import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { BrowserWindow, screen } from 'electron'
import type { ThemeId, WallpaperData } from '../shared/types'
import { log } from './logger'

/**
 * 바탕화면 React 트리를 PNG 로 굽는 곳.
 *
 * 이 앱에서 가장 잘 깨지는 부분이다. 실패 양상은 늘 셋 중 하나였다:
 *   1. 폰트가 아직 안 붙은 채로 찍혀서 글자가 기본 sans 로 나온다.
 *   2. 첫 페인트 전에 찍혀서 통째로 검은/빈 이미지가 나온다.
 *   3. 매 갱신마다 창을 새로 만들어서 메모리가 계속 늘고, 가끔 GPU 가 죽는다.
 *
 * 그래서 (a) 준비 신호는 setTimeout 이 아니라 페이지가 명시적으로 보내는
 * document.title 변경으로 받고, (b) 숨은 창 하나를 계속 재사용한다.
 */

/** 페이지가 "다 그렸다" 고 알릴 때 쓰는 제목 접두사. main.tsx 와 맞춰져 있다. */
const READY_PREFIX = 'wallpaper-ready:'

/** 준비 신호를 이만큼 기다리다 포기한다. 렌더 자체는 보통 1초 안에 끝난다. */
const READY_TIMEOUT_MS = 20_000

let captureWindow: BrowserWindow | null = null

/** 캡처는 절대 겹치면 안 된다 — 창 하나를 공유하므로 직렬로 세운다. */
let queue: Promise<unknown> = Promise.resolve()

export interface CaptureOptions {
  theme: ThemeId
  data: WallpaperData
  iconSafeRatio: number
  /** 저장 경로. 상위 폴더가 없으면 만든다. */
  outPath: string
}

export interface CaptureResult {
  path: string
  /** 실제로 기록된 PNG 의 픽셀 크기. */
  width: number
  height: number
}

/** 주 모니터 기준 렌더 크기. CSS 픽셀 크기와 최종 물리 픽셀 배율을 나눠서 돌려준다. */
function targetSize(): { cssWidth: number; cssHeight: number; scaleFactor: number } {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.size
  // scaleFactor 는 0 이나 NaN 으로 오는 사례가 보고된 적이 있어 방어한다.
  const raw = display.scaleFactor
  const scaleFactor = Number.isFinite(raw) && raw > 0 ? raw : 1
  return { cssWidth: Math.max(640, Math.round(width)), cssHeight: Math.max(480, Math.round(height)), scaleFactor }
}

function ensureWindow(cssWidth: number, cssHeight: number): BrowserWindow {
  if (captureWindow && !captureWindow.isDestroyed()) {
    // 모니터가 바뀌었을 수 있으니 매번 크기를 맞춘다.
    const [w, h] = captureWindow.getContentSize()
    if (w !== cssWidth || h !== cssHeight) captureWindow.setContentSize(cssWidth, cssHeight)
    return captureWindow
  }

  captureWindow = new BrowserWindow({
    width: cssWidth,
    height: cssHeight,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: false,
    skipTaskbar: true,
    // 4K 모니터에서 창이 화면보다 커질 수 있다. macOS 는 이 옵션이 없으면 잘라낸다.
    enableLargerThanScreen: true,
    // 숨은 채로도 렌더를 돌려야 capturePage 가 빈 이미지를 내지 않는다.
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // 숨은 창은 기본적으로 타이머·렌더가 늦춰진다. 캡처 창에서는 치명적이다.
      backgroundThrottling: false,
      // 여기서는 preload 를 붙이지 않는다. 캡처 페이지는 아무 권한도 필요 없다.
    },
  })

  captureWindow.on('closed', () => {
    captureWindow = null
  })

  return captureWindow
}

/** JSON 을 URL 에 안전하게 실을 수 있는 base64 로. 한글이 그대로 들어가므로 UTF-8 을 거친다. */
function encodePayload(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
}

/** 캡처 페이지를 지정한 파라미터로 띄운다. dev 는 vite 서버, prod 는 out/renderer 의 파일. */
async function loadPage(win: BrowserWindow, query: Record<string, string>): Promise<void> {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) {
    const url = new URL('wallpaper.html', devServer.endsWith('/') ? devServer : `${devServer}/`)
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
    await win.loadURL(url.toString())
    return
  }
  await win.loadFile(join(__dirname, '../renderer/wallpaper.html'), { query })
}

