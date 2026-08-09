import { useCallback, useRef, useState, type CSSProperties } from 'react'

import { toPanelProps, type ThemeSkin } from '../../shared/theme'
import type { WallpaperData } from '../../shared/types'

/**
 * 타일 안에 들어가는 살아있는 축소판.
 *
 * 바탕화면 이미지를 따로 굽지 않고, 실제 테마 컴포넌트를 그대로 그린 뒤
 * transform 으로 줄인다. 그래서 테마를 바꾸는 순간 타일이 같이 바뀐다.
 *
 * 패널은 항상 MINI_WIDTH 라는 고정 폭으로 자연 높이만큼 그린다. 그 자연 크기를
 * 재서 가로·세로 두 축 모두에 들어가는 배율을 고르므로, 저녁 급식이나 7교시가
 * 잘려 나가는 일이 없다. 타일은 축소판이지 잘라낸 조각이 아니다.
 *
 * 바탕(Ground)은 배율을 되돌린 크기로 깔아 타일 전체를 채운다 — 남는 여백에
 * 회색 타일 바탕이 비치지 않고 테마 바탕이 그대로 이어진다.
 */

/** 패널을 그리는 기준 폭. 바탕화면의 급식 칼럼 폭과 비슷하게 잡았다. */
const MINI_WIDTH = 760
/** 패널과 타일 가장자리 사이 여백(축소 전 기준). */
const MINI_PAD = 30

export interface PanelMiniProps {
  skin: ThemeSkin
  data: WallpaperData
  kind: 'meal' | 'timetable'
  width: number
  height: number
}

export function PanelMini({ skin, data, kind, width, height }: PanelMiniProps) {
  const [contentHeight, setContentHeight] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)

  /**
   * 패널의 자연 높이를 잰다. transform 은 레이아웃 크기를 건드리지 않으므로
   * 여기서 읽는 값은 항상 축소 전(디자인) 기준이다.
   *
   * 콜백 ref 인 이유: 테마를 바꾸면 Ground 컴포넌트 자체가 바뀌어 안쪽이 통째로
   * 새로 마운트된다. effect 로 붙여 두면 관찰 대상이 낡은(떨어져 나간) 노드에
   * 남아 높이가 0 으로 돌아가고, 그 순간 타일이 다시 잘린다.
   */
  const measure = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!el) return
    const ro = new ResizeObserver(() => setContentHeight(el.offsetHeight))
    ro.observe(el)
    observer.current = ro
    setContentHeight(el.offsetHeight)
  }, [])

  if (width <= 0 || height <= 0) return null

  const { meal, timetable } = toPanelProps(data)

  const needW = MINI_WIDTH + MINI_PAD * 2
  const needH = contentHeight + MINI_PAD * 2
  // 높이를 아직 못 쟀으면 가로만 맞춘다. 첫 프레임 뒤 곧바로 다시 계산된다.
  const scale = contentHeight > 0 ? Math.min(width / needW, height / needH) : width / needW

  const surface: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width / scale,
    height: height / scale,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    overflow: 'hidden',
    // WallpaperFrame 과 같은 규칙: 1em = 축소 전 1px.
    fontSize: 1,
    ...(skin.tokens as CSSProperties),
    background: 'var(--bg)',
    color: 'var(--fg)',
  }

  return (
    <div className="mini" style={{ width, height }}>
      <div style={surface} data-theme={skin.id}>
        <skin.Ground>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: MINI_PAD,
            }}
          >
            <div ref={measure} style={{ flex: 'none', width: MINI_WIDTH, minWidth: 0 }}>
              {kind === 'meal' ? (
                <skin.MealPanel {...meal} />
              ) : (
                <skin.TimetablePanel {...timetable} />
              )}
            </div>
          </div>
        </skin.Ground>
      </div>
    </div>
  )
}
