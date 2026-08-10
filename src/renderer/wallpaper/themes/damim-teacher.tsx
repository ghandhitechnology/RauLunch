import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'
import teacherUrl from './assets/damim-teacher.jpg'

const BLACK = '#000000'
const WHITE = '#FFFFFF'
const DIM = '#A8A8A8'

const PIXEL: CSSProperties = {
  fontFamily: "'Neodgm', monospace",
  color: WHITE,
}

/** 클로드와 같은 말풍선 레이아웃. 오른쪽 아래 캐릭터만 담임 선생님 그림으로 바꾼다. */
function Ground({ children }: { children: ReactNode }) {
  const decoration: CSSProperties = { opacity: 'var(--frame-decoration, 0)' }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BLACK }}>
      <div
        style={{
          ...decoration,
          position: 'absolute',
          left: 'calc(var(--frame-left, 30rem) - 28rem)',
          top: 'calc(var(--frame-top, 30rem) - 28rem)',
          right: 'calc(var(--frame-right, 30rem) - 28rem)',
          bottom: 'calc(var(--frame-bottom, 30rem) - 28rem)',
          border: `7rem solid ${WHITE}`,
        }}
      >
        {/* 말풍선 꼬리를 픽셀 계단 두 칸으로 만든다. */}
        <div
          style={{
            position: 'absolute',
            right: '84rem',
            bottom: '-55rem',
            width: '70rem',
            height: '55rem',
            borderRight: `7rem solid ${WHITE}`,
            borderBottom: `7rem solid ${WHITE}`,
          }}
        />
      </div>

      <img
        src={teacherUrl}
        alt=""
        aria-hidden="true"
        style={{
          ...decoration,
          position: 'absolute',
          right: '36rem',
          bottom: '12rem',
          width: '300rem',
          height: '390rem',
          objectFit: 'contain',
          objectPosition: 'bottom center',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div
      style={{
        ...PIXEL,
        display: 'flex',
        alignItems: 'center',
        gap: '22rem',
        paddingBottom: '18rem',
        borderBottom: `5rem solid ${WHITE}`,
      }}
    >
      <span style={{ fontSize: '50rem', lineHeight: 1 }}>{dateLabel}</span>
      <span style={{ fontSize: '38rem', lineHeight: 1, color: DIM }}>{weekdayLabel}요일</span>
      <span style={{ flex: 1 }} />
      {stale ? <span style={{ fontSize: '28rem', color: DIM }}>[ SAVE ]</span> : null}
      <span style={{ fontSize: '38rem', lineHeight: 1 }}>
        {grade}학년 {classNo}반
      </span>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14rem', marginBottom: '16rem' }}>
      <span style={{ width: '14rem', height: '14rem', background: WHITE }} />
      <span style={{ fontSize: '38rem', lineHeight: 1 }}>{children}</span>
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  return (
    <div style={{ ...PIXEL, height: '100%', paddingRight: '34rem' }}>
      <SectionTitle>오늘의 급식</SectionTitle>
      {empty ? (
        <div style={{ fontSize: '36rem', color: DIM }}>NO MENU DATA</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18rem' }}>
          {MEAL_KEYS.map((key) => {
            const items = meals[key] ?? []
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '80rem 1fr', gap: '14rem' }}>
                <span
                  style={{
                    alignSelf: 'start',
                    padding: '7rem 8rem',
                    border: `4rem solid ${WHITE}`,
                    fontSize: '30rem',
                    lineHeight: 1,
                    textAlign: 'center',
                  }}
                >
                  {MEAL_LABELS[key]}
                </span>
                <span style={{ fontSize: '35rem', lineHeight: 1.32, wordBreak: 'keep-all' }}>
                  {items.length ? items.join(' · ') : '---'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimetablePanel({ periods, weekdayLabel, empty }: TimetablePanelProps) {
  return (
    <div
      style={{
        ...PIXEL,
        height: '100%',
        paddingLeft: '36rem',
        borderLeft: `5rem solid ${WHITE}`,
      }}
    >
      <SectionTitle>{weekdayLabel}요일 시간표</SectionTitle>
      {empty ? (
        <div style={{ fontSize: '36rem', color: DIM }}>NO CLASS DATA</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9rem' }}>
          {periods.slice(0, 7).map((period) => (
            <div
              key={period.period}
              style={{
                display: 'grid',
                gridTemplateColumns: '46rem 1fr auto',
                alignItems: 'center',
                gap: '14rem',
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '38rem',
                  height: '38rem',
                  background: WHITE,
                  color: BLACK,
                  fontSize: '28rem',
                  lineHeight: 1,
                }}
              >
                {period.period}
              </span>
              <span style={{ fontSize: '38rem', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {period.subject}
              </span>
              <span style={{ fontSize: '27rem', lineHeight: 1, color: DIM }}>{period.teacher}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const damimTeacher: ThemeSkin = {
  id: 'damim-teacher',
  name: '담임쌤',
  blurb: '검은 화면 위 흰 말풍선 옆에서 담임 선생님이 오늘의 급식과 시간표를 말한다.',
  chip: [BLACK, WHITE, DIM],
  fonts: ['Neodgm'],
  tokens: { '--bg': BLACK, '--fg': WHITE, '--dim': DIM },
  geometry: {
    columns: '1.15fr 0.9fr',
    columnGap: 0,
    padding: 72,
    paddingTop: 90,
    paddingRight: 390,
    paddingBottom: 320,
    headerGap: 28,
  },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default damimTeacher