/**
 * 페이지가 이번 토큰으로 준비 신호를 보낼 때까지 기다린다.
 *
 * 신호를 title 로 받는 이유: 캡처 페이지에는 preload 가 없어 ipcRenderer 를 못 쓰고,
 * executeJavaScript 폴링은 렌더 스레드를 건드린다. page-title-updated 는 순수 이벤트다.
 * 토큰을 끼워 넣는 건 직전 캡처가 남긴 신호를 이번 것으로 착각하지 않기 위해서다.
 */
function waitForReady(win: BrowserWindow, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const expected = READY_PREFIX + token
    let settled = false

    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      win.webContents.off('page-title-updated', onTitle)
      win.webContents.off('render-process-gone', onGone)
      win.webContents.off('did-fail-load', onFail)
      if (err) reject(err)
      else resolve()
    }

    const onTitle = (_e: Electron.Event, title: string) => {
      if (title === expected) finish()
    }
    const onGone = () => finish(new Error('캡처 페이지 렌더러가 죽었습니다'))
    const onFail = (_e: Electron.Event, code: number, desc: string) =>
      finish(new Error(`캡처 페이지 로드 실패 (${code} ${desc})`))

    const timer = setTimeout(
      () => finish(new Error(`캡처 준비 신호 시간 초과 (${READY_TIMEOUT_MS}ms)`)),
      READY_TIMEOUT_MS,
    )

    win.webContents.on('page-title-updated', onTitle)
    win.webContents.on('render-process-gone', onGone)
    win.webContents.on('did-fail-load', onFail)

    // 리스너를 붙이기 전에 이미 준비가 끝났을 가능성(빠른 캐시 로드)을 한 번 훑는다.
    if (win.webContents.getTitle() === expected) finish()
  })
}

async function captureOnce(opts: CaptureOptions): Promise<CaptureResult> {
  const { cssWidth, cssHeight, scaleFactor } = targetSize()
  const win = ensureWindow(cssWidth, cssHeight)
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  const ready = waitForReady(win, token)
  try {
    await loadPage(win, {
      token,
      theme: opts.theme,
      ratio: String(opts.iconSafeRatio),
      w: String(cssWidth),
      h: String(cssHeight),
      data: encodePayload(opts.data),
    })
  } catch (e) {
    // 로드가 먼저 터지면 ready 를 기다릴 사람이 사라진다. 그냥 두면 did-fail-load 나
    // 20초 뒤 시간 초과가 아무도 받지 않는 거부로 남아 main 프로세스를 통째로 죽인다.
    ready.catch(() => undefined)
    throw e
  }
  await ready

  let image = await win.webContents.capturePage()

  // 한 번도 화면에 뜬 적 없는 창은 macOS 에서 드물게 빈 프레임을 준다.
  // 화면 밖에 잠깐 띄워 강제로 한 프레임 그리게 한 뒤 다시 찍는다.
  if (image.isEmpty()) {
    log('캡처가 비어 있어 화면 밖 표시 후 재시도')
    win.setPosition(-cssWidth - 100, 0)
    win.showInactive()
    await new Promise((r) => setTimeout(r, 250))
    image = await win.webContents.capturePage()
    win.hide()
    if (image.isEmpty()) throw new Error('캡처 결과가 비어 있습니다')
  }

  // 고해상도 모니터에서는 논리 크기로 그려도 비트맵은 배율만큼 촘촘하다.
  // scaleFactor 를 넘겨야 그 원본 비트맵이 그대로 파일로 나간다.
  const png = image.toPNG({ scaleFactor })

  const dir = dirname(opts.outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(opts.outPath, png)

  const size = image.getSize()
  const result: CaptureResult = {
    path: opts.outPath,
    width: Math.round(size.width * scaleFactor),
    height: Math.round(size.height * scaleFactor),
  }
  log(`바탕화면 렌더 완료 ${result.width}x${result.height} (${opts.theme})`)
  return result
}

/** 바탕화면 한 장을 그려 PNG 로 저장한다. 호출이 겹쳐도 순서대로 처리된다. */
export function captureWallpaper(opts: CaptureOptions): Promise<CaptureResult> {
  const next = queue.then(
    () => captureOnce(opts),
    () => captureOnce(opts),
  )
  // 큐는 실패해도 끊기면 안 되므로 거부를 여기서 흡수한다.
  queue = next.catch(() => undefined)
  return next
}

/** 상태 브로드캐스트가 캡처 창까지 때리지 않게 걸러내는 데 쓴다. */
export function isCaptureWindow(win: BrowserWindow): boolean {
  return captureWindow !== null && win.id === captureWindow.id
}

/** 앱 종료 시 숨은 창 정리. */
export function destroyCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) captureWindow.destroy()
  captureWindow = null
}
