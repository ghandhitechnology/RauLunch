/**
 * 시스템 트레이.
 *
 * 이 앱은 대부분의 시간을 창 없이 산다 — 교실 PC 를 켜두면 알아서 갱신되는 게
 * 정상 동작이고, 컨트롤러 창은 설정을 바꿀 때만 잠깐 뜬다. 그래서 트레이가
 * 사실상 유일한 상시 진입점이다.
 *
 * 여기서는 상태를 갖지 않는다. 무엇을 할지는 전부 콜백으로 받는다.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { app, Menu, Tray, nativeImage } from 'electron'
import type { NativeImage } from 'electron'

export interface TrayHandlers {
  /** 급식·시간표를 다시 받아오고 바탕화면까지 다시 적용. */
  onRefresh: () => void
  /** 컨트롤러 창 열기(또는 앞으로 가져오기). */
  onOpenSettings: () => void
  /** 앱 완전 종료. */
  onQuit: () => void
}

export interface TrayController {
  tray: Tray
  /** 마지막 갱신 시각 같은 짧은 안내를 툴팁에 얹는다. */
  setTooltip: (text: string) => void
  destroy: () => void
}

const APP_TITLE = '급식 컨트롤러'

/**
 * 아이콘 원본을 찾는다.
 *
 * 개발 중에는 프로젝트의 resources/, 패키징 후에는 process.resourcesPath 아래에
 * 놓인다. .ico 는 Windows 에서 크기별 표현을 이미 들고 있어 먼저 본다.
 */
function iconCandidates(): string[] {
  const roots = [
    path.join(app.getAppPath(), 'resources', 'icons'),
    path.join(process.resourcesPath, 'icons'),
    path.join(process.resourcesPath, 'resources', 'icons'),
  ]
  const names =
    process.platform === 'win32'
      ? ['app_icon.ico', 'app_icon.png', 'app_icon_1024.png']
      : ['app_icon.png', 'app_icon_1024.png']
  return roots.flatMap((root) => names.map((name) => path.join(root, name)))
}

/**
 * 트레이용 아이콘 이미지.
 *
 * 1024px 원본을 그대로 넘기면 macOS 메뉴바가 거대한 아이콘을 그리려 든다.
 * 반드시 축소해서 넘긴다. macOS 는 2배로 줄인 뒤 scaleFactor 2 로 다시 읽어
 * 레티나에서 흐려지지 않게 한다.
 */
function trayIcon(): NativeImage {
  const found = iconCandidates().find((p) => existsSync(p))
  if (!found) return nativeImage.createEmpty()

  const source = nativeImage.createFromPath(found)
  if (source.isEmpty()) return nativeImage.createEmpty()

  if (process.platform === 'darwin') {
    const hi = source.resize({ width: 32, height: 32, quality: 'best' })
    return nativeImage.createFromBuffer(hi.toPNG(), { scaleFactor: 2 })
  }
  return source.resize({ width: 16, height: 16, quality: 'best' })
}

export function createTray(handlers: TrayHandlers): TrayController {
  const tray = new Tray(trayIcon())

  const menu = Menu.buildFromTemplate([
    { label: '새로고침', click: () => handlers.onRefresh() },
    { label: '설정', click: () => handlers.onOpenSettings() },
    { type: 'separator' },
    { label: '종료', click: () => handlers.onQuit() },
  ])

  tray.setToolTip(APP_TITLE)
  tray.setContextMenu(menu)

  // Windows 에서는 왼쪽 클릭에 메뉴가 뜨지 않는다. 창 여는 걸 기본 동작으로 둔다.
  if (process.platform === 'win32') {
    tray.on('click', () => handlers.onOpenSettings())
    tray.on('double-click', () => handlers.onOpenSettings())
  }

  return {
    tray,
    setTooltip: (text: string) => {
      tray.setToolTip(text ? `${APP_TITLE} — ${text}` : APP_TITLE)
    },
    destroy: () => {
      if (!tray.isDestroyed()) tray.destroy()
    },
  }
}
