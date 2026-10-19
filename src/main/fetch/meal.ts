/**
 * NEIS 급식식단정보 API 에서 인천과학고 급식을 가져온다 (API 키 없이 소량 호출).
 *
 * 파이썬 원본(fetch_meal.py)의 동작을 그대로 옮겼다.
 * 다만 캐시 되살리기는 여기서 하지 않는다 — 당일·주간 조회가 모두 실패하면 Error 를 던지고,
 * 캐시 fallback 은 호출자(config 캐시 API 를 쥔 쪽)가 담당한다. 시간표 쪽과 실패 처리를 한곳에 모으기 위해서다.
 *
 * 파싱 함수는 전부 순수 함수로 따로 내보낸다. 네트워크 없이 시험할 수 있어야 한다.
 */
import { MEAL_KEYS, type MealData, type MealKey } from '../../shared/types'

export const NEIS_BASE = 'https://open.neis.go.kr/hub'
export const SCHOOL_NAME = '인천과학고등학교'
const TIMEOUT_MS = 10_000

/** "(5.6.13)" 알레르기 표기. 숫자·점·공백만 든 괄호라야 메뉴 이름의 괄호를 안 건드린다. */
const ALLERGY = /\s*\([0-9. ]+\)\s*/g
/** DDISH_NM 은 줄바꿈 대신 <br/> 로 메뉴를 나눈다. */
const TAG = /<[^>]+>/g

/** 시도교육청코드 + 행정표준코드. 최초 1회 조회하면 바뀌지 않아 config 에 캐시한다. */
export interface SchoolCode {
  atpt: string
  code: string
}

/**
 * 학교코드 캐시 저장소. config 모듈을 직접 물지 않고 주입받는다 —
 * 이 파일이 디스크를 모르게 해야 시험할 수 있다.
 */
export interface SchoolCodeStore {
  read(): SchoolCode | null
  write(value: SchoolCode): void
}

/** 날짜별 급식. { "20260613": { 중식: [...] } } */
export type MealsByDate = Record<string, Partial<Record<MealKey, string[]>>>

// ---------------------------------------------------------------- 순수 함수

/**
 * '찹쌀밥 <br/>소불고기 (5.6)' → ['찹쌀밥', '소불고기']
 * 태그를 줄바꿈으로 바꾼 뒤 줄마다 알레르기 표기를 지우고, 남은 점·공백을 턴다.
 */
export function cleanDish(raw: string): string[] {
  const items: string[] = []
  for (const part of raw.replace(TAG, '\n').split('\n')) {
    const name = stripDots(part.replace(ALLERGY, '').trim()).trim()
    if (name) items.push(name)
  }
  return items
}

/** 파이썬 str.strip(".") — 앞뒤의 점을 전부 턴다. */
function stripDots(value: string): string {
  let start = 0
  let end = value.length
  while (start < end && value[start] === '.') start += 1
  while (end > start && value[end - 1] === '.') end -= 1
  return value.slice(start, end)
}

/**
 * MMEAL_SC_NM → MealData 의 키.
 * 실제 응답에 '중식(A)' 처럼 꼬리가 붙어 오는 학교가 있어 정확히 같은지 대신 포함 여부로 본다.
 */
export function toMealKey(raw: unknown): MealKey | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, '')
  return MEAL_KEYS.find((key) => name.includes(key)) ?? null
}

/** 세 끼니가 모두 빈 배열인 MealData 의 meals. */
export function emptyMeals(): Record<MealKey, string[]> {
  return { 조식: [], 중식: [], 석식: [] }
}

/** schoolInfo 응답에서 이름이 정확히 일치하는 학교의 코드를 뽑는다. */
export function parseSchoolInfo(json: unknown, schoolName = SCHOOL_NAME): SchoolCode {
  const rows = extractRows(json, 'schoolInfo')
  const row = rows.find((item) => item.SCHUL_NM === schoolName)
  if (!row) throw new Error(`급식: schoolInfo 에 '${schoolName}' 이(가) 없다`)
  const atpt = row.ATPT_OFCDC_SC_CODE
  const code = row.SD_SCHUL_CODE
  if (typeof atpt !== 'string' || typeof code !== 'string') {
    throw new Error('급식: schoolInfo 응답에 학교코드가 없다')
  }
  return { atpt, code }
}

