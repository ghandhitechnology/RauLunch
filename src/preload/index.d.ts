import type { ControllerApi } from '../shared/types'

/** preload 가 contextBridge 로 심어 둔 것. 컨트롤러 renderer 는 이것만 본다. */
declare global {
  interface Window {
    api: ControllerApi
  }
}

export {}
