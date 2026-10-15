import type { CSSProperties } from 'react'
import { frameDefinitions } from '../../model/data'
import { frameArt } from '../../frame-art'
import type { FrameId } from '../../types'
import { FrameGlyph } from '../weapon-glyph'

// 与战场同源的机体展示台
export function RushHangar(props: { frame: FrameId }) {
  const frame = frameDefinitions.find((item) => item.id === props.frame)!
  return (
    <div
      className={`rush-hangar-stage is-${frame.id}`}
      style={{ '--hangar-color': frameArt[frame.id].accent } as CSSProperties}
      aria-hidden="true"
    >
      <div className="rush-hangar-radar">
        <i />
        <i />
        <i />
      </div>
      <span className="rush-hangar-axis is-left" />
      <span className="rush-hangar-axis is-right" />
      <div className="rush-hangar-hero">
        <FrameGlyph id={frame.id} />
      </div>
      <div className="rush-hangar-platform">
        <i />
        <i />
        <i />
      </div>
      <span className="rush-hangar-serial">0{frameDefinitions.indexOf(frame) + 1}</span>
    </div>
  )
}
