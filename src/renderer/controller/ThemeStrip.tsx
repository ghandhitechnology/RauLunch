import { useEffect, useRef, type KeyboardEvent } from 'react'

import type { ThemeId } from '../../shared/types'
import { THEMES } from '../wallpaper/themes'
import { Check } from './Glyphs'
import { useRoving } from './hooks'

/**
 * 테마 띠.
 *
 * 칩을 누르면 바로 설정에 저장된다. 지금 적용된 테마에는 체크가 붙는다.
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

  return (
    <section className="strip" aria-label="테마">
      <header className="strip-head">
        <span className="strip-title">테마</span>
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