/**
 * mealServiceDietInfo 응답 → 날짜별 급식.
 * mealServiceDietInfo 키 자체가 없으면 INFO-200(해당 날짜 자료 없음)이므로 빈 객체다 — 오류가 아니다.
 */
export function parseMealRows(json: unknown): MealsByDate {
  if (!isRecord(json) || !('mealServiceDietInfo' in json)) return {}
  const meals: MealsByDate = {}
  for (const row of extractRows(json, 'mealServiceDietInfo')) {
    const ymd = row.MLSV_YMD
    const key = toMealKey(row.MMEAL_SC_NM)
    if (typeof ymd !== 'string' || !key) continue
    const dish = typeof row.DDISH_NM === 'string' ? row.DDISH_NM : ''
    meals[ymd] ??= {}
    meals[ymd][key] = cleanDish(dish)
  }
  return meals
}

/** "2026-06-13" → "20260613". NEIS 는 구분자 없는 날짜만 받는다. */
export function toYmd(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

/** 로컬 오늘 날짜를 "YYYY-MM-DD" 로. toISOString 은 UTC 라 못 쓴다. */
export function todayIsoDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** NEIS 응답은 [{head:...}, {row:[...]}] 꼴이다. row 배열만 꺼낸다. */
function extractRows(json: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(json)) throw new Error(`급식: ${key} 응답이 JSON 객체가 아니다`)
  const block = json[key]
  if (!Array.isArray(block) || block.length < 2) {
    throw new Error(`급식: ${key} 응답에 자료 블록이 없다 (${describeNeisResult(json)})`)
  }
  const rows = isRecord(block[1]) ? block[1].row : undefined
  if (!Array.isArray(rows)) throw new Error(`급식: ${key} 응답에 row 가 없다`)
  return rows.filter(isRecord)
}

/** RESULT.CODE/MESSAGE 를 오류 메시지에 실어 나른다. 로그만 보고 원인을 알 수 있어야 한다. */
function describeNeisResult(json: Record<string, unknown>): string {
  const result = json.RESULT
  if (!isRecord(result)) return '알 수 없는 응답'
  return `${result.CODE ?? '?'} ${result.MESSAGE ?? ''}`.trim()
}

/** head[0].list_total_count. 응답에 없으면 null. */
function listTotal(json: unknown, key: string): number | null {
  if (!isRecord(json)) return null
  const block = json[key]
  if (!Array.isArray(block) || !isRecord(block[0])) return null
  const head = block[0].head
  if (!Array.isArray(head) || !isRecord(head[0])) return null
  const total = head[0].list_total_count
  return typeof total === 'number' && Number.isFinite(total) ? total : null
}

/**
 * 응답이 잘렸는지 본다.
 *
 * NEIS 는 인증키 없이 호출하면 한 번에 5행까지만 주고 pIndex·pSize 를 무시한다.
 * 잘린 응답은 '그날 급식이 없다' 와 구별되지 않으므로, 총 건수보다 적게 오면 버린다.
 * 버리지 않으면 반쪽 급식이 성공으로 처리돼 캐시에까지 남는다.
 */
export function assertComplete(json: unknown, key: string): void {
  if (!isRecord(json) || !(key in json)) return // INFO-200: 조회 결과 없음
  const total = listTotal(json, key)
  if (total === null) return
  const received = extractRows(json, key).length
  if (received < total) throw new Error(`${key} 응답이 잘렸다 (${received}/${total}행)`)
}

