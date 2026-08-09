import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 포스터 — 학교 축제 대자보.
 *
 * 노랑 바탕에 검정 덩어리를 크게 얹는다. 크기 대비가 이 테마의 전부라서
 * 제목은 과하다 싶을 만큼 키우고 본문은 오히려 얌전하게 둔다.
 *
 * 날짜는 오른쪽 세로 띠에 90도 돌려 세운다. 그 띠 폭만큼 본문이 밀려야
 * 글자가 겹치지 않으므로, 헤더와 오른쪽 칼럼은 오른쪽 여백을 따로 준다.
 */

const YELLOW = '#FFD400'
const INK = '#000000'
const WHITE = '#FFFFFF'
const ORANGE = '#FF3B00'

/** 오른쪽 세로 날짜 띠의 폭. 본문 여백 계산이 여기에 묶여 있다. */
const RAIL = 156
/** 본문이 띠를 피하려고 두는 오른쪽 여백. 바깥 패딩과 합쳐 띠를 넘긴다. */
const RAIL_CLEAR = '120rem'

const DISPLAY: CSSProperties = {
  fontFamily: "'BlackHanSans', sans-serif",
}
const SANS: CSSProperties = {
  fontFamily: "'Pretendard', sans-serif",
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: YELLOW }}>
      {/* 대자보 아래를 막는 사선 띠. 평면 반복 패턴이므로 깊이감은 없다. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '30rem',
          backgroundImage: `repeating-linear-gradient(-45deg, ${INK} 0 24rem, ${YELLOW} 24rem 48rem)`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/** 검정으로 꽉 채운 제목 덩어리. 구획마다 하나씩 붙는다. */
function Block({
  children,
  size,
  fill = INK,
  color = YELLOW,
}: {
  children: ReactNode
  size: number
  fill?: string
  color?: string
}) {
  return (
    <span
      style={{
        ...DISPLAY,
        display: 'inline-block',
        background: fill,
        color,
        fontSize: `${size}rem`,
        lineHeight: 1,
        letterSpacing: '2rem',
        padding: `${Math.round(size * 0.26)}rem ${Math.round(size * 0.45)}rem`,
      }}
    >
      {children}
    </span>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <>
      {/* 세로 날짜 띠. stage 가 position:absolute 라 이 요소는 화면 오른쪽
          끝을 기준으로 선다. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: `${RAIL}rem`,
          background: INK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* 한글은 눕히지 않고 세로쓰기로 세운다. 90도 돌린 글자는 고개를
            기울여야 읽히지만, 세로쓰기는 글자가 똑바로 선 채 아래로 내려간다. */}
        <span
          style={{
            ...DISPLAY,
            fontSize: '84rem',
            lineHeight: 1.08,
            letterSpacing: '4rem',
            color: YELLOW,
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            whiteSpace: 'nowrap',
          }}
        >
          {dateLabel} {weekdayLabel}요일
        </span>
      </div>

      <div style={{ paddingRight: RAIL_CLEAR }}>
        <div
          style={{
            ...DISPLAY,
            color: INK,
            fontSize: '132rem',
            lineHeight: 0.95,
            letterSpacing: '-2rem',
          }}
        >
          오늘의 급식
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16rem',
            marginTop: '14rem',
          }}
        >
          <Block size={40}>
            {grade}학년 {classNo}반
          </Block>
          {stale ? (
            <Block size={36} fill={ORANGE} color={WHITE}>
              저장본
            </Block>
          ) : null}
        </div>
      </div>
    </>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div style={{ height: '100%' }}>
        <Block size={52}>급식</Block>
        <div
          style={{
            ...DISPLAY,
            color: INK,
            fontSize: '72rem',
            lineHeight: 1.15,
            marginTop: '26rem',
          }}
        >
          오늘은
          <br />
          급식 없음
        </div>
      </div>
    )
  }
  return (
    // 세 끼가 칼럼 높이를 고르게 나눠 갖는다. 위에서부터 쌓으면 아래쪽에
    // 노란 여백만 크게 남아 시간표 칼럼과 무게가 맞지 않는다.
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '18rem',
      }}
    >
      {MEAL_KEYS.map((key) => {
        const items = meals[key] ?? []
        return (
          <div key={key}>
            <Block size={40}>{MEAL_LABELS[key]}</Block>
            {items.length === 0 ? (
              <div
                style={{
                  ...SANS,
                  color: INK,
                  fontSize: '36rem',
                  fontWeight: 700,
                  marginTop: '10rem',
                }}
              >
                없음
              </div>
            ) : (
              // 차림표는 적힌 차례대로 읽혀야 한다. 두 칼럼 격자에 흘리면 눈이
              // 한 칼럼을 세로로 훑어 순서가 뒤집히므로, 한 줄로 흘리고 넘칠 때만
              // 다음 줄로 내린다. 사이의 검정 사각형이 끊는 자리다.
              <div
                style={{
                  marginTop: '10rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: '18rem',
                  rowGap: '4rem',
                }}
              >
                {items.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18rem',
                      ...SANS,
                      color: INK,
                      fontSize: '40rem',
                      fontWeight: 800,
                      lineHeight: 1.3,
                      letterSpacing: '-1rem',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {name}
                    {i < items.length - 1 ? (
                      <span style={{ width: '12rem', height: '12rem', background: INK }} />
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
    <div style={{ height: '100%', paddingRight: RAIL_CLEAR }}>
      <Block size={44}>{weekdayLabel}요일</Block>
      {empty ? (
        <div
          style={{
            ...DISPLAY,
            color: INK,
            fontSize: '72rem',
            lineHeight: 1.15,
            marginTop: '26rem',
          }}
        >
          시간표
          <br />
          준비 중
        </div>
      ) : (
        <div style={{ marginTop: '18rem', display: 'flex', flexDirection: 'column', gap: '8rem' }}>
          {periods.slice(0, 7).map((p) => (
            // 흰 덩어리를 노랑 위에 얹으면 프로젝터에서도 줄이 또렷하게 끊긴다.
            <div
              key={p.period}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18rem',
                background: WHITE,
                padding: '10rem 16rem',
              }}
            >
              <span
                style={{
                  ...DISPLAY,
                  background: INK,
                  color: YELLOW,
                  fontSize: '38rem',
                  lineHeight: 1,
                  padding: '11rem 16rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.period}
              </span>
              <span
                style={{
                  ...SANS,
                  color: INK,
                  fontSize: '44rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-1rem',
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {p.subject}
              </span>
              <span
                style={{
                  ...SANS,
                  color: INK,
                  fontSize: '34rem',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {p.teacher}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const poster: ThemeSkin = {
  id: 'poster',
  name: '포스터',
  blurb: '노랑 바탕에 검정 덩어리. 세로로 세운 날짜가 붙은 축제 대자보.',
  chip: [YELLOW, INK, ORANGE],
  fonts: ['BlackHanSans', 'Pretendard'],
  tokens: {
    '--bg': YELLOW,
    '--fg': INK,
    '--accent': ORANGE,
    '--paper': WHITE,
  },
  geometry: { columns: '1.2fr 1fr', columnGap: 48, padding: 60, headerGap: 36 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default poster
