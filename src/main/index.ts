import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BrowserWindow, app, shell } from 'electron'
import {
  DEFAULT_SETTINGS,
  type AppState,
  type MealData,
  type Settings,
  type StatusSnapshot,
  type TimetableData,
  type WallpaperData,
} from '../shared/types'
import { captureWallpaper, destroyCaptureWindow } from './capture'
import { broadcastState, registerIpc } from './ipc'
import {
  cacheKey,
  ensureAppDir,
  getPaths,
  loadSettings,
  readMealCache,
  readTimetableCache,
  saveSettings,
  writeMealCache,
  writeTimetableCache,
} from './config'
import { log } from './logger'
import { fetchMeal, type SchoolCode, type SchoolCodeStore } from './fetch/meal'
import {
  buildManualTimetable,
  fetchTimetable,
  resolveTimetableTeacherNames,
} from './fetch/timetable'
import { Scheduler } from './scheduler'
import { applyWallpaper } from './wallpaper'
import { apply as applyAutostart, isEnabled as isAutostartEnabled } from './autostart'
import { createTray, type TrayController } from './tray'
import { startAutoUpdater } from './updater'

/**
 * 앱 전체를 엮는 곳.
 *
 * 상태(설정·자료·마지막 결과)는 여기 한 군데에만 산다. 다른 모듈은 상태를 갖지 않고
 * 순수하게 "받아서 돌려주는" 함수로 두었다 — 트레이·컨트롤러·스케줄러 셋이
 * 동시에 같은 값을 건드리는 순간 어디서 틀어졌는지 못 찾게 되기 때문이다.
 *
 * 예외가 하나 있다. 갱신 이력(마지막 성공·실패·연속 실패 횟수)은 Scheduler 가
 * 혼자 들고 있다 — 재시도 간격을 계산하는 주체와 기록하는 주체가 갈라지면
 * backoff 가 조용히 어긋난다. 여기서는 그 값을 읽어 나르기만 한다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function todayKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function emptyMealData(date: string): MealData {
  return { date, meals: { 조식: [], 중식: [], 석식: [] }, cached: true }
}

// ── 상태 ──────────────────────────────────────────────────────────────

let settings: Settings = { ...DEFAULT_SETTINGS }
let data: WallpaperData | null = null

/** 스케줄러가 아직 없을 때(부팅 몇 밀리초) 쓰는 빈 상태. */
const IDLE_STATUS: StatusSnapshot = {
  lastSuccessAt: null,
  lastFailureAt: null,
  failCount: 0,
  refreshing: false,
  lastError: null,
  appliedAt: null,
}

/**
 * 둘 중 하나만 실패한 '반쪽 성공' 의 사유. 스케줄러 입장에서 이건 성공이라
 * lastError 에 남지 않는데, 교실에서는 왜 시간표만 어제 것인지 보여야 한다.
 */
let partialError: string | null = null
/** 바탕화면 적용 자체가 실패한 사유. 자료 갱신과는 별개로 뜬다. */
let applyError: string | null = null

let controllerWindow: BrowserWindow | null = null
let tray: TrayController | null = null
let scheduler: Scheduler | null = null
/** 트레이의 '종료' 를 거쳤는지. 이게 false 면 창을 닫아도 앱은 안 죽는다. */
let quitting = false

function snapshot(): AppState {
  const base = scheduler ? scheduler.status() : IDLE_STATUS
  return {
    settings,
    data,
    status: { ...base, lastError: base.lastError ?? applyError ?? partialError },
  }
}

/** 상태가 바뀌면 반드시 이걸 부른다. 컨트롤러와 트레이가 같은 순간에 갱신되도록. */
function publish(): AppState {
  const state = snapshot()
  broadcastState(state)
  tray?.setTooltip(trayLine(state.status))
  return state
}

