/**
 * scheduler 판단 로직 점검. 테스트 프레임워크 없이 돌린다.
 *
 *   node --experimental-strip-types src/main/scheduler.test.ts
 *
 * decide 가 시계를 읽지 않는 순수 함수라서 가짜 시계 하나로 전부 검증된다.
 * 새 트리거를 추가하면 여기 우선순위 케이스부터 늘릴 것.
 */
import assert from 'node:assert/strict'

// 정적 경로로 쓰면 tsconfig 가 .ts 확장자를 막는다. node 는 확장자가 있어야 찾는다.
const mod = await import(new URL('./scheduler.ts', import.meta.url).href)
const { decide, backoffDelay, dateOf, Scheduler, TICK_SEC, WAKE_GAP_SEC, BACKOFF_STEPS_SEC } = mod

const DAY = '2026-08-09'
/** decide 인자의 기본값. 각 케이스는 관심 있는 필드만 덮어쓴다. */
const base = {
  today: DAY,
  lastSuccessDate: DAY,
  secondsSinceSuccess: 0,
  secondsSinceFailure: null,
  wallGap: TICK_SEC,
  intervalMin: 60,
  failCount: 0,
}
const at = (over: Record<string, unknown> = {}) => decide({ ...base, ...over })

/**
 * 시계를 tick 간격으로 잘게 밀며 스케줄러를 돌린다.
 * 한 번에 크게 밀면 절전 해제 트리거가 먼저 걸려 주기 검증이 흐려진다.
 */
async function runFor(
  s: { tick: () => Promise<boolean> },
  seconds: number,
  bump: (ms: number) => void,
): Promise<void> {
  for (let left = seconds; left > 0; left -= TICK_SEC) {
    bump(Math.min(TICK_SEC, left) * 1000)
    await s.tick()
  }
}

const tests: Array<[string, () => void | Promise<void>]> = []
const test = (name: string, fn: () => void | Promise<void>) => tests.push([name, fn])

// ── 상수 ──
test('상수가 참조 구현과 같다', () => {
  assert.equal(TICK_SEC, 20)
  assert.equal(WAKE_GAP_SEC, 120)
  assert.deepEqual([...BACKOFF_STEPS_SEC], [60, 120, 240, 480, 900])
})

// ── 최초 실행 ──
test('최초 실행: 성공 이력도 실패도 없으면 즉시 갱신', () => {
  const d = at({ lastSuccessDate: null, secondsSinceSuccess: null })
  assert.equal(d.should, true)
  assert.equal(d.reason, '최초 갱신')
})

test('최초 실행이라도 이미 실패했으면 backoff 가 잡는다', () => {
  const d = at({ lastSuccessDate: null, secondsSinceSuccess: null, failCount: 1, secondsSinceFailure: 0 })
  assert.equal(d.should, false)
})

// ── backoff ──
test('backoffDelay 가 단계별 값을 준다', () => {
  assert.equal(backoffDelay(0), 0)
  assert.equal(backoffDelay(-3), 0)
  assert.equal(backoffDelay(1), 60)
  assert.equal(backoffDelay(2), 120)
  assert.equal(backoffDelay(3), 240)
  assert.equal(backoffDelay(4), 480)
  assert.equal(backoffDelay(5), 900)
  // 단계를 넘어서면 마지막 값에 머문다.
  assert.equal(backoffDelay(6), 900)
  assert.equal(backoffDelay(99), 900)
})

test('backoff: 대기 시간 전에는 안 하고 지나면 한다', () => {
  assert.equal(at({ failCount: 2, secondsSinceFailure: 119 }).should, false)
  assert.equal(at({ failCount: 2, secondsSinceFailure: 120 }).should, true)
})

test('backoff 가 날짜 변경보다 우선한다', () => {
  // 네트워크가 끊긴 채 자정을 넘겨도 매 tick 재시도하면 안 된다.
  const d = at({ lastSuccessDate: '2026-08-08', failCount: 1, secondsSinceFailure: 10 })
  assert.equal(d.should, false)
})

test('backoff 가 절전 해제보다 우선한다', () => {
  const d = at({ failCount: 3, secondsSinceFailure: 5, wallGap: 3600 })
  assert.equal(d.should, false)
})

