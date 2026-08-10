import { forwardRef, type KeyboardEvent } from 'react'

import { ChevronLeft, ChevronRight } from './Glyphs'

/**
 * ‹ 값 › 스테퍼.
 *
 * 값을 바꾸는 키는 놓인 자리를 따라간다. 가로로 늘어선 자리(bar)에서는
 * 좌우가 "옆 컨트롤로 이동" 이라 값은 위아래로 바꾸고, 세로로 쌓인
 * 사이드바·설정 목록(row)에서는 반대다. 커서가 흐르는 축과 값이 바뀌는
 * 축이 겹치면 안 된다. ‹ › 는 마우스용 손잡이라 탭 정지점이 아니다.
 */

export interface StepperProps {
  label: string
  values: readonly number[]
  value: number
  format?: (v: number) => string
  onChange: (v: number) => void
  tabIndex?: number
  onFocus?: () => void
  size?: 'bar' | 'row'
}

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(function Stepper(
  { label, values, value, format, onChange, tabIndex = 0, onFocus, size = 'bar' },
  ref,
) {
  const index = Math.max(
    0,
    values.findIndex((v) => v === value),
  )
  const text = format ? format(values[index]) : String(values[index])

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(values.length - 1, index + delta))
    if (next !== index) onChange(values[next])
  }

  const [up, down] = size === 'bar' ? ['ArrowUp', 'ArrowDown'] : ['ArrowRight', 'ArrowLeft']

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === up) {
      e.preventDefault()
      e.stopPropagation()
      step(1)
    } else if (e.key === down) {
      e.preventDefault()
      e.stopPropagation()
      step(-1)
    }
  }

  return (
    <div className="stepper" data-size={size}>
      <span className="stepper-label">{label}</span>
      <div
        className="stepper-box"
        ref={ref}
        data-stop
        role="spinbutton"
        aria-label={label}
        aria-valuenow={values[index]}
        aria-valuetext={text}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      >
        <button
          className="stepper-arrow"
          tabIndex={-1}
          disabled={index === 0}
          onClick={() => step(-1)}
          aria-label={`${label} 이전`}
        >
          <ChevronLeft />
        </button>
        <span className="stepper-value">{text}</span>
        <button
          className="stepper-arrow"
          tabIndex={-1}
          disabled={index === values.length - 1}
          onClick={() => step(1)}
          aria-label={`${label} 다음`}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  )
})