/** 트레이 툴팁 한 줄. 메뉴를 열지 않고도 지금 상태를 알 수 있어야 한다. */
function trayLine(status: StatusSnapshot): string {
  if (status.refreshing) return '갱신 중'
  if (status.failCount > 0) return `갱신 실패 (${status.failCount}회)`
  if (!status.lastSuccessAt) return '아직 갱신 전'
  const t = new Date(status.lastSuccessAt)
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} 갱신됨`
}

// ── 학교코드 캐시 ─────────────────────────────────────────────────────

/**
 * NEIS 학교코드는 한 번 알아내면 바뀌지 않는다. config.json 은 Settings 만
 * 통과시키는 정규화를 거치므로 여기에 끼워 넣을 수 없어 파일을 따로 둔다.
 */
const schoolCodeStore: SchoolCodeStore = {
  read(): SchoolCode | null {
    try {
      // 베타 급식 학교가 기존 인천과학고 캐시를 재사용하지 않도록 파일을 분리한다.
      const file = join(getPaths().dir, 'school-beta-incheon-girls.json')
      if (!existsSync(file)) return null
      const raw: unknown = JSON.parse(readFileSync(file, 'utf8'))
      if (typeof raw !== 'object' || raw === null) return null
      const { atpt, code } = raw as Record<string, unknown>
      if (typeof atpt !== 'string' || typeof code !== 'string') return null
      return { atpt, code }
    } catch {
      return null
    }
  },
  write(value: SchoolCode): void {
    try {
      ensureAppDir()
      writeFileSync(
        join(getPaths().dir, 'school-beta-incheon-girls.json'),
        JSON.stringify(value),
        'utf8',
      )
    } catch (e) {
      log(`학교코드 저장 실패 — ${String(e)}`)
    }
  },
}

/**
 * 컴시간 학교코드도 한 번 알아내면 바뀌지 않는다. 저장해 두지 않으면 갱신할 때마다
 * 학교 검색 요청이 한 번 더 나가고, 그만큼 비공식 서버에 기대는 지점이 늘어난다.
 */
function readComciCode(): number | null {
  try {
    const file = join(getPaths().dir, 'comci-beta-incheon-girls.json')
    if (!existsSync(file)) return null
    const raw: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (typeof raw !== 'object' || raw === null) return null
    const code = (raw as Record<string, unknown>).schoolCode
    return typeof code === 'number' && Number.isFinite(code) ? code : null
  } catch {
    return null
  }
}

function writeComciCode(schoolCode: number): void {
  if (!Number.isFinite(schoolCode) || readComciCode() === schoolCode) return
  try {
    ensureAppDir()
    writeFileSync(
      join(getPaths().dir, 'comci-beta-incheon-girls.json'),
      JSON.stringify({ schoolCode }),
      'utf8',
    )
  } catch (e) {
    log(`컴시간 학교코드 저장 실패 — ${String(e)}`)
  }
}

// ── 갱신 ──────────────────────────────────────────────────────────────

/**
 * 급식·시간표를 받아 상태에 반영한다.
 *
 * 둘 중 하나만 실패해도 나머지는 살린다 — 시간표(컴시간 스크래핑)가 급식(NEIS)보다
 * 훨씬 자주 깨지는데, 그때마다 화면 전체를 비우면 앱이 쓸모없어진다.
 * 반환값은 스케줄러 규약을 따른다: true 성공, false 실패, null 이미 진행 중.
 */
async function runRefresh(): Promise<boolean | null> {
  const date = todayKey()
  const weekdayLabel = WEEKDAYS[new Date().getDay()]
  const key = cacheKey(date, settings.grade, settings.classNo)
  const errors: string[] = []

  const [mealResult, timetableResult] = await Promise.allSettled([
    fetchMeal({ store: schoolCodeStore, date, log }),
    settings.preferManualTimetable
      ? Promise.resolve(buildManualTimetable(settings))
      : fetchTimetable({
          grade: settings.grade,
          classNo: settings.classNo,
          schoolCode: readComciCode(),
        }).then((r) => {
          writeComciCode(r.schoolCode)
          return r.timetable
        }),
  ])

  let meal: MealData
  if (mealResult.status === 'fulfilled') {
    meal = mealResult.value
    writeMealCache(key, meal)
  } else {
    errors.push(`급식: ${String(mealResult.reason)}`)
    // 빈 화면보다는 어제 급식이라도 띄운다. 헤더에 '지난 자료' 로 표시된다.
    meal = readMealCache(key, { allowStale: true }) ?? data?.meal ?? emptyMealData(date)
  }

  let timetable: TimetableData
  if (timetableResult.status === 'fulfilled') {
    timetable = timetableResult.value
    if (!timetable.manual) writeTimetableCache(key, timetable)
  } else {
    errors.push(`시간표: ${String(timetableResult.reason)}`)
    // 캐시 → 수동 시간표 순으로 물러선다. 수동이 비어 있으면 빈 패널이 뜬다.
    timetable =
      readTimetableCache(key, { allowStale: true }) ??
      data?.timetable ??
      buildManualTimetable(settings)
  }

  data = {
    date,
    weekdayLabel,
    grade: settings.grade,
    classNo: settings.classNo,
    meal,
    timetable,
  }

  // 둘 다 실패했을 때만 실패로 친다. 하나라도 새로 받았으면 바탕화면은 갱신할 값어치가 있다.
  const ok = errors.length < 2
  partialError = ok && errors.length ? errors.join(' / ') : null
  if (!ok) {
    log(`갱신 실패 — ${errors.join(' / ')}`)
    publish()
    // 스케줄러가 backoff 를 걸 수 있도록 사유를 그대로 던진다.
    throw new Error(errors.join(' / '))
  }

  if (errors.length) log(`부분 갱신 — ${errors.join(' / ')}`)
  publish()
  await applyCurrentWallpaper()
  return true
}

/** 지금 상태로 바탕화면을 그려 실제로 적용한다. */
async function applyCurrentWallpaper(): Promise<{ ok: boolean; detail: string }> {
  if (!data) return { ok: false, detail: '보여줄 자료가 아직 없습니다' }
  try {
    const wallpaperData: WallpaperData = {
      ...data,
      timetable: resolveTimetableTeacherNames(data.timetable, settings.teacherNames ?? []),
    }
    const shot = await captureWallpaper({
      theme: settings.theme,
      data: wallpaperData,
      iconSafeRatio: settings.iconSafeRatio,
      outPath: getPaths().wallpaper,
    })
    const result = await applyWallpaper(shot.path)
    if (result.ok) {
      applyError = null
      scheduler?.markApplied()
    } else {
      applyError = `바탕화면 적용 실패: ${result.detail}`
      log(applyError)
    }
    publish()
    return { ok: result.ok, detail: result.detail }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    applyError = `바탕화면 생성 실패: ${detail}`
    log(applyError)
    publish()
    return { ok: false, detail }
  }
}

// ── 창 ────────────────────────────────────────────────────────────────

function createControllerWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 720,
    height: 480,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    // 닌텐도 홈 화면 같은 껍데기가 표면 전체를 갖는다. OS 제목 표시줄은 한 줄도 남기지 않는다.
    titleBarStyle: 'hidden',
    frame: process.platform === 'darwin',
    // macOS 신호등만 남긴다. 36px 손잡이 한가운데에 오도록 내려 앉힌다.
    trafficLightPosition: { x: 14, y: 11 },
    backgroundColor: '#161616',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // 흰 화면이 한 번 번쩍이지 않도록 첫 페인트까지 숨겨 둔다.
  win.once('ready-to-show', () => win.show())

  // 닫기는 종료가 아니라 트레이로 접기다. 종료는 트레이 메뉴에만 있다.
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    win.hide()
  })

  win.on('closed', () => {
    controllerWindow = null
  })

  // 외부 링크는 앱 안에서 열지 않는다. file:// 같은 걸 넘기면 OS 가 무엇을 열지 모르니
  // http(s) 만 통과시키고, openExternal 의 거부는 여기서 받아 삼킨다.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url).catch((e) => log(`외부 링크 열기 실패 — ${String(e)}`))
    }
    return { action: 'deny' }
  })

  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) {
    void win.loadURL(`${devServer.replace(/\/$/, '')}/controller.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/controller.html'))
  }

  return win
}

