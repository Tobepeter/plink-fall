import type { RushPort, RushState } from '../../../types'
import { ControlGlyph } from '../../weapon-glyph'

// 只暴露真实可用设置，触屏不显示鼠标专属选项
export function RushSettingsPage(props: { state: RushState; store: RushPort }) {
  const { record } = props.state
  return (
    <div className="rush-settings-page rush-secondary">
      <button
        className="rush-setting"
        onClick={() => props.store.toggleSound()}
        aria-label="游戏声音"
        aria-pressed={!record.muted}
      >
        <ControlGlyph id={record.muted ? 'muted' : 'sound'} />
        <span>
          <b>声音</b>
        </span>
        <i className={`rush-setting-switch${!record.muted ? ' is-on' : ''}`} aria-hidden="true" />
      </button>
      <button
        className="rush-setting is-pointer"
        onClick={() => props.store.setMouseAim(!record.mouseAim)}
        aria-label="鼠标方向瞄准"
        aria-pressed={record.mouseAim}
      >
        <ControlGlyph id="target" />
        <span>
          <b>鼠标瞄准</b>
          <small>{record.mouseAim ? '手动' : '自动'}</small>
        </span>
        <i className={`rush-setting-switch${record.mouseAim ? ' is-on' : ''}`} aria-hidden="true" />
      </button>
    </div>
  )
}
