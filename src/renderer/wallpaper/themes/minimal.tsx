import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 미니멀.
 *
 * 상자도 없고 괘선도 없다. 두 칼럼을 가르는 세로선 하나가 이 테마의 전부다.
 * 대신 활자를 크게 키우고 여백을 넉넉히 남겨서 뒷자리에서도 읽히게 한다.
 *
 * 강조색은 화면 전체에 딱 한 번, 헤더의 요일 글자에만 쓴다. 두 번째로
 * 쓰는 순간 이 테마는 그냥 평범한 흰 바탕이 된다.
 */

const INK = '#151515'
const PAPER = '#FFFFFF'
const ACCENT = '#FF2D00'

const SANS: CSSProperties = {
  fontFamily: "'Pretendard', sans-serif",
}

/** 구획 이름. 크기를 낮추는 대신 자간을 넓혀 본문과 구분한다. */
const LABEL: CSSProperties = {
  ...SANS,
  fontSize: '34rem',
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: '12rem',
  color: INK,
}

function Ground({ children }: { children: ReactNode }) {
  // 질감도 패턴도 없다. 흰 종이 그 자체.
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER }}>{children}</div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ ...SANS, color: INK }}>
      <div
        style={{
          fontSize: '112rem',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-5rem',
        }}
      >
        {dateLabel} <span style={{ color: ACCENT }}>{weekdayLabel}</span>
      </div>
      <div
        style={{
          fontSize: '34rem',
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '10rem',
          marginTop: '20rem',
        }}
      >
        {grade}학년 {classNo}반{stale ? '   저장된 자료' : ''}
      </div>
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  return (
    <div
      style={{
        ...SANS,
        color: INK,
        height: '100%',
        // 화면에 존재하는 유일한 선. 칼럼 간격을 0으로 두고 양쪽에서 같은
        // 여백을 밀어야 선이 두 칼럼 한가운데에 선다.
        paddingRight: '64rem',
        borderRight: `3rem solid ${INK}`,
      }}
    >
      {empty ? (
        <div style={{ paddingTop: '40rem' }}>
          <div style={LABEL}>급식</div>
          <div
            style={{
              fontSize: '56rem',
              fontWeight: 600,
              lineHeight: 1.2,
              marginTop: '28rem',
              letterSpacing: '-2rem',
            }}
          >
            오늘은 알려줄 급식이 없습니다
          </div>
        </div>
      ) : (
        <div
          style={{
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            // 세 끼니가 세로를 고르게 나눠 갖는다. 아래에 빈 띠가 남으면
            // 덜어낸 것이 아니라 그냥 빠뜨린 것처럼 보인다.
            justifyContent: 'space-between',
          }}
        >
          {MEAL_KEYS.map((key) => {
            const items = meals[key] ?? []
            return (
              <div key={key}>
                <div style={LABEL}>{MEAL_LABELS[key]}</div>
                <div
                  style={{
                    fontSize: '50rem',
                    fontWeight: 600,
                    lineHeight: 1.28,
                    letterSpacing: '-1rem',
                    marginTop: '18rem',
                    // 한글 기본 줄바꿈은 음절 아무 데서나 끊는다 — "오렌지주스" 가
                    // "오렌 / 지주스" 로 잘렸다. 메뉴 이름은 통째로 유지한다.
                    wordBreak: 'keep-all',
                  }}
                >
                  {/* 목록을 한 문단으로 흘린다. 줄바꿈이 알아서 되므로
                      메뉴가 몇 개든 칸이 터지지 않는다. */}
                  {items.length === 0 ? '없음' : items.join('  ·  ')}
                </div>
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
        ...SANS,
        color: INK,
        height: '100%',
        minHeight: 0,
        paddingLeft: '64rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={LABEL}>{weekdayLabel}요일</div>
      {empty ? (
        <div
          style={{
            fontSize: '56rem',
            fontWeight: 600,
            lineHeight: 1.2,
            marginTop: '28rem',
            letterSpacing: '-2rem',
          }}
        >
          시간표가 아직 비어 있습니다
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: '30rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {periods.slice(0, 7).map((p) => (
            <div
              key={p.period}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '28rem',
              }}
            >
              <span
                style={{
                  fontSize: '40rem',
                  fontWeight: 500,
                  lineHeight: 1,
                  width: '56rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.period}
              </span>
              <span
                style={{
                  fontSize: '56rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-2rem',
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {p.subject}
              </span>
              <span style={{ fontSize: '36rem', fontWeight: 500, lineHeight: 1 }}>
                {p.teacher}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const minimal: ThemeSkin = {
  id: 'minimal',
  name: '미니멀',
  blurb: '흰 바탕, 큰 활자, 세로선 하나. 덜어낸 것이 곧 디자인이다.',
  chip: [PAPER, INK, ACCENT],
  fonts: ['Pretendard'],
  tokens: {
    '--bg': PAPER,
    '--fg': INK,
    '--accent': ACCENT,
  },
  // 칼럼 간격을 0으로 두고 각 패널이 직접 여백을 만든다 — 그래야 가운데 선이
  // 정확히 두 칼럼 사이에 놓인다.
  geometry: { columns: '1.25fr 1fr', columnGap: 0, padding: 72, headerGap: 64 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default minimal
