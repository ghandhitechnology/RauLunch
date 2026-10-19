import type { CSSProperties, ReactNode } from 'react'
import type { MealKey, Period, ThemeId, WallpaperData } from './types'

/**
 * 테마 계약.
 *
 * 뼈대(레이아웃)는 WallpaperFrame 하나가 전담한다 — 아이콘 여백, 헤더 줄,
 * 두 칼럼 배치, 화면 크기에 따른 스케일. 테마는 그 슬롯 안의 "겉"만 책임진다:
 * 색, 활자, 질감, 테두리, 칸 사이 간격.
 *
 * 빔프로젝터 + 칠판이라는 표시 환경 때문에 지켜야 하는 규칙:
 *   1. 2D 만. blur / box-shadow / gradient / bevel / filter 금지.
 *      (배경 질감용 repeating-linear-gradient 는 예외 — 평면 패턴이므로 허용)
 *   2. 색은 4단계 이하. 중간 톤은 칠판에서 사라진다.
 *   3. 선은 굵게. 3px 미만 테두리는 뒷자리에서 안 보인다.
 *   4. 어두운 바탕에서는 밝은 획과 본문 대비를 충분히 확보한다.
 *   5. 본문 글자는 렌더 기준 폭 1920 에서 34px 이상.
 */

/** 테마가 슬롯 기하를 조금 조정하고 싶을 때. 전부 선택 사항. */
export interface SlotGeometry {
  /** 급식 칼럼 : 시간표 칼럼 비율. 기본 '1.15fr 1fr'. */
  columns?: string
  /** 두 칼럼 사이 간격(px, 1920 기준). 기본 64. */
  columnGap?: number
  /** 안쪽 여백(px, 1920 기준). 기본 72. */
  padding?: number
  /** 테마 장식을 위해 방향별 여백을 따로 예약할 때 사용한다. */
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  /** 헤더와 본문 사이 간격(px, 1920 기준). 기본 48. */
  headerGap?: number
}

export interface MealPanelProps {
  meals: Record<MealKey, string[]>
  /** 급식 정보를 못 받아왔을 때. 패널은 이 경우도 반드시 무언가 그려야 한다. */
  empty: boolean
}

export interface TimetablePanelProps {
  periods: Period[]
  weekdayLabel: string
  empty: boolean
}

/** 바탕화면 오른쪽 아래 빈 자리에 놓이는 큰 글씨. */
export interface CornerProps {
  /** "D-12" · "D-DAY" · "D+3". */
  label: string
}

export interface HeaderProps {
  /** "6월 13일" */
  dateLabel: string
  /** "수" */
  weekdayLabel: string
  grade: number
  classNo: number
  /** 캐시된 자료를 보여주는 중이면 true — 테마가 원하면 표시할 수 있다. */
  stale: boolean
}

export interface ThemeSkin {
  id: ThemeId
  /** 컨트롤러에 뜨는 한글 이름. */
  name: string
  /** 한 줄 설명. 컨트롤러에서 선택 시 아래에 뜬다. */
  blurb: string

  /**
   * 컨트롤러 테마 칩용 3색. 왼→오 순서로 칩에 세로 띠로 깔린다.
   * 실제 바탕화면의 인상을 3색으로 요약할 것.
   */
  chip: [string, string, string]

  /** 이 테마가 쓰는 폰트 family 이름들. assets/fonts 에 등록된 것만. */
  fonts: string[]

  /**
   * 뼈대 위에 얹히는 CSS 변수. WallpaperFrame 이 루트에 그대로 붙인다.
   * 최소한 --bg 와 --fg 는 반드시 정의할 것.
   */
  tokens: CSSProperties & Record<`--${string}`, string | number>

  /** 슬롯 기하 조정. 없으면 기본값. */
  geometry?: SlotGeometry

  /**
   * 바탕 그 자체. 색·질감을 여기서 깔고 children 을 그대로 통과시킨다.
   * position:absolute 로 깔리는 평면 패턴은 허용, blur/shadow 는 금지.
   */
  Ground: (props: { children: ReactNode }) => ReactNode

  Header: (props: HeaderProps) => ReactNode
  MealPanel: (props: MealPanelProps) => ReactNode
  TimetablePanel: (props: TimetablePanelProps) => ReactNode
  /** 상자 오른쪽 아래 여백의 디데이. label 이 비면 프레임이 아예 그리지 않는다. */
  Corner: (props: CornerProps) => ReactNode
}

/** 테마 구현 파일이 default export 하는 것. */
export type ThemeModule = ThemeSkin

export const DEFAULT_GEOMETRY: Required<SlotGeometry> = {
  columns: '1.15fr 1fr',
  columnGap: 64,
  padding: 72,
  paddingTop: 72,
  paddingRight: 72,
  paddingBottom: 72,
  headerGap: 48,
}

/** 미리보기·렌더 공통 기준 폭. 모든 px 값은 이 폭을 기준으로 스케일된다. */
export const DESIGN_WIDTH = 1920
export const DESIGN_HEIGHT = 1080

/**
 * 교사 이름 뒤에 붙는 표식. 시간표에서 T 는 담당 교사를 뜻한다.
 * 이름이 비어 있는 칸(수동 시간표)에는 붙이지 않는다.
 */
function teacherMark(name: string): string {
  return name ? `${name}T` : ''
}

/** WallpaperData → 각 패널이 받는 props 로 쪼개는 헬퍼. */
export function toPanelProps(data: WallpaperData): {
  header: HeaderProps
  meal: MealPanelProps
  timetable: TimetablePanelProps
  corner: CornerProps
} {
  const [, month, day] = data.date.split('-')
  const meals = data.meal.meals
  const mealEmpty = (['조식', '중식', '석식'] as MealKey[]).every(
    (k) => !meals[k] || meals[k].length === 0,
  )
  return {
    header: {
      dateLabel: `${Number(month)}월 ${Number(day)}일`,
      weekdayLabel: data.weekdayLabel,
      grade: data.grade,
      classNo: data.classNo,
      stale: data.meal.cached || data.timetable.cached,
    },
    meal: { meals, empty: mealEmpty },
    timetable: {
      periods: data.timetable.periods.map((period) => ({
        ...period,
        teacher: teacherMark(period.teacher),
      })),
      weekdayLabel: data.timetable.weekdayLabel,
      empty: data.timetable.periods.length === 0,
    },
    corner: { label: data.dday ?? '' },
  }
}
