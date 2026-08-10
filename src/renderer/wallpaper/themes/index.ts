import type { ThemeId } from '../../../shared/types'
import type { ThemeSkin } from '../../../shared/theme'

import damimTeacher from './damim-teacher'
import pixelSpeech from './pixel-speech'

/** 컨트롤러 테마 띠에 나오는 순서. */
export const THEMES: ThemeSkin[] = [pixelSpeech, damimTeacher]

const BY_ID = new Map<ThemeId, ThemeSkin>(THEMES.map((t) => [t.id, t]))

export function getTheme(id: ThemeId): ThemeSkin {
  return BY_ID.get(id) ?? THEMES[0]
}
