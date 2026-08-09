import { useCallback, useEffect, useMemo, useState } from 'react'

import { EMPTY_DATA } from '../../shared/fixtures'
import type { AppState, Settings, ThemeId, WallpaperData } from '../../shared/types'
import { getTheme } from '../wallpaper/themes'
import { api, isMac } from './api'
import { ConfigBar } from './ConfigBar'
import { Close, Minimize } from './Glyphs'
import { PreviewOverlay } from './PreviewOverlay'
import { SettingsView } from './SettingsView'
import { ThemeStrip } from './ThemeStrip'
import { TileRow } from './TileRow'

/**
 * 컨트롤러 창 전체.
 *
 * 화면은 위에서부터 창 손잡이 / 타일 / 테마 띠 / 설정 바, 네 층이다.
 * 테마 커서는 설정값과 따로 논다 — 커서를 옮기면 타일이 먼저 갈아입고(미리보기),
 * 정하고 나서야 설정에 저장된다. 고르는 동안 결과가 보여야 고를 수 있다.
 */

export function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [cursor, setCursor] = useState<ThemeId | null>(null)
  const [sheet, setSheet] = useState<'none' | 'settings' | 'preview'>('none')
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
  const data: WallpaperData = useMemo(() => {
    if (state?.data) return state.data
    return {
      ...EMPTY_DATA,
      grade: settings?.grade ?? EMPTY_DATA.grade,
      classNo: settings?.classNo ?? EMPTY_DATA.classNo,
    }
  }, [state?.data, settings?.grade, settings?.classNo])

  if (!state || !settings || !cursor) return <div className="app" />

  const skin = getTheme(cursor)

  return (
    <div className="app">
      {/* 창 손잡이. macOS 에서는 OS 신호등이 왼쪽 위를 쓰므로 그 자리를 비우고
          우리 버튼은 그리지 않는다. 나머지 플랫폼은 프레임이 아예 없어서 직접 그린다. */}
      <header className="chrome" data-mac={isMac || undefined}>
        <span className="chrome-title">급식 컨트롤러</span>
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

      <main className="main">
        <TileRow skin={skin} data={data} onOpenPreview={() => setSheet('preview')} />

        <ThemeStrip
          cursorId={cursor}
          appliedId={settings.theme}
          onCursor={setCursor}
          onApply={(id) => patch({ theme: id })}
        />

        {sheet === 'settings' && (
          <SettingsView settings={settings} onPatch={patch} onClose={() => setSheet('none')} />
        )}
        {sheet === 'preview' && (
          <PreviewOverlay
            skin={skin}
            data={data}
            iconSafeRatio={settings.iconSafeRatio}
            onClose={() => setSheet('none')}
          />
        )}
      </main>

      <ConfigBar
        settings={settings}
        status={state.status}
        applying={applying}
        onPatch={patch}
        onOpenSettings={() => setSheet('settings')}
        onRefresh={() => void api.refresh()}
        onApply={() => void applyWallpaper()}
      />
    </div>
  )
}
