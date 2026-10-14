import type { RushPort } from '../../types'
import { ControlGlyph } from '../weapon-glyph'

// 鼠标方向瞄准与自动索敌切换
export function RushAim(props: { store: RushPort; enabled: boolean }) {
  return (
    <button
      className={`rush-icon rush-aim-toggle${props.enabled ? ' is-enabled' : ''}`}
      onClick={() => props.store.setMouseAim(!props.enabled)}
      aria-label="鼠标方向瞄准"
      aria-pressed={props.enabled}
    >
      <ControlGlyph id="target" />
      <small>鼠标</small>
      <i />
    </button>
  )
}
