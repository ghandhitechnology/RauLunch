import type { CSSProperties } from 'react'
import {
  DEFAULT_GEOMETRY,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  toPanelProps,
  type ThemeSkin,
} from '../../shared/theme'
import type { WallpaperData } from '../../shared/types'

/**
 * 12개 테마가 전부 이 뼈대 위에 올라간다.
 *
 * 하는 일은 셋뿐이다:
 *   1. 왼쪽 아이콘 여백을 비운다 (바탕화면 아이콘이 글자를 덮지 않게).
 *   2. 헤더 / 급식 칼럼 / 시간표 칼럼 세 슬롯을 배치한다.
 *   3. 1920×1080 기준으로 짠 px 값을 실제 해상도에 맞춰 통째로 스케일한다.
 *
 * 색·활자·질감은 전부 테마 몫이다. 여기에는 어떤 색도 들어가지 않는다.
 */

export interface WallpaperFrameProps {
  skin: ThemeSkin
  data: WallpaperData
  /** 왼쪽에 비워둘 비율 (0~0.4). */
  iconSafeRatio: number
  /** 실제 렌더 폭. 미리보기는 작은 값을 넣는다. */
  width?: number
  height?: number
}

export function WallpaperFrame({
  skin,
  data,
  iconSafeRatio,
  width = DESIGN_WIDTH,
  height = DESIGN_HEIGHT,
}: WallpaperFrameProps) {
  const geo = { ...DEFAULT_GEOMETRY, ...(skin.geometry ?? {}) }
  const { header, meal, timetable } = toPanelProps(data)

  // 1920 기준으로 짠 디자인을 실제 크기에 맞춘다. 세로가 더 빡빡한 화면(4:3
  // 프로젝터 등)에서 글자가 넘치지 않도록 두 축 중 작은 배율을 쓴다.
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)

  const rootStyle: CSSProperties = {
    width,
    height,
    overflow: 'hidden',
    position: 'relative',
    // 테마 토큰을 여기서 한 번에 주입한다. 아래 모든 패널이 var() 로 읽는다.
    ...(skin.tokens as CSSProperties),
    // 1rem = 스케일된 1px. 테마는 px 대신 rem 을 쓰면 자동으로 따라온다.
    fontSize: scale,
    background: 'var(--bg)',
    color: 'var(--fg)',
  }

  const stageStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    rowGap: geo.headerGap * scale,
    paddingTop: geo.padding * scale,
    paddingBottom: geo.padding * scale,
    paddingRight: geo.padding * scale,
    // 아이콘 여백은 항상 실제 폭 기준 — 스케일과 무관하게 화면 비율로 잡는다.
    paddingLeft: Math.round(width * iconSafeRatio),
  }

  const columnsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: geo.columns,
    columnGap: geo.columnGap * scale,
    minHeight: 0,
  }

  return (
    <div style={rootStyle} data-theme={skin.id}>
      <skin.Ground>
        <div style={stageStyle}>
          <div style={{ minHeight: 0 }}>
            <skin.Header {...header} />
          </div>
          <div style={columnsStyle}>
            <div style={{ minHeight: 0, minWidth: 0 }}>
              <skin.MealPanel {...meal} />
            </div>
            <div style={{ minHeight: 0, minWidth: 0 }}>
              <skin.TimetablePanel {...timetable} />
            </div>
          </div>
        </div>
      </skin.Ground>
    </div>
  )
}
