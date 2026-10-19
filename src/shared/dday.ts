/**
 * 디데이 계산.
 *
 * 고른 날짜가 D-0 이고 당일은 'D-DAY' 로 쓴다. 날짜만 다루므로 UTC 자정으로 세어
 * 서머타임이나 시간대 때문에 하루가 밀리는 일이 없다.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** "YYYY-MM-DD" 가 실제 달력 날짜인지. 2026-02-31 같은 값은 거른다. */
export function isIsoDate(value: string): boolean {
  const m = ISO.exec(value)
  if (!m) return false
  const [, y, mo, d] = m
  const at = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  return (
    at.getUTCFullYear() === Number(y) &&
    at.getUTCMonth() === Number(mo) - 1 &&
    at.getUTCDate() === Number(d)
  )
}

/** 로컬 오늘 날짜. toISOString 은 UTC 라 자정 근처에서 날짜가 어긋난다. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/**
 * 기준일까지 남은 날. 당일은 'D-DAY', 이미 지났으면 'D+3'.
 * 날짜가 비었거나 잘못됐으면 빈 문자열 — 호출한 쪽이 아무것도 그리지 않는다.
 */
export function ddayLabel(target: string, today: string): string {
  if (!isIsoDate(target) || !isIsoDate(today)) return ''
  const days = dayNumber(target) - dayNumber(today)
  if (days === 0) return 'D-DAY'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
