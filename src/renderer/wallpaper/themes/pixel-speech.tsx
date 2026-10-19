import type { CSSProperties, ReactNode } from 'react'
import type {
  CornerProps,
  HeaderProps,
  MealPanelProps,
  ThemeSkin,
  TimetablePanelProps,
} from '../../../shared/theme'
import { getThemeMeta } from '../../../shared/themeCatalog'
import { MEAL_KEYS, MEAL_LABELS } from '../../../shared/types'
import { fitRem, useFitToSlot } from '../fitToSlot'

const BLACK = '#000000'
const WHITE = '#FFFFFF'
const DIM = '#A8A8A8'

const PIXEL: CSSProperties = {
  fontFamily: "'Neodgm', monospace",
  color: WHITE,
}

/** 사용자 레퍼런스의 말풍선과 작은 픽셀 캐릭터를 해상도 독립적인 도형으로 다시 그린다. */
function Ground({ children }: { children: ReactNode }) {
  const decoration: CSSProperties = { opacity: 'var(--frame-decoration, 0)' }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BLACK }}>
      <div
        style={{
          ...decoration,
          position: 'absolute',
          left: 'calc(var(--frame-left, 30rem) - 28rem)',
          top: 'calc(var(--frame-top, 30rem) - 28rem)',
          right: 'calc(var(--frame-right, 30rem) - 28rem)',
          bottom: 'calc(var(--frame-bottom, 30rem) - 28rem)',
          border: `7rem solid ${WHITE}`,
        }}
      >
        {/* 말풍선 꼬리를 픽셀 계단 두 칸으로 만든다. */}
        <div
          style={{
            position: 'absolute',
            right: '84rem',
            bottom: '-55rem',
            width: '70rem',
            height: '55rem',
            borderRight: `7rem solid ${WHITE}`,
            borderBottom: `7rem solid ${WHITE}`,
          }}
        />
      </div>

      <svg
        viewBox="0 0 330 300"
        aria-hidden="true"
        style={{
          ...decoration,
          position: 'absolute',
          right: '54rem',
          bottom: '30rem',
          width: '315rem',
          height: '286rem',
        }}
      >
        <path
          d="M65 20H265V85H325V155H270V285H220V220H175V285H125V220H80V285H30V155H5V85H65Z"
          fill={BLACK}
          stroke={WHITE}
          strokeWidth="8"
          strokeLinejoin="miter"
        />
        <rect x="95" y="55" width="36" height="42" fill={WHITE} />
        <rect x="213" y="55" width="36" height="42" fill={WHITE} />
      </svg>
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  )
}

function Header({ dateLabel, weekdayLabel, grade, classNo, stale }: HeaderProps) {
  return (
    <div
      style={{
        ...PIXEL,
        display: 'flex',
        alignItems: 'center',
        gap: '22rem',
        paddingBottom: '18rem',
        borderBottom: `5rem solid ${WHITE}`,
      }}
    >
      <span style={{ fontSize: '50rem', lineHeight: 1 }}>{dateLabel}</span>
      <span style={{ fontSize: '38rem', lineHeight: 1, color: DIM }}>{weekdayLabel}요일</span>
      <span style={{ flex: 1 }} />
      {stale ? <span style={{ fontSize: '28rem', color: DIM }}>[ SAVE ]</span> : null}
      <span style={{ fontSize: '38rem', lineHeight: 1 }}>{grade}학년 {classNo}반</span>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14rem', marginBottom: '16rem' }}>
      <span style={{ width: '14rem', height: '14rem', background: WHITE }} />
      <span style={{ fontSize: '38rem', lineHeight: 1 }}>{children}</span>
    </div>
  )
}

