import { rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'

// 현재 테마의 검수 이미지를 라벨과 함께 한 장으로 만든다.
const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const SHOTS = join(ROOT, 'docs', 'shots')

const ITEMS = [['pixel-speech', '픽셀 말풍선']]

const CELL_W = 480, CELL_H = 270, COLS = 4, LABEL = 30
const W = CELL_W * COLS, H = (CELL_H + LABEL) * Math.ceil(ITEMS.length / COLS)

const cells = ITEMS.map(([id, name]) =>
  `<figure><img src="file://${join(SHOTS, id + '.png')}"><figcaption>${name}</figcaption></figure>`,
).join('')

const html = `<!doctype html><meta charset="utf-8"><style>
 @font-face{font-family:P;src:url(file://${ROOT}/resources/fonts/PretendardVariable.ttf)}
 body{margin:0;background:#111;font-family:P,sans-serif;display:grid;
      grid-template-columns:repeat(${COLS},${CELL_W}px)}
 figure{margin:0}
 img{width:${CELL_W}px;height:${CELL_H}px;display:block}
 figcaption{height:${LABEL}px;line-height:${LABEL}px;color:#fff;font-size:15px;
            padding-left:12px;background:#1b1b1b}
</style>${cells}`

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, show: false })
  const tmp = join(ROOT, 'docs', '.sheet.html')
  writeFileSync(tmp, html)
  await win.loadFile(tmp)
  await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,300)))')
  const img = await win.webContents.capturePage()
  writeFileSync(join(ROOT, 'docs', 'themes.png'), img.toPNG())
  rmSync(tmp, { force: true })
  console.log('wrote docs/themes.png', W + 'x' + H)
  app.exit(0)
})
