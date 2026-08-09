import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 터미널 · 흰바탕.
 *
 * 이 세트에서 가장 대비가 센 테마다. 조명이 밝은 교실이나 오래된 프로젝터처럼
 * 색이 다 날아가는 환경에서 마지막까지 살아남으라고 흰 바탕 + 검정 글자만 쓴다.
 * 색을 빼는 대신 굵은 검정 괘선과 반전 블록으로 구조를 만든다.
 */

const INK = '#000000'
const PAPER = '#FFFFFF'
// 문자 격자 느낌을 내는 아주 옅은 회색. 글자에는 절대 쓰지 않는다 —
// 중간 톤은 칠판에서 사라지므로 배경 질감 전용이다.
const RULE_SOFT = '#DCDCDC'

const MONO: CSSProperties = {
  fontFamily: "'Neodgm', monospace",
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER }}>
      {/* 종이에 인쇄된 문자 격자. 평면 반복 패턴이라 깊이감을 만들지 않는다. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to right, ${RULE_SOFT} 0 3rem, transparent 3rem 48rem)`,
          opacity: 0.55,
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/** 검정으로 꽉 채운 반전 라벨. 이 테마의 유일한 강조 수단이다. */
function Invert({ children, size }: { children: ReactNode; size: number }) {
  return (
    <span
      style={{
        ...MONO,
        display: 'inline-block',
        background: INK,
        color: PAPER,
        fontSize: `${size}rem`,
        lineHeight: 1,
        padding: `${Math.round(size * 0.22)}rem ${Math.round(size * 0.4)}rem`,
      }}
    >
      {children}
    </span>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ ...MONO, color: INK, borderBottom: `8rem solid ${INK}`, paddingBottom: '18rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16rem' }}>
        <span style={{ fontSize: '68rem', lineHeight: 1 }}>&gt;</span>
        <span style={{ fontSize: '68rem', lineHeight: 1 }}>
          {dateLabel} ({weekdayLabel})
        </span>
        <span style={{ flex: 1 }} />
        <Invert size={54}>
          {grade}-{classNo}
        </Invert>
      </div>
      {stale ? (
        <div style={{ fontSize: '34rem', lineHeight: 1, marginTop: '16rem', letterSpacing: '2rem' }}>
          // 저장된 자료
        </div>
      ) : null}
    </div>
  )
}

function SectionTag({ text }: { text: string }) {
  return (
    <div style={{ ...MONO, fontSize: '42rem', lineHeight: 1, color: INK, letterSpacing: '2rem' }}>
      [{text}]
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div style={{ ...MONO, color: INK, border: `6rem solid ${INK}`, padding: '40rem' }}>
        <SectionTag text="급식" />
        <div style={{ fontSize: '40rem', marginTop: '24rem', lineHeight: 1.5 }}>
          $ fetch meal
          <br />
          &gt; 자료 없음
        </div>
      </div>
    )
  }
  return (
    <div style={{ ...MONO, color: INK, display: 'flex', flexDirection: 'column', gap: '22rem' }}>
      {MEAL_KEYS.map((key) => {
        const items = meals[key] ?? []
        return (
          <div key={key} style={{ borderTop: `5rem solid ${INK}`, paddingTop: '14rem' }}>
            <SectionTag text={MEAL_LABELS[key]} />
            {items.length === 0 ? (
              <div style={{ fontSize: '36rem', marginTop: '14rem' }}>&gt; 없음</div>
            ) : (
              // ls 출력처럼 두 칸으로 흘린다. 목록이 길어져도 세로로 안 넘친다.
              <div
                style={{
                  marginTop: '12rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  columnGap: '28rem',
                  rowGap: '4rem',
                }}
              >
                {items.map((name, i) => (
                  <div
                    key={`${name}-${i}`}
                    style={{
                      fontSize: '36rem',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'clip',
                    }}
                  >
                    - {name}
                  </div>
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
    <div style={{ ...MONO, color: INK, height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16rem',
          borderBottom: `8rem solid ${INK}`,
          paddingBottom: '14rem',
        }}
      >
        <SectionTag text="시간표" />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '40rem', lineHeight: 1 }}>{weekdayLabel}요일</span>
      </div>
      {empty ? (
        <div style={{ fontSize: '40rem', marginTop: '28rem', lineHeight: 1.5 }}>
          $ fetch timetable
          <br />
          &gt; 자료 없음
        </div>
      ) : (
        <div style={{ marginTop: '10rem' }}>
          {periods.slice(0, 7).map((p) => (
            <div
              key={p.period}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20rem',
                borderBottom: `3rem solid ${INK}`,
                padding: '11rem 0',
              }}
            >
              <Invert size={38}>{String(p.period).padStart(2, '0')}</Invert>
              <span
                style={{
                  fontSize: '42rem',
                  lineHeight: 1.1,
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {p.subject}
              </span>
              {p.teacher ? (
                <span style={{ fontSize: '32rem', lineHeight: 1.1 }}>{p.teacher}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const terminalLight: ThemeSkin = {
  id: 'terminal-light',
  name: '터미널 · 흰바탕',
  blurb: '흰 종이에 찍은 흑백 터미널. 조명이 나쁜 교실에서 가장 안전하다.',
  chip: [PAPER, INK, INK],
  fonts: ['Neodgm'],
  tokens: {
    '--bg': PAPER,
    '--fg': INK,
    '--rule': INK,
    '--rule-soft': RULE_SOFT,
  },
  geometry: { columns: '1.2fr 1fr', columnGap: 60, padding: 68, headerGap: 40 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default terminalLight
