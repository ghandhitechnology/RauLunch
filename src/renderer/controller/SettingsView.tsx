import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  REFRESH_INTERVAL_LABELS,
  VALID_CLASSES,
  VALID_GRADES,
  VALID_REFRESH_INTERVALS,
  type Settings,
} from '../../shared/types'
import { Close } from './Glyphs'
import { useOverlay } from './hooks'
import { Stepper } from './Stepper'

/**
 * 설정 화면. 새 창을 띄우지 않고 테마 띠 위로 덮어 내려온다 —
 * 창이 하나뿐이어야 "작은 기계" 라는 인상이 유지된다.
 */

const WEEKDAYS = ['월', '화', '수', '목', '금']
const PERIOD_COUNT = 7

export interface SettingsViewProps {
  settings: Settings
  onPatch: (patch: Partial<Settings>) => void
  onClose: () => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="srow">
      <span className="srow-label">{label}</span>
      <div className="srow-control">{children}</div>
    </div>
  )
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      className="toggle"
      data-stop
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-on={on || undefined}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          onChange(true)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onChange(false)
        }
      }}
    >
      <span className="toggle-knob" />
    </button>
  )
}

export function SettingsView({ settings, onPatch, onClose }: SettingsViewProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [day, setDay] = useState(WEEKDAYS[0])
  const [teacherDraft, setTeacherDraft] = useState(settings.teacherNames.join('\n'))

  const manual = settings.manualTimetable[day] ?? []

  const setPeriod = (index: number, text: string) => {
    const next = Array.from({ length: PERIOD_COUNT }, (_, i) => manual[i] ?? '')
    next[index] = text
    const trimmed = [...next]
    while (trimmed.length > 0 && trimmed[trimmed.length - 1].trim() === '') trimmed.pop()
    onPatch({ manualTimetable: { ...settings.manualTimetable, [day]: trimmed } })
  }

  const saveTeacherNames = () => {
    const teacherNames = teacherDraft
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean)
    const unique = [...new Set(teacherNames)]
    if (unique.join('\u0000') !== settings.teacherNames.join('\u0000')) {
      onPatch({ teacherNames: unique })
    }
  }

  const closeSettings = () => {
    saveTeacherNames()
    onClose()
  }

  const ref = useOverlay(true, closeSettings)

  // 세로로 쌓인 목록이므로 위아래는 항목 이동. 글자를 치는 중이면 건드리지 않는다.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
    const items = Array.from(
      bodyRef.current?.querySelectorAll<HTMLElement>('[data-stop]') ?? [],
    )
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    const next = at + (e.key === 'ArrowDown' ? 1 : -1)
    items[Math.max(0, Math.min(items.length - 1, next))]?.focus()
  }

  return (
    <div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label="설정">
      <header className="sheet-head">
        <h2 className="sheet-title">설정</h2>
        <button className="btn btn-icon" onClick={closeSettings} aria-label="닫기" data-autofocus>
          <Close />
        </button>
      </header>

      <div className="sheet-body" ref={bodyRef} onKeyDown={onKeyDown}>
        <Row label="학년">
          <Stepper
            label="학년"
            size="row"
            values={VALID_GRADES}
            value={settings.grade}
            onChange={(v) => onPatch({ grade: v })}
          />
        </Row>
        <Row label="반">
          <Stepper
            label="반"
            size="row"
            values={VALID_CLASSES}
            value={settings.classNo}
            onChange={(v) => onPatch({ classNo: v })}
          />
        </Row>
        <Row label="갱신 주기">
          <Stepper
            label="갱신 주기"
            size="row"
            values={VALID_REFRESH_INTERVALS}
            value={settings.refreshIntervalMin}
            format={(v) => REFRESH_INTERVAL_LABELS[v] ?? `${v}분`}
            onChange={(v) => onPatch({ refreshIntervalMin: v })}
          />
        </Row>
        <Row label="부팅 시 자동 실행">
          <Toggle
            label="부팅 시 자동 실행"
            on={settings.autostart}
            onChange={(v) => onPatch({ autostart: v })}
          />
        </Row>
        <Row label="아이콘 여백">
          <div className="slider">
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.01}
              value={settings.iconSafeRatio}
              onChange={(e) => onPatch({ iconSafeRatio: Number(e.target.value) })}
              aria-label="아이콘 여백"
              data-stop
            />
            <span className="slider-value">{Math.round(settings.iconSafeRatio * 100)}%</span>
          </div>
        </Row>
        <Row label="수동 시간표 우선">
          <Toggle
            label="수동 시간표 우선"
            on={settings.preferManualTimetable}
            onChange={(v) => onPatch({ preferManualTimetable: v })}
          />
        </Row>

        <section className="teacher-editor">
          <label htmlFor="teacher-names">교사 이름</label>
          <span>한 줄에 한 명씩 입력하면 시간표의 *를 완성합니다.</span>
          <textarea
            id="teacher-names"
            value={teacherDraft}
            onChange={(e) => setTeacherDraft(e.target.value)}
            onBlur={saveTeacherNames}
            placeholder={'김완수\n이민지'}
            spellCheck={false}
            data-stop
          />
        </section>

        <section className="editor">
          <div className="editor-tabs" role="tablist" aria-label="요일">
            {WEEKDAYS.map((w) => (
              <button
                key={w}
                role="tab"
                aria-selected={w === day}
                className="tab"
                data-on={w === day || undefined}
                onClick={() => setDay(w)}
                data-stop
              >
                {w}
              </button>
            ))}
          </div>
          <div className="editor-grid">
            {Array.from({ length: PERIOD_COUNT }, (_, i) => (
              <label className="field" key={i}>
                <span className="field-no">{i + 1}</span>
                <input
                  value={manual[i] ?? ''}
                  onChange={(e) => setPeriod(i, e.target.value)}
                  spellCheck={false}
                  aria-label={`${day}요일 ${i + 1}교시`}
                  data-stop
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
