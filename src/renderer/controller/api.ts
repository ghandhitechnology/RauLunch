import { SAMPLE_DATA } from '../../shared/fixtures'
import { DEFAULT_SETTINGS, type AppState, type ControllerApi, type Settings } from '../../shared/types'

/**
 * preload 가 붙여주는 window.api 를 감싼다.
 *
 * preload 가 없는 환경(브라우저에서 `electron-vite dev` 만 띄운 경우)에서도
 * UI 를 그대로 만들 수 있어야 하므로, 없으면 표본 자료로 도는 가짜 구현을 쓴다.
 * 화면 코드는 둘을 구분하지 않는다 — 항상 이 모듈의 `api` 만 부른다.
 */

type ApiHost = { api?: ControllerApi }

/**
 * preload 없이 뜬 경우의 플랫폼 추정.
 * 창 손잡이는 macOS 에서만 신호등 자리를 비워야 해서, 이 값이 틀리면 레이아웃이 어긋난다.
 */
function guessPlatform(): NodeJS.Platform {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/Mac/i.test(ua)) return 'darwin'
  if (/Win/i.test(ua)) return 'win32'
  return 'linux'
}

function createMockApi(): ControllerApi {
  const listeners = new Set<(s: AppState) => void>()

  const state: AppState = {
    settings: { ...DEFAULT_SETTINGS },
    data: { ...SAMPLE_DATA },
    status: {
      lastSuccessAt: new Date().toISOString(),
      lastFailureAt: null,
      failCount: 0,
      refreshing: false,
      lastError: null,
      appliedAt: null,
    },
  }

  const emit = () => {
    const snapshot: AppState = {
      settings: { ...state.settings },
      data: state.data ? { ...state.data } : null,
      status: { ...state.status },
    }
    listeners.forEach((cb) => cb(snapshot))
  }

  return {
    async getState() {
      return JSON.parse(JSON.stringify(state)) as AppState
    },
    onState(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async setSettings(patch: Partial<Settings>) {
      state.settings = { ...state.settings, ...patch }
      if (state.data) {
        state.data = {
          ...state.data,
          grade: state.settings.grade,
          classNo: state.settings.classNo,
        }
      }
      emit()
      return state
    },
    async refresh() {
      state.status = { ...state.status, refreshing: true }
      emit()
      await new Promise((r) => setTimeout(r, 900))
      state.status = {
        ...state.status,
        refreshing: false,
        failCount: 0,
        lastError: null,
        lastSuccessAt: new Date().toISOString(),
      }
      emit()
      return state
    },
    async applyWallpaper() {
      await new Promise((r) => setTimeout(r, 500))
      state.status = { ...state.status, appliedAt: new Date().toISOString() }
      emit()
      return { ok: true, detail: '미리보기 모드' }
    },
    async minimizeToTray() {},
    async closeWindow() {},
    platform: guessPlatform(),
  }
}

const injected = (window as unknown as ApiHost).api

/** preload 가 붙어 있으면 진짜, 아니면 표본 자료로 도는 가짜. */
export const api: ControllerApi = injected ?? createMockApi()

/** 가짜 구현으로 도는 중인지. 창 제목 옆 표시에만 쓴다. */
export const isStandalone = !injected

/** macOS 는 신호등 버튼이 창 왼쪽 위를 차지한다. 손잡이가 그 자리를 비켜야 한다. */
export const isMac = (injected?.platform ?? guessPlatform()) === 'darwin'
