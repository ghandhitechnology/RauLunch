/**
 * 파일 로그. 교실 PC 는 원격으로 들여다볼 수 없어서, 무엇이 언제 실패했는지는
 * 이 log.txt 하나로만 알 수 있다. 그래서 로깅 자체는 절대 예외를 던지지 않는다.
 */
import fs from 'node:fs'

import { ensureAppDir, getPaths } from './config'

/** 이 크기를 넘으면 앞쪽(오래된 줄)을 잘라낸다. */
export const LOG_MAX_BYTES = 1_000_000
/** 잘라낸 뒤 남길 크기. 매번 자르지 않도록 넉넉히 줄인다. */
const LOG_KEEP_BYTES = 500_000

const TRUNCATE_MARK = '--- 오래된 로그 잘림 ---\n'

export type LogLevel = 'info' | 'warn' | 'error'

/** 개발 중에는 터미널로도 흘려보낸다. 패키징된 앱에서는 파일만 남긴다. */
const isDev = process.env.NODE_ENV !== 'production'

function stamp(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ` +
    `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
  )
}

/**
 * 파일 뒤쪽 LOG_KEEP_BYTES 만 남긴다. 참조 구현은 통째로 지웠지만,
 * 그러면 문제가 터진 직후의 흔적까지 같이 사라져서 진단이 불가능했다.
 */
function truncateFront(logPath: string): void {
  const buf = fs.readFileSync(logPath)
  let tail = buf.subarray(buf.length - LOG_KEEP_BYTES)
  // 줄 중간에서 자르면 깨진 한글이 남는다. 첫 개행 뒤부터 사용한다.
  const nl = tail.indexOf(0x0a)
  if (nl >= 0) tail = tail.subarray(nl + 1)
  fs.writeFileSync(logPath, Buffer.concat([Buffer.from(TRUNCATE_MARK, 'utf8'), tail]))
}

export function log(message: string, level: LogLevel = 'info'): void {
  const prefix = level === 'info' ? '' : `[${level.toUpperCase()}] `
  const line = `[${stamp(new Date())}] ${prefix}${message}\n`

  if (isDev) {
    if (level === 'error') console.error(line.trimEnd())
    else if (level === 'warn') console.warn(line.trimEnd())
    else console.log(line.trimEnd())
  }

  try {
    ensureAppDir()
    const logPath = getPaths().log
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > LOG_MAX_BYTES) {
      truncateFront(logPath)
    }
    fs.appendFileSync(logPath, line, 'utf8')
  } catch {
    /* 디스크가 꽉 찼든 권한이 없든, 로그 때문에 앱이 죽으면 안 된다 */
  }
}

export function logWarn(message: string): void {
  log(message, 'warn')
}

/** Error 든 문자열이든 아무거나 받는다 — catch 블록에서 타입 따지기 싫으니까. */
export function logError(message: string, cause?: unknown): void {
  const detail = describe(cause)
  log(detail ? `${message}: ${detail}` : message, 'error')
}

export function describe(cause: unknown): string {
  if (cause == null) return ''
  if (cause instanceof Error) return cause.message || cause.name
  if (typeof cause === 'string') return cause
  try {
    return JSON.stringify(cause)
  } catch {
    return String(cause)
  }
}

/** 컨트롤러에서 "로그 보기" 를 눌렀을 때 쓸 최근 n줄. */
export function tailLog(lines = 200): string[] {
  try {
    const text = fs.readFileSync(getPaths().log, 'utf8')
    return text.split('\n').filter(Boolean).slice(-lines)
  } catch {
    return []
  }
}

export function clearLog(): void {
  try {
    fs.rmSync(getPaths().log, { force: true })
  } catch {
    /* 무시 */
  }
}
