/** 아이콘은 전부 직접 그린 선 도형이다. 폰트 문자나 그림문자를 쓰지 않는다. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function ChevronLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 3.5 5.5 8 10 12.5" {...stroke} />
    </svg>
  )
}

export function ChevronRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" {...stroke} />
    </svg>
  )
}

/** 갱신. 원호 + 화살촉 — 도는 애니메이션은 CSS 가 붙인다. */
export function Refresh({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13 8a5 5 0 1 1-1.6-3.7" {...stroke} />
      <path d="M13 1.6V4.7H9.9" {...stroke} />
    </svg>
  )
}

export function Minimize({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8h9" {...stroke} />
    </svg>
  )
}

export function Close({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" {...stroke} />
    </svg>
  )
}

export function Check({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" {...stroke} strokeWidth={2.6} />
    </svg>
  )
}
