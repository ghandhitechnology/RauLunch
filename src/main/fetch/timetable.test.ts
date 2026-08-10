/**
 * 교사명 마스킹 복원 점검.
 *
 *   node --experimental-strip-types src/main/fetch/timetable.test.ts
 */
import assert from 'node:assert/strict'

const mod = await import(new URL('./timetable.ts', import.meta.url).href)
const { resolveMaskedTeacherName, resolveTimetableTeacherNames } = mod

assert.equal(resolveMaskedTeacherName('김완*', ['김완수', '이민지']), '김완수')
assert.equal(resolveMaskedTeacherName('이민지', ['이민지']), '이민지')
assert.equal(resolveMaskedTeacherName('김완*', []), '김완*')
assert.equal(resolveMaskedTeacherName('김완*', ['김완수', '김완희']), '김완*')
assert.equal(resolveMaskedTeacherName('김완*', ['김완수님']), '김완*')

const timetable = {
  date: '2026-08-10',
  weekdayLabel: '월',
  periods: [
    { period: 1, time: '08:50', subject: '수학', teacher: '김완*' },
    { period: 2, time: '09:50', subject: '영어', teacher: '이민지' },
  ],
  cached: true,
  manual: false,
}

const resolved = resolveTimetableTeacherNames(timetable, ['김완수'])
assert.equal(resolved.periods[0].teacher, '김완수')
assert.equal(resolved.periods[1].teacher, '이민지')
assert.equal(timetable.periods[0].teacher, '김완*')

console.log('교사명 마스킹 복원 테스트 통과')
