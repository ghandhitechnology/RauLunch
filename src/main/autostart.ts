/**
 * 로그인 시 자동 실행 등록.
 *
 * Electron 의 app.setLoginItemSettings 를 쓰지 않는다. Windows 쪽은 결국 같은
 * Run 키를 건드리면서도 개발 모드에서 electron.exe 경로가 그대로 박히고,
 * macOS 쪽은 서명되지 않은 개발 빌드에서 조용히 무시된다. 참조 구현과 동일하게
 * 레지스트리/LaunchAgent 를 직접 다루는 편이 무슨 일이 벌어지는지 명확하다.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { app } from 'electron'

const execFileAsync = promisify(execFile)

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
/** 레지스트리 값 이름 겸 LaunchAgent 라벨의 뿌리. 바꾸면 예전 등록이 유령으로 남는다. */
const VALUE_NAME = '급식컨트롤러'
const LAUNCH_AGENT_LABEL = 'com.hataewook.geupsik'

/** 자동 실행으로 뜰 때는 컨트롤러 창을 열지 않고 트레이로만 산다. */
const BACKGROUND_FLAG = '--background'

/**
 * 실행 인자.
 *
 * 패키징된 앱은 실행 파일 하나면 되고, 개발 중에는 electron 바이너리에
 * 프로젝트 경로를 붙여야 한다. 자동 실행 등록은 개발 중에도 눌러보게 되므로
 * 두 경우를 모두 만들어 둔다.
 */
function programArguments(): string[] {
  if (app.isPackaged) return [process.execPath, BACKGROUND_FLAG]
  return [process.execPath, app.getAppPath(), BACKGROUND_FLAG]
}

/** Run 키에 넣을 한 줄 명령. 경로에 공백이 있으므로 각 경로를 따옴표로 감싼다. */
function windowsCommand(): string {
  const [exe, ...rest] = programArguments()
  return [`"${exe}"`, ...rest.map((a) => (a.startsWith('--') ? a : `"${a}"`))].join(' ')
}

/* ------------------------------------------------------------------ */
/* Windows                                                             */
/* ------------------------------------------------------------------ */

async function winEnable(): Promise<void> {
  await execFileAsync(
    'reg',
    ['add', RUN_KEY, '/v', VALUE_NAME, '/t', 'REG_SZ', '/d', windowsCommand(), '/f'],
    { timeout: 10_000, windowsHide: true },
  )
}

async function winDisable(): Promise<void> {
  try {
    await execFileAsync('reg', ['delete', RUN_KEY, '/v', VALUE_NAME, '/f'], {
      timeout: 10_000,
      windowsHide: true,
    })
  } catch {
    // 값이 애초에 없으면 reg 가 1 로 끝난다. 목표 상태(미등록)는 이미 달성됐다.
  }
}

async function winIsEnabled(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('reg', ['query', RUN_KEY, '/v', VALUE_NAME], {
      timeout: 10_000,
      windowsHide: true,
    })
    return stdout.includes(VALUE_NAME)
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* macOS                                                               */
/* ------------------------------------------------------------------ */

function plistPath(): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `${LAUNCH_AGENT_LABEL}.plist`)
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function plistBody(): string {
  const args = programArguments()
    .map((a) => `    <string>${xmlEscape(a)}</string>`)
    .join('\n')
  const logDir = path.join(os.homedir(), 'Library', 'Logs')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(path.join(logDir, 'geupsik-controller.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(path.join(logDir, 'geupsik-controller.err.log'))}</string>
</dict>
</plist>
`
}

/** launchctl 은 이미 등록/미등록 상태에서 실패해도 무해하다. 결과를 보지 않는다. */
async function launchctl(...args: string[]): Promise<void> {
  try {
    await execFileAsync('launchctl', args, { timeout: 5_000 })
  } catch {
    /* 무시 */
  }
}

async function macEnable(): Promise<void> {
  const file = plistPath()
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, plistBody(), 'utf8')
  const domain = `gui/${process.getuid?.() ?? 501}`
  // 내용이 바뀌었을 수 있으니 먼저 내리고 다시 올린다.
  await launchctl('bootout', domain, file)
  await launchctl('bootstrap', domain, file)
}

async function macDisable(): Promise<void> {
  const file = plistPath()
  const domain = `gui/${process.getuid?.() ?? 501}`
  await launchctl('bootout', domain, file)
  await fs.rm(file, { force: true }).catch(() => undefined)
}

/* ------------------------------------------------------------------ */

/** 로그인 시 자동 실행을 켠다. 실패해도 throw 하지 않고 false 를 돌려준다. */
export async function enable(): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await winEnable()
      return true
    }
    if (process.platform === 'darwin') {
      await macEnable()
      return true
    }
    return false
  } catch {
    return false
  }
}

/** 자동 실행 등록을 지운다. 등록이 없어도 성공으로 친다. */
export async function disable(): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await winDisable()
      return true
    }
    if (process.platform === 'darwin') {
      await macDisable()
      return true
    }
    return false
  } catch {
    return false
  }
}

/** 지금 등록되어 있는지. 설정 화면의 토글이 이 값을 그대로 반영한다. */
export async function isEnabled(): Promise<boolean> {
  try {
    if (process.platform === 'win32') return await winIsEnabled()
    if (process.platform === 'darwin') return existsSync(plistPath())
    return false
  } catch {
    return false
  }
}

/** 설정값 한 개로 상태를 맞춘다. */
export async function apply(enabled: boolean): Promise<boolean> {
  return enabled ? enable() : disable()
}

/** 이 OS 에서 자동 실행 등록을 지원하는지. */
export function isAutostartSupported(): boolean {
  return process.platform === 'win32' || process.platform === 'darwin'
}