// ---------------------------------------------------------------- 네트워크

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${NEIS_BASE}/${path}`)
  url.searchParams.set('Type', 'json')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

/** 캐시가 있으면 그걸 쓰고, 없을 때만 조회한 뒤 저장한다. */
export async function getSchoolCode(
  store: SchoolCodeStore,
  fetchImpl: typeof fetch = fetch,
): Promise<SchoolCode> {
  const cached = store.read()
  if (cached?.atpt && cached?.code) return cached
  const json = await getJson(buildUrl('schoolInfo', { SCHUL_NM: SCHOOL_NAME }), fetchImpl)
  const found = parseSchoolInfo(json)
  store.write(found)
  return found
}

async function queryMeals(
  school: SchoolCode,
  dateParams: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<MealsByDate> {
  const json = await getJson(
    buildUrl('mealServiceDietInfo', {
      ATPT_OFCDC_SC_CODE: school.atpt,
      SD_SCHUL_CODE: school.code,
      ...dateParams,
    }),
    fetchImpl,
  )
  assertComplete(json, 'mealServiceDietInfo')
  return parseMealRows(json)
}

export interface FetchMealOptions {
  /** 학교코드 캐시. config 모듈이 넘겨준다. */
  store: SchoolCodeStore
  /** "YYYY-MM-DD". 없으면 오늘. */
  date?: string
  /** 시험용 주입 지점. */
  fetchImpl?: typeof fetch
  /** 중간 실패를 남길 곳. config.log 를 넘기면 된다. */
  log?: (message: string) => void
}

/**
 * 당일 조회 → 범위 조회 순으로 시도한다. 둘 다 실패하면 던진다.
 *
 * 조회는 됐는데 그날 급식이 없는 경우(방학·주말)는 실패가 아니다 —
 * 빈 MealData 를 그대로 돌려줘 다음 단계로 넘어가지 않는다. 원본과 같은 판단이다.
 */
export async function fetchMeal(options: FetchMealOptions): Promise<MealData> {
  const { store, fetchImpl = fetch, log = () => {} } = options
  const date = options.date ?? todayIsoDate()
  const ymd = toYmd(date)

  let school: SchoolCode
  try {
    school = await getSchoolCode(store, fetchImpl)
  } catch (error) {
    throw new Error(`급식: 학교코드 조회 실패 (${describeError(error)})`)
  }

  // 1차: 당일 조회. 응답이 작아 가장 빠르다.
  try {
    const meals = await queryMeals(school, { MLSV_YMD: ymd }, fetchImpl)
    if (meals[ymd]) return toMealData(date, meals[ymd])
    log('급식: 당일 조회가 비어 있어 범위 조회 시도')
  } catch (error) {
    log(`급식: 당일 조회 실패 (${describeError(error)}), 범위 조회 시도`)
  }

  // 2차: 같은 날을 범위 파라미터로 다시 묻는다. 당일 조회만 간헐적으로 비는 일이 있어
  // 경로를 바꿔 한 번 더 확인한다. 범위를 하루로 묶는 이유는 NEIS 가 인증키 없이 5행에서
  // 응답을 자르기 때문이다 — 넓게 긁으면 오늘 점심·저녁이 잘려 나간 채로 성공이 된다.
  try {
    const meals = await queryMeals(school, { MLSV_FROM_YMD: ymd, MLSV_TO_YMD: ymd }, fetchImpl)
    return toMealData(date, meals[ymd])
  } catch (error) {
    const detail = describeError(error)
    log(`급식: 범위 조회도 실패 (${detail}), 캐시 사용`)
    throw new Error(`급식: 당일·범위 조회 모두 실패 (${detail})`)
  }
}

/** 날짜별 조회 결과 한 칸을 MealData 로. 없는 끼니는 빈 배열로 채운다. */
export function toMealData(date: string, found: Partial<Record<MealKey, string[]>> = {}): MealData {
  const meals = emptyMeals()
  for (const key of MEAL_KEYS) meals[key] = found[key] ?? []
  return { date, meals, cached: false }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    // AbortSignal.timeout 은 TimeoutError 를 던지는데 message 가 비어 있는 런타임이 있다.
    return error.message || error.name
  }
  return String(error)
}