function showController(): void {
  if (!controllerWindow || controllerWindow.isDestroyed()) {
    controllerWindow = createControllerWindow()
    return
  }
  if (!controllerWindow.isVisible()) controllerWindow.show()
  controllerWindow.focus()
}

// ── 설정 ──────────────────────────────────────────────────────────────

async function applySettingsPatch(patch: Partial<Settings>): Promise<AppState> {
  const before = settings
  settings = saveSettings({ ...settings, ...patch })

  if (settings.autostart !== before.autostart) {
    try {
      await applyAutostart(settings.autostart)
    } catch (e) {
      log(`자동 실행 설정 실패 — ${String(e)}`)
    }
  }

  // 학년·반이 바뀌면 들고 있는 자료가 남의 것이 된다. 즉시 다시 받아온다.
  const needsRefetch =
    settings.grade !== before.grade ||
    settings.classNo !== before.classNo ||
    settings.preferManualTimetable !== before.preferManualTimetable
  if (needsRefetch) {
    publish()
    void scheduler?.triggerNow('설정 변경')
    return snapshot()
  }

  // 겉모습만 바뀐 경우엔 이미 있는 자료로 다시 그리기만 하면 된다.
  const needsRedraw =
    settings.theme !== before.theme ||
    settings.iconSafeRatio !== before.iconSafeRatio ||
    (settings.teacherNames ?? []).join('\u0000') !== (before.teacherNames ?? []).join('\u0000')
  if (data) data = { ...data, grade: settings.grade, classNo: settings.classNo }
  publish()
  if (needsRedraw) void applyCurrentWallpaper()
  return snapshot()
}

