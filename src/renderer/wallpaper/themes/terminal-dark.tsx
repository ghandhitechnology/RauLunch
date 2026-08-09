import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 터미널 · 검은바탕.
 *
 * 어두운 바탕이 허용되는 이유는 하나다 — 여기서 검정은 "칠해진 색"이 아니라
 * 빔이 아무것도 쏘지 않아 칠판이 그대로 비치는 부분이다. 즉 실제로 빛나는 건
 * 인광 초록 글자뿐이고, 프로젝터 입장에서는 가장 밝은 획만 남는다.
 * 스캔라인은 깊이감을 주므로 쓰지 않고, 아주 어두운 초록 격자만 평면으로 깐다.
 *
 * 흰바탕 형제와는 구조로 갈라놓았다: 저쪽이 괘선과 반전 블록이라면
 * 이쪽은 전부 테두리 박스다. 급식 한 항목이 곧 하나의 셀이다.
 */

const VOID = '#000000'
const PHOSPHOR = '#39FF14'
// 격자 전용. 글자로 쓰면 뒷자리에서 안 보인다.
const GRID = '#0C3A05'

const MONO: CSSProperties = {
  fontFamily: "'Neodgm', monospace",
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: VOID }}>
      {/* 문자 셀 격자. 가로·세로 반복 패턴이라 평면이다. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            `repeating-linear-gradient(to right, ${GRID} 0 3rem, transparent 3rem 40rem)`,
            `repeating-linear-gradient(to bottom, ${GRID} 0 3rem, transparent 3rem 40rem)`,
          ].join(','),
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ ...MONO, color: PHOSPHOR }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18rem' }}>
        <span style={{ fontSize: '64rem', lineHeight: 1 }}>
          {grade}학년 {classNo}반
        </span>
        <span style={{ fontSize: '64rem', lineHeight: 1 }}>
          {dateLabel} {weekdayLabel}
        </span>
        {/* 명령 입력을 기다리는 커서 블록. 깜빡이지 않는다 — 정지 화면이므로. */}
        <span
          style={{
            display: 'inline-block',
            width: '30rem',
            height: '56rem',
            background: PHOSPHOR,
          }}
        />
        <span style={{ flex: 1 }} />
        {stale ? (
          <span
            style={{
              fontSize: '30rem',
              lineHeight: 1,
              border: `3rem solid ${PHOSPHOR}`,
              padding: '10rem 16rem',
            }}
          >
            CACHE
          </span>
        ) : null}
      </div>
      <div style={{ height: '5rem', background: PHOSPHOR, marginTop: '18rem' }} />
    </div>
  )
}

/** 초록으로 꽉 채운 제목 띠. 반전된 셀 한 줄처럼 보인다. */
function Bar({ text, note }: { text: string; note?: string }) {
  return (
    <div
      style={{
        ...MONO,
        display: 'flex',
        alignItems: 'center',
        gap: '14rem',
        background: PHOSPHOR,
        color: VOID,
        padding: '8rem 16rem',
      }}
    >
      <span style={{ fontSize: '40rem', lineHeight: 1.1 }}>{text}</span>
      <span style={{ flex: 1 }} />
      {note ? <span style={{ fontSize: '30rem', lineHeight: 1.1 }}>{note}</span> : null}
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div style={{ ...MONO, color: PHOSPHOR, border: `4rem solid ${PHOSPHOR}`, padding: '36rem' }}>
        <div style={{ fontSize: '44rem', lineHeight: 1.5 }}>
          meal --today
          <br />
          NO RESPONSE
        </div>
        <div style={{ fontSize: '36rem', marginTop: '18rem' }}>급식 자료 없음</div>
      </div>
    )
  }
  return (
    <div style={{ ...MONO, color: PHOSPHOR, display: 'flex', flexDirection: 'column', gap: '22rem' }}>
      {MEAL_KEYS.map((key) => {
        const items = meals[key] ?? []
        return (
          <div key={key}>
            <Bar text={MEAL_LABELS[key]} />
            {items.length === 0 ? (
              <div
                style={{
                  fontSize: '34rem',
                  lineHeight: 1.1,
                  border: `3rem solid ${PHOSPHOR}`,
                  borderTop: 'none',
                  padding: '16rem',
                }}
              >
                없음
              </div>
            ) : (
              // 항목 하나가 셀 하나. 길이에 따라 자연스럽게 다음 줄로 흐른다.
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10rem',
                  border: `3rem solid ${PHOSPHOR}`,
                  borderTop: 'none',
                  padding: '14rem',
                }}
              >
                {items.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    style={{
                      fontSize: '38rem',
                      lineHeight: 1.1,
                      border: `3rem solid ${PHOSPHOR}`,
                      padding: '8rem 14rem',
                    }}
                  >
                    {name}
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
    <div style={{ ...MONO, color: PHOSPHOR, height: '100%' }}>
      <Bar text="시간표" note={`${weekdayLabel}요일`} />
      {empty ? (
        <div
          style={{
            border: `3rem solid ${PHOSPHOR}`,
            borderTop: 'none',
            padding: '32rem',
            fontSize: '40rem',
            lineHeight: 1.5,
          }}
        >
          timetable --today
          <br />
          NO RESPONSE
        </div>
      ) : (
        <div
          style={{
            border: `3rem solid ${PHOSPHOR}`,
            borderTop: 'none',
            padding: '14rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10rem',
          }}
        >
          {periods.slice(0, 7).map((p) => (
            <div
              key={p.period}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16rem',
                border: `3rem solid ${PHOSPHOR}`,
                padding: '8rem 14rem',
              }}
            >
              <span
                style={{
                  fontSize: '36rem',
                  lineHeight: 1.1,
                  background: PHOSPHOR,
                  color: VOID,
                  padding: '6rem 12rem',
                }}
              >
                {p.period}
              </span>
              <span
                style={{
                  fontSize: '40rem',
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
                <span style={{ fontSize: '30rem', lineHeight: 1.1 }}>{p.teacher}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const terminalDark: ThemeSkin = {
  id: 'terminal-dark',
  name: '터미널 · 검은바탕',
  blurb: '칠판이 그대로 비치는 검정 위에 인광 초록 글자만 남는다.',
  chip: [VOID, PHOSPHOR, GRID],
  fonts: ['Neodgm'],
  tokens: {
    '--bg': VOID,
    '--fg': PHOSPHOR,
    '--rule': PHOSPHOR,
    '--grid': GRID,
  },
  geometry: { columns: '1.15fr 1fr', columnGap: 56, padding: 70, headerGap: 40 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default terminalDark
