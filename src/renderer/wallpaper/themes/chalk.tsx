import type { CSSProperties, ReactNode } from 'react'
import type {
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'

/**
 * 분필.
 *
 * 이 테마만은 목표가 "예쁜 화면"이 아니라 착각이다. 빔이 칠판에 닿는 순간
 * 어두운 바탕은 빛이 거의 나가지 않아 진짜 칠판이 그대로 비치고, 밝은 획만
 * 남는다. 그러면 아침에 누군가 오늘 메뉴를 손으로 적어둔 것처럼 보인다.
 * 그 착각을 깨는 건 (1) 자로 잰 듯한 직선과 (2) 균일한 두께다. 그래서 모든
 * 밑줄은 두 번 그은 겹선이고, 아주 조금씩 기울어 있다.
 *
 * 질감은 반복 그러데이션 한 겹뿐이다. 흐림·그림자는 프로젝터에서 그냥 뿌옇게
 * 번지기만 하므로 쓰지 않는다.
 */

const BOARD = '#1E2B22'
const CHALK = '#F4F1E8'
const LEMON = '#F7E08A'
const ROSE = '#F5B3C4'

const PEN: CSSProperties = { fontFamily: "'NanumPen', cursive" }

/** 손으로 그은 선은 매번 다르게 흔들려야 한다. 순서를 넣으면 늘 같은 값이 나온다. */
const TILTS = [-0.55, 0.4, -0.3, 0.6, -0.45, 0.35, -0.6, 0.5]
function tilt(i: number): string {
  return `rotate(${TILTS[i % TILTS.length]}deg)`
}

/**
 * 겹선 밑줄. 분필로 밑줄을 그으면 한 번에 끝나는 법이 없어서
 * 길이가 다른 두 획이 살짝 어긋나게 겹친다.
 */
function DoubleRule({ color, seed = 0 }: { color: string; seed?: number }) {
  return (
    <div style={{ marginTop: '6rem' }}>
      <div
        style={{
          height: '5rem',
          background: color,
          transform: tilt(seed),
          transformOrigin: 'left center',
        }}
      />
      <div
        style={{
          height: '4rem',
          background: color,
          width: '86%',
          marginTop: '7rem',
          marginLeft: '4rem',
          transform: tilt(seed + 1),
          transformOrigin: 'left center',
        }}
      />
    </div>
  )
}

function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: BOARD }}>
      {/* 지우고 남은 분필 가루. 사선 두 방향이 서로 어긋나야 결이 생긴다. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'repeating-linear-gradient(102deg, rgba(244,241,232,0.05) 0 2rem, transparent 2rem 23rem)',
            'repeating-linear-gradient(76deg, rgba(244,241,232,0.035) 0 3rem, transparent 3rem 41rem)',
          ].join(','),
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div style={{ ...PEN, color: CHALK }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '26rem' }}>
        <span style={{ fontSize: '86rem', lineHeight: 0.95 }}>
          {grade}학년 {classNo}반
        </span>
        <span style={{ fontSize: '68rem', lineHeight: 0.95, color: LEMON }}>
          {dateLabel} {weekdayLabel}요일
        </span>
        <span style={{ flex: 1 }} />
        {stale ? (
          <span style={{ fontSize: '42rem', lineHeight: 1, color: ROSE }}>
            어제 적어둔 것
          </span>
        ) : null}
      </div>
      <DoubleRule color={CHALK} seed={0} />
    </div>
  )
}

/** 칸 제목. 분필로 쓰고 그 아래를 두 번 긋는다. */
function Section({ text, note, color, seed }: {
  text: string
  note?: string
  color: string
  seed: number
}) {
  return (
    <div style={{ marginBottom: '14rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16rem' }}>
        <span style={{ fontSize: '58rem', lineHeight: 1, color }}>{text}</span>
        {note ? (
          <span style={{ fontSize: '36rem', lineHeight: 1, color: CHALK }}>{note}</span>
        ) : null}
      </div>
      <DoubleRule color={color} seed={seed} />
    </div>
  )
}

/** 메뉴 한 줄. 앞의 점은 분필을 톡 찍은 자국이다. */
function Item({ name, dot, seed }: { name: string; dot: string; seed: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '11rem',
        maxWidth: '100%',
      }}
    >
      <span
        style={{
          width: '12rem',
          height: '12rem',
          borderRadius: '50%',
          background: dot,
          flex: 'none',
        }}
      />
      <span
        style={{
          fontSize: '46rem',
          lineHeight: 1.05,
          color: CHALK,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          transform: tilt(seed),
        }}
      >
        {name}
      </span>
    </span>
  )
}

