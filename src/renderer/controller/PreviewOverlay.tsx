import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../shared/theme'
import type { ThemeSkin } from '../../shared/theme'
import type { WallpaperData } from '../../shared/types'
import { WallpaperFrame } from '../wallpaper/WallpaperFrame'
import { Close } from './Glyphs'
import { useElementSize, useOverlay } from './hooks'

/**
 * 타일을 누르면 뜨는 전체 미리보기.
 *
 * WallpaperFrame 을 실제 크기(1920×1080)로 그린 뒤 통째로 줄인다. 프레임에
 * 작은 폭을 넘겨 그리지 않는 이유는, 그러면 테마가 쓰는 길이 단위가 화면 크기와
 * 어긋나 실제 바탕화면과 다른 그림이 나오기 때문이다.
 */

export interface PreviewOverlayProps {
  skin: ThemeSkin
  data: WallpaperData
  iconSafeRatio: number
  onClose: () => void
}

export function PreviewOverlay({ skin, data, iconSafeRatio, onClose }: PreviewOverlayProps) {
  const ref = useOverlay(true, onClose)
  const [stageRef, stage] = useElementSize<HTMLDivElement>()
  const scale = Math.min(stage.width / DESIGN_WIDTH, stage.height / DESIGN_HEIGHT)

  return (
    <div className="sheet sheet-preview" ref={ref} role="dialog" aria-modal="true" aria-label="미리보기">
      <header className="sheet-head">
        <h2 className="sheet-title">{skin.name}</h2>
        <button className="btn btn-icon" onClick={onClose} aria-label="닫기" data-autofocus>
          <Close />
        </button>
      </header>
      <div className="preview-stage" ref={stageRef}>
        {scale > 0 && (
          <div
            className="preview-crop"
            style={{ width: DESIGN_WIDTH * scale, height: DESIGN_HEIGHT * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <WallpaperFrame skin={skin} data={data} iconSafeRatio={iconSafeRatio} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
