import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS, type MealKey } from '../../../shared/types'

/**
 * 색유리.
 *
 * 유리창의 "번짐"이 아니라 "납선"이 이 테마의 정체다. 요즘 흔한 반투명 유리
 * 흉내(blur, 반투명)는 빔프로젝터에서 전부 회색으로 죽으므로 쓰지 않는다.
 * 대신 진짜 스테인드글라스가 하는 일을 그대로 한다 — 고채도 색판을 굵은
 * 검은 납선으로 잘라 붙인다.
 *
 * 읽기 위한 타협 하나: 시끄러운 색판은 화면 가장자리에만 두고, 글자가 앉는
 * 가운데는 상아색 판으로 비워둔다. 판을 나누는 건 색이 아니라 납선이다.
 */

const IVORY = '#FFF7E4'
const LEAD = '#0B0B0B'
const COBALT = '#0B3FD1'
const RUBY = '#D6003C'
const AMBER = '#FFB800'
const EMERALD = '#00895B'

/** 끼니마다 다른 색판 하나씩. 라벨 조각에만 쓰여서 본문 가독성을 건드리지 않는다. */
const MEAL_GLASS: Record<MealKey, string> = {
  조식: AMBER,
  중식: RUBY,
  석식: COBALT,
}

/** 색판 위에 얹는 글자색. 호박색만 검정이 읽히고 나머지는 상아색이 읽힌다. */
function inkOn(glass: string): string {
  return glass === AMBER ? LEAD : IVORY
}

const GLASS_FONT: CSSProperties = {
  fontFamily: "'GowunDodum', sans-serif",
  letterSpacing: '-0.5rem',
}

/** 상아색 유리판 하나. 모든 내용은 반드시 이 판 위에 앉는다. */
const PANE: CSSProperties = {
  background: IVORY,
  border: `7rem solid ${LEAD}`,
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: IVORY }}>
      {/* 색판과 납선은 SVG 로 그린다 — 다각형 채우기와 굵은 선이 전부라
          평면 그대로이고, slice 로 어떤 화면비에서도 가장자리를 채운다. */}
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <g stroke={LEAD} strokeWidth={11} strokeLinejoin="round">
          {/* 왼쪽 기둥 — 아이콘 여백(폭의 15%)보다 안쪽으로 넘어오지 않는다. */}
          <polygon points="0,0 268,0 246,332 0,392" fill={COBALT} />
          <polygon points="0,392 246,332 282,716 0,662" fill={AMBER} />
          <polygon points="0,662 282,716 262,1080 0,1080" fill={EMERALD} />
          {/* 윗 띠 */}
          <polygon points="268,0 1148,0 1128,94 246,122" fill={RUBY} />
          <polygon points="1148,0 1920,0 1920,152 1128,94" fill={COBALT} />
          {/* 오른쪽 기둥 */}
          <polygon points="1830,146 1920,152 1920,604 1806,582" fill={AMBER} />
          <polygon points="1806,582 1920,604 1920,1080 1788,1080" fill={RUBY} />
          {/* 아랫 띠 */}
          <polygon points="282,1002 1152,1016 1142,1080 262,1080" fill={AMBER} />
          <polygon points="1152,1016 1788,1000 1788,1080 1142,1080" fill={EMERALD} />
          {/* 가운데 판을 나누는 납선. 색은 없고 선만 있다. */}
          <g fill="none">
            <path d="M 256,122 L 706,142 L 764,522 L 802,1006" />
            <path d="M 764,522 L 1806,566" />
            <path d="M 1140,96 L 1198,524" />
          </g>
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/** 색판 조각. 라벨·숫자처럼 짧은 글자만 올린다. */
function Shard({
  glass,
  size,
  children,
}: {
  glass: string
  size: number
  children: ReactNode
}) {
  return (
    <span
      style={{
        ...GLASS_FONT,
        fontSize: `${size}rem`,
        lineHeight: 1,
        color: inkOn(glass),
        background: glass,
        border: `5rem solid ${LEAD}`,
        padding: `${Math.round(size * 0.22)}rem ${Math.round(size * 0.34)}rem`,
        whiteSpace: 'nowrap',
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
        ...PANE,
        ...GLASS_FONT,
        color: LEAD,
        display: 'flex',
        alignItems: 'center',
        gap: '22rem',
        padding: '18rem 26rem',
      }}
    >
      <span style={{ fontSize: '76rem', lineHeight: 1 }}>{dateLabel}</span>
      <Shard glass={RUBY} size={44}>
        {weekdayLabel}
      </Shard>
      <span style={{ flex: 1 }} />
      {stale ? (
        <Shard glass={AMBER} size={30}>
          지난 자료
        </Shard>
      ) : null}
      <Shard glass={COBALT} size={44}>
        {grade}학년 {classNo}반
      </Shard>
    </div>
  )
}

