/**
 * 앱 전체가 공유하는 자료 형태.
 *
 * main(백엔드) → preload → renderer(컨트롤러/바탕화면) 로 흐르는 값은 전부 여기 정의된다.
 * IPC 를 건너다니므로 전부 구조적 복제(structured clone)가 되는 순수 JSON 이어야 한다.
 * Date 객체를 넣지 말 것 — 날짜는 항상 "YYYY-MM-DD" 문자열이다.
 */

/** NEIS 가 쓰는 식사 구분. 표시 순서도 이 순서다. */
export const MEAL_KEYS = ['조식', '중식', '석식'] as const
export type MealKey = (typeof MEAL_KEYS)[number]

/** 바탕화면에 쓰는 짧은 이름. '조식' 보다 '아침' 이 멀리서 읽힌다. */
export const MEAL_LABELS: Record<MealKey, string> = {
  조식: '아침',
  중식: '점심',
  석식: '저녁',
}

export interface MealData {
  /** "YYYY-MM-DD" */
  date: string
  /** 식사별 메뉴 이름 목록. 급식이 없는 끼니는 빈 배열. */
  meals: Record<MealKey, string[]>
  /** 네트워크 실패로 캐시를 되살렸으면 true. */
  cached: boolean
}

export interface Period {
  /** 1교시부터. */
  period: number
  /** "08:50". 모르면 빈 문자열. */
  time: string
  subject: string
  /** 컴시간에서는 "김완*"처럼 마스킹되어 올 수 있다. 모르면 빈 문자열. */
  teacher: string
}

export interface TimetableData {
  /** "YYYY-MM-DD" — 주말이면 다가오는 월요일. */
  date: string
  /** "월".."금" */
  weekdayLabel: string
  periods: Period[]
  cached: boolean
  /** 컴시간 대신 사용자가 직접 넣은 시간표를 쓰는 중이면 true. */
  manual: boolean
}

/** 바탕화면 테마 id. 파일명·설정값·CSS 클래스가 이 id 를 공유한다. */
export const THEME_IDS = ['pixel-speech', 'damim-teacher'] as const
export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'pixel-speech'

/** 바탕화면 한 장을 그리는 데 필요한 전부. */
export interface WallpaperData {
  /** "YYYY-MM-DD" */
  date: string
  /** "수" */
  weekdayLabel: string
  grade: number
  classNo: number
  meal: MealData
  timetable: TimetableData
}

export interface Settings {
  theme: ThemeId
  grade: number
  classNo: number
  /** 분 단위. 0 이면 주기 갱신 없음(날짜 변경·절전 해제는 그래도 갱신). */
  refreshIntervalMin: number
  /** 부팅 시 자동 실행. */
  autostart: boolean
  /**
   * 바탕화면 왼쪽에서 아이콘용으로 비워둘 비율(0~0.4).
   * 빔프로젝터 교실 기준 기본값 0.15.
   */
  iconSafeRatio: number
  /** 컴시간 실패 시 쓸 수동 시간표. 요일(월~금) → 과목 이름 배열. */
  manualTimetable: Record<string, string[]>
  /** 수동 시간표를 항상 우선 사용. */
  preferManualTimetable: boolean
  /** 컴시간의 마스킹된 교사명을 완성하는 데 사용할 전체 이름 목록. */
  teacherNames: string[]
}

export const VALID_GRADES = [1, 2, 3] as const
export const VALID_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const VALID_REFRESH_INTERVALS = [0, 30, 60, 180] as const

export const REFRESH_INTERVAL_LABELS: Record<number, string> = {
  0: '끔',
  30: '30분',
  60: '1시간',
  180: '3시간',
}

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  grade: 1,
  classNo: 3,
  refreshIntervalMin: 60,
  autostart: true,
  iconSafeRatio: 0.15,
  manualTimetable: {},
  preferManualTimetable: false,
  teacherNames: [],
}

/** 마지막 갱신 시도 결과. 컨트롤러 사이드바가 이걸 그대로 보여준다. */
export interface StatusSnapshot {
  /** 마지막으로 성공한 갱신의 ISO 시각. 아직 없으면 null. */
  lastSuccessAt: string | null
  /** 마지막 실패의 ISO 시각. */
  lastFailureAt: string | null
  /** 연속 실패 횟수. 0 이면 정상. */
  failCount: number
  /** 지금 갱신 중인지. */
  refreshing: boolean
  /** 사람이 읽을 마지막 오류 메시지. 정상이면 null. */
  lastError: string | null
  /** 바탕화면이 실제로 적용된 ISO 시각. */
  appliedAt: string | null
}

export interface AppState {
  settings: Settings
  data: WallpaperData | null
  status: StatusSnapshot
}

/** renderer 가 preload 를 통해 부를 수 있는 것들. */
export interface ControllerApi {
  getState(): Promise<AppState>
  onState(cb: (state: AppState) => void): () => void
  setSettings(patch: Partial<Settings>): Promise<AppState>
  /** 데이터 다시 받아오기. */
  refresh(): Promise<AppState>
  /** 현재 테마로 바탕화면 이미지를 만들어 실제로 적용. */
  applyWallpaper(): Promise<{ ok: boolean; detail: string }>
  minimizeToTray(): Promise<void>
  closeWindow(): Promise<void>
  platform: NodeJS.Platform
}