// ── 날짜 변경 ──
test('날짜 변경: 주기가 꺼져 있어도 갱신한다', () => {
  const d = at({ lastSuccessDate: '2026-08-08', intervalMin: 0 })
  assert.equal(d.should, true)
  assert.equal(d.reason, '날짜 변경')
})

test('같은 날이고 주기 전이면 아무것도 안 한다', () => {
  assert.equal(at({ secondsSinceSuccess: 60 }).should, false)
})

// ── 절전 해제 ──
test('절전 해제: 벽시계 공백이 임계 초과면 갱신', () => {
  assert.equal(at({ wallGap: WAKE_GAP_SEC }).should, false)
  const d = at({ wallGap: WAKE_GAP_SEC + 1 })
  assert.equal(d.should, true)
  assert.match(d.reason, /절전 해제/)
})

// ── 주기 ──
test('주기: 경계에서 정확히 갱신된다', () => {
  assert.equal(at({ intervalMin: 30, secondsSinceSuccess: 1799 }).should, false)
  assert.equal(at({ intervalMin: 30, secondsSinceSuccess: 1800 }).should, true)
})

test('주기 0 이면 아무리 오래돼도 주기 갱신은 없다', () => {
  assert.equal(at({ intervalMin: 0, secondsSinceSuccess: 86400 }).should, false)
})

// ── dateOf ──
test('dateOf 는 로컬 자정 기준으로 날짜를 나눈다', () => {
  const justBefore = new Date(2026, 7, 9, 23, 59, 59).getTime()
  const justAfter = new Date(2026, 7, 10, 0, 0, 1).getTime()
  assert.equal(dateOf(justBefore), '2026-08-09')
  assert.equal(dateOf(justAfter), '2026-08-10')
})

// ── 루프 ──
test('Scheduler: 첫 tick 은 갱신, 그 다음은 주기까지 쉰다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  const calls: string[] = []
  const s = new Scheduler({
    runRefresh: async (reason: string) => {
      calls.push(reason)
      return true
    },
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })

  await s.tick()
  assert.deepEqual(calls, ['최초 갱신'])

  await runFor(s, 30 * 60, (ms) => {
    now += ms
  })
  assert.equal(calls.length, 1)

  await runFor(s, 30 * 60, (ms) => {
    now += ms
  })
  assert.equal(calls.length, 2)
  assert.match(calls[1], /주기 갱신/)
})

test('Scheduler: 실패하면 backoff 순서대로 재시도한다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  let attempts = 0
  const s = new Scheduler({
    runRefresh: async () => {
      attempts += 1
      return false
    },
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })

  await s.tick()
  assert.equal(attempts, 1)
  assert.equal(s.status().failCount, 1)

  // 1단계 대기는 60초. 59초에는 안 되고 60초에는 된다.
  now += 59_000
  await s.tick()
  assert.equal(attempts, 1)

  now += 1_000
  await s.tick()
  assert.equal(attempts, 2)
  assert.equal(s.status().failCount, 2)

  // 2단계 대기는 120초.
  now += 119_000
  await s.tick()
  assert.equal(attempts, 2)

  now += 1_000
  await s.tick()
  assert.equal(attempts, 3)
})

test('Scheduler: 성공하면 실패 상태가 초기화된다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  let ok = false
  const s = new Scheduler({
    runRefresh: async () => ok,
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })

  await s.tick()
  assert.equal(s.status().failCount, 1)
  assert.notEqual(s.status().lastFailureAt, null)

  ok = true
  now += 60_000
  await s.tick()
  const st = s.status()
  assert.equal(st.failCount, 0)
  assert.equal(st.lastFailureAt, null)
  assert.equal(st.lastError, null)
  assert.notEqual(st.lastSuccessAt, null)
})

test('Scheduler: 자정을 넘기면 주기와 무관하게 갱신한다', async () => {
  let now = new Date(2026, 7, 9, 23, 59, 0).getTime()
  let calls = 0
  const s = new Scheduler({
    runRefresh: async () => {
      calls += 1
      return true
    },
    loadSettings: () => ({ refreshIntervalMin: 0 }), // 주기 갱신 꺼짐
    clock: () => now,
  })

  await s.tick()
  assert.equal(calls, 1)

  // 자정 직전 tick — 아직 같은 날.
  now += 30_000
  await s.tick()
  assert.equal(calls, 1)

  // 자정 직후 tick — 날짜가 바뀌었다.
  now += 60_000
  await s.tick()
  assert.equal(calls, 2)
})

