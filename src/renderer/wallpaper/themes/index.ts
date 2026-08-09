import type { ThemeId } from '../../../shared/types'
import type { ThemeSkin } from '../../../shared/theme'

import terminalLight from './terminal-light'
import terminalDark from './terminal-dark'
import chalk from './chalk'
import marker from './marker'
import modular from './modular'
import digital from './digital'
import stained from './stained'
import gridpaper from './gridpaper'
import riso from './riso'
import poster from './poster'
import sticker from './sticker'
import minimal from './minimal'

/** 컨트롤러 테마 띠에 나오는 순서. */
export const THEMES: ThemeSkin[] = [
  terminalLight,
  terminalDark,
  chalk,
  marker,
  modular,
  digital,
  stained,
  gridpaper,
  riso,
  poster,
  sticker,
  minimal,
]

const BY_ID = new Map<ThemeId, ThemeSkin>(THEMES.map((t) => [t.id, t]))

export function getTheme(id: ThemeId): ThemeSkin {
  return BY_ID.get(id) ?? THEMES[0]
}
