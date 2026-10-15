import { MousePointer2, Volume2, VolumeX } from 'lucide-react'
import type { RushPort, RushState } from '../../../types'

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
        {record.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        <span>
          <b>声音</b>
          <small>{record.muted ? '已静音' : '已开启'}</small>
        </span>
        <i className={`rush-setting-switch${!record.muted ? ' is-on' : ''}`} aria-hidden="true" />
      </button>
      <button
        className="rush-setting is-pointer"
        onClick={() => props.store.setMouseAim(!record.mouseAim)}
        aria-label="鼠标方向瞄准"
        aria-pressed={record.mouseAim}
      >
        <MousePointer2 aria-hidden="true" />
        <span>
          <b>鼠标方向瞄准</b>
          <small>{record.mouseAim ? '朝鼠标方向射击' : '自动索敌'}</small>
        </span>
        <i className={`rush-setting-switch${record.mouseAim ? ' is-on' : ''}`} aria-hidden="true" />
      </button>
    </div>
  )
}
