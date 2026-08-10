import { useEffect, useRef, type KeyboardEvent } from 'react'

import type { ThemeSkin } from '../../shared/theme'
import type { ThemeId } from '../../shared/types'
import { THEMES } from '../wallpaper/themes'
import { Check } from './Glyphs'
import { useRoving } from './hooks'

/**
 * 테마 선택 띠. 현재는 픽셀 말풍선 한 종만 제공한다.
 *
 * 커서를 옮기면 위 타일이 바로 그 테마로 갈아입고(미리보기), Enter 를 눌러야
 * 실제 설정에 박힌다. 지금 적용된 테마에는 체크 표시가 붙는다.
 */

export interface ThemeStripProps {
  cursorId: ThemeId
  appliedId: ThemeId
  onCursor: (id: ThemeId) => void
  onApply: (id: ThemeId) => void
}

export function ThemeStrip({ cursorId, appliedId, onCursor, onApply }: ThemeStripProps) {
  const cursorIndex = Math.max(
    0,
    THEMES.findIndex((t) => t.id === cursorId),
  )
  const roving = useRoving(THEMES.length, cursorIndex)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 커서가 움직이면 그 칩이 항상 보이게 따라 스크롤하고, 탭 정지점도 같이 옮긴다.
  // (마우스로 훑어서 커서만 움직인 경우에도 Tab 이 엉뚱한 칩으로 들어가지 않게.)
  const { setIndex } = roving
  useEffect(() => {
    setIndex(cursorIndex)
  }, [cursorIndex, setIndex])

  useEffect(() => {
    const track = scrollRef.current
    const chip = track?.children[cursorIndex] as HTMLElement | undefined
    if (!track || !chip) return
    const left = chip.offsetLeft - (track.clientWidth - chip.offsetWidth) / 2
    track.scrollTo({ left, behavior: 'smooth' })
  }, [cursorIndex])

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(THEMES.length - 1, cursorIndex + delta))
    onCursor(THEMES[next].id)
    roving.focusAt(next)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      step(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      step(-THEMES.length)
    } else if (e.key === 'End') {
      e.preventDefault()
      step(THEMES.length)
    }
  }

  const cursorSkin: ThemeSkin | undefined = THEMES[cursorIndex]

  return (
    <section className="strip" aria-label="테마">
      <header className="strip-head">
        <span className="strip-title">테마</span>
        <span className="strip-blurb">{cursorSkin?.blurb}</span>
      </header>
      <div className="strip-track" ref={scrollRef} onKeyDown={onKeyDown}>
        {THEMES.map((theme, i) => (
          <button
            key={theme.id}
            className="chip"
            data-selected={i === cursorIndex || undefined}
            data-applied={theme.id === appliedId || undefined}
            {...roving.itemProps(i)}
            onClick={() => {
              onCursor(theme.id)
              onApply(theme.id)
            }}
            onMouseEnter={() => onCursor(theme.id)}
            aria-pressed={theme.id === appliedId}
          >
            <span className="chip-swatch">
              {theme.chip.map((color, k) => (
                <i key={k} style={{ background: color }} />
              ))}
              {theme.id === appliedId && (
                <span className="chip-check">
                  <Check />
                </span>
              )}
            </span>
            <span className="chip-name">{theme.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
