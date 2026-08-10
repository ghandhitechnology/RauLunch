import { useEffect, useRef, type KeyboardEvent } from 'react'

import { THEME_CATALOG } from '../../shared/themeCatalog'
import type { ThemeId } from '../../shared/types'
import { Check } from './Glyphs'
import { useRoving } from './hooks'

/**
 * 테마 선택 띠.
 *
 * 칩을 누르면 바로 설정에 저장된다. 지금 적용된 테마에는 체크가 붙는다.
 * 카탈로그만 보고 피부(Ground/이미지)는 건드리지 않는다.
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
    THEME_CATALOG.findIndex((t) => t.id === cursorId),
  )
  const roving = useRoving(THEME_CATALOG.length, cursorIndex)
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
    // scrollIntoView 는 상위 스크롤 용기까지 끌어올려 창 레이아웃을 흔든다.
    // 트랙 안에서만 옮긴다.
    const top = chip.offsetTop - (track.clientHeight - chip.offsetHeight) / 2
    track.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [cursorIndex])

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(THEME_CATALOG.length - 1, cursorIndex + delta))
    onCursor(THEME_CATALOG[next].id)
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
      step(-THEME_CATALOG.length)
    } else if (e.key === 'End') {
      e.preventDefault()
      step(THEME_CATALOG.length)
    }
  }

  return (
    <section className="strip" aria-label="테마">
      <div className="strip-track" ref={scrollRef} onKeyDown={onKeyDown}>
        {THEME_CATALOG.map((theme, i) => (
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
