import { BrowserWindow, ipcMain } from 'electron'
import type { AppState, Settings } from '../shared/types'
import { isCaptureWindow } from './capture'

/**
 * renderer ↔ main 사이의 유일한 통로.
 *
 * ControllerApi(shared/types.ts) 의 메서드 하나에 채널 하나가 정확히 대응한다.
 * 여기에는 어떤 판단도 두지 않는다 — 전부 index.ts 가 넘겨준 콜백으로 흘린다.
 * 그래야 "무엇을 할 수 있는가"(이 파일)와 "실제로 무엇을 하는가"(index.ts)가 안 섞인다.
 */

export const CH = {
  getState: 'controller:get-state',
  setSettings: 'controller:set-settings',
  refresh: 'controller:refresh',
  applyWallpaper: 'controller:apply-wallpaper',
  minimizeToTray: 'controller:minimize-to-tray',
  closeWindow: 'controller:close-window',
  /** main → renderer 단방향 푸시. */
  state: 'state',
} as const

export interface IpcDeps {
  getState(): AppState
  setSettings(patch: Partial<Settings>): Promise<AppState>
  refresh(): Promise<AppState>
  applyWallpaper(): Promise<{ ok: boolean; detail: string }>
  minimizeToTray(): void
  closeWindow(): void
}

export function registerIpc(deps: IpcDeps): void {
  ipcMain.handle(CH.getState, () => deps.getState())
  ipcMain.handle(CH.setSettings, (_e, patch: Partial<Settings>) => deps.setSettings(patch ?? {}))
  ipcMain.handle(CH.refresh, () => deps.refresh())
  ipcMain.handle(CH.applyWallpaper, () => deps.applyWallpaper())
  ipcMain.handle(CH.minimizeToTray, () => {
    deps.minimizeToTray()
  })
  ipcMain.handle(CH.closeWindow, () => {
    deps.closeWindow()
  })
}

/** 상태가 바뀔 때마다 살아 있는 모든 창에 통째로 밀어 넣는다. 부분 갱신은 두지 않는다. */
export function broadcastState(state: AppState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    // 캡처 창은 이 방송을 들을 이유가 없다 — preload 도 없고, 로딩 중일 수도 있다.
    if (win.isDestroyed() || isCaptureWindow(win)) continue
    win.webContents.send(CH.state, state)
  }
}
