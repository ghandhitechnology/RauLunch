/**
 * 설정 / 캐시 / 경로 관리. 파이썬 참조 구현의 config.py 를 옮긴 것이다.
 *
 * electron 의 app.getPath 를 쓰지 않는다 — 이 모듈은 electron 런타임 없이
 * 그냥 node 로 import 해서 테스트할 수 있어야 한다. 대신 setAppDir() 로
 * 저장 위치를 갈아끼울 수 있게 열어 둔다.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  THEME_IDS,
  VALID_CLASSES,
  VALID_GRADES,
  VALID_REFRESH_INTERVALS,
  type MealData,
  type MealKey,
  type Period,
  type Settings,
  type TimetableData,
} from '../shared/types'

export const APP_NAME = '급식컨트롤러'

/** 아이콘 여백 비율의 허용 범위. 0.4 를 넘으면 본문이 화면 밖으로 밀린다. */
export const ICON_SAFE_MIN = 0
export const ICON_SAFE_MAX = 0.4

/** 수동 시간표 키. 주말은 애초에 저장하지 않는다. */
const WEEKDAY_KEYS = ['월', '화', '수', '목', '금']

const MEAL_KEY_LIST: MealKey[] = ['조식', '중식', '석식']

export interface AppPaths {
  dir: string
  config: string
  cache: string
  log: string
  /** 렌더링한 바탕화면 PNG 가 떨어지는 자리. */
  wallpaper: string
}

/**
 * OS 별 앱 데이터 폴더를 계산한다. 부작용 없는 순수 함수라서 테스트에서
 * 플랫폼을 바꿔 끼워 검증할 수 있다.
 */
export function resolveAppDir(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (platform === 'win32') {
    const base = env.APPDATA || os.homedir()
    return path.join(base, APP_NAME)
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME)
  }
  // 리눅스는 배포 대상이 아니지만 CI 에서 돌 수 있으니 XDG 규칙을 따른다.
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), APP_NAME)
}

let appDir = resolveAppDir()

/** 테스트에서 임시 폴더로 갈아끼우기 위한 통로. 운영 코드는 부르지 않는다. */
export function setAppDir(dir: string): void {
  appDir = dir
}

export function getPaths(): AppPaths {
  return {
    dir: appDir,
    config: path.join(appDir, 'config.json'),
    cache: path.join(appDir, 'cache.json'),
    log: path.join(appDir, 'log.txt'),
    wallpaper: path.join(appDir, 'wallpaper.png'),
  }
}

/** 저장 직전에만 부른다. import 하는 것만으로 폴더가 생기면 테스트가 지저분해진다. */
export function ensureAppDir(): string {
  fs.mkdirSync(appDir, { recursive: true })
  return appDir
}

/* ------------------------------------------------------------------ 파일 입출력 */

/**
 * tmp 에 다 쓴 뒤 rename 한다. 바탕화면 갱신 도중 전원이 끊겨도
 * 반쯤 잘린 config.json 이 남지 않게 하는 유일한 방법이다.
 */
