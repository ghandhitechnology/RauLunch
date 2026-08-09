import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 리소리소.
 *
 * 리소그래프는 색을 섞지 못한다. 판을 한 번에 하나씩 찍고, 종이가 미세하게
 * 밀리면서 판끼리 어긋난다. 그 "어긋남"이 이 테마의 전부다 — 같은 도형을 분홍
 * 한 번, 파랑 한 번, 6~10rem 밀어서 두 번 찍는다.
 *
 * 잉크는 딱 둘이고 겹치는 곳을 어둡게 처리하지 않는다(그러면 그림자가 된다).
 * 어긋남의 크기는 무엇에 찍히느냐로 갈린다. 면(띠·블록·괘선·망점)에는 크게
 * 주어야 인쇄 사고처럼 보이고, 글자에는 아주 조금만 준다 — 획이 몇 rem만 밀려도
 * 한글은 다른 글자로 뭉쳐 읽힌다("급식"이 "금식"이 된다). 가독성이 먼저다.
 */

const PAPER = '#F3EFE2'
const PINK = '#FF48B0'
const BLUE = '#0060FF'

const RISO_FONT: CSSProperties = {
  fontFamily: "'DoHyeon', sans-serif",
}

/** 한 잉크로 찍은 망점 판. 채워야 하는 넓은 면에만 쓴다. */
function halftone(ink: string, cell: number): CSSProperties {
  return {
    backgroundImage: `radial-gradient(circle, ${ink} 0 30%, transparent 32%)`,
    backgroundSize: `${cell}rem ${cell}rem`,
  }
}

/**
 * 어긋나게 두 번 찍은 글자. 분홍 판이 먼저, 파랑 판이 그 위에.
 * 밀림은 3rem 을 넘기지 않는다 — 그 이상은 글자 모양 자체를 바꿔버린다.
 */
function MisregText({
  children,
  size,
  dx = 3,
  dy = 3,
}: {
  children: ReactNode
  size: number
  dx?: number
  dy?: number
}) {
  const layer: CSSProperties = {
    ...RISO_FONT,
    fontSize: `${size}rem`,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        aria-hidden
        style={{ ...layer, position: 'absolute', left: `${dx}rem`, top: `${dy}rem`, color: PINK }}
      >
        {children}
      </span>
      <span style={{ ...layer, position: 'relative', color: BLUE }}>{children}</span>
    </span>
  )
}

/** 어긋나게 두 번 찍은 사각형. 뒤에 분홍 판이 삐져나오게 둔다. */
function MisregBlock({
  children,
  style,
  dx = 9,
  dy = 8,
}: {
  children?: ReactNode
  style?: CSSProperties
  dx?: number
  dy?: number
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: `${dx}rem`,
          top: `${dy}rem`,
          right: `${-dx}rem`,
          bottom: `${-dy}rem`,
          background: PINK,
        }}
      />
      <span
        style={{
          position: 'relative',
          background: BLUE,
          color: PAPER,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {children}
      </span>
    </span>
  )
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER }}>
      {/* 오른쪽 여백을 채우는 분홍 망점 판. 폭은 슬롯 바깥 여백(84rem)보다 좁게
          잡는다 — 넓게 깔면 시간표 오른쪽 끝의 교사명 위로 망점이 올라와 읽히지 않는다. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '76rem',
          bottom: 0,
          ...halftone(PINK, 20),
        }}
      />
      {/* 어긋나게 두 번 찍힌 굵은 띠. 이 테마의 서명이다. */}
      <div
        style={{ position: 'absolute', left: 0, top: '26rem', width: '190rem', height: '22rem', background: PINK }}
      />
      <div
        style={{ position: 'absolute', left: '9rem', top: '34rem', width: '190rem', height: '22rem', background: BLUE }}
      />
      <div
        style={{ position: 'absolute', left: 0, bottom: '48rem', width: '230rem', height: '22rem', background: PINK }}
      />
      <div
        style={{ position: 'absolute', left: '9rem', bottom: '40rem', width: '230rem', height: '22rem', background: BLUE }}
      />
      {/* 왼쪽 아이콘 여백을 채우는 망점 기둥. 글자가 앉는 자리에는 들어가지 않는다. */}
      <div
        style={{
          position: 'absolute',
          left: '38rem',
          top: '150rem',
          width: '150rem',
          bottom: '150rem',
          ...halftone(BLUE, 22),
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
        ...RISO_FONT,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '26rem',
        paddingBottom: '14rem',
        // 판 경계 대신 굵은 잉크 선 하나. 리소 인쇄물의 관례다.
        borderBottom: `10rem solid ${BLUE}`,
      }}
    >
      <MisregText size={82}>{dateLabel}</MisregText>
      <MisregBlock style={{ padding: '10rem 20rem', fontSize: '40rem', lineHeight: 1 }}>
        {weekdayLabel}
      </MisregBlock>
      <span style={{ flex: 1 }} />
      {stale ? (
        <span style={{ fontSize: '30rem', lineHeight: 1, color: PINK, paddingBottom: '8rem' }}>
          지난 자료
        </span>
      ) : null}
      <span style={{ fontSize: '46rem', lineHeight: 1, color: BLUE, paddingBottom: '4rem' }}>
        {grade}-{classNo}
      </span>
    </div>
  )
}

