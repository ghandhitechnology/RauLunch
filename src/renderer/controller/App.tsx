import { useCallback, useEffect, useState } from 'react'

import type { AppState, Settings, ThemeId } from '../../shared/types'
import { api, isMac } from './api'
import { ConfigBar } from './ConfigBar'
import { Close, Minimize } from './Glyphs'
import { SettingsView } from './SettingsView'
import { ThemeStrip } from './ThemeStrip'

/**
 * 컨트롤러 창 전체.
 *
 * 화면은 창 손잡이 아래에 사이드바(설정)와 테마 띠가 나란히 앉는다.
 * 테마 커서는 설정값과 따로 논다 — 고르면 바로 저장되고,
 * 적용된 테마에는 체크가 붙는다.
 */

export function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [cursor, setCursor] = useState<ThemeId | null>(null)
  const [sheet, setSheet] = useState<'none' | 'settings'>('none')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    let alive = true
    api.getState().then((s) => {
      if (!alive) return
      setState(s)
      setCursor((c) => c ?? s.settings.theme)
    })
    const off = api.onState((s) => {
      if (alive) setState(s)
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  const patch = useCallback((p: Partial<Settings>) => {
    setState((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...p } } : prev))
    void api.setSettings(p)
  }, [])

  const applyWallpaper = useCallback(async () => {
    setApplying(true)
    try {
      await api.applyWallpaper()
    } finally {
      setApplying(false)
    }
  }, [])

  const settings = state?.settings

  if (!state || !settings || !cursor) return <div className="app" />

  return (
    <div className="app">
      {/* 창 손잡이. macOS 에서는 OS 신호등이 왼쪽 위를 쓰므로 그 자리를 비우고
          우리 버튼은 그리지 않는다. 나머지 플랫폼은 프레임이 아예 없어서 직접 그린다. */}
      <header className="chrome" data-mac={isMac || undefined}>
        <span className="chrome-title">ㅁㄴㅇ</span>
        {!isMac && (
          <div className="chrome-buttons">
            <button
              className="chrome-btn"
              onClick={() => void api.minimizeToTray()}
              aria-label="트레이로 내리기"
            >
              <Minimize />
            </button>
            <button
              className="chrome-btn chrome-btn-close"
              onClick={() => void api.closeWindow()}
              aria-label="닫기"
            >
              <Close />
            </button>
          </div>
        )}
      </header>

      <div className="body">
        <ConfigBar
          settings={settings}
          status={state.status}
          applying={applying}
          onPatch={patch}
          onOpenSettings={() => setSheet('settings')}
          onRefresh={() => void api.refresh()}
          onApply={() => void applyWallpaper()}
        />

        <main className="main">
          <ThemeStrip
            cursorId={cursor}
            appliedId={settings.theme}
            onCursor={setCursor}
            onApply={(id) => patch({ theme: id })}
          />

          {sheet === 'settings' && (
            <SettingsView settings={settings} onPatch={patch} onClose={() => setSheet('none')} />
          )}
        </main>
      </div>
    </div>
  )
}
