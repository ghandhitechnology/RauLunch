import type { KeyboardEvent } from 'react'

import type { ThemeSkin } from '../../shared/theme'
import type { WallpaperData } from '../../shared/types'
import { useElementSize, useRoving } from './hooks'
import { PanelMini } from './PanelMini'

/** 두 장의 큰 타일. 각각 지금 고른 테마의 급식/시간표 패널을 그대로 축소해 보여준다. */

export interface TileRowProps {
  skin: ThemeSkin
  data: WallpaperData
  onOpenPreview: (kind: 'meal' | 'timetable') => void
}

export function TileRow({ skin, data, onOpenPreview }: TileRowProps) {
  const roving = useRoving(2)
  const [mealRef, mealSize] = useElementSize<HTMLDivElement>()
  const [timeRef, timeSize] = useElementSize<HTMLDivElement>()

  const [, month, day] = data.date.split('-')
  // 왼쪽 타일은 아침·점심·저녁을 전부 보여준다. 그래서 '점심' 이 아니라 '급식' 이다.
  // 오른쪽 타일에는 교시 수를 적지 않는다 — 타일 안에 교시가 그대로 다 보인다.
  const tiles = [
    {
      kind: 'meal' as const,
      title: '급식',
      meta: `${Number(month)}월 ${Number(day)}일`,
      ref: mealRef,
      size: mealSize,
    },
    {
      kind: 'timetable' as const,
      title: '시간표',
      meta: '',
      ref: timeRef,
      size: timeSize,
    },
  ]

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      roving.move(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      roving.move(-1)
    }
  }

  return (
    <div className="tiles" onKeyDown={onKeyDown}>
      {tiles.map((tile, i) => (
        <div className="tile-slot" key={tile.kind}>
          <button
            className="tile"
            {...roving.itemProps(i)}
            onClick={() => onOpenPreview(tile.kind)}
            aria-label={`${tile.title} 미리보기`}
          >
            <div className="tile-art" ref={tile.ref}>
              <PanelMini
                skin={skin}
                data={data}
                kind={tile.kind}
                width={tile.size.width}
                height={tile.size.height}
              />
            </div>
          </button>
          <div className="tile-label">
            <span className="tile-title">{tile.title}</span>
            {tile.meta && <span className="tile-meta">{tile.meta}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
