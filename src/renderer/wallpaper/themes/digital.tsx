import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 디지털.
 *
 * 터미널 형제 둘과 같은 픽셀 폰트를 쓰지만 정체가 다르다 — 이건 화면이 아니라
 * 계산기 LCD 다. 그래서 글자가 빛나지 않고, 연녹색 액정 위에 짙은 올리브색
 * 세그먼트가 "가려져서" 보인다. 꺼진 세그먼트(8자 유령)를 옅은 톤으로 미리
 * 깔아두면 그림자 없이도 액정 특유의 느낌이 나온다.
 *
 * 구조도 갈라놓았다: 터미널이 흐르는 출력이라면 이쪽은 칸이 딱딱 맞물린 격자다.
 */

const LCD = '#C8D66B'
const SEGMENT = '#1B2205'
// 꺼진 세그먼트. 배경보다 살짝 어두운 정도로만 — 글자로는 절대 쓰지 않는다.
const GHOST = '#A9B94F'
// 액정 안쪽 밝은 칸. 값이 들어가는 자리를 구분한다.
const WELL = '#E0E9AC'

const LCD_FONT: CSSProperties = {
  fontFamily: "'Neodgm', monospace",
  letterSpacing: '2rem',
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: LCD }}>
      {/* 액정 화소 격자. 평면 반복 패턴. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to bottom, ${GHOST} 0 3rem, transparent 3rem 12rem)`,
          opacity: 0.5,
        }}
      />
      {/* 베젤. 두께만 있는 평면 테두리라 입체감이 생기지 않는다. */}
      <div
        style={{
          position: 'absolute',
          inset: '18rem',
          border: `9rem solid ${SEGMENT}`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

/** 꺼진 세그먼트 위에 켜진 숫자를 겹쳐 놓는다. 그림자 없이 액정 느낌만 낸다. */
function SegmentNumber({ value, size }: { value: number; size: number }) {
  const text = String(value)
  const box: CSSProperties = {
    ...LCD_FONT,
    fontSize: `${size}rem`,
    lineHeight: 1,
    gridArea: '1 / 1',
    textAlign: 'center',
  }
  return (
    <span style={{ display: 'grid', minWidth: `${Math.round(size * 0.85)}rem` }}>
      <span style={{ ...box, color: GHOST }}>{'8'.repeat(text.length)}</span>
      <span style={{ ...box, color: SEGMENT }}>{text}</span>
    </span>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div
      style={{
        ...LCD_FONT,
        color: SEGMENT,
        display: 'flex',
        alignItems: 'center',
        gap: '20rem',
        border: `5rem solid ${SEGMENT}`,
        background: WELL,
        padding: '14rem 22rem',
      }}
    >
      <span style={{ fontSize: '58rem', lineHeight: 1 }}>{dateLabel}</span>
      <span
        style={{
          fontSize: '38rem',
          lineHeight: 1,
          background: SEGMENT,
          color: LCD,
          padding: '10rem 16rem',
        }}
      >
        {weekdayLabel}
      </span>
      <span style={{ flex: 1 }} />
      {stale ? (
        <span style={{ fontSize: '34rem', lineHeight: 1, color: SEGMENT }}>예전 자료</span>
      ) : null}
      <span style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
        <SegmentNumber value={grade} size={58} />
        <span style={{ fontSize: '40rem', lineHeight: 1 }}>학년</span>
        <SegmentNumber value={classNo} size={58} />
        <span style={{ fontSize: '40rem', lineHeight: 1 }}>반</span>
      </span>
    </div>
  )
}

/** 칸 왼쪽에 붙는 라벨판. 계산기의 인쇄된 표시등 자리다. */
function Plate({ text }: { text: string }) {
  return (
    <span
      style={{
        ...LCD_FONT,
        fontSize: '40rem',
        lineHeight: 1.1,
        background: SEGMENT,
        color: LCD,
        padding: '12rem 14rem',
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div
        style={{
          ...LCD_FONT,
          color: SEGMENT,
          border: `5rem solid ${SEGMENT}`,
          background: WELL,
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex' }}>
          <Plate text="급식" />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '30rem 20rem',
          }}
        >
          <div style={{ fontSize: '88rem', lineHeight: 1, color: GHOST }}>-- -- --</div>
          <div style={{ fontSize: '44rem', lineHeight: 1, marginTop: '22rem' }}>자료 없음</div>
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        ...LCD_FONT,
        color: SEGMENT,
        border: `5rem solid ${SEGMENT}`,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {MEAL_KEYS.map((key, idx) => {
        const items = meals[key] ?? []
        return (
          <div
            key={key}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'stretch',
              background: WELL,
              // 칸끼리 굵은 선 하나를 공유한다. 계산기 표시창처럼 딱 맞물리게.
              borderTop: idx === 0 ? 'none' : `5rem solid ${SEGMENT}`,
            }}
          >
            <Plate text={MEAL_LABELS[key]} />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexWrap: 'wrap',
                alignContent: 'center',
                gap: '6rem 12rem',
                padding: '14rem 16rem',
              }}
            >
              {items.length === 0 ? (
                <span style={{ fontSize: '44rem', lineHeight: 1.1, color: GHOST }}>------</span>
              ) : (
                items.map((name, i) => (
                  <span key={`${name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
                    {/* 구분선은 이름 앞에 붙인다. 뒤에 붙이면 줄이 바뀔 때
                        줄 끝에 선만 덩그러니 남는다. */}
                    {i > 0 ? (
                      <span style={{ width: '3rem', height: '36rem', background: GHOST }} />
                    ) : null}
                    <span style={{ fontSize: '46rem', lineHeight: 1.15 }}>{name}</span>
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
  return (
    <div
      style={{
        ...LCD_FONT,
        color: SEGMENT,
        border: `5rem solid ${SEGMENT}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', background: WELL }}>
        <Plate text="시간표" />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '38rem', lineHeight: 1, padding: '0 18rem' }}>{weekdayLabel}</span>
      </div>
      {empty ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: WELL,
            borderTop: `5rem solid ${SEGMENT}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '30rem 20rem',
          }}
        >
          <div style={{ fontSize: '88rem', lineHeight: 1, color: GHOST }}>-- -- --</div>
          <div style={{ fontSize: '44rem', lineHeight: 1, marginTop: '22rem' }}>자료 없음</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {periods.slice(0, 7).map((p) => (
            <div
              key={p.period}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '16rem',
                background: WELL,
                borderTop: `5rem solid ${SEGMENT}`,
                padding: '0 16rem',
                minHeight: 0,
              }}
            >
              <SegmentNumber value={p.period} size={46} />
              <span style={{ width: '3rem', alignSelf: 'stretch', background: GHOST }} />
              <span
                style={{
                  fontSize: '46rem',
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
                <span style={{ fontSize: '34rem', lineHeight: 1.1 }}>{p.teacher}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const digital: ThemeSkin = {
  id: 'digital',
  name: '디지털',
  blurb: '연녹색 액정에 짙은 세그먼트. 계산기 표시창을 그대로 옮겼다.',
  chip: [LCD, SEGMENT, GHOST],
  fonts: ['Neodgm'],
  tokens: {
    '--bg': LCD,
    '--fg': SEGMENT,
    '--ghost': GHOST,
    '--well': WELL,
  },
  geometry: { columns: '1.15fr 1fr', columnGap: 52, padding: 78, headerGap: 36 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default digital
