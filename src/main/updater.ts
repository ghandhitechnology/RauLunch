import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

import { log } from './logger'

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * GitHub Releases에서 새 Windows 버전을 확인한다.
 *
 * 개발 빌드와 portable 빌드는 electron-updater의 설치 대상이 아니므로 건너뛴다.
 * NSIS 설치본은 업데이트를 백그라운드로 내려받고, 사용자가 재시작을 승인하면 적용한다.
 */
export function startAutoUpdater(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  let lastProgressBucket = -1

  autoUpdater.on('checking-for-update', () => log('앱 업데이트 확인 중'))
  autoUpdater.on('update-available', (info) => {
    log(`앱 업데이트 발견 — ${info.version}`)
  })
  autoUpdater.on('update-not-available', () => log('앱이 최신 버전입니다'))
  autoUpdater.on('download-progress', (progress) => {
    const bucket = Math.floor(progress.percent / 25)
    if (bucket === lastProgressBucket) return
    lastProgressBucket = bucket
    log(`앱 업데이트 다운로드 — ${Math.min(bucket * 25, 100)}%`)
  })
  autoUpdater.on('error', (error) => log(`앱 업데이트 실패 — ${error.message}`, 'error'))
  autoUpdater.on('update-downloaded', (info) => {
    log(`앱 업데이트 다운로드 완료 — ${info.version}`)
    void dialog
      .showMessageBox({
        type: 'info',
        title: '업데이트 준비 완료',
        message: `급식 컨트롤러 ${info.version} 업데이트를 설치할까요?`,
        detail: '지금 재시작하면 업데이트가 자동으로 설치됩니다.',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall(false, true)
      })
      .catch((error: unknown) => log(`업데이트 알림 표시 실패 — ${String(error)}`, 'error'))
  })

  const check = (): void => {
    void autoUpdater.checkForUpdates().catch((error: unknown) => {
      log(`앱 업데이트 확인 실패 — ${String(error)}`, 'error')
    })
  }

  // 네트워크와 트레이 초기화를 방해하지 않도록 부팅 직후에는 잠깐 기다린다.
  setTimeout(check, 10_000)
  const timer = setInterval(check, CHECK_INTERVAL_MS)
  timer.unref()
}
