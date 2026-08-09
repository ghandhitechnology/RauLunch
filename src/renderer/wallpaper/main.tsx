import { createRoot } from 'react-dom/client'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../shared/theme'
import { DEFAULT_SETTINGS, DEFAULT_THEME, type ThemeId, type WallpaperData } from '../../shared/types'
import { SAMPLE_DATA } from '../../shared/fixtures'
import { getTheme } from './themes'
import { WallpaperFrame } from './WallpaperFrame'
import '../fonts.css'

/**
 * 캡처 전용 페이지.
 *
 * main 프로세스가 숨은 창에 이 페이지를 띄우고, 다 그려지면 화면을 찍는다.
 * 사람이 볼 일은 없지만 개발 중에는 브라우저로 직접 열어볼 수 있어야 하므로
 * 쿼리 파라미터가 하나도 없으면 표본 자료로 그린다.
 */

/** capture.ts 의 READY_PREFIX 와 반드시 같아야 한다. */
const READY_PREFIX = 'wallpaper-ready:'

function decodePayload<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder('utf-8').decode(bytes)) as T
  } catch {
    return null
  }
}

function numberParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key)
  if (raw === null) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

const params = new URLSearchParams(window.location.search)
const token = params.get('token')

const data = decodePayload<WallpaperData>(params.get('data')) ?? SAMPLE_DATA
const themeId = (params.get('theme') ?? DEFAULT_THEME) as ThemeId
const iconSafeRatio = Math.min(
  0.4,
  Math.max(0, numberParam(params, 'ratio', DEFAULT_SETTINGS.iconSafeRatio)),
)
// 쿼리가 없으면 창 크기를, 그것도 0 이면 설계 기준 크기를 쓴다.
const width = numberParam(params, 'w', window.innerWidth || DESIGN_WIDTH)
const height = numberParam(params, 'h', window.innerHeight || DESIGN_HEIGHT)

const container = document.getElementById('root')
if (!container) throw new Error('#root 가 없습니다')

// 캡처는 뷰포트 전체를 찍는다. 여백이 남으면 그대로 검은 띠가 되므로 body 도 맞춰둔다.
document.body.style.width = `${width}px`
document.body.style.height = `${height}px`

// rem 은 무엇을 감싸든 언제나 html 의 font-size 로 계산된다. WallpaperFrame 이
// 자기 div 에 건 font-size 로는 테마가 쓰는 rem 이 따라오지 않으므로 루트에 직접 건다.
// (컨트롤러 쪽은 controller.css 가 :root { font-size: 1px } 으로 같은 일을 한다.)
document.documentElement.style.fontSize = `${Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)}px`

createRoot(container).render(
  <WallpaperFrame
    skin={getTheme(themeId)}
    data={data}
    iconSafeRatio={iconSafeRatio}
    width={width}
    height={height}
  />,
)

/**
 * "다 그렸다" 를 main 에 알린다.
 *
 * 순서가 중요하다. 먼저 두 프레임을 흘려 레이아웃이 잡히게 해야 어떤 폰트가
 * 실제로 필요한지 브라우저가 알고 내려받기 시작한다. 그 다음에야 fonts.ready 가
 * 의미 있는 약속이 된다. 마지막 두 프레임은 폰트가 붙은 뒤의 재페인트를 기다린다.
 */
async function signalReady(): Promise<void> {
  await nextFrame()
  await nextFrame()
  await document.fonts.ready
  await nextFrame()
  await nextFrame()
  if (token) document.title = READY_PREFIX + token
}

void signalReady()
