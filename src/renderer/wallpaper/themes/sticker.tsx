import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS, type MealKey } from '../../../shared/types'

/**
 * 스티커.
 *
 * 다이어리에 스티커를 손으로 붙인 면. 붙인 티가 나야 하므로 칸마다 각도를
 * 2~3도씩 다르게 틀어 놓는다. 각도만으로 손맛을 내고, 들뜬 그림자는 넣지
 * 않는다 — 칠판에 쏘면 그림자는 그냥 때가 된다.
 *
 * 유치해 보여도 검은 윤곽선만은 두껍게 유지한다. 이 테마가 뒷자리에서
 * 읽히는 이유는 색이 아니라 그 윤곽선이다.
 */

const CREAM = '#FFF3D6'
const INK = '#141414'
const WHITE = '#FFFFFF'
const RED = '#FF3B2F'
const YELLOW = '#FFD100'
const BLUE = '#1D63FF'
const GREEN = '#1EB65A'

const JUA: CSSProperties = { fontFamily: "'Jua', sans-serif" }

/** 색 스티커 위에 올릴 글자색. 노랑만 검정, 나머지는 흰색이 읽힌다. */
function inkOn(fill: string): string {
  return fill === YELLOW ? INK : WHITE
}

const MEAL_FILL: Record<MealKey, string> = {
  조식: YELLOW,
  중식: RED,
  석식: BLUE,
}

/** 끼니마다 다르게 틀어 붙인 각도. 손으로 붙인 것처럼 규칙이 없어야 한다. */
const MEAL_TILT: Record<MealKey, number> = {
  조식: -2.2,
  중식: 1.8,
  석식: -1.4,
}