function MealPanel({ meals, empty }: MealPanelProps) {
  // 메뉴가 많은 날은 제목 아래 남은 높이에 맞춰 본문만 줄인다. 제목은 그대로 둬야
  // 옆 칼럼 제목과 크기가 맞는다.
  const { boxRef, contentRef } = useFitToSlot()

  return (
    <div
      style={{
        ...PIXEL,
        height: '100%',
        paddingRight: '34rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SectionTitle>오늘의 급식</SectionTitle>
      <div ref={boxRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: fitRem(18) }}>
          {empty ? (
            <div style={{ fontSize: fitRem(36), color: DIM }}>NO MENU DATA</div>
          ) : (
            MEAL_KEYS.map((key) => {
              const items = meals[key] ?? []
              return (
                <div
                  key={key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `${fitRem(80)} 1fr`,
                    gap: fitRem(14),
                  }}
                >
                  <span
                    style={{
                      alignSelf: 'start',
                      padding: `${fitRem(7)} ${fitRem(8)}`,
                      border: `${fitRem(4)} solid ${WHITE}`,
                      fontSize: fitRem(30),
                      lineHeight: 1,
                      textAlign: 'center',
                    }}
                  >
                    {MEAL_LABELS[key]}
                  </span>
                  <span style={{ fontSize: fitRem(35), lineHeight: 1.32, wordBreak: 'keep-all' }}>
                    {items.length ? items.join(' · ') : '---'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function TimetablePanel({ periods, weekdayLabel, empty }: TimetablePanelProps) {
  return (
    <div
      style={{
        ...PIXEL,
        height: '100%',
        paddingLeft: '36rem',
        borderLeft: `5rem solid ${WHITE}`,
      }}
    >
      <SectionTitle>{weekdayLabel}요일 시간표</SectionTitle>
      {empty ? (
        <div style={{ fontSize: '36rem', color: DIM }}>NO CLASS DATA</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9rem' }}>
          {periods.slice(0, 7).map((period) => (
            <div
              key={period.period}
              style={{ display: 'grid', gridTemplateColumns: '46rem 1fr auto', alignItems: 'center', gap: '14rem' }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '38rem',
                  height: '38rem',
                  background: WHITE,
                  color: BLACK,
                  fontSize: '28rem',
                  lineHeight: 1,
                }}
              >
                {period.period}
              </span>
              <span style={{ fontSize: '38rem', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {period.subject}
              </span>
              <span style={{ fontSize: '27rem', lineHeight: 1, color: DIM }}>{period.teacher}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 상자 오른쪽 아래 빈 자리의 디데이. 두 칸짜리 격자 아래, 캐릭터 위가 비어 있다.
 * 그 자리를 채우는 유일한 요소이므로 테마에서 가장 큰 글자 크기를 쓴다.
 */
function Corner({ label }: CornerProps) {
  return (
    <div
      style={{
        ...PIXEL,
        fontSize: '200rem',
        lineHeight: 0.85,
        letterSpacing: '-6rem',
        textAlign: 'right',
        whiteSpace: 'nowrap',
        // 글자 뒤로 칼럼 구분선이 지나간다. 바탕색으로 끊어 주지 않으면
        // 글자 아래로 선 토막이 남아 그어진 것처럼 보인다.
        background: BLACK,
        padding: '0 22rem 20rem',
        marginBottom: '-20rem',
      }}
    >
      {label}
    </div>
  )
}

const meta = getThemeMeta('pixel-speech')

const pixelSpeech: ThemeSkin = {
  id: meta.id,
  name: meta.name,
  blurb: meta.blurb,
  chip: meta.chip,
  fonts: ['Neodgm'],
  tokens: { '--bg': BLACK, '--fg': WHITE, '--dim': DIM },
  geometry: {
    columns: '1.15fr 0.9fr',
    columnGap: 0,
    padding: 72,
    paddingTop: 90,
    paddingRight: 390,
    paddingBottom: 285,
    headerGap: 28,
  },
  Ground,
  Header,
  MealPanel,
  TimetablePanel,
  Corner,
}

export default pixelSpeech
