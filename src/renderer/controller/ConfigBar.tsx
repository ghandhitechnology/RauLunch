import type { KeyboardEvent } from 'react'

import {
  REFRESH_INTERVAL_LABELS,
  VALID_CLASSES,
  VALID_GRADES,
  VALID_REFRESH_INTERVALS,
  type Settings,
  type StatusSnapshot,
} from '../../shared/types'
import { Refresh } from './Glyphs'
import { useRoving } from './hooks'
import { Stepper } from './Stepper'

/** 하단 고정 바. 자주 만지는 것만 올라온다 — 나머지는 설정 화면으로 보낸다. */

export interface ConfigBarProps {
  settings: Settings
  status: StatusSnapshot
  applying: boolean
  onPatch: (patch: Partial<Settings>) => void
  onOpenSettings: () => void
  onRefresh: () => void
  onApply: () => void
}

type Tone = 'idle' | 'busy' | 'fail'

function readStatus(status: StatusSnapshot, applying: boolean): { tone: Tone; text: string } {
  if (status.refreshing) return { tone: 'busy', text: '갱신 중' }
  if (applying) return { tone: 'busy', text: '적용 중' }
  if (status.failCount > 0) return { tone: 'fail', text: `실패 ${status.failCount}회` }
  const stamp = status.appliedAt ?? status.lastSuccessAt
  if (!stamp) return { tone: 'idle', text: '기록 없음' }
  const d = new Date(stamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { tone: 'idle', text: `${hh}:${mm}` }
}

export function ConfigBar({
  settings,
  status,
  applying,
  onPatch,
  onOpenSettings,
  onRefresh,
  onApply,
}: ConfigBarProps) {
  const roving = useRoving(6)
  const { tone, text } = readStatus(status, applying)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      roving.move(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      roving.move(-1)
    }
  }

  const slot = (i: number) => {
    const props = roving.itemProps(i)
    return { tabIndex: props.tabIndex, onFocus: props.onFocus, ref: props.ref }
  }

  return (
    <div className="bar" onKeyDown={onKeyDown}>
      <Stepper
        label="학년"
        values={VALID_GRADES}
        value={settings.grade}
        onChange={(v) => onPatch({ grade: v })}
        {...slot(0)}
      />
      <Stepper
        label="반"
        values={VALID_CLASSES}
        value={settings.classNo}
        onChange={(v) => onPatch({ classNo: v })}
        {...slot(1)}
      />
      <Stepper
        label="갱신"
        values={VALID_REFRESH_INTERVALS}
        value={settings.refreshIntervalMin}
        format={(v) => REFRESH_INTERVAL_LABELS[v] ?? `${v}분`}
        onChange={(v) => onPatch({ refreshIntervalMin: v })}
        {...slot(2)}
      />

      <button className="btn" {...roving.itemProps(3)} onClick={onOpenSettings}>
        설정
      </button>

      <div className="bar-gap" />

      <div className="status" data-tone={tone} title={status.lastError ?? undefined}>
        <span className="status-dot" />
        <span className="status-text">{text}</span>
      </div>

      <button
        className="btn btn-icon"
        data-spin={status.refreshing || undefined}
        {...roving.itemProps(4)}
        onClick={onRefresh}
        aria-label="다시 받아오기"
      >
        <Refresh />
      </button>

      <button
        className="btn btn-primary"
        {...roving.itemProps(5)}
        onClick={onApply}
        disabled={applying}
      >
        적용
      </button>
    </div>
  )
}
