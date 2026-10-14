import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RushPort, RushState } from '../types'
import { dashMaxCooldown } from '../model/weapons'
import { activeProtocols, protocolDefinitions } from '../model/combat/protocols'
import { ControlGlyph, WeaponGlyph, time } from './weapon-glyph'
import { RushAbility } from './campaign/rush-ability'
import { RushRadar } from './campaign/rush-radar'
import { RushScrap } from './campaign/rush-scrap'
import { RushWaveTrack } from './campaign/rush-wave-track'
import './campaign/rush-campaign-hud.css'

// 波次读数与机械控制
export function RushHud(props: { state: RushState; store: RushPort; ready: boolean }) {
  const { state, store } = props
  const boss =
    state.phase === 'playing' ? state.enemies.find((enemy) => enemy.kind === 'boss') : undefined
  const playing = state.phase === 'playing' && !state.paused && props.ready
  const dashCooldown = dashMaxCooldown(state)
  const dashReady = playing && state.player.dashCooldown <= 0
  const [counter, setCounter] = useState<{ amount: number; runId: number } | null>(null)
  useEffect(
    () =>
      store.onEvent((event) => {
        if (event.type === 'counter')
          setCounter({ amount: event.amount ?? 0, runId: store.state.runId })
      }),
    [store],
  )
  useEffect(() => {
    if (!counter) return
    const timer = window.setTimeout(() => setCounter(null), 650)
    return () => window.clearTimeout(timer)
  }, [counter])
  const intercepted = counter && counter.runId === state.runId
  const breather = state.wave.phase === 'breather'
  const remaining = Math.max(0, Math.ceil(state.wave.duration - state.wave.elapsed))
  const protocols = activeProtocols(state)
  const focusCanvas = () =>
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  const dash = () => {
    if (store.dash()) focusCanvas()
  }
  const sound = () => {
    store.toggleSound()
    focusCanvas()
  }
  const pause = () => {
    store.setPaused(!store.state.paused)
    if (!store.state.paused) focusCanvas()
  }
  return (
    <div className="rush-hud">
      <div className="rush-vitals">
        <div
          className={`rush-health${state.player.hp <= 1 ? ' is-low' : ''}`}
          role="meter"
          aria-label="装甲生命"
          aria-valuemin={0}
          aria-valuemax={state.player.maxHp}
          aria-valuenow={state.player.hp}
        >
          <ControlGlyph id="armor" />
          <span className={`rush-health-cells${state.player.maxHp > 6 ? ' is-dense' : ''}`}>
            {Array.from({ length: state.player.maxHp }, (_, index) => (
              <i className={index < state.player.hp ? 'is-filled' : ''} key={index} />
            ))}
          </span>
        </div>
        <span className="rush-kills" aria-label={`击败 ${state.kills} 名敌人`}>
          <ControlGlyph id="target" />
          <b>{state.kills}</b>
          <RushScrap />
          <small aria-label={`本局零件 ${state.scrap}`}>{state.scrap}</small>
        </span>
      </div>
      <div className={`rush-clock${breather ? ' is-breather' : ''}`}>
        <span className="rush-wave-name">
          第 {String(state.wave.index).padStart(2, '0')} 波 <em>/ 9</em>
          <i />
          {breather ? '休整' : state.wave.name}
        </span>
        <b className={state.wave.duration === 0 ? 'is-lockdown' : ''}>
          {breather ? `${remaining}s` : state.wave.duration === 0 ? '击破封锁' : time(remaining)}
        </b>
        <span className="rush-level">
          等级 {state.level} <i />
          {time(state.clock)}
        </span>
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
        <RushWaveTrack state={state} />
      </div>
      <div className="rush-settings">
        <button
          className="rush-icon"
          onClick={pause}
          disabled={!props.ready || state.phase === 'dead' || state.phase === 'won'}
          aria-label={state.paused ? '继续战斗' : '暂停战斗'}
        >
          <ControlGlyph id={state.paused ? 'play' : 'pause'} />
        </button>
        <button
          className="rush-icon"
          onClick={sound}
          aria-label={state.record.muted ? '开启声音' : '关闭声音'}
          aria-pressed={!state.record.muted}
        >
          <ControlGlyph id={state.record.muted ? 'muted' : 'sound'} />
        </button>
      </div>
      {playing && state.wave.elapsed < 1.4 && !breather && (
        <span className="rush-wave-banner" key={state.wave.index}>
          <i />
          <b>{state.wave.name}</b>
          <span>第 {state.wave.index} 波</span>
          <i />
        </span>
      )}
      {playing && breather && (
        <span className="rush-breather">
          <i />
          补给回收 <b>{remaining}</b>
          <small>秒后接敌</small>
          <i />
        </span>
      )}
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
          火力超载
          <i />
          <b>{state.overdrive.toFixed(1)}</b>
        </span>
      )}
      {protocols.length > 0 && (
        <div className="rush-protocols" aria-label="已接入协议">
          {protocols.map((id) => {
            const item = protocolDefinitions.find((protocol) => protocol.id === id)!
            return (
              <span key={id} aria-label={item.name} title={item.name}>
                <WeaponGlyph id={item.parts[0]} size={29} />
                <i />
                <WeaponGlyph id={item.parts[1]} size={29} />
              </span>
            )
          })}
        </div>
      )}
      {state.phase === 'playing' && <RushAbility state={state} store={store} />}
      {state.phase === 'playing' && <RushRadar state={state} />}
      {state.phase === 'playing' && (
        <button
          className={`rush-dash${dashReady ? ' is-ready' : ''}${intercepted ? ' has-counter' : ''}`}
          onClick={dash}
          disabled={!dashReady}
          aria-label={dashReady ? '冲刺截弹' : '冲刺冷却中'}
          style={
            {
              '--dash-charge': Math.max(0, 1 - state.player.dashCooldown / dashCooldown),
            } as CSSProperties
          }
        >
          <svg className="rush-dash-ring" viewBox="0 0 88 88" aria-hidden="true">
            <circle className="rush-dash-track" cx="44" cy="44" r="36" />
            <circle className="rush-dash-fill" cx="44" cy="44" r="36" pathLength="100" />
            <path d="M38 2h12M38 86h12M2 38v12M86 38v12" />
          </svg>
          <ControlGlyph id="dash" />
          <span>截弹冲刺</span>
          {intercepted && <b className="rush-counter-count">反击 ×{counter.amount}</b>}
        </button>
      )}
      {state.phase === 'playing' && (
        <span className="rush-key-hint">
          <kbd>WASD</kbd> 移动 <kbd>SPACE</kbd> 截弹反击
          <kbd>E</kbd> 机体技能
        </span>
      )}
    </div>
  )
}