/** 자료가 없을 때. 빈 판을 그대로 내보내는 대신 망점만 남은 면을 찍는다. */
function EmptyInk({ label }: { label: string }) {
  return (
    <div
      style={{
        ...RISO_FONT,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '22rem',
      }}
    >
      <div style={{ height: '90rem', ...halftone(PINK, 20) }} />
      <span style={{ fontSize: '38rem', lineHeight: 1.2, color: BLUE }}>{label}</span>
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ marginBottom: '18rem' }}>
        <MisregText size={54}>오늘의 급식</MisregText>
      </div>
      {empty ? (
        <EmptyInk label="급식 자료를 받지 못했습니다" />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16rem' }}>
          {MEAL_KEYS.map((key) => {
            const items = meals[key] ?? []
            return (
              // 세 끼가 칼럼 높이를 똑같이 나눠 갖고, 내용은 그 띠 한가운데에
              // 앉는다. 위로만 붙이면 아래쪽에 빈 종이가 크게 남는다.
              <div
                key={key}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24rem',
                  paddingTop: '14rem',
                  borderTop: `6rem solid ${PINK}`,
                }}
              >
                <MisregBlock
                  style={{ width: '124rem', height: '66rem', fontSize: '40rem', lineHeight: 1 }}
                >
                  {MEAL_LABELS[key]}
                </MisregBlock>
                <div
                  style={{
                    ...RISO_FONT,
                    flex: 1,
                    minWidth: 0,
                    color: BLUE,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'center',
                    gap: '10rem 20rem',
                  }}
                >
                  {items.length === 0 ? (
                    <span style={{ fontSize: '40rem', lineHeight: 1.2, color: PINK }}>없음</span>
                  ) : (
                    items.map((name, i) => (
                      <span
                        key={`${name}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '20rem',
                          fontSize: '44rem',
                          lineHeight: 1.2,
                          wordBreak: 'keep-all',
                        }}
                      >
                        {name}
                        {i < items.length - 1 ? (
                          <span style={{ width: '14rem', height: '14rem', background: PINK }} />
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
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ marginBottom: '18rem' }}>
        <MisregText size={54}>{weekdayLabel}요일 시간표</MisregText>
      </div>
      {empty ? (
        <EmptyInk label="시간표 자료 없음" />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {periods.slice(0, 7).map((p, idx, rows) => (
            <div
              key={p.period}
              style={{
                ...RISO_FONT,
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '20rem',
                // 줄 구분은 분홍 잉크 괘선으로만 한다. 예전에는 한 줄 걸러 망점을
                // 깔았는데, 망점이 과목명과 교사명 위에 그대로 얹혀서 교실 뒤에서
                // 글자가 뭉개졌다. 망점은 글자가 없는 면에만 쓴다.
                borderBottom: idx < rows.length - 1 ? `4rem solid ${PINK}` : 'none',
              }}
            >
              <MisregBlock
                dx={7}
                dy={6}
                style={{ width: '62rem', height: '62rem', fontSize: '36rem', lineHeight: 1 }}
              >
                {p.period}
              </MisregBlock>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '42rem',
                  lineHeight: 1.1,
                  color: BLUE,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.subject}
              </span>
              {p.teacher ? (
                <span
                  style={{ fontSize: '30rem', lineHeight: 1.1, color: PINK, flexShrink: 0, paddingRight: '8rem' }}
                >
                  {p.teacher}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const riso: ThemeSkin = {
  id: 'riso',
  name: '리소리소',
  blurb: '분홍·파랑 두 잉크만. 판이 어긋나게 찍힌 자국이 그대로 무늬가 된다.',
  chip: [PAPER, PINK, BLUE],
  fonts: ['DoHyeon'],
  tokens: {
    '--bg': PAPER,
    '--fg': BLUE,
    '--ink-pink': PINK,
    '--ink-blue': BLUE,
  },
  geometry: { columns: '1.2fr 1fr', columnGap: 72, padding: 84, headerGap: 44 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default riso