function writeJsonAtomic(target: string, value: unknown): void {
  ensureAppDir()
  const tmp = `${target}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}

/**
 * 깨진 JSON 을 만나면 예외 대신 null 을 주고, 원본은 옆에 치워 둔다.
 * 참조 구현이 비싸게 배운 부분 — 설정 하나 깨졌다고 자동 갱신이 통째로
 * 죽으면 교실 화면에 어제 급식이 그대로 걸려 있게 된다.
 */
function readJsonTolerant(target: string): unknown | null {
  let raw: string
  try {
    raw = fs.readFileSync(target, 'utf8')
  } catch {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed
  } catch {
    quarantine(target)
    return null
  }
}

/** 깨진 파일을 .corrupt-<시각> 으로 옮긴다. 실패해도 그냥 넘어간다. */
function quarantine(target: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  try {
    fs.renameSync(target, `${target}.corrupt-${stamp}`)
  } catch {
    /* 백업조차 실패하면 기본값으로 계속 가는 편이 낫다 */
  }
  pruneQuarantine(target)
}

/** 격리본이 무한정 쌓이지 않도록 최근 3개만 남긴다. */
function pruneQuarantine(target: string): void {
  const dir = path.dirname(target)
  const prefix = `${path.basename(target)}.corrupt-`
  try {
    const stale = fs
      .readdirSync(dir)
      .filter((name) => name.startsWith(prefix))
      .sort()
      .slice(0, -3)
    for (const name of stale) fs.rmSync(path.join(dir, name), { force: true })
  } catch {
    /* 무시 */
  }
}

/* ------------------------------------------------------------------ 설정 정규화 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickChoice(value: unknown, choices: readonly number[], fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return choices.includes(n) ? n : fallback
}

function clampRatio(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(ICON_SAFE_MAX, Math.max(ICON_SAFE_MIN, n))
}

function sanitizeManualTimetable(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {}
  const out: Record<string, string[]> = {}
  for (const day of WEEKDAY_KEYS) {
    const row = value[day]
    if (!Array.isArray(row)) continue
    const subjects = row
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
    if (subjects.length > 0) out[day] = subjects
  }
  return out
}

/**
 * 손으로 고친 설정, 옛 버전이 남긴 키, 타입이 어긋난 값을 전부 흡수한다.
 * DEFAULT_SETTINGS 에 없는 키는 그대로 버린다.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const src = isRecord(raw) ? raw : {}
  const theme = THEME_IDS.find((id) => id === src.theme)
  return {
    theme: theme ?? DEFAULT_THEME,
    grade: pickChoice(src.grade, VALID_GRADES, DEFAULT_SETTINGS.grade),
    classNo: pickChoice(src.classNo, VALID_CLASSES, DEFAULT_SETTINGS.classNo),
    refreshIntervalMin: pickChoice(
      src.refreshIntervalMin,
      VALID_REFRESH_INTERVALS,
      DEFAULT_SETTINGS.refreshIntervalMin,
    ),
    autostart:
      typeof src.autostart === 'boolean' ? src.autostart : DEFAULT_SETTINGS.autostart,
    iconSafeRatio: clampRatio(src.iconSafeRatio, DEFAULT_SETTINGS.iconSafeRatio),
    manualTimetable: sanitizeManualTimetable(src.manualTimetable),
    preferManualTimetable:
      typeof src.preferManualTimetable === 'boolean'
        ? src.preferManualTimetable
        : DEFAULT_SETTINGS.preferManualTimetable,
  }
}

export function loadSettings(): Settings {
  return sanitizeSettings(readJsonTolerant(getPaths().config))
}

/** 저장 전에도 정규화한다. 컨트롤러가 보낸 값이라고 믿지 않는다. */
export function saveSettings(settings: Settings): Settings {
  const clean = sanitizeSettings(settings)
  writeJsonAtomic(getPaths().config, clean)
  return clean
}

/** 부분 갱신. IPC 의 setSettings 가 이걸 그대로 쓴다. */
export function patchSettings(patch: Partial<Settings>): Settings {
  return saveSettings({ ...loadSettings(), ...patch })
}

/* ------------------------------------------------------------------ 캐시 */

export interface CacheEntry<T> {
  /** cacheKey() 결과. 날짜·학년·반이 바뀌면 다른 칸에 저장된다. */
  key: string
  /** 저장 시각(ISO). 얼마나 묵은 값인지 로그로 확인할 때 쓴다. */
  savedAt: string
  data: T
}

export type CacheFile = {
  meal?: CacheEntry<MealData>
  timetable?: CacheEntry<TimetableData>
}

/** 급식은 반과 무관하지만, 한 가지 키 규칙만 두는 편이 헷갈리지 않는다. */
export function cacheKey(date: string, grade: number, classNo: number): string {
  return `${date}|${grade}-${classNo}`
}

export function loadCache(): CacheFile {
  const raw = readJsonTolerant(getPaths().cache)
  return isRecord(raw) ? (raw as CacheFile) : {}
}

function saveCacheEntry<K extends keyof CacheFile>(slot: K, entry: CacheFile[K]): void {
  const cache = loadCache()
  cache[slot] = entry
  writeJsonAtomic(getPaths().cache, cache)
}

export function writeMealCache(key: string, data: MealData): void {
  saveCacheEntry('meal', { key, savedAt: new Date().toISOString(), data })
}

export function writeTimetableCache(key: string, data: TimetableData): void {
  saveCacheEntry('timetable', { key, savedAt: new Date().toISOString(), data })
}

export interface RestoreOptions {
  /**
   * 키가 달라도(= 어제 것이라도) 돌려준다.
   * 빈 화면보다는 어제 모양이라도 띄우는 편이 교실에서 덜 당황스럽다.
   */
  allowStale?: boolean
}

export function readMealCache(key: string, opts: RestoreOptions = {}): MealData | null {
  const entry = loadCache().meal
  if (!entry || !isRecord(entry.data)) return null
  if (entry.key !== key && !opts.allowStale) return null
  const meals: Record<string, unknown> = isRecord(entry.data.meals) ? entry.data.meals : {}
  const restored: MealData = {
    date: typeof entry.data.date === 'string' ? entry.data.date : '',
    meals: {
      조식: [],
      중식: [],
      석식: [],
    },
    // 캐시에서 되살린 값은 무조건 cached 다 — 화면에 "지난 자료" 표시를 띄우는 근거.
    cached: true,
  }
  for (const mk of MEAL_KEY_LIST) {
    const row = meals[mk]
    restored.meals[mk] = Array.isArray(row)
      ? row.filter((s): s is string => typeof s === 'string')
      : []
  }
  return restored
}

export function readTimetableCache(
  key: string,
  opts: RestoreOptions = {},
): TimetableData | null {
  const entry = loadCache().timetable
  if (!entry || !isRecord(entry.data)) return null
  if (entry.key !== key && !opts.allowStale) return null
  const src = entry.data
  const periods = Array.isArray(src.periods) ? src.periods : []
  return {
    date: typeof src.date === 'string' ? src.date : '',
    weekdayLabel: typeof src.weekdayLabel === 'string' ? src.weekdayLabel : '',
    periods: periods.filter(isRecord).map(
      (p): Period => ({
        period: Number.isFinite(Number(p.period)) ? Number(p.period) : 0,
        time: typeof p.time === 'string' ? p.time : '',
        subject: typeof p.subject === 'string' ? p.subject : '',
        teacher: typeof p.teacher === 'string' ? p.teacher : '',
      }),
    ),
    cached: true,
    manual: src.manual === true,
  }
}

export function clearCache(): void {
  try {
    fs.rmSync(getPaths().cache, { force: true })
  } catch {
    /* 무시 */
  }
}
