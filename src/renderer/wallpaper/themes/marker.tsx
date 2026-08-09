import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 마커.
 *
 * 분필의 반대편. 저쪽이 가루가 앉은 느낌이라면 이쪽은 미끄러운 화이트보드에
 * 마커가 끽끽거리며 지나간 자국이다. 그래서 획을 굵게(6~8rem) 잡고, 칸은
 * 전부 손으로 그린 네모로 가둔다. 네모의 모서리 반경을 네 곳 다르게 주면
 * 자로 그은 티가 사라진다 — 기울이기보다 이쪽이 훨씬 손맛이 난다.
 *
 * 제목만 붓글씨체(NanumBrush)를 쓴다. 메뉴 목록까지 붓글씨로 가면 획이 서로
 * 엉켜 뒷자리에서 못 읽는다. 본문은 개구체 굵게.
 */

const WHITE = '#FFFFFF'
const INK = '#141210'
const RED = '#E4002B'
const BLUE = '#0047C7'

const BRUSH: CSSProperties = { fontFamily: "'NanumBrush', cursive" }
const BODY: CSSProperties = { fontFamily: "'Gaegu', cursive", fontWeight: 700 }

/** 손으로 그린 네모의 모서리. 순서마다 다르게 뭉개진다. */
const CORNERS = [
  '20rem 34rem 24rem 40rem / 34rem 22rem 38rem 24rem',
  '38rem 22rem 40rem 20rem / 22rem 36rem 20rem 40rem',
  '26rem 40rem 20rem 30rem / 40rem 24rem 34rem 22rem',
  '34rem 24rem 36rem 26rem / 24rem 38rem 22rem 36rem',
]
function corner(i: number): string {
  return CORNERS[i % CORNERS.length]
}

/** 마커로 대충 친 네모칸. */
function Box({
  color,
  index,
  children,
}: {
  color: string
  index: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        border: `7rem solid ${color}`,
        borderRadius: corner(index),
        padding: '20rem 26rem 24rem',
        // 세로로 남는 자리를 칸끼리 나눠 가진다. 아래에 빈 띠가 남으면
        // 화이트보드를 덜 쓴 것처럼 보인다.
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: WHITE }}>
      {/* 지웠다 다시 쓴 자리. 가로로 길게 남는 마른 걸레 자국이다. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(4deg, rgba(20,18,16,0.045) 0 6rem, transparent 6rem 34rem)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ color: INK }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24rem' }}>
        <span style={{ ...BRUSH, fontSize: '96rem', lineHeight: 0.9 }}>
          {grade}학년 {classNo}반
        </span>
        <span style={{ ...BRUSH, fontSize: '76rem', lineHeight: 0.9, color: RED }}>
          {dateLabel}
        </span>
        {/* 요일만 파란 마커로 동그라미. 화이트보드에서 제일 자주 하는 표시다. */}
        <span
          style={{
            ...BODY,
            fontSize: '48rem',
            lineHeight: 1,
            color: BLUE,
            border: `6rem solid ${BLUE}`,
            borderRadius: '50%',
            width: '84rem',
            height: '84rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {weekdayLabel}
        </span>
        <span style={{ flex: 1 }} />
        {stale ? (
          <span style={{ ...BODY, fontSize: '38rem', lineHeight: 1, color: RED }}>
            예전 자료
          </span>
        ) : null}
      </div>
      <div
        style={{
          height: '9rem',
          background: INK,
          borderRadius: '6rem',
          marginTop: '14rem',
        }}
      />
    </div>
  )
}

/** 끼니마다 마커 색을 바꾼다. 멀리서는 색이 곧 이름표다. */
const MEAL_TONE: Record<string, string> = { 조식: BLUE, 중식: RED, 석식: INK }

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box color={INK} index={0}>
          <div style={{ ...BRUSH, fontSize: '80rem', lineHeight: 1, color: RED }}>급식</div>
          <div
            style={{ ...BODY, fontSize: '48rem', lineHeight: 1.4, marginTop: '16rem', color: INK }}
          >
            오늘 메뉴를 받아오지 못했습니다.
            <br />
            급식실 앞 게시판을 확인하세요.
          </div>
        </Box>
      </div>
    )
  }
  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '18rem',
      }}
    >
      {MEAL_KEYS.map((key, si) => {
        const items = meals[key] ?? []
        const tone = MEAL_TONE[key] ?? INK
        return (
          <Box key={key} color={tone} index={si}>
            <div style={{ ...BRUSH, fontSize: '64rem', lineHeight: 0.9, color: tone }}>
              {MEAL_LABELS[key]}
            </div>
            {items.length === 0 ? (
              <div style={{ ...BODY, fontSize: '40rem', lineHeight: 1.1, color: INK }}>없음</div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: '16rem',
                  rowGap: '6rem',
                  marginTop: '8rem',
                }}
              >
                {items.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '16rem' }}
                  >
                    {i > 0 ? (
                      <span
                        style={{
                          width: '14rem',
                          height: '14rem',
                          background: tone,
                          borderRadius: '4rem',
                          flex: 'none',
                        }}
                      />
                    ) : null}
                    <span
                      style={{
                        ...BODY,
                        fontSize: '42rem',
                        lineHeight: 1.15,
                        color: INK,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </Box>
        )
      })}
    </div>
  )
}

function TimetablePanel({ periods, weekdayLabel, empty }: TimetablePanelProps) {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box color={INK} index={3}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16rem' }}>
          <span style={{ ...BRUSH, fontSize: '66rem', lineHeight: 0.9, color: INK }}>시간표</span>
          <span style={{ ...BODY, fontSize: '38rem', lineHeight: 1, color: BLUE }}>
            {weekdayLabel}요일
          </span>
        </div>
        {empty ? (
          <div
            style={{ ...BODY, fontSize: '44rem', lineHeight: 1.4, marginTop: '18rem', color: INK }}
          >
            시간표를 받아오지 못했습니다.
            <br />
            <span style={{ color: RED }}>어제 시간표대로 준비하세요.</span>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: '12rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {periods.slice(0, 7).map((p, i, arr) => (
              <div
                key={p.period}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18rem',
                  borderBottom: i === arr.length - 1 ? 'none' : `3rem solid ${INK}`,
                }}
              >
                <span
                  style={{
                    ...BODY,
                    flex: 'none',
                    width: '58rem',
                    height: '58rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '38rem',
                    lineHeight: 1,
                    color: BLUE,
                    border: `5rem solid ${BLUE}`,
                    borderRadius: corner(i),
                  }}
                >
                  {p.period}
                </span>
                <span
                  style={{
                    ...BODY,
                    fontSize: '48rem',
                    lineHeight: 1.1,
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    color: INK,
                  }}
                >
                  {p.subject}
                </span>
                {p.teacher ? (
                  <span
                    style={{ ...BODY, fontSize: '36rem', lineHeight: 1, color: RED, flex: 'none' }}
                  >
                    {p.teacher}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Box>
    </div>
  )
}

const marker: ThemeSkin = {
  id: 'marker',
  name: '마커',
  blurb: '화이트보드에 마커로 굵게. 빨강·파랑 두 색만 크게 쓴다.',
  chip: [WHITE, RED, BLUE],
  fonts: ['NanumBrush', 'Gaegu'],
  tokens: {
    '--bg': WHITE,
    '--fg': INK,
    '--rule': INK,
    '--accent': RED,
    '--accent2': BLUE,
  },
  geometry: { columns: '1.15fr 1fr', columnGap: 60, padding: 70, headerGap: 40 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default marker
