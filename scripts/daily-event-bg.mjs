import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

/**
 * 매일 새벽 5시에 돌리는 이벤트 배경 갱신 스크립트.
 *
 * 1. 밈 이미지(imgflip, 스펀지밥·패트릭 계열 우선)와 아이돌 사진(위키미디어
 *    커먼스)을 날짜 시드로 한 장씩 골라 resources/events/YYYY-MM-DD/ 에 받는다.
 * 2. resources/events/latest.json 에 오늘자 매니페스트를 쓴다.
 * 3. 7일 지난 날짜 폴더는 지운다.
 * 4. npm run pack:mac 으로 새 dmg 를 굽는다(릴리스). --no-build 로 생략 가능.
 *
 * 둘 중 하나라도 받아지면 릴리스까지 간다. 둘 다 실패해야만 비정상 종료.
 * launchd(kr.hs.icsh.geupsik.daily-event-bg)가 5:00 에 이 스크립트를 부른다.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const EVENTS_DIR = join(ROOT, 'resources', 'events')
const KEEP_DAYS = 7
const FETCH_TIMEOUT_MS = 20_000
const UA = 'geupsik-controller-daily-event-bg/1.0 (personal classroom project)'
const NO_BUILD = process.argv.includes('--no-build')

const MEME_KEYWORDS = ['spongebob', 'patrick', 'squidward', 'krabs', 'plankton']

const today = new Date()
const DATE = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
  today.getDate(),
).padStart(2, '0')}`
const SEED = Number(DATE.replaceAll('-', ''))

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

/** 같은 날짜면 같은 결과, 날짜가 바뀌면 다른 결과가 나오는 결정적 인덱스. */
function seededIndex(length, salt) {
  let h = SEED * 2654435761 + salt * 40503
  h = Math.abs(h ^ (h >>> 13))
  return h % length
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

async function download(url, outPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 10_000) throw new Error(`응답이 너무 작습니다 (${buf.length}B) — 이미지 아님`)
  writeFileSync(outPath, buf)
  return buf.length
}

function extOf(url) {
  const m = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)
  const ext = m ? m[1].toLowerCase() : ''
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
}

/** imgflip 상위 100개 밈 중 스펀지밥 계열을 우선 골라 한 장. */
async function pickMeme(outDir) {
  const json = await fetchJson('https://api.imgflip.com/get_memes')
  const memes = json?.data?.memes ?? []
  if (memes.length === 0) throw new Error('imgflip 밈 목록이 비어 있습니다')
  const preferred = memes.filter((m) =>
    MEME_KEYWORDS.some((k) => m.name.toLowerCase().includes(k)),
  )
  const pool = preferred.length > 0 ? preferred : memes
  const meme = pool[seededIndex(pool.length, 1)]
  const file = join(outDir, `meme.${extOf(meme.url)}`)
  const bytes = await download(meme.url, file)
  log(`밈: ${meme.name} (${(bytes / 1024).toFixed(0)}KB)`)
  return { kind: 'meme', title: meme.name, file, source: meme.url }
}

/** 위키미디어 커먼스에서 K-pop 아이돌 사진 한 장. 자유 라이선스라 번들필 때 안전하다. */
async function pickIdol(outDir) {
  const query = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: 'K-pop idol filetype:bitmap',
    gsrnamespace: '6',
    gsrlimit: '50',
    prop: 'imageinfo',
    iiprop: 'url|size',
    iiurlwidth: '1600',
    format: 'json',
  })
  const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${query}`)
  const pages = Object.values(json?.query?.pages ?? {})
    .flatMap((p) => p.imageinfo ?? [])
    .filter((ii) => ii.thumburl && ii.thumbwidth >= 800 && ii.thumbheight >= 800)
  if (pages.length === 0) throw new Error('커먼스 검색 결과가 비어 있습니다')
  const info = pages[seededIndex(pages.length, 2)]
  const file = join(outDir, `idol.${extOf(info.thumburl)}`)
  const bytes = await download(info.thumburl, file)
  log(`아이돌: ${info.descriptionshorturl ?? info.thumburl} (${(bytes / 1024).toFixed(0)}KB)`)
  return { kind: 'idol', title: info.descriptionshorturl ?? 'K-pop idol', file, source: info.url }
}

/** KEEP_DAYS 보다 오래된 날짜 폴더 정리. */
function prune() {
  const dirs = readdirSync(EVENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort()
  const stale = dirs.slice(0, Math.max(0, dirs.length - KEEP_DAYS))
  for (const name of stale) {
    rmSync(join(EVENTS_DIR, name), { recursive: true, force: true })
    log(`정리: ${name}`)
  }
}

/** dmg 릴리스. launchd 환경은 PATH 가 빈약하므로 node 있는 디렉터리를 앞에 붙인다. */
function release() {
  return new Promise((resolvePromise, reject) => {
    const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` }
    const child = spawn('npm', ['run', 'pack:mac'], { cwd: ROOT, stdio: 'inherit', env })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`pack:mac 종료 코드 ${code}`)),
    )
  })
}

async function main() {
  const outDir = join(EVENTS_DIR, DATE)
  mkdirSync(outDir, { recursive: true })

  const images = []
  const errors = []
  for (const pick of [pickMeme, pickIdol]) {
    try {
      images.push(await pick(outDir))
    } catch (err) {
      errors.push(err.message)
      log(`실패 — ${err.message}`)
    }
  }

  if (images.length === 0) {
    log(`오늘자 이미지를 하나도 못 받았습니다: ${errors.join(' / ')}`)
    process.exit(1)
  }

  const manifest = {
    date: DATE,
    images: images.map(({ kind, title, file, source }) => ({
      kind,
      title,
      file: file.slice(ROOT.length + 1),
      source,
    })),
  }
  writeFileSync(join(EVENTS_DIR, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n')
  log(`매니페스트: resources/events/latest.json (${images.length}장)`)

  prune()

  if (NO_BUILD) {
    log('--no-build — 릴리스 생략')
    return
  }
  log('릴리스 시작 (npm run pack:mac)')
  await release()
  log('릴리스 완료')
}

main().catch((err) => {
  log(`치명적 오류 — ${err.message}`)
  process.exit(1)
})