const MEAL_TONE: Record<string, string> = { 조식: LEMON, 중식: CHALK, 석식: ROSE }

function MealPanel({ meals, empty }: MealPanelProps) {
  if (empty) {
    return (
      <div style={{ ...PEN, color: CHALK }}>
        <Section text="오늘 급식" color={LEMON} seed={2} />
        <div style={{ fontSize: '50rem', lineHeight: 1.35, marginTop: '24rem' }}>
          아직 아무것도 적혀 있지 않습니다.
          <br />
          <span style={{ color: ROSE }}>급식표를 받아오면 여기에 씁니다.</span>
        </div>
      </div>
    )
  }
  return (
    <div style={{ ...PEN, display: 'flex', flexDirection: 'column', gap: '30rem' }}>
      {MEAL_KEYS.map((key, si) => {
        const items = meals[key] ?? []
        const tone = MEAL_TONE[key] ?? CHALK
        return (
          <div key={key}>
            <Section text={MEAL_LABELS[key]} color={tone} seed={si * 2 + 1} />
            {items.length === 0 ? (
              <span style={{ fontSize: '44rem', lineHeight: 1.1, color: CHALK }}>없음</span>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  columnGap: '30rem',
                  rowGap: '12rem',
                }}
              >
                {items.map((name, i) => (
                  <Item key={`${name}-${i}`} name={name} dot={tone} seed={si + i} />
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
    <div style={{ ...PEN, color: CHALK, height: '100%' }}>
      <Section text="시간표" note={`${weekdayLabel}요일`} color={CHALK} seed={5} />
      {empty ? (
        <div style={{ fontSize: '48rem', lineHeight: 1.35, marginTop: '20rem' }}>
          시간표를 못 받아왔습니다.
          <br />
          <span style={{ color: LEMON }}>칠판 옆 게시판을 보세요.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem' }}>
          {periods.slice(0, 7).map((p, i) => (
            <div
              key={p.period}
              style={{ display: 'flex', alignItems: 'center', gap: '20rem' }}
            >
              {/* 교시 번호는 분필로 동그라미를 쳐 둔다. 원도 손으로 그리면 안 닫힌다. */}
              <span
                style={{
                  flex: 'none',
                  width: '62rem',
                  height: '62rem',
                  borderRadius: '50%',
                  border: `4rem solid ${LEMON}`,
                  borderRightColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42rem',
                  lineHeight: 1,
                  color: LEMON,
                  transform: tilt(i),
                }}
              >
                {p.period}
              </span>
              <span
                style={{
                  fontSize: '50rem',
                  lineHeight: 1.05,
                  flex: '0 1 auto',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  transform: tilt(i + 3),
                }}
              >
                {p.subject}
              </span>
              {/* 담당 선생님은 과목 바로 뒤에 붙여 쓴다. 오른쪽 끝으로 밀면
                  어느 과목의 이름인지 눈이 다시 찾아가야 한다. */}
              {p.teacher ? (
                <span
                  style={{
                    fontSize: '40rem',
                    lineHeight: 1,
                    color: CHALK,
                    flex: 'none',
                    transform: tilt(i + 5),
                  }}
                >
                  {p.teacher}
                </span>
              ) : null}
              <span style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const chalk: ThemeSkin = {
  id: 'chalk',
  name: '분필',
  blurb: '누군가 아침에 칠판에 적어둔 것처럼. 어두운 바탕 위 분필 손글씨.',
  chip: [BOARD, CHALK, LEMON],
  fonts: ['NanumPen'],
  tokens: {
    '--bg': BOARD,
    '--fg': CHALK,
    '--rule': CHALK,
    '--accent': LEMON,
    '--accent2': ROSE,
  },
  geometry: { columns: '1.2fr 1fr', columnGap: 68, padding: 74, headerGap: 44 },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
}

export default chalk