/** 판 위쪽에 걸치는 제목 띠. 납선 하나를 판과 공유한다. */
function PaneTitle({ text, glass }: { text: string; glass: string }) {
  return (
    <div
      style={{
        ...GLASS_FONT,
        fontSize: '42rem',
        lineHeight: 1,
        color: inkOn(glass),
        background: glass,
        padding: '16rem 24rem',
        borderBottom: `7rem solid ${LEAD}`,
      }}
    >
      {text}
    </div>
  )
}

/** 자료가 없을 때 그리는 빈 판. 색유리는 비어도 유리는 남는다. */
function EmptyPane({ label }: { label: string }) {
  return (
    <div
      style={{
        ...GLASS_FONT,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20rem',
        color: LEAD,
      }}
    >
      <span
        style={{
          width: '150rem',
          height: '150rem',
          background: EMERALD,
          border: `7rem solid ${LEAD}`,
          clipPath: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)',
        }}
      />
      <span style={{ fontSize: '38rem', lineHeight: 1 }}>{label}</span>
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  return (
    <div
      style={{
        ...PANE,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <PaneTitle text="오늘 급식" glass={EMERALD} />
      {empty ? (
        <EmptyPane label="급식 자료를 받지 못했습니다" />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {MEAL_KEYS.map((key, idx) => {
            const items = meals[key] ?? []
            const glass = MEAL_GLASS[key]
            return (
              <div
                key={key}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: '20rem',
                  padding: '18rem 22rem',
                  // 끼니 사이도 납선으로 자른다. 판이 나뉜 것처럼 보이게.
                  borderTop: idx === 0 ? 'none' : `7rem solid ${LEAD}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Shard glass={glass} size={38}>
                    {MEAL_LABELS[key]}
                  </Shard>
                </div>
                <div
                  style={{
                    ...GLASS_FONT,
                    flex: 1,
                    minWidth: 0,
                    color: LEAD,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'center',
                    gap: '8rem 20rem',
                  }}
                >
                  {items.length === 0 ? (
                    <span style={{ fontSize: '36rem', lineHeight: 1.2 }}>없음</span>
                  ) : (
                    items.map((name, i) => (
                      <span
                        key={`${name}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '20rem',
                          fontSize: '38rem',
                          lineHeight: 1.2,
                          wordBreak: 'keep-all',
                        }}
                      >
                        {name}
                        {i < items.length - 1 ? (
                          <span
                            style={{
                              width: '14rem',
                              height: '14rem',
                              background: glass,
                              border: `3rem solid ${LEAD}`,
                              transform: 'rotate(45deg)',
                            }}
                          />
                        ) : null}
                      </span>
                    ))
                  )}
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
  const shown = periods.slice(0, 7)
  const cycle = [COBALT, RUBY, AMBER, EMERALD]
  return (
    <div
      style={{
        ...PANE,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <PaneTitle text={`${weekdayLabel}요일 시간표`} glass={COBALT} />
      {empty ? (
        <EmptyPane label="시간표 자료 없음" />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {shown.map((p, idx) => {
            const glass = cycle[idx % cycle.length]
            return (
              <div
                key={p.period}
                style={{
                  ...GLASS_FONT,
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18rem',
                  padding: '0 22rem',
                  color: LEAD,
                  borderTop: idx === 0 ? 'none' : `5rem solid ${LEAD}`,
                }}
              >
                <span
                  style={{
                    width: '62rem',
                    height: '62rem',
                    flexShrink: 0,
                    background: glass,
                    border: `5rem solid ${LEAD}`,
                    color: inkOn(glass),
                    fontSize: '36rem',
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
                    fontSize: '42rem',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.subject}
                </span>
                {p.teacher ? (
                  <span style={{ fontSize: '30rem', lineHeight: 1.1, flexShrink: 0 }}>
                    {p.teacher}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const stained: ThemeSkin = {
  id: 'stained',
  name: '색유리',
  blurb: '굵은 납선으로 자른 고채도 색판. 글자는 가운데 상아색 유리 위에 앉는다.',
  chip: [COBALT, RUBY, AMBER],
  fonts: ['GowunDodum'],
  tokens: {
    '--bg': IVORY,
    '--fg': LEAD,
    '--lead': LEAD,
    '--cobalt': COBALT,
    '--ruby': RUBY,
    '--amber': AMBER,
    '--emerald': EMERALD,
  },
  geometry: { columns: '1.2fr 1fr', columnGap: 56, padding: 76, headerGap: 40 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default stained
