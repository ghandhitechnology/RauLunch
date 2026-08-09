import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, ControllerApi, Settings } from '../shared/types'

/**
 * renderer 에 노출되는 유일한 표면.
 *
 * 채널 이름은 main/ipc.ts 의 CH 와 같은 문자열을 손으로 맞춰 적는다.
 * preload 번들이 main 쪽 모듈을 끌어오면 electron 의 main 전용 API 까지 딸려오므로
 * 여기서는 일부러 import 하지 않는다.
 */
const CH = {
  getState: 'controller:get-state',
  setSettings: 'controller:set-settings',
  refresh: 'controller:refresh',
  applyWallpaper: 'controller:apply-wallpaper',
  minimizeToTray: 'controller:minimize-to-tray',
  closeWindow: 'controller:close-window',
  state: 'state',
} as const

const api: ControllerApi = {
  getState: () => ipcRenderer.invoke(CH.getState),
  setSettings: (patch: Partial<Settings>) => ipcRenderer.invoke(CH.setSettings, patch),
  refresh: () => ipcRenderer.invoke(CH.refresh),
  applyWallpaper: () => ipcRenderer.invoke(CH.applyWallpaper),
  minimizeToTray: () => ipcRenderer.invoke(CH.minimizeToTray),
  closeWindow: () => ipcRenderer.invoke(CH.closeWindow),
  platform: process.platform,

  // 구독을 끊는 함수를 돌려준다. React 의 useEffect 가 그대로 반환할 수 있는 모양이다.
  onState(cb: (state: AppState) => void) {
    const listener = (_e: Electron.IpcRendererEvent, state: AppState) => cb(state)
    ipcRenderer.on(CH.state, listener)
    return () => {
      ipcRenderer.off(CH.state, listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
