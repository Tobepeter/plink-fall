import type { CSSProperties } from 'react'
import { frameArt } from '../frame-art'
import type { FrameId } from '../types'
import { FrameGlyph } from './weapon-glyph'
import './rush-loading.css'

// 装配环与真实选中机体同源，等待真实资源加载
export function RushLoading(props: { frame: FrameId }) {
  return (
    <section
      className="rush-loading"
      style={{ '--loading-accent': frameArt[props.frame].accent } as CSSProperties}
      role="status"
      aria-label="机体装配中"
    >
      <div className="rush-loading-rig" aria-hidden="true">
        <svg className="rush-loading-ring" viewBox="0 0 180 180">
          <circle className="rush-loading-track" cx="90" cy="90" r="73" />
          <circle className="rush-loading-charge" cx="90" cy="90" r="65" />
          <path d="M69 15h42M69 165h42M15 69v42M165 69v42" />
        </svg>
        <div className="rush-loading-body">
          <FrameGlyph id={props.frame} />
        </div>
        <span className="rush-loading-clamp is-left" />
        <span className="rush-loading-clamp is-right" />
      </div>
      <b>零点突围</b>
      <span className="rush-loading-caption">
        机体装配中
        <i />
        <i />
        <i />
      </span>
    </section>
  )
}
