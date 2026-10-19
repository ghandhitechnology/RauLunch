import { useLayoutEffect, useRef } from 'react'

/**
 * 슬롯 높이에 맞춰 내용을 통째로 줄이는 훅.
 *
 * 급식은 날마다 메뉴 수가 달라 고정 높이에 들어간다는 보장이 없다. 넘칠 때
 * 말풍선 테두리를 뚫고 나가는 대신 들어갈 때까지 배율을 낮춘다. 배율은
 * --fit 하나로 내려보내고, 테마는 크기 자리에 fitRem() 을 쓴다.
 *
 * 바닥(floor) 아래로는 내리지 않는다. 교실 뒤에서 읽히지 않을 만큼 작게
 * 줄이느니 마지막 몇 줄을 자르는 편이 낫다. 잘림은 테두리 안쪽에서 끝나므로
 * 프레임 밖으로 새는 일은 없다.
 */

/** 배율이 적용된 크기. 테마가 쓰던 rem 값을 그대로 넣는다. */
export function fitRem(size: number): string {
  return `calc(${size}rem * var(--fit, 1))`
}

const DEFAULT_FLOOR = 0.75

export function useFitToSlot(floor = DEFAULT_FLOOR) {
  const boxRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    const content = contentRef.current
    if (!box || !content) return

    const apply = (scale: number) => content.style.setProperty('--fit', scale.toFixed(4))
    const heightOf = (el: HTMLElement) => el.getBoundingClientRect().height

    // 내용 높이는 배율에 따라 단조 증가하지 않는다(글자가 줄면 줄바꿈이 바뀐다).
    // 배율을 이분 탐색해 "들어가는 가장 큰 배율"로 수렴시킨다.
    const fit = () => {
      const available = heightOf(box)
      if (available <= 0) return

      apply(1)
      if (heightOf(content) <= available) return

      apply(floor)
      if (heightOf(content) > available) return

      let fitting = floor
      let overflowing = 1
      while (overflowing - fitting > 0.002) {
        const mid = (fitting + overflowing) / 2
        apply(mid)
        if (heightOf(content) <= available) fitting = mid
        else overflowing = mid
      }
      apply(fitting)
    }

    fit()
    // 폰트가 늦게 붙거나 창 크기가 바뀌면 높이가 달라진다.
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    document.fonts.addEventListener('loadingdone', fit)
    return () => {
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', fit)
    }
  }, [floor])

  return { boxRef, contentRef }
}
