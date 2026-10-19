/**
 * 바탕화면 적용 대신 브라우저 탭으로 렌더 결과를 내보내는 개발용 통로.
 *
 * 테마를 고칠 때마다 OS 바탕화면을 갈아엎으면 되돌리기가 번거롭고, 교실 PC 가 아닌
 * 개발기에서는 그 자체가 방해다. GEUPSIK_PREVIEW=<포트> 로 띄우면 capture 결과를
 * 로컬 HTTP 로 흘려보내고, 열어 둔 탭이 SSE 신호를 받아 스스로 갱신한다.
 *
 * 127.0.0.1 에만 붙는다 — 같은 네트워크에 교실 화면을 노출할 이유가 없다.
 */
import { createServer, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { log } from './logger'

export const PREVIEW_ENV = 'GEUPSIK_PREVIEW'
export const PREVIEW_DEFAULT_PORT = 4319

export interface PreviewServer {
  url: string
  /** 새 렌더를 탭에 밀어 넣는다. 파일 읽기가 실패하면 로그만 남기고 넘어간다. */
  publish(pngPath: string): void
  close(): void
}

/**
 * 환경변수에서 포트를 읽는다. 값이 없으면 null(미리보기 아님),
 * 값이 비었거나 포트가 아니면 기본 포트로 연다.
 */
export function readPreviewPort(env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = env[PREVIEW_ENV]
  if (raw === undefined) return null
  const port = Number.parseInt(raw.trim(), 10)
  return Number.isInteger(port) && port > 0 && port < 65_536 ? port : PREVIEW_DEFAULT_PORT
}

const PAGE = `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>급식 컨트롤러 미리보기</title>
<style>
  html, body { margin: 0; height: 100%; background: #111; color-scheme: dark }
  img { display: block; width: 100vw; height: 100vh; object-fit: contain }
  #status { position: fixed; left: 16px; bottom: 12px; font: 13px/1.4 -apple-system, sans-serif; color: #8a8a8a }
  #status[data-live] { color: #6ee7a8 }
</style>
<img id="shot" alt="바탕화면 미리보기" hidden>
<div id="status">렌더를 기다리는 중</div>
<script>
  const img = document.getElementById('shot')
  const status = document.getElementById('status')
  img.onload = () => {
    img.hidden = false
    status.textContent = new Date().toLocaleTimeString('ko-KR') + ' · ' + img.naturalWidth + '×' + img.naturalHeight
    status.dataset.live = '1'
  }
  new EventSource('/events').onmessage = (event) => {
    img.src = '/wallpaper.png?v=' + encodeURIComponent(event.data)
  }
</script>
`

/** 열어 둔 탭들. 새 렌더가 나오면 전부 깨운다. */
type Client = ServerResponse

export function startPreview(port: number = PREVIEW_DEFAULT_PORT): PreviewServer | null {
  const clients = new Set<Client>()
  let latest: Buffer | null = null

  const send = (client: Client, chunk: string): void => {
    try {
      client.write(chunk)
    } catch {
      clients.delete(client)
    }
  }

  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0]

    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(PAGE)
      return
    }

    if (path === '/wallpaper.png') {
      if (!latest) {
        res.writeHead(503, { 'cache-control': 'no-store' })
        res.end('아직 렌더가 없습니다')
        return
      }
      res.writeHead(200, {
        'content-type': 'image/png',
        'content-length': latest.length,
        'cache-control': 'no-store',
      })
      res.end(latest)
      return
    }

    if (path === '/events') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      })
      res.write('retry: 1000\n\n')
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }

    res.writeHead(404, { 'cache-control': 'no-store' })
    res.end('not found')
  })

  // 프록시·브라우저가 오래된 연결을 끊어도 EventSource 가 스스로 다시 붙게 살려 둔다.
  const keepAlive = setInterval(() => {
    for (const client of clients) send(client, ': ping\n\n')
  }, 25_000)
  keepAlive.unref()

  server.on('error', (error: NodeJS.ErrnoException) => {
    log(`미리보기 서버 오류 — ${error.code ?? ''} ${error.message}`)
  })

  server.listen(port, '127.0.0.1')

  return {
    url: `http://127.0.0.1:${port}/`,
    publish(pngPath: string): void {
      let png: Buffer
      try {
        png = readFileSync(pngPath)
      } catch (e) {
        log(`미리보기 전송 실패 — ${String(e)}`)
        return
      }
      latest = png
      const stamp = Date.now().toString(36)
      for (const client of clients) send(client, `data: ${stamp}\n\n`)
    },
    close(): void {
      clearInterval(keepAlive)
      for (const client of clients) client.end()
      clients.clear()
      server.close()
    },
  }
}
