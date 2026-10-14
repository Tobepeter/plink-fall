import { ChevronsUp, Crosshair, Heart, Pause, Play, Volume2, VolumeX, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { RushPort, RushState } from '../types'
import { dashMaxCooldown } from '../model/weapons'
import { time } from './weapon-glyph'

// 战斗读数与短操作
export function RushHud(props: { state: RushState; store: RushPort; ready: boolean }) {
  const { state, store } = props
  const boss =
    state.phase === 'playing' ? state.enemies.find((enemy) => enemy.kind === 'boss') : undefined
  const playing = state.phase === 'playing' && !state.paused && props.ready
  const dashReady = playing && state.player.dashCooldown <= 0
  const dash = () => {
    if (!store.dash()) return
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  const sound = () => {
    store.toggleSound()
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  const pause = () => {
    store.setPaused(!store.state.paused)
    if (!store.state.paused)
      document
        .querySelector<HTMLCanvasElement>('.rush-stage canvas')
        ?.focus({ preventScroll: true })
  }
  return (
    <div className="rush-hud">
      <div className="rush-vitals">
        <div
          className={`rush-health${state.player.hp <= 1 ? ' is-low' : ''}`}
          role="meter"
          aria-label="生命"
          aria-valuemin={0}
          aria-valuemax={state.player.maxHp}
          aria-valuenow={state.player.hp}
        >
          <Heart size={18} fill="currentColor" />
          <span className="rush-health-cells">
            {Array.from({ length: state.player.maxHp }, (_, index) => (
              <i className={index < state.player.hp ? 'is-filled' : ''} key={index} />
            ))}
          </span>
        </div>
        <span className="rush-kills" aria-label={`击败 ${state.kills} 名敌人`}>
          <Crosshair size={13} />
          <b>{state.kills}</b>
        </span>
      </div>
      <div className="rush-clock">
        <b>{time(state.clock)}</b>
        <span>LV {state.level}</span>
        <i
          className="rush-xp"
          role="progressbar"
          aria-label="升级经验"
          aria-valuemin={0}
          aria-valuemax={state.nextXp}
          aria-valuenow={state.xp}
        >
          <i style={{ transform: `scaleX(${Math.min(1, state.xp / state.nextXp)})` }} />
        </i>
      </div>
      <div className="rush-settings">
        <button
          className="rush-icon"
          onClick={pause}
          disabled={!props.ready || state.phase === 'dead' || state.phase === 'won'}
          aria-label={state.paused ? '继续战斗' : '暂停战斗'}
        >
          {state.paused ? (
            <Play size={19} fill="currentColor" />
          ) : (
            <Pause size={19} fill="currentColor" />
          )}
        </button>
        <button
          className="rush-icon"
          onClick={sound}
          aria-label={state.record.muted ? '开启声音' : '关闭声音'}
          aria-pressed={!state.record.muted}
        >
          {state.record.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>
      {boss && (
        <div className="rush-boss">
          <span>封锁者 {boss.tier}</span>
          <i>
            <i style={{ transform: `scaleX(${Math.max(0, boss.hp / boss.maxHp)})` }} />
          </i>
        </div>
      )}
      {state.phase === 'playing' && state.overdrive > 0 && (
        <span className="rush-overdrive">
          <Zap size={16} fill="currentColor" />
          超载
        </span>
      )}
      {state.phase === 'playing' && (
        <button
          className={`rush-dash${dashReady ? ' is-ready' : ''}`}
          onClick={dash}
          disabled={!dashReady}
          aria-label={dashReady ? '冲刺' : '冲刺冷却中'}
          style={
            {
              '--dash-charge': Math.max(0, 1 - state.player.dashCooldown / dashMaxCooldown(state)),
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle className="rush-dash-track" cx="36" cy="36" r="32" />
            <circle className="rush-dash-fill" cx="36" cy="36" r="32" pathLength="100" />
          </svg>
          <ChevronsUp size={26} />
          <span>冲刺</span>
        </button>
      )}
      {state.phase === 'playing' && (
        <span className="rush-key-hint">
          <kbd>WASD</kbd> 移动 <kbd>SPACE</kbd> 冲刺
        </span>
      )}
    </div>
  )
}
