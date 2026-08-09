import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 모눈종이.
 *
 * 마커가 시끄러운 화이트보드라면 이쪽은 조용한 공책이다. 그래서 굵은 테두리
 * 상자를 하나도 쓰지 않는다. 칸을 나누는 건 왼쪽에 세로로 내려긋는 빨간
 * 여백선 하나뿐 — 국어 공책에서 이름 쓰는 그 선이다.
 *
 * 글줄 간격을 모눈 한 칸(46rem)의 배수로 맞춰 두었다. 줄이 격자와 맞물려야
 * 종이 위에 쓴 것처럼 보이고, 어긋나면 그냥 격자 무늬 배경이 된다.
 */

const PAPER = '#FDFAF0'
const GRID = '#B7D2E6'
const PENCIL = '#3B3A36'
const RED = '#D6392E'

/** 모눈 한 칸. 1920 기준으로 대략 5mm 폭이다. */
const CELL = 46

const HAND: CSSProperties = { fontFamily: "'Gaegu', cursive", fontWeight: 400 }
const HAND_BOLD: CSSProperties = { fontFamily: "'Gaegu', cursive", fontWeight: 700 }

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            `repeating-linear-gradient(to right, ${GRID} 0 3rem, transparent 3rem ${CELL}rem)`,
            `repeating-linear-gradient(to bottom, ${GRID} 0 3rem, transparent 3rem ${CELL}rem)`,
          ].join(','),
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/** 연필로 대충 동그라미 친 제목. 원이 조금 찌그러지고 기울어야 손글씨다. */
function Circled({ text, color = PENCIL }: { text: string; color?: string }) {
  return (
    <span
      style={{
        ...HAND_BOLD,
        display: 'inline-block',
        fontSize: '54rem',
        lineHeight: 1,
        color,
        border: `4rem solid ${color}`,
        borderRadius: '50%',
        padding: '14rem 34rem 16rem',
        transform: 'rotate(-1.2deg)',
      }}
    >
      {text}
    </span>
  )
}

/** 왼쪽 빨간 여백선 + 그 오른쪽에 쓰는 내용. */
function Ruled({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: '4rem', background: RED, flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0, paddingLeft: '30rem' }}>{children}</div>
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ color: PENCIL }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '24rem' }}>
        <span style={{ ...HAND_BOLD, fontSize: '82rem', lineHeight: 1 }}>
          {grade}학년 {classNo}반
        </span>
        <span style={{ ...HAND, fontSize: '58rem', lineHeight: 1, color: RED }}>
          {dateLabel} ({weekdayLabel})
        </span>
        <span style={{ flex: 1 }} />
        {stale ? (
          <span style={{ ...HAND, fontSize: '38rem', lineHeight: 1, color: RED }}>
            지난 기록
          </span>
        ) : null}
      </div>
      {/* 공책 맨 윗줄. 격자보다 진하게 한 번 더 긋는다. */}
      <div style={{ height: '4rem', background: PENCIL, marginTop: '12rem' }} />
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <Ruled>
        <Circled text="급식" />
        <div
          style={{
            ...HAND_BOLD,
            fontSize: '50rem',
            lineHeight: `${CELL * 1.5}rem`,
            color: PENCIL,
            marginTop: '20rem',
          }}
        >
          받아온 메뉴가 없습니다.
          <br />
          빈 칸으로 둡니다.
        </div>
      </Ruled>
    )
  }
  return (
    <Ruled>
      <div
        style={{
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          // 세 끼니가 세로를 고르게 나눠 갖는다. 아래에 빈 종이가 남지 않는다.
          justifyContent: 'space-between',
          paddingBottom: `${CELL / 2}rem`,
        }}
      >
        {MEAL_KEYS.map((key) => {
          const items = meals[key] ?? []
          return (
            <div key={key}>
              <Circled text={MEAL_LABELS[key]} />
              {items.length === 0 ? (
                <div
                  style={{
                    ...HAND_BOLD,
                    fontSize: '52rem',
                    lineHeight: `${CELL * 1.5}rem`,
                    color: PENCIL,
                    marginTop: '10rem',
                  }}
                >
                  없음
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    columnGap: '26rem',
                    marginTop: '10rem',
                  }}
                >
                  {items.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      style={{
                        ...HAND_BOLD,
                        fontSize: '52rem',
                        // 글줄 높이를 모눈 한 칸 반에 맞춰 종이 위에 앉힌다.
                        lineHeight: `${CELL * 1.5}rem`,
                        color: PENCIL,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: RED, marginRight: '10rem' }}>-</span>
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Ruled>
  )
}

function TimetablePanel({ periods, weekdayLabel, empty }: TimetablePanelProps) {
  return (
    <Ruled>
      <Circled text={`시간표 ${weekdayLabel}`} />
      {empty ? (
        <div
          style={{
            ...HAND_BOLD,
            fontSize: '50rem',
            lineHeight: `${CELL * 1.5}rem`,
            color: PENCIL,
            marginTop: '20rem',
          }}
        >
          시간표를 적지 못했습니다.
          <br />
          <span style={{ color: RED }}>내일 다시 확인하세요.</span>
        </div>
      ) : (
        <div style={{ marginTop: '14rem' }}>
          {periods.slice(0, 7).map((p) => (
            <div
              key={p.period}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18rem',
                // 한 줄이 모눈 두 칸. 위아래로 계속 격자에 맞물린다.
                height: `${CELL * 2}rem`,
              }}
            >
              <span
                style={{
                  ...HAND_BOLD,
                  flex: 'none',
                  width: '62rem',
                  fontSize: '46rem',
                  lineHeight: 1,
                  color: RED,
                }}
              >
                {p.period}.
              </span>
              <span
                style={{
                  ...HAND_BOLD,
                  fontSize: '52rem',
                  lineHeight: 1,
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  color: PENCIL,
                }}
              >
                {p.subject}
              </span>
              {p.teacher ? (
                <span
                  style={{ ...HAND_BOLD, fontSize: '40rem', lineHeight: 1, color: PENCIL, flex: 'none' }}
                >
                  {p.teacher}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Ruled>
  )
}

const gridpaper: ThemeSkin = {
  id: 'gridpaper',
  name: '모눈종이',
  blurb: '연한 파란 모눈 위에 연필로. 왼쪽에는 빨간 여백선.',
  chip: [PAPER, GRID, RED],
  fonts: ['Gaegu'],
  tokens: {
    '--bg': PAPER,
    '--fg': PENCIL,
    '--rule': RED,
    '--grid': GRID,
  },
  geometry: { columns: '1.15fr 1fr', columnGap: 64, padding: 72, headerGap: 44 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default gridpaper
