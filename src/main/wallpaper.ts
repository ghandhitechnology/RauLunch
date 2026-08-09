/**
 * OS 바탕화면 적용.
 *
 * 네이티브 애드온을 쓰지 않는다 — 이 앱은 학교 PC 에 그냥 복사해서 돌아가야 하고,
 * node-gyp 빌드가 필요한 순간 배포가 무너진다. 그래서 win32 는 PowerShell 로
 * P/Invoke 를, darwin 은 osascript 를 각각 자식 프로세스로 불러 쓴다.
 * 모든 호출은 execFile + 인자 배열이다. 셸 문자열을 조립하지 않는다.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { app, nativeImage } from 'electron'

const execFileAsync = promisify(execFile)

/** 참조 구현(wallpaper.py)의 결과 형태를 그대로 유지한다. 상태 표시줄이 이걸 읽는다. */
export interface WallpaperApplyResult {
  ok: boolean
  /** 실제로 OS 에 넘긴 경로. macOS 는 uuid 사본, win32 는 변환된 BMP 일 수 있다. */
  path: string
  /** 'Windows' | 'AppleScript' | '' */
  method: string
  /** 사람이 읽을 상세 사유. 성공이면 보통 화면 수 안내. */
  detail: string
  /** 적용된 화면 수. 알 수 없으면 0. */
  screens: number
}

function result(
  ok: boolean,
  filePath = '',
  method = '',
  detail = '',
  screens = 0,
): WallpaperApplyResult {
  return { ok, path: filePath, method, detail, screens }
}

/** macOS 사본 파일 접두어. 청소할 때 이 접두어로만 지운다. */
const LIVE_PREFIX = 'wallpaper_live_'
/** 남겨둘 최근 사본 개수. 되돌리기용으로 몇 장은 두되 무한정 쌓지 않는다. */
const LIVE_KEEP = 6

function appDir(): string {
  return app.getPath('userData')
}

/* ------------------------------------------------------------------ */
/* Windows                                                             */
/* ------------------------------------------------------------------ */

const SPI_SETDESKWALLPAPER = 0x0014
const SPIF_UPDATEINIFILE = 0x01
const SPIF_SENDCHANGE = 0x02

/**
 * PNG 를 24bit BMP 로 변환한다.
 *
 * SystemParametersInfoW 는 최신 Windows 라면 PNG 도 받아주지만, 그룹 정책이나
 * 오래된 빌드에서는 조용히 검은 화면만 남긴다. 참조 구현이 BMP 를 거치는 이유가
 * 그것이고, 여기서도 같은 안전장치를 둔다. Electron 의 nativeImage 만 쓰므로
 * 추가 의존성이 없다.
 */
async function pngToBmp(pngPath: string): Promise<string> {
  const image = nativeImage.createFromPath(pngPath)
  if (image.isEmpty()) throw new Error('이미지를 읽지 못함')

  const { width, height } = image.getSize()
  const bgra = image.toBitmap()

  // BMP 한 줄은 4바이트 배수로 패딩된다.
  const rowSize = (width * 3 + 3) & ~3
  const pixelBytes = rowSize * height
  const headerSize = 14 + 40
  const buffer = Buffer.alloc(headerSize + pixelBytes)

  buffer.write('BM', 0, 'ascii')
  buffer.writeUInt32LE(headerSize + pixelBytes, 2)
  buffer.writeUInt32LE(headerSize, 10)
  buffer.writeUInt32LE(40, 14) // BITMAPINFOHEADER
  buffer.writeInt32LE(width, 18)
  buffer.writeInt32LE(height, 22)
  buffer.writeUInt16LE(1, 26) // planes
  buffer.writeUInt16LE(24, 28) // bpp
  buffer.writeUInt32LE(0, 30) // BI_RGB
  buffer.writeUInt32LE(pixelBytes, 34)

  // BMP 는 아래에서 위로 저장된다. nativeImage 는 위에서 아래 BGRA.
  for (let y = 0; y < height; y += 1) {
    const src = y * width * 4
    const dst = headerSize + (height - 1 - y) * rowSize
    for (let x = 0; x < width; x += 1) {
      buffer[dst + x * 3] = bgra[src + x * 4] // B
      buffer[dst + x * 3 + 1] = bgra[src + x * 4 + 1] // G
      buffer[dst + x * 3 + 2] = bgra[src + x * 4 + 2] // R
    }
  }

  const bmpPath = path.join(
    path.dirname(pngPath),
    `${path.basename(pngPath, path.extname(pngPath))}.bmp`,
  )
  await fs.writeFile(bmpPath, buffer)
  return bmpPath
}

/**
 * 경로는 명령줄에 절대 싣지 않고 환경변수로 넘긴다.
 * 공백·따옴표·한글이 섞인 경로에서 인용 규칙 때문에 깨지는 사고를 원천 차단한다.
 * 스크립트 자체는 -EncodedCommand(UTF-16LE base64)로 넘겨 셸 파싱을 건너뛴다.
 */
const WIN_PATH_ENV = 'GEUPSIK_WALLPAPER_PATH'

const WIN_SCRIPT = `
$sig = @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
'@
Add-Type -MemberDefinition $sig -Name Wallpaper -Namespace Geupsik | Out-Null
$target = $env:${WIN_PATH_ENV}
if (-not (Test-Path -LiteralPath $target)) { Write-Error 'file-missing'; exit 2 }
$r = [Geupsik.Wallpaper]::SystemParametersInfo(${SPI_SETDESKWALLPAPER}, 0, $target, ${SPIF_UPDATEINIFILE | SPIF_SENDCHANGE})
if ($r -eq 0) { Write-Error 'SystemParametersInfo returned 0'; exit 1 }
exit 0
`