test('Scheduler: 절전에서 깨어나면 갱신한다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  let calls = 0
  const s = new Scheduler({
    runRefresh: async () => {
      calls += 1
      return true
    },
    loadSettings: () => ({ refreshIntervalMin: 180 }),
    clock: () => now,
  })

  await s.tick()
  assert.equal(calls, 1)

  now += 20_000
  await s.tick()
  assert.equal(calls, 1)

  // 같은 날 안에서 두 시간 자고 일어난다. 주기(180분)는 아직 안 찼다.
  now += 2 * 60 * 60 * 1000
  await s.tick()
  assert.equal(calls, 2)
})

test('Scheduler: 설정 주기 변경이 재시작 없이 먹는다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  let intervalMin = 180
  let calls = 0
  const s = new Scheduler({
    runRefresh: async () => {
      calls += 1
      return true
    },
    loadSettings: () => ({ refreshIntervalMin: intervalMin }),
    clock: () => now,
  })

  await s.tick()
  assert.equal(calls, 1)

  await runFor(s, 31 * 60, (ms) => {
    now += ms
  })
  assert.equal(calls, 1) // 180분 주기에서는 아직 이르다

  intervalMin = 30
  await s.tick()
  assert.equal(calls, 2)
})

test('Scheduler: 설정을 못 읽으면 기본 주기로 버틴다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  const s = new Scheduler({
    runRefresh: async () => true,
    loadSettings: () => {
      throw new Error('config.json 깨짐')
    },
    clock: () => now,
  })
  assert.equal(s.currentInterval(), 60)
  await s.tick() // 죽지 않는다
  now += 60 * 60 * 1000
  assert.equal(await s.tick(), true)
})

test('Scheduler: 갱신 콜백이 던져도 실패로만 처리된다', async () => {
  const now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  const s = new Scheduler({
    runRefresh: async () => {
      throw new Error('네트워크 끊김')
    },
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })
  await s.tick()
  assert.equal(s.status().failCount, 1)
  assert.equal(s.status().lastError, '네트워크 끊김')
})

test('Scheduler: null 을 반환하면 상태를 건드리지 않는다', async () => {
  const now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  const s = new Scheduler({
    runRefresh: async () => null,
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })
  await s.tick()
  const st = s.status()
  assert.equal(st.failCount, 0)
  assert.equal(st.lastSuccessAt, null)
  assert.equal(st.lastFailureAt, null)
})

test('Scheduler: triggerNow 는 겹쳐 불려도 한 번만 돈다', async () => {
  const now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  let running = 0
  let peak = 0
  const s = new Scheduler({
    runRefresh: async () => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, 10))
      running -= 1
      return true
    },
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })
  await Promise.all([s.triggerNow(), s.triggerNow(), s.triggerNow()])
  assert.equal(peak, 1)
  assert.equal(s.status().failCount, 0)
})

test('Scheduler: seed 하면 즉시 재갱신하지 않는다', async () => {
  let now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  let calls = 0
  const s = new Scheduler({
    runRefresh: async () => {
      calls += 1
      return true
    },
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
  })
  s.seed(true)
  now += 20_000
  await s.tick()
  assert.equal(calls, 0)
})

test('Scheduler: 상태 변경이 콜백으로 나간다', async () => {
  const now = new Date(2026, 7, 9, 9, 0, 0).getTime()
  const seen: boolean[] = []
  const s = new Scheduler({
    runRefresh: async () => true,
    loadSettings: () => ({ refreshIntervalMin: 60 }),
    clock: () => now,
    onStatus: (st: { refreshing: boolean }) => seen.push(st.refreshing),
  })
  await s.tick()
  // 갱신 시작(true) → 종료(false) 가 순서대로 보여야 한다.
  assert.deepEqual(seen, [true, false])
})

let failed = 0
for (const [name, fn] of tests) {
  try {
    await fn()
    console.log(`  ok  ${name}`)
  } catch (e) {
    failed += 1
    console.log(`FAIL  ${name}`)
    console.log(String(e instanceof Error ? e.stack : e))
  }
}
console.log(`\n${tests.length - failed}/${tests.length} 통과`)
if (failed > 0) process.exitCode = 1
