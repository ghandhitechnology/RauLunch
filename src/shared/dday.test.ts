/**
 * 디데이 계산 점검.
 *
 *   node --experimental-strip-types src/shared/dday.test.ts
 */
import assert from 'node:assert/strict'

const mod = await import(new URL('./dday.ts', import.meta.url).href)
const { ddayLabel, isIsoDate, localToday } = mod

assert.equal(ddayLabel('2026-10-25', '2026-10-20'), 'D-5')
assert.equal(ddayLabel('2026-10-20', '2026-10-20'), 'D-DAY')
assert.equal(ddayLabel('2026-10-18', '2026-10-20'), 'D+2')

// 달을 넘고 윤년을 지나도 하루씩만 움직인다.
assert.equal(ddayLabel('2026-03-01', '2026-02-28'), 'D-1')
assert.equal(ddayLabel('2028-01-01', '2027-12-31'), 'D-1')

// 설정이 비었거나 날짜가 틀리면 아무것도 그리지 않는다.
assert.equal(ddayLabel('', '2026-10-20'), '')
assert.equal(ddayLabel('2026-02-31', '2026-10-20'), '')
assert.equal(ddayLabel('2026-10-25', ''), '')

assert.equal(isIsoDate('2026-10-20'), true)
assert.equal(isIsoDate('2026-2-3'), false)
assert.equal(isIsoDate('2026-13-01'), false)
assert.equal(isIsoDate('2026-02-30'), false)

assert.match(localToday(new Date(2026, 0, 5)), /^2026-01-05$/)

console.log('디데이 계산 테스트 통과')
