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

// ---------------------------------------------------------------- 주간 자료 해석

const { decodeWeek } = mod
const boot = { route: '1', searchQ: '1', prefix: '1', dayKey: '147', teacherKey: '446', subjectKey: '492' }

const subjects: string[] = []
subjects[17] = '고물A'
subjects[44] = '자율'
const teachers: string[] = []
teachers[15] = '김병'
teachers[24] = '차혁'

/** [교시수, 코드...]. 컴시간은 변경·이동 수업을 '>44024' 처럼 문자열로 내려준다. */
const classRow: unknown[] = [
  null,
  [3, 44024, '>17015', 0],
  [2, '>44024', '>44024'],
  [3, 44024, '>0', 44024],
  [0],
  [0],
]
const table: unknown[] = []
table[1] = [null, classRow]
const raw = { 자료492: subjects, 자료446: teachers, 자료147: table }
const week = decodeWeek(raw, boot, 1, 1)

// 월요일: 2교시가 문자열 코드 하나뿐이므로 사라지면 안 된다.
assert.deepEqual(
  week[0].map((p) => [p.period, p.subject, p.teacher]),
  [
    [1, '자율', '차혁'],
    [2, '고물A', '김병'],
  ],
)
// 화요일: 전부 문자열 코드여도 그날 시간표가 통째로 비면 안 된다.
assert.deepEqual(
  week[1].map((p) => p.subject),
  ['자율', '자율'],
)
// '>0' 은 수업이 없다는 표시이므로 빈 교시로 남는다.
assert.deepEqual(
  week[2].map((p) => p.subject),
  ['자율', '', '자율'],
)

console.log('주간 자료 해석 테스트 통과')
