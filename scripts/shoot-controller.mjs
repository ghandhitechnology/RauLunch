import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'

/**
 * 컨트롤러 창을 실제 크기(720x480)로 한 장 찍는다.
 *
 * SSH 로 붙어 개발하는 환경이라 창을 눈으로 볼 수 없어서, 디자인 검수는
 * 이 스크립트가 구운 PNG 로만 한다. window.api 가 없으면 컨트롤러가
 * SAMPLE_DATA 로 떨어지도록 되어 있어 preload 없이도 그려진다.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUT_DIR = join(ROOT, 'docs', 'shots')
const PAGE = join(ROOT, 'out', 'renderer', 'controller.html')

const W = 720
const H = 480

async function shoot(win, name, before) {
  if (before) await win.webContents.executeJavaScript(before)
  // 폰트 로드 + 두 프레임 대기. 전환 애니메이션이 끝난 뒤를 찍는다.
  await win.webContents.executeJavaScript(
    `document.fonts.ready.then(() => new Promise(r => setTimeout(r, 400)))`,
  )
  const img = await win.webContents.capturePage()
  const out = join(OUT_DIR, `${name}.png`)
  writeFileSync(out, img.toPNG())
  console.log('wrote', out)
}

app.whenReady().then(async () => {
  if (!existsSync(PAGE)) {
    console.error('out/renderer/controller.html 이 없습니다. npm run build 먼저.')
    app.exit(1)
    return
  }
  mkdirSync(OUT_DIR, { recursive: true })

  const win = new BrowserWindow({
    width: W,
    height: H,
    show: false,
    frame: false,
    backgroundColor: '#2D2D2D',
    webPreferences: { offscreen: false },
  })
  await win.loadFile(PAGE)

  await shoot(win, 'controller-home')
  // 테마를 몇 개 바꿔가며 타일이 실제로 다시 칠해지는지 본다.
  // 칩에 id 속성이 없어 이름으로 찾는다.
  const byName = { chalk: '분필', poster: '포스터', 'terminal-dark': null }
  for (const [id, name] of Object.entries(byName)) {
    if (!name) continue
    await shoot(
      win,
      `controller-${id}`,
      `(() => {
         const el = [...document.querySelectorAll('.chip')]
           .find(b => b.textContent.includes(${JSON.stringify(name)}))
         if (el) el.click()
         return !!el
       })()`,
    )
  }

  win.destroy()
  app.exit(0)
})
