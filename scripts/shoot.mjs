import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'

/**
 * 바탕화면 테마를 1920x1080 으로 구워 docs/shots 에 떨구는 검수용 스크립트.
 *
 * src/main/capture.ts 를 그대로 못 쓴다 — 거기 targetSize() 는 주 모니터 크기를
 * 강제로 따라가므로 맥에서 돌리면 1920x1080 이 아닌 크기가 나온다. 검수 이미지는
 * 실제 교실 프로젝터 해상도와 같아야 의미가 있으므로 창을 직접 몬다.
 * 준비 신호(title 토큰) 규약만 capture.ts 와 똑같이 맞췄다.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUT_DIR = join(ROOT, 'docs', 'shots')
const PAGE = join(ROOT, 'out', 'renderer', 'wallpaper.html')

const WIDTH = 1920
const HEIGHT = 1080
const ICON_SAFE_RATIO = 0.15
const READY_PREFIX = 'wallpaper-ready:'
const READY_TIMEOUT_MS = 20_000

const THEME_IDS = ['pixel-speech']

/** EMPTY_DATA 로도 찍어볼 테마. 빈 상태가 초라하지 않은지 보는 용도. */
const EMPTY_TARGETS = ['pixel-speech']

/**
 * fixtures.ts 를 그대로 읽어 쓴다. 손으로 베껴두면 원본이 바뀌었을 때
 * 검수 이미지가 조용히 낡은 자료로 찍힌다.
 */
function loadFixtures() {
  const src = readFileSync(join(ROOT, 'src', 'shared', 'fixtures.ts'), 'utf8')
  const pick = (name) => {
    const at = src.indexOf(`export const ${name}`)
    if (at < 0) throw new Error(`${name} 를 fixtures.ts 에서 못 찾았습니다`)
    const start = src.indexOf('{', at)
    let depth = 0
    for (let i = start; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1
      else if (src[i] === '}') {
        depth -= 1
        if (depth === 0) return eval(`(${src.slice(start, i + 1)})`)
      }
    }
    throw new Error(`${name} 리터럴이 안 닫혔습니다`)
  }
  return { SAMPLE_DATA: pick('SAMPLE_DATA'), EMPTY_DATA: pick('EMPTY_DATA') }
}

function encodePayload(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
}

function waitForReady(win, token) {
  return new Promise((resolvePromise, reject) => {
    const expected = READY_PREFIX + token
    let settled = false
    const finish = (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      win.webContents.off('page-title-updated', onTitle)
      win.webContents.off('did-fail-load', onFail)
      if (err) reject(err)
      else resolvePromise()
    }
    const onTitle = (_e, title) => {
      if (title === expected) finish()
    }
    const onFail = (_e, code, desc) => finish(new Error(`로드 실패 (${code} ${desc})`))
    const timer = setTimeout(() => finish(new Error('준비 신호 시간 초과')), READY_TIMEOUT_MS)
    win.webContents.on('page-title-updated', onTitle)
    win.webContents.on('did-fail-load', onFail)
    if (win.webContents.getTitle() === expected) finish()
  })
}

async function shoot(win, theme, data, outPath) {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const ready = waitForReady(win, token)
  await win.loadFile(PAGE, {
    query: {
      token,
      theme,
      ratio: String(ICON_SAFE_RATIO),
      w: String(WIDTH),
      h: String(HEIGHT),
      data: encodePayload(data),
    },
  })
  await ready

  let image = await win.webContents.capturePage()
  if (image.isEmpty()) throw new Error('캡처 결과가 비어 있습니다')

  // 레티나 맥에서 비트맵이 2배로 잡히더라도 검수 이미지는 정확히 1920x1080 이어야 한다.
  const png = image.resize({ width: WIDTH, height: HEIGHT }).toPNG({ scaleFactor: 1 })
  writeFileSync(outPath, png)
  return png.length
}

async function main() {
  if (!existsSync(PAGE)) throw new Error(`빌드 결과가 없습니다: ${PAGE} (npm run build 먼저)`)
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const { SAMPLE_DATA, EMPTY_DATA } = loadFixtures()

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    useContentSize: true,
    show: false,
    frame: false,
    skipTaskbar: true,
    enableLargerThanScreen: true,
    paintWhenInitiallyHidden: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  })

  const jobs = [
    ...THEME_IDS.map((id) => ({ id, data: SAMPLE_DATA, name: `${id}.png` })),
    ...EMPTY_TARGETS.map((id) => ({ id, data: EMPTY_DATA, name: `empty-${id}.png` })),
  ]

  let failed = 0
  for (const job of jobs) {
    const out = join(OUT_DIR, job.name)
    try {
      const bytes = await shoot(win, job.id, job.data, out)
      console.log(`ok   ${job.name}  ${(bytes / 1024).toFixed(0)}KB`)
    } catch (err) {
      failed += 1
      console.log(`FAIL ${job.name}  ${err.message}`)
    }
  }

  console.log(failed === 0 ? `완료 — ${jobs.length}장` : `실패 ${failed}건`)
  app.exit(failed === 0 ? 0 : 1)
}

// 최상위 await 를 쓰면 안 된다. ESM 진입점은 모듈 평가가 끝나야 ready 가 뜨므로
// `await app.whenReady()` 를 최상위에 두면 그 자리에서 영원히 멈춘다.
app.whenReady().then(main, (err) => {
  console.error(err)
  app.exit(1)
})