async function applyWindows(pngPath: string): Promise<WallpaperApplyResult> {
  let target = pngPath
  let converted = ''
  try {
    target = await pngToBmp(pngPath)
    converted = target
  } catch (e) {
    // 변환에 실패해도 PNG 로 한 번은 시도해 본다. 최신 Windows 면 그대로 먹힌다.
    converted = ''
    target = pngPath
  }

  const encoded = Buffer.from(WIN_SCRIPT, 'utf16le').toString('base64')
  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      {
        timeout: 20_000,
        windowsHide: true,
        env: { ...process.env, [WIN_PATH_ENV]: path.resolve(target) },
      },
    )
    return result(
      true,
      target,
      'Windows',
      converted ? 'BMP 변환 후 적용' : 'PNG 그대로 적용',
      1,
    )
  } catch (e) {
    const detail = errText(e)
    return result(false, target, 'Windows', `SystemParametersInfo 실패: ${detail}`, 0)
  }
}

/* ------------------------------------------------------------------ */
/* macOS                                                               */
/* ------------------------------------------------------------------ */

/**
 * macOS 는 이미 지정된 것과 같은 경로를 다시 지정하면 새 그림을 무시한다.
 * 두 파일명을 번갈아 쓰는 방식도 한쪽이 옛 렌더를 들고 있으면 테마가 깜빡이는
 * 것처럼 보인다. 매번 새 uuid 파일을 만들어 DesktopServices 캐시를 확실히 피한다.
 */
function macLivePath(): string {
  return path.join(appDir(), `${LIVE_PREFIX}${randomUUID().replace(/-/g, '')}.png`)
}

async function cleanupMacLiveFiles(keepPath: string): Promise<void> {
  try {
    const base = appDir()
    const keep = path.resolve(keepPath)
    const names = await fs.readdir(base)
    const entries: Array<{ mtime: number; file: string }> = []
    for (const name of names) {
      if (!name.startsWith(LIVE_PREFIX) || !name.endsWith('.png')) continue
      const file = path.join(base, name)
      if (path.resolve(file) === keep) continue
      try {
        const st = await fs.stat(file)
        entries.push({ mtime: st.mtimeMs, file })
      } catch {
        /* 지워졌으면 신경 쓸 것 없다 */
      }
    }
    entries.sort((a, b) => b.mtime - a.mtime)
    for (const { file } of entries.slice(LIVE_KEEP)) {
      await fs.rm(file, { force: true }).catch(() => undefined)
    }
  } catch {
    /* 청소는 실패해도 적용 자체와 무관하다 */
  }
}

// argv 로 경로를 받는다. 스크립트 본문에 경로를 끼워 넣으면 따옴표 하나에 무너진다.
const MAC_SCRIPT = `
on run argv
  set imagePath to POSIX file (item 1 of argv)
  tell application "System Events"
    set picture of every desktop to imagePath
    return (count of desktops)
  end tell
end run
`

async function applyMac(pngPath: string): Promise<WallpaperApplyResult> {
  let target = pngPath
  try {
    const live = macLivePath()
    await fs.copyFile(pngPath, live)
    target = live
  } catch (e) {
    // 사본 생성에 실패하면 원본 경로로라도 시도한다. 캐시 때문에 갱신이 안 보일 수는 있다.
    target = pngPath
  }

  try {
    const { stdout } = await execFileAsync('osascript', ['-e', MAC_SCRIPT, path.resolve(target)], {
      timeout: 15_000,
    })
    const screens = Number.parseInt(stdout.trim(), 10)
    const count = Number.isFinite(screens) && screens > 0 ? screens : 1
    await cleanupMacLiveFiles(target)
    return result(true, target, 'AppleScript', `${count}개 화면 적용`, count)
  } catch (e) {
    return result(false, target, 'AppleScript', `System Events 적용 실패: ${errText(e)}`, 0)
  }
}

/* ------------------------------------------------------------------ */

function errText(e: unknown): string {
  if (e && typeof e === 'object') {
    const anyErr = e as { stderr?: string; message?: string }
    const stderr = (anyErr.stderr ?? '').toString().trim()
    if (stderr) return stderr.split('\n')[0]
    if (anyErr.message) return anyErr.message
  }
  return String(e)
}

/** PNG 한 장을 바탕화면으로 만든다. 절대 throw 하지 않는다 — 결과 객체로만 답한다. */
export async function applyWallpaper(pngPath: string): Promise<WallpaperApplyResult> {
  if (!pngPath || !existsSync(pngPath)) {
    return result(false, pngPath ?? '', '', '이미지 파일 없음', 0)
  }
  try {
    if (process.platform === 'win32') return await applyWindows(pngPath)
    if (process.platform === 'darwin') return await applyMac(pngPath)
    return result(false, pngPath, '', `지원하지 않는 OS: ${process.platform}`, 0)
  } catch (e) {
    return result(false, pngPath, '', `예상치 못한 오류: ${errText(e)}`, 0)
  }
}

/** 이 OS 에서 바탕화면 적용이 가능한지. 컨트롤러가 버튼을 흐리게 할 때 쓴다. */
export function isWallpaperSupported(): boolean {
  return process.platform === 'win32' || process.platform === 'darwin'
}
