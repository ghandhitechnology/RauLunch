import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 한 줄(밴드) 안에서 화살표로 옮겨 다니는 커서.
 *
 * 밴드 안에서 tab 정지점은 항상 하나뿐이다 — 그래야 Tab 이 "다음 항목" 이 아니라
 * "다음 밴드" 로 넘어간다. 스위치 홈 화면의 이동 감각이 이것이다.
 */
export function useRoving(count: number, initial = 0) {
  const [index, setIndex] = useState(initial)
  const refs = useRef<Array<HTMLElement | null>>([])

  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i))

  const focusAt = useCallback(
    (i: number) => {
      const n = clamp(i)
      setIndex(n)
      refs.current[n]?.focus()
    },
    [count],
  )

  const move = useCallback((delta: number) => focusAt(index + delta), [focusAt, index])

  const itemProps = (i: number) => ({
    ref: (el: HTMLElement | null) => {
      refs.current[i] = el
    },
    tabIndex: i === index ? 0 : -1,
    onFocus: () => setIndex(i),
  })

  return { index, setIndex, focusAt, move, itemProps, refs }
}

/** 타일 크기를 실제로 재서 미리보기 배율을 구한다. 창은 고정이지만 값을 박아두지 않는다. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setSize({ width: Math.round(box.width), height: Math.round(box.height) })
    })
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  return [ref, size] as const
}

/** 열려 있는 동안 Esc 로 닫고, 밖으로 포커스가 새 나가지 않게 가둔다. */
export function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  // 닫기 콜백은 렌더마다 새로 만들어진다. 이걸 효과의 의존성에 넣으면
  // 매 렌더마다 포커스를 처음으로 되돌려 버려서, ref 로 우회한다.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = ref.current

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
        return
      }
      if (e.key !== 'Tab' || !root) return
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return ref
}
