/**
 * 컴시간알리미(comci.net) 비공식 API 시간표 조회.
 *
 * 서버 스크립트의 라우트·접두사·자료 키 번호가 주기적으로 바뀐다.
 * 그래서 값을 상수로 박아두지 않고 매 실행마다 /st 를 받아 정규식으로 다시 뽑는다.
 * (파이썬 원본 fetch_timetable.py 를 그대로 옮긴 것 — 산술·인덱싱을 손대면 깨진다.)
 *
 * 네트워크가 필요 없는 순수 함수(parseBootstrap/parseSchoolSearch/decodeWeek 등)를
 * 따로 내보내 저장해 둔 HTML·JSON 표본으로 시험할 수 있게 했다.
 */
import iconv from 'iconv-lite'

import type { Period, Settings, TimetableData } from '../../shared/types'

export const BASE = 'http://comci.net:4082'
/** 베타 테스트용 임시 학교. */
export const SCHOOL_NAME = '인천여자고등학교'
const TIMEOUT_MS = 10_000
const HEADERS = { 'User-Agent': 'Mozilla/5.0' }

/** 원본과 동일. 인덱스 0 이 월요일이다. */
export const WEEKDAYS = '월화수목금토일'

const RE_ROUTE = /\.\/(\d+)\?(\d+)l/
const RE_PREFIX = /sc_data\('(\d+)_'/
const RE_DAY = /일일자료=Q자료\(자료\.자료(\d+)/
const RE_TEACHER = /성명=Q성명\(자료\.자료(\d+)\[th\]/
const RE_SUBJECT = /자료\.자료(\d+)\[sb\]/
const RE_PERIOD_TIME = /\((\d{2}:\d{2})\)/

/** /st 스크립트에서 뽑아낸, 이번 실행에만 유효한 값들. */
export interface Bootstrap {
  route: string
  searchQ: string
  prefix: string
  dayKey: string
  teacherKey: string
  subjectKey: string
}

export interface TimetableResult {
  timetable: TimetableData
  /** 검색으로 알아낸 학교 코드. 다음 실행에 재사용하도록 설정에 저장할 것. */
  schoolCode: number
  /** 월~금 5일치. 특정 요일만 필요하면 timetable.periods 를 쓰면 된다. */
  week: Period[][]
}

export interface FetchTimetableOptions {
  grade: number
  classNo: number
  /** 기준 날짜. 없으면 오늘. */
  today?: Date
  /** 이미 알고 있는 학교 코드. 있으면 검색 요청을 건너뛴다. */
  schoolCode?: number | null
  schoolName?: string
}

// ---------------------------------------------------------------- 순수 함수

function must(re: RegExp, script: string, label: string): RegExpMatchArray {
  const m = script.match(re)
  if (!m) throw new Error(`컴시간 스크립트에서 ${label} 을(를) 찾지 못했다`)
  return m
}

/** /st 응답(EUC-KR 로 디코딩된 문자열)에서 현재 라우트·접두사·자료 키를 추출. */
export function parseBootstrap(script: string): Bootstrap {
  const route = must(RE_ROUTE, script, '라우트')
  return {
    route: route[1],
    searchQ: route[2],
    prefix: must(RE_PREFIX, script, '접두사')[1],
    dayKey: must(RE_DAY, script, '일일자료 키')[1],
    teacherKey: must(RE_TEACHER, script, '교사명 키')[1],
    subjectKey: must(RE_SUBJECT, script, '과목명 키')[1],
  }
}

/**
 * 학교명을 EUC-KR 바이트 단위 퍼센트 인코딩한다.
 * 서버가 UTF-8 질의를 못 알아들으므로 encodeURIComponent 로 대체할 수 없다.
 */
export function encodeSchoolQuery(name: string): string {
  const bytes = iconv.encode(name, 'euc-kr')
  let out = ''
  for (const b of bytes) out += '%' + b.toString(16).toUpperCase().padStart(2, '0')
  return out
}

/** 컴시간 응답 JSON 뒤에는 NUL 패딩이 붙어 온다. 떼어내고 파싱. */
export function parseComciJson(text: string): any {
  return JSON.parse(text.replace(/\u0000/g, '').trim())
}

/** 학교검색 응답에서 학교 코드를 고른다. 행 형식: [지역코드, 지역명, 학교명, 학교코드] */
export function parseSchoolSearch(text: string, name: string): number {
  const rows: any[][] = parseComciJson(text)['학교검색']
  if (!rows || rows.length === 0) throw new Error(`컴시간알리미에서 '${name}' 검색 결과 없음`)
  // 이름이 정확히 같은 학교를 우선 — 부분 일치 학교가 앞에 올 수 있다
  for (const row of rows) {
    if (row[2] === name) return Number(row[3])
  }
  return Number(rows[0][3])
}

/**
 * 주간 자료를 [월..금][교시] 형태로 푼다.
 *
 * 자료[학년][반][요일(1=월..5=금)] 의 0번째가 그날 교시 수, 1번 이후가 교시별 코드다.
 * 코드는 과목·교사가 한 정수에 눌려 있어 1000 으로 나눠 몫이 과목, 나머지가 교사다.
 */
export function decodeWeek(raw: any, boot: Bootstrap, grade: number, classNo: number): Period[][] {
  const subjects: unknown[] = raw[`자료${boot.subjectKey}`]
  const teachers: unknown[] = raw[`자료${boot.teacherKey}`]
  const table: any = raw[`자료${boot.dayKey}`]
  const periodTimes: unknown[] = raw['일과시간'] ?? [] // ["1(08:50)", ...]

  const times: string[] = periodTimes.map((t) => String(t).match(RE_PERIOD_TIME)?.[1] ?? '')
  const timeAt = (period: number): string => (period <= times.length ? times[period - 1] : '')

  // 학년·반 칸이 통째로 없으면 빈 시간표가 아니라 오류다.
  // 조용히 빈 배열로 넘기면 '성공'으로 처리돼 멀쩡한 캐시를 빈 값으로 덮어쓰고,
  // 교실 화면에는 아무 경고 없이 빈 시간표만 걸린다. 원본(파이썬)도 여기서 터진다.
  const classRow: unknown = table?.[grade]?.[classNo]
  if (!Array.isArray(classRow)) {
    throw new Error(`컴시간 자료에 ${grade}학년 ${classNo}반이 없다`)
  }

  const days: Period[][] = []
  for (let day = 1; day <= 5; day++) {
    const row: unknown[] = Array.isArray(classRow[day]) ? (classRow[day] as unknown[]) : []
    const count = typeof row[0] === 'number' ? (row[0] as number) : 0
    const periods: Period[] = []
    row.slice(1, count + 1).forEach((x, idx) => {
      const period = idx + 1
      if (typeof x !== 'number' || x === 0) {
        periods.push({ period, time: timeAt(period), subject: '', teacher: '' })
        return
      }
      const s = Math.floor(x / 1000)
      const th = x % 1000
      periods.push({
        period,
        time: timeAt(period),
        subject: s < subjects.length ? String(subjects[s]) : '?',
        teacher: th < teachers.length ? String(teachers[th]) : '',
      })
    })
    // 뒤쪽 빈 교시는 표시할 게 없으므로 잘라낸다
    while (periods.length > 0 && !periods[periods.length - 1].subject) periods.pop()
    days.push(periods)
  }
  return days
}

/** 월=0 .. 일=6. JS 의 getDay() 는 일요일이 0 이라 원본과 어긋난다. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** 현지 시간 기준 "YYYY-MM-DD". toISOString 은 UTC 로 밀려 날짜가 바뀔 수 있다. */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 주말에는 보여줄 시간표가 없으니 다가오는 월요일을 대상으로 삼는다. */
export function targetDate(today?: Date): Date {
  const d = today ? new Date(today.getTime()) : new Date()
  const wd = weekdayIndex(d)
  if (wd >= 5) d.setDate(d.getDate() + (7 - wd))
  return d
}

// ---------------------------------------------------------------- 네트워크

async function get(url: string, encoding: 'euc-kr' | 'utf-8'): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`컴시간 요청 실패: HTTP ${res.status}`)
  return iconv.decode(Buffer.from(await res.arrayBuffer()), encoding)
}

export async function bootstrap(): Promise<Bootstrap> {
  return parseBootstrap(await get(`${BASE}/st`, 'euc-kr'))
}

export async function searchSchool(boot: Bootstrap, name: string): Promise<number> {
  const url = `${BASE}/${boot.route}?${boot.searchQ}l${encodeSchoolQuery(name)}`
  return parseSchoolSearch(await get(url, 'utf-8'), name)
}

export async function fetchRaw(boot: Bootstrap, schoolCode: number): Promise<any> {
  const token = Buffer.from(`${boot.prefix}_${schoolCode}_0_1`, 'utf8').toString('base64')
  return parseComciJson(await get(`${BASE}/${boot.route}?${token}`, 'utf-8'))
}

/**
 * 한 번의 조회로 이번 주 시간표를 받아 대상 날짜의 교시 목록을 만든다.
 * 실패는 던진다 — 캐시·수동 시간표로 넘어갈지는 호출한 쪽이 정한다.
 */
export async function fetchTimetable(opts: FetchTimetableOptions): Promise<TimetableResult> {
  const name = opts.schoolName ?? SCHOOL_NAME
  const target = targetDate(opts.today)

  const boot = await bootstrap()
  const schoolCode = opts.schoolCode || (await searchSchool(boot, name))
  const week = decodeWeek(await fetchRaw(boot, schoolCode), boot, opts.grade, opts.classNo)

  return {
    schoolCode,
    week,
    timetable: {
      date: toISODate(target),
      weekdayLabel: WEEKDAYS[weekdayIndex(target)],
      periods: week[weekdayIndex(target)] ?? [],
      cached: false,
      manual: false,
    },
  }
}

// ---------------------------------------------------------------- 수동 시간표

/**
 * 설정에 직접 넣어둔 시간표를 TimetableData 로 바꾼다.
 * 컴시간 조회가 실패했거나 preferManualTimetable 이 켜져 있을 때 쓴다.
 * 교시 시각·교사명은 사용자가 입력하지 않으므로 비워 둔다(추측해 채우지 않는다).
 */
export function buildManualTimetable(settings: Settings, date?: Date): TimetableData {
  const target = targetDate(date)
  const label = WEEKDAYS[weekdayIndex(target)]
  const subjects = settings.manualTimetable?.[label] ?? []

  const periods: Period[] = subjects.map((subject, i) => ({
    period: i + 1,
    time: '',
    subject: (subject ?? '').trim(),
    teacher: '',
  }))
  while (periods.length > 0 && !periods[periods.length - 1].subject) periods.pop()

  return {
    date: toISODate(target),
    weekdayLabel: label,
    periods,
    cached: false,
    manual: true,
  }
}