// ── 부팅 ──────────────────────────────────────────────────────────────

/**
 * 마지막 안전망.
 *
 * 이 앱은 교실 PC 에서 몇 주씩 아무도 안 보는 채로 돈다. Node 18 부터 처리되지 않은
 * 거부는 프로세스를 죽이는 것이 기본값이라, 어디 한 군데서 await 를 빠뜨리면
 * 어느 날 밤 조용히 사라지고 다음 날 아침 어제 바탕화면만 남는다.
 * 죽는 대신 기록만 남기고 계속 돈다 — 반쪽짜리 화면이 없는 화면보다 낫다.
 */
process.on('unhandledRejection', (reason) => {
  log(`처리되지 않은 거부 — ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`)
})
process.on('uncaughtException', (error) => {
  log(`처리되지 않은 예외 — ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
})

/** 자동 실행으로 뜬 경우(autostart.ts 의 BACKGROUND_FLAG). 창 없이 트레이로만 시작한다. */
const startInBackground = process.argv.includes('--background')

// 두 번째 인스턴스는 창만 띄우고 스스로 물러난다. 바탕화면을 두 프로세스가
// 번갈아 덮어쓰는 사고를 막는 유일한 방법이다.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showController())

  void app.whenReady().then(async () => {
    settings = loadSettings()

    // 설정 파일과 OS 등록 상태가 어긋나 있으면 설정 쪽을 정답으로 삼는다.
    try {
      if ((await isAutostartEnabled()) !== settings.autostart) {
        await applyAutostart(settings.autostart)
      }
    } catch (e) {
      log(`자동 실행 상태 확인 실패 — ${String(e)}`)
    }

    registerIpc({
      getState: () => snapshot(),
      setSettings: (patch) => applySettingsPatch(patch),
      refresh: async () => {
        await scheduler?.triggerNow('수동')
        return snapshot()
      },
      applyWallpaper: () => applyCurrentWallpaper(),
      minimizeToTray: () => controllerWindow?.hide(),
      closeWindow: () => controllerWindow?.close(),
    })

    tray = createTray({
      onOpenSettings: () => showController(),
      onRefresh: () => {
        void scheduler?.triggerNow('트레이')
      },
      onQuit: () => {
        quitting = true
        app.quit()
      },
    })

    startAutoUpdater()

    scheduler = new Scheduler({
      runRefresh,
      loadSettings,
      // 스케줄러가 상태를 바꿀 때마다 컨트롤러·트레이가 같이 따라간다.
      onStatus: () => {
        publish()
      },
      log,
    })

    // 로그인 자동 실행으로 뜬 것이면 창을 열지 않는다. 수업 시작할 때마다
    // 컨트롤러가 화면을 덮고 뜨면 그건 그냥 고장이다.
    if (!startInBackground) controllerWindow = createControllerWindow()

    // 창을 띄우기 전에 activate 를 걸어 둔다. 아래 부팅 갱신은 수십 초가 걸릴 수 있고,
    // 그 사이 독 아이콘을 눌러도 아무 일이 없으면 사용자는 앱이 죽은 줄 안다.
    app.on('activate', () => showController())

    // 부팅 갱신은 스케줄러를 통해 돈다. 그래야 첫 tick 이 곧바로 또 받아오지 않는다.
    await scheduler.triggerNow('부팅')
    scheduler.start()
  })

  // 트레이에 사는 앱이다. 창이 다 닫혀도 살아 있어야 한다.
  app.on('window-all-closed', () => {})

  app.on('before-quit', () => {
    quitting = true
    scheduler?.stop()
    tray?.destroy()
    destroyCaptureWindow()
  })
}
