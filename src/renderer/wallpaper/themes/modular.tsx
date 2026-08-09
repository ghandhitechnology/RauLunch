import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 모듈러 — 스위스 국제주의 양식.
 *
 * 장식을 전부 걷어내고 "구조"만 남긴다. 흰 바탕, 검정 활자, 빨강 하나.
 * 모든 요소가 왼쪽 한 줄에 맞춰 서고, 위계는 크기와 괘선 굵기로만 만든다.
 *
 * 빨강은 아껴 쓴다 — 반 표시, 구획 이름, 시간표 머리. 그 이상 늘리면
 * 프로젝터에서 검정과 싸우면서 화면이 시끄러워진다.
 */

const INK = '#000000'
const PAPER = '#FFFFFF'
const RED = '#E4022B'
// 모듈 격자를 눈에 보이게 하는 옅은 회색. 배경 전용이며 글자에는 쓰지 않는다.
const GRID = '#D8D8D8'

const SANS: CSSProperties = {
  fontFamily: "'Pretendard', sans-serif",
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER }}>
      {/* 12칼럼 모듈 격자. 평면 반복 패턴이라 깊이감을 만들지 않는다. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to right, ${GRID} 0 3rem, transparent 3rem 160rem)`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/**
 * 구획 이름. 한글에는 스몰캡스가 없으므로 작은 크기 + 넓은 자간 + 빨강으로
 * 같은 인상을 만든다.
 */
function Label({ text }: { text: string }) {
  return (
    <div
      style={{
        ...SANS,
        fontSize: '34rem',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '10rem',
        color: RED,
      }}
    >
      {text}
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ ...SANS, color: INK }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '28rem',
          paddingBottom: '16rem',
        }}
      >
        <span
          style={{
            fontSize: '104rem',
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: '-4rem',
          }}
        >
          {dateLabel}
        </span>
        <span
          style={{
            fontSize: '104rem',
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: '-4rem',
            color: RED,
          }}
        >
          {weekdayLabel}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: '44rem',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '4rem',
            paddingBottom: '8rem',
          }}
        >
          {grade}학년 {classNo}반{stale ? ' · 저장본' : ''}
        </span>
      </div>
      {/* 위계의 최상단 괘선. 아래로 갈수록 얇아진다. */}
      <div style={{ height: '12rem', background: INK }} />
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div style={{ ...SANS, color: INK, height: '100%' }}>
        <Label text="급 식" />
        <div style={{ height: '6rem', background: INK, margin: '16rem 0 28rem' }} />
        <div style={{ fontSize: '48rem', fontWeight: 700, lineHeight: 1.2 }}>
          자료 없음
        </div>
        <div style={{ fontSize: '34rem', fontWeight: 500, marginTop: '12rem' }}>
          급식 정보를 받아오지 못했습니다
        </div>
      </div>
    )
  }
  return (
    <div style={{ ...SANS, color: INK, display: 'flex', flexDirection: 'column', gap: '26rem' }}>
      {MEAL_KEYS.map((key) => {
        const items = meals[key] ?? []
        return (
          <div key={key}>
            <Label text={MEAL_LABELS[key]} />
            <div style={{ height: '6rem', background: INK, margin: '14rem 0 16rem' }} />
            {items.length === 0 ? (
              <div style={{ fontSize: '36rem', fontWeight: 500, lineHeight: 1.2 }}>없음</div>
            ) : (
              // 차림표는 적힌 차례대로 읽혀야 한다. 두 칼럼 격자에 흘리면 눈이
              // 한 칼럼을 세로로 훑어 순서가 뒤집히므로, 한 줄로 흘리고 넘칠 때만
              // 다음 줄로 내린다. 사이의 빨간 사각형이 끊는 자리다.
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: '18rem',
                  rowGap: '6rem',
                }}
              >
                {items.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18rem',
                      fontSize: '38rem',
                      fontWeight: 600,
                      lineHeight: 1.25,
                      letterSpacing: '-1rem',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {name}
                    {i < items.length - 1 ? (
                      <span style={{ width: '10rem', height: '10rem', background: RED }} />
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TimetablePanel({ periods, weekdayLabel, empty }: TimetablePanelProps) {
  return (
    <div style={{ ...SANS, color: INK, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '20rem' }}>
        <Label text="시 간 표" />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '40rem', fontWeight: 700, lineHeight: 1 }}>{weekdayLabel}</span>
      </div>
      <div style={{ height: '6rem', background: INK, margin: '14rem 0 0' }} />
      {empty ? (
        <div style={{ marginTop: '28rem' }}>
          <div style={{ fontSize: '48rem', fontWeight: 700, lineHeight: 1.2 }}>자료 없음</div>
          <div style={{ fontSize: '34rem', fontWeight: 500, marginTop: '12rem' }}>
            시간표를 받아오지 못했습니다
          </div>
        </div>
      ) : (
        <div>
          {periods.slice(0, 7).map((p) => (
            <div
              key={p.period}
              style={{
                display: 'grid',
                // 교시 숫자는 고정 폭 칼럼으로 세워 표처럼 읽히게 한다.
                gridTemplateColumns: '104rem 1fr auto',
                alignItems: 'baseline',
                columnGap: '20rem',
                padding: '16rem 0',
                borderBottom: `3rem solid ${INK}`,
              }}
            >
              <span
                style={{
                  fontSize: '46rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  color: RED,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(p.period).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '46rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-1rem',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {p.subject}
              </span>
              <span style={{ fontSize: '34rem', fontWeight: 500, lineHeight: 1 }}>
                {p.teacher}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const modular: ThemeSkin = {
  id: 'modular',
  name: '모듈러',
  blurb: '흰 바탕에 검정 활자와 빨강 하나. 격자와 괘선만으로 짜인 스위스 양식.',
  chip: [PAPER, INK, RED],
  fonts: ['Pretendard'],
  tokens: {
    '--bg': PAPER,
    '--fg': INK,
    '--accent': RED,
    '--grid': GRID,
  },
  geometry: { columns: '1.15fr 1fr', columnGap: 72, padding: 64, headerGap: 44 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default modular
