import type { ThemeId } from './types'
import { THEME_IDS } from './types'

/**
 * 컨트롤러 테마 칩에 필요한 메타만.
 *
 * 바탕화면 Ground/이미지까지 컨트롤러 번들에 끌어오면 안 된다 —
 * 캡처 페이지와 컨트롤러가 같은 피부 모듈을 공유하면 테마를 늘릴 때마다
 * 컨트롤러 로드·CSP·번들 크기가 같이 깨진다. 이름·칩 색은 여기가 정본이고
 * 각 테마 피부 파일은 같은 id 로 이 값을 읽어 쓴다.
 */

export interface ThemeMeta {
  id: ThemeId
  name: string
  blurb: string
  chip: [string, string, string]
}

export const THEME_CATALOG: readonly ThemeMeta[] = [
  {
    id: 'pixel-speech',
    name: '클로드',
    blurb: '검은 화면 위 흰 픽셀 캐릭터가 오늘의 급식과 시간표를 말한다.',
    chip: ['#000000', '#FFFFFF', '#A8A8A8'],
  },
  {
    id: 'damim-teacher',
    name: '담임쌤',
    blurb: '검은 화면 위 흰 말풍선 옆에서 담임 선생님이 오늘의 급식과 시간표를 말한다.',
    chip: ['#000000', '#E8DCC4', '#FFFFFF'],
  },
] as const

const BY_ID = new Map<ThemeId, ThemeMeta>(THEME_CATALOG.map((t) => [t.id, t]))

/** 컴파일 타임에 THEME_IDS 와 카탈로그가 어긋나면 바로 드러낸다. */
if (THEME_CATALOG.length !== THEME_IDS.length || THEME_IDS.some((id) => !BY_ID.has(id))) {
  throw new Error('THEME_CATALOG 와 THEME_IDS 가 일치하지 않습니다')
}

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return BY_ID.get(id) ?? THEME_CATALOG[0]
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}
