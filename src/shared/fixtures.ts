import type { WallpaperData } from './types'

/**
 * 테마를 네트워크 없이 만들고 확인하기 위한 표본 자료.
 *
 * 값은 일부러 까다롭게 잡았다 — 긴 메뉴 이름, 7교시, 마스킹된 교사명.
 * 테마가 이 자료에서 안 넘치면 실제 자료에서도 대개 안 넘친다.
 */
export const SAMPLE_DATA: WallpaperData = {
  date: '2026-06-13',
  weekdayLabel: '수',
  grade: 1,
  classNo: 3,
  dday: 'D-12',
  meal: {
    date: '2026-06-13',
    meals: {
      조식: ['백미밥', '미역국', '계란말이', '포기김치', '요구르트'],
      중식: ['김치찌개', '제육볶음', '숙주나물무침', '깍두기', '흑미밥', '사과'],
      석식: ['돈까스덮밥', '유부장국', '단무지', '양배추샐러드', '오렌지주스'],
    },
    cached: false,
  },
  timetable: {
    date: '2026-06-13',
    weekdayLabel: '수',
    periods: [
      { period: 1, time: '08:50', subject: '문학', teacher: '김완*' },
      { period: 2, time: '09:50', subject: '미적분', teacher: '박선*' },
      { period: 3, time: '10:50', subject: '영어독해', teacher: '이수*' },
      { period: 4, time: '11:50', subject: '물리학Ⅱ', teacher: '정하*' },
      { period: 5, time: '13:30', subject: '화학실험', teacher: '최민*' },
      { period: 6, time: '14:30', subject: '체육', teacher: '오재*' },
      { period: 7, time: '15:30', subject: '자율활동', teacher: '' },
    ],
    cached: false,
    manual: false,
  },
}

/** 자료를 못 받아온 최악의 경우. 모든 테마가 이 상태에서도 멀쩡해야 한다. */
export const EMPTY_DATA: WallpaperData = {
  date: '2026-06-13',
  weekdayLabel: '수',
  grade: 1,
  classNo: 3,
  meal: {
    date: '2026-06-13',
    meals: { 조식: [], 중식: [], 석식: [] },
    cached: true,
  },
  timetable: {
    date: '2026-06-13',
    weekdayLabel: '수',
    periods: [],
    cached: true,
    manual: false,
  },
}
