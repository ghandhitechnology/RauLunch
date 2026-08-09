/**
 * 백그라운드 자동 갱신 스케줄러.
 *
 * 컨트롤러 창은 렌더러라 설정을 직접 갖고 있지 않고, 트레이만 띄운 채로도 앱이 돈다.
 * 그래서 매 tick 마다 설정을 다시 읽는다 — 앱을 재시작하지 않아도 주기 변경이 먹는다.
 *
 * 판단 로직(decide)은 시계를 직접 읽지 않는 순수 함수라 가짜 시계로 테스트할 수 있다.
 * 이 성질이 이 파일의 전부다. 시계를 읽고 싶어지면 tick 쪽으로 밀어 넣을 것.
 */
import type { Settings, StatusSnapshot } from '../shared/types'

export const TICK_SEC = 20
/**
 * tick 간격보다 이만큼 더 벌어지면 절전/최대절전에서 깨어난 것으로 본다.
 * 단조 시계(performance.now)의 절전 중 동작이 OS 마다 달라
 * (macOS/Linux 는 멈추고 Windows 는 흐른다) 어디서나 같게 동작하는 벽시계 간격만 본다.
 */
export const WAKE_GAP_SEC = 120
/** 실패 후 재시도 간격. 깨어났는데 Wi-Fi 가 아직 안 붙은 경우를 덮는다. */
export const BACKOFF_STEPS_SEC = [60, 120, 240, 480, 900] as const

/** 허용하는 갱신 주기. shared/types 의 VALID_REFRESH_INTERVALS 와 같은 값이다. */
const VALID_INTERVALS_MIN = [0, 30, 60, 180]
const DEFAULT_INTERVAL_MIN = 60

/** 연속 실패 횟수에 대응하는 재시도 대기 시간(초). */
export function backoffDelay(failCount: number): number {
  if (failCount <= 0) return 0
  return BACKOFF_STEPS_SEC[Math.min(failCount, BACKOFF_STEPS_SEC.length) - 1]
}

export interface DecideInput {
  /** "YYYY-MM-DD" — 지금이 며칠인지. */
  today: string
  /** 마지막 성공 갱신의 날짜. 아직 없으면 null. */
  lastSuccessDate: string | null
  /** 마지막 성공 이후 흐른 초. 성공한 적 없으면 null. */
  secondsSinceSuccess: number | null
  /** 마지막 실패 이후 흐른 초. 실패한 적 없으면 null. */
  secondsSinceFailure: number | null
  /** 직전 tick 과 이번 tick 사이의 벽시계 간격(초). */
  wallGap: number
  /** 설정된 주기(분). 0 이면 주기 갱신 없음. */
  intervalMin: number
  /** 연속 실패 횟수. */
  failCount: number
}

export interface Decision {
  should: boolean
  /** 로그에만 쓰인다. */
  reason: string
}

/**
 * 갱신할지 말지 결정한다. 시계를 읽지 않는 순수 함수.
 * 우선순위: 최초 → 재시도(backoff) → 날짜 변경 → 절전 해제 → 주기.
 */
export function decide(input: DecideInput): Decision {
  const {
    today,
    lastSuccessDate,
    secondsSinceSuccess,
    secondsSinceFailure,
    wallGap,
    intervalMin,
    failCount,
  } = input

  if (lastSuccessDate === null && failCount === 0) {
    return { should: true, reason: '최초 갱신' }
  }

  // 실패 중에는 backoff 가 다른 트리거보다 우선한다.
  // 그렇지 않으면 네트워크가 끊긴 동안 날짜 변경/절전 해제가 매 tick 재시도를 유발한다.
  if (failCount > 0) {
    const delay = backoffDelay(failCount)
    if (secondsSinceFailure === null || secondsSinceFailure >= delay) {
      const mins = Math.floor(delay / 60)
      return { should: true, reason: `재시도 (연속 ${failCount}회 실패, ${mins}분 대기 후)` }
    }
    return { should: false, reason: '' }
  }

  // 바탕화면은 '오늘' 급식·시간표를 보여준다. 자정을 넘겼으면 주기 설정과 무관하게 갱신한다.
  if (lastSuccessDate !== today) {
    return { should: true, reason: '날짜 변경' }
  }

  if (wallGap > WAKE_GAP_SEC) {
    return { should: true, reason: `절전 해제 감지 (${Math.trunc(wallGap)}초 공백)` }
  }

  if (intervalMin > 0 && secondsSinceSuccess !== null && secondsSinceSuccess >= intervalMin * 60) {
    return { should: true, reason: `주기 갱신 (${intervalMin}분)` }
  }

  return { should: false, reason: '' }
}