function Ground({ children }: { children: ReactNode }) {
  // 여백에 붙은 장식 스티커. 왼쪽은 바탕화면 아이콘 자리라 한 장도 두지 않고,
  // 오른쪽 가장자리 여백에만 붙인다. 칸 위로 올라타면 그냥 얼룩이 된다.
  const decor: CSSProperties[] = [
    { top: '26rem', right: '30rem', width: '86rem', height: '86rem', background: GREEN, borderRadius: '50%' },
    { top: '150rem', right: '18rem', width: '60rem', height: '60rem', background: YELLOW, borderRadius: '16rem', transform: 'rotate(14deg)' },
    { bottom: '6rem', right: '8rem', width: '40rem', height: '40rem', background: RED, borderRadius: '14rem', transform: 'rotate(-10deg)' },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, background: CREAM }}>
      {decor.map((s, i) => (
        <div key={i} style={{ position: 'absolute', border: `6rem solid ${INK}`, ...s }} />
      ))}
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/** 알약 스티커. 짧은 말만 넣는다. */
function Pill({
  fill,
  size,
  tilt = 0,
  children,
}: {
  fill: string
  size: number
  tilt?: number
  children: ReactNode
}) {
  return (
    <span
      style={{
        ...JUA,
        fontSize: `${size}rem`,
        lineHeight: 1,
        color: inkOn(fill),
        background: fill,
        border: `6rem solid ${INK}`,
        borderRadius: '999rem',
        padding: `${Math.round(size * 0.24)}rem ${Math.round(size * 0.52)}rem`,
        whiteSpace: 'nowrap',
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      {children}
    </span>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div
      style={{
        ...JUA,
        background: WHITE,
        border: `8rem solid ${INK}`,
        borderRadius: '34rem',
        display: 'flex',
        alignItems: 'center',
        gap: '22rem',
        padding: '16rem 28rem',
        color: INK,
        transform: 'rotate(-0.8deg)',
      }}
    >
      <span style={{ fontSize: '74rem', lineHeight: 1 }}>{dateLabel}</span>
      <Pill fill={RED} size={40} tilt={3}>
        {weekdayLabel}
      </Pill>
      <span style={{ flex: 1 }} />
      {stale ? (
        <Pill fill={YELLOW} size={28} tilt={-3}>
          지난 자료
        </Pill>
      ) : null}
      <Pill fill={BLUE} size={40} tilt={-2}>
        {grade}학년 {classNo}반
      </Pill>
    </div>
  )
}

/**
 * 자료가 없을 때. 칸을 지우지 않고 빈 카드를 그대로 붙여 둔다 —
 * 카드가 사라지면 덜 만든 화면처럼 보이고, 남아 있으면 "오늘은 비었다" 가 된다.
 */
function EmptySticker({ label, tilt = -1.2 }: { label: string; tilt?: number }) {
  return (
    <div
      style={{
        ...JUA,
        flex: 1,
        minHeight: 0,
        background: WHITE,
        border: `8rem solid ${INK}`,
        borderRadius: '36rem',
        transform: `rotate(${tilt}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24rem',
        color: INK,
      }}
    >
      <span
        style={{
          width: '160rem',
          height: '160rem',
          background: YELLOW,
          border: `8rem solid ${INK}`,
          borderRadius: '40rem',
          transform: 'rotate(-6deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '70rem',
          lineHeight: 1,
        }}
      >
        ?
      </span>
      <span style={{ fontSize: '44rem', lineHeight: 1.2 }}>{label}</span>
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16rem',
          minHeight: 0,
          padding: '8rem 14rem',
        }}
      >
        <div style={{ display: 'flex' }}>
          <Pill fill={YELLOW} size={34} tilt={-2}>
            급식
          </Pill>
        </div>
        <EmptySticker label="급식 자료를 받지 못했어요" tilt={-1.6} />
      </div>
    )
  }
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '22rem',
        minHeight: 0,
        // 비스듬히 붙은 스티커 모서리가 잘리지 않게 사방을 조금 비워 둔다.
        padding: '8rem 14rem',
      }}
    >
      {MEAL_KEYS.map((key) => {
        const items = meals[key] ?? []
        const fill = MEAL_FILL[key]
        return (
          <div
            key={key}
            style={{
              flex: 1,
              minHeight: 0,
              background: WHITE,
              border: `8rem solid ${INK}`,
              borderRadius: '36rem',
              padding: '16rem 22rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12rem',
              transform: `rotate(${MEAL_TILT[key]}deg)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Pill fill={fill} size={34}>
                {MEAL_LABELS[key]}
              </Pill>
            </div>
            <div
              style={{
                ...JUA,
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                color: INK,
                display: 'flex',
                flexWrap: 'wrap',
                alignContent: 'center',
                gap: '6rem 22rem',
              }}
            >
              {items.length === 0 ? (
                <span style={{ fontSize: '42rem', lineHeight: 1.2 }}>오늘은 없어요</span>
              ) : (
                items.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12rem',
                      fontSize: '42rem',
                      lineHeight: 1.2,
                      wordBreak: 'keep-all',
                    }}
                  >
                    <span
                      style={{
                        width: '18rem',
                        height: '18rem',
                        borderRadius: '50%',
                        background: fill,
                        border: `4rem solid ${INK}`,
                        flexShrink: 0,
                      }}
                    />
                    {name}
                  </span>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TimetablePanel({ periods, weekdayLabel, empty }: TimetablePanelProps) {
  const cycle = [RED, YELLOW, BLUE, GREEN]
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        padding: '8rem 14rem',
      }}
    >
      <div style={{ display: 'flex', marginBottom: '16rem' }}>
        <Pill fill={GREEN} size={38} tilt={-2}>
          {weekdayLabel}요일 시간표
        </Pill>
      </div>
      {empty ? (
        <EmptySticker label="시간표가 아직 없어요" tilt={1.4} />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10rem' }}>
          {periods.slice(0, 7).map((p, idx) => {
            const fill = cycle[idx % cycle.length]
            return (
              <div
                key={p.period}
                style={{
                  ...JUA,
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16rem',
                  background: WHITE,
                  border: `6rem solid ${INK}`,
                  borderRadius: '999rem',
                  padding: '0 20rem',
                  color: INK,
                  // 줄마다 방향을 바꿔 틀면 한 장씩 따로 붙인 것처럼 보인다.
                  transform: `rotate(${idx % 2 === 0 ? 1.1 : -1.1}deg)`,
                }}
              >
                <span
                  style={{
                    width: '58rem',
                    height: '58rem',
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: fill,
                    border: `5rem solid ${INK}`,
                    color: inkOn(fill),
                    fontSize: '34rem',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.period}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: '44rem',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.subject}
                </span>
                {p.teacher ? (
                  <span style={{ fontSize: '34rem', lineHeight: 1.1, flexShrink: 0 }}>{p.teacher}</span>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const sticker: ThemeSkin = {
  id: 'sticker',
  name: '스티커',
  blurb: '두꺼운 검정 윤곽에 원색 스티커. 한 장씩 삐뚤게 붙인 다이어리 면.',
  chip: [RED, YELLOW, BLUE],
  fonts: ['Jua'],
  tokens: {
    '--bg': CREAM,
    '--fg': INK,
    '--red': RED,
    '--yellow': YELLOW,
    '--blue': BLUE,
    '--green': GREEN,
  },
  geometry: { columns: '1.18fr 1fr', columnGap: 48, padding: 70, headerGap: 34 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default sticker