/** 벽시계는 NTP 보정 등으로 뒤로 갈 수 있으므로 음수는 0으로 막는다. */
function elapsedSec(nowMs: number, thenMs: number | null): number | null {
  if (thenMs === null) return null
  return Math.max(0, (nowMs - thenMs) / 1000)
}

/** 벽시계 ms → 로컬 기준 "YYYY-MM-DD". UTC 로 밀리면 자정 판정이 어긋난다. */
export function dateOf(wallMs: number): string {
  const d = new Date(wallMs)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function safeRefreshInterval(value: unknown): number {
  const n = typeof value === 'number' ? Math.trunc(value) : Number.NaN
  return VALID_INTERVALS_MIN.includes(n) ? n : DEFAULT_INTERVAL_MIN
}

/**
 * 갱신 콜백의 반환값 규약:
 *   true  — 갱신 성공
 *   false — 갱신 실패 (backoff 시작)
 *   null  — 이미 갱신 중이라 건너뜀 (성공도 실패도 아님, 상태를 바꾸지 않는다)
 */
export type RefreshResult = boolean | null

export interface SchedulerOptions {
  /** 실제 갱신 작업. 예외를 던지면 실패로 친다. */
  runRefresh: (reason: string) => Promise<RefreshResult>
  /** 매 tick 다시 읽는다. 던지면 기본 주기로 떨어진다. */
  loadSettings: () => Settings
  /** 상태가 바뀔 때마다 불린다. 컨트롤러 하단 바가 이걸 그대로 보여준다. */
  onStatus?: (status: StatusSnapshot) => void
  log?: (message: string) => void
  /** 테스트용 주입점. */
  tickSec?: number
  clock?: () => number
}

export class Scheduler {
  private readonly runRefresh: SchedulerOptions['runRefresh']
  private readonly loadSettings: SchedulerOptions['loadSettings']
  private readonly onStatus: (status: StatusSnapshot) => void
  private readonly log: (message: string) => void
  private readonly tickSec: number
  private readonly clock: () => number

  private timer: ReturnType<typeof setInterval> | null = null
  private prevTickWall: number | null = null

  private lastSuccessWall: number | null = null
  private lastSuccessDate: string | null = null
  private lastFailureWall: number | null = null
  private failCount = 0
  private lastError: string | null = null
  private appliedWall: number | null = null

  /** 진행 중인 갱신. 두 갱신이 겹치지 않게 하는 유일한 장치다. */
  private inFlight: Promise<void> | null = null

  constructor(options: SchedulerOptions) {
    this.runRefresh = options.runRefresh
    this.loadSettings = options.loadSettings
    this.onStatus = options.onStatus ?? (() => {})
    this.log = options.log ?? (() => {})
    this.tickSec = options.tickSec ?? TICK_SEC
    this.clock = options.clock ?? Date.now
  }

  // ── 상태 ──

  status(): StatusSnapshot {
    return {
      lastSuccessAt: this.lastSuccessWall === null ? null : new Date(this.lastSuccessWall).toISOString(),
      lastFailureAt: this.lastFailureWall === null ? null : new Date(this.lastFailureWall).toISOString(),
      failCount: this.failCount,
      refreshing: this.inFlight !== null,
      lastError: this.lastError,
      appliedAt: this.appliedWall === null ? null : new Date(this.appliedWall).toISOString(),
    }
  }

  private emit(): void {
    try {
      this.onStatus(this.status())
    } catch (e) {
      // 상태 구독자가 죽어도 스케줄러는 계속 돌아야 한다.
      this.log(`상태 알림 실패: ${String(e)}`)
    }
  }

  /** 부팅 직후 이미 한 번 갱신했음을 알려 즉시 재갱신을 막는다. */
  seed(success: boolean): void {
    const now = this.clock()
    if (success) {
      this.markSuccess(now)
    } else {
      this.failCount = 1
      this.lastFailureWall = now
    }
    this.emit()
  }

  /** 바탕화면이 실제로 적용된 시각을 기록한다. */
  markApplied(): void {
    this.appliedWall = this.clock()
    this.emit()
  }

  private markSuccess(now: number): void {
    this.lastSuccessWall = now
    this.lastSuccessDate = dateOf(now)
    this.lastFailureWall = null
    this.failCount = 0
    this.lastError = null
  }

  // ── 루프 ──

  start(): void {
    if (this.timer !== null) return
    // 첫 tick 은 tickSec 뒤다. 부팅 직후 갱신은 호출부가 직접 한다.
    this.prevTickWall = this.clock()
    this.timer = setInterval(() => {
      void this.tick()
    }, this.tickSec * 1000)
    // 이 타이머가 앱 종료를 붙잡지 않게 한다.
    this.timer.unref?.()
    this.log(`자동 갱신 스케줄러 시작 (tick ${this.tickSec}초)`)
  }

  stop(): void {
    if (this.timer === null) return
    clearInterval(this.timer)
    this.timer = null
    this.prevTickWall = null
  }

  /** 한 번의 판단 주기. 테스트에서 직접 부를 수 있게 열어 둔다. */
  async tick(): Promise<boolean> {
    const now = this.clock()
    const prev = this.prevTickWall
    this.prevTickWall = now
    const wallGap = prev === null ? 0 : Math.max(0, (now - prev) / 1000)

    const { should, reason } = decide({
      today: dateOf(now),
      lastSuccessDate: this.lastSuccessDate,
      secondsSinceSuccess: elapsedSec(now, this.lastSuccessWall),
      secondsSinceFailure: elapsedSec(now, this.lastFailureWall),
      wallGap,
      intervalMin: this.currentInterval(),
      failCount: this.failCount,
    })

    if (should) await this.refresh(reason)
    return should
  }

  /** 매 tick 설정을 다시 읽는다 — 컨트롤러에서 바꾼 주기를 재시작 없이 반영하기 위해. */
  currentInterval(): number {
    try {
      return safeRefreshInterval(this.loadSettings().refreshIntervalMin)
    } catch (e) {
      this.log(`자동 갱신 설정 읽기 실패, 기본값 사용: ${String(e)}`)
      return DEFAULT_INTERVAL_MIN
    }
  }

  /** 사용자가 직접 누른 갱신. 진행 중이면 그 갱신을 기다린다. */
  triggerNow(reason = '수동'): Promise<void> {
    return this.refresh(reason)
  }

  private refresh(reason: string): Promise<void> {
    if (this.inFlight !== null) return this.inFlight
    const run = this.runOnce(reason).finally(() => {
      this.inFlight = null
      this.emit()
    })
    this.inFlight = run
    this.emit()
    return run
  }

  private async runOnce(reason: string): Promise<void> {
    this.log(`자동 갱신 — ${reason}`)
    // 지난 실패 메시지가 남아 새 시도의 결과를 가리지 않게 한다.
    this.lastError = null
    let result: RefreshResult = false
    try {
      result = await this.runRefresh(reason)
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      this.log(`자동 갱신 실패: ${detail}`)
      this.lastError = detail
      result = false
    }

    if (result === null) {
      // 이미 갱신 중 — 상태를 건드리지 않는다.
      this.log('자동 갱신 건너뜀 (이미 갱신 중)')
      return
    }

    const now = this.clock()
    if (result) {
      this.markSuccess(now)
      return
    }

    this.failCount += 1
    this.lastFailureWall = now
    if (this.lastError === null) this.lastError = '갱신에 실패했다'
    this.log(`자동 갱신 실패 — ${Math.floor(backoffDelay(this.failCount) / 60)}분 후 재시도`)
  }
}
