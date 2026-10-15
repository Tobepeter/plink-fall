import { useEffect, useState } from 'react'
import { GameGlyph } from './game-glyph'
import type { CSSProperties, PointerEvent } from 'react'
import type { ProtocolId, RushPort, RushState } from '../types'
import { dashMaxCooldown } from '../model/weapons'
import { activeWeaponReactions } from '../model/armory/data'
import { ControlGlyph, time } from './weapon-glyph'
import { ArmoryGlyph } from './armory-glyph'
import { RushAbility } from './campaign/rush-ability'
import { RushRadar } from './campaign/rush-radar'
import { RushWaveTrack } from './campaign/rush-wave-track'
import { RushWeaponSlots } from './campaign/rush-weapon-slots'
import './campaign/rush-campaign-hud.css'

// 波次读数与机械控制
export function RushHud(props: { state: RushState; store: RushPort; ready: boolean }) {
  const { state, store } = props
  const boss =
    state.phase === 'playing'
      ? state.enemies.find((enemy) => enemy.kind === 'boss' && enemy.hp > 0)
      : undefined
  const playing = state.phase === 'playing' && !state.paused && props.ready
  const dashCooldown = dashMaxCooldown(state)
  const dashReady = playing && state.player.dashCooldown <= 0
  const [counter, setCounter] = useState<{ amount: number; runId: number } | null>(null)
  const [connected, setConnected] = useState<{
    id: ProtocolId
    clock: number
    runId: number
  } | null>(null)
  useEffect(
    () =>
      store.onEvent((event) => {
        if (event.type === 'counter')
          setCounter({ amount: event.amount ?? 0, runId: store.state.runId })
        if (event.type === 'protocol' && event.amount === 1 && event.protocol)
          setConnected({ id: event.protocol, clock: store.state.clock, runId: store.state.runId })
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
  const remainingSeconds = Math.max(0, state.wave.duration - state.wave.elapsed)
  const remaining = Math.ceil(remainingSeconds)
  const protocols = activeWeaponReactions(state)
  const focusCanvas = () =>
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  const dash = () => {
    if (store.dash()) focusCanvas()
  }
  const dashPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    if (event.pointerType !== 'mouse') dash()
  }
  const pause = () => {
    store.setPaused(!store.state.paused)
    if (!store.state.paused) focusCanvas()
  }
  return (
    <div className="rush-hud" inert={state.paused}>
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
          <GameGlyph id="kills" size={22} />
          <b>{state.kills}</b>
        </span>
      </div>
      <div className={`rush-clock${breather ? ' is-breather' : ''}`}>
        <span className="rush-wave-name" aria-label={`第 ${state.wave.index} / 9 波`}>
          <b>{String(state.wave.index).padStart(2, '0')}</b>
          <em>/ 09</em>
        </span>
        <b
          className={state.wave.duration === 0 ? 'is-boss-wave' : ''}
          aria-label={state.wave.duration === 0 ? '首领战' : '本波剩余时间'}
        >
          {state.wave.duration === 0 ? (
            <GameGlyph id="kills" size={30} />
          ) : breather ? (
            remainingSeconds.toFixed(1)
          ) : (
            time(remaining)
          )}
        </b>
        <span className="rush-level">
          <GameGlyph id="level" size={16} />
          <b>{state.level}</b>
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
        </span>
        <RushWaveTrack state={state} />
      </div>
      <div className="rush-settings">
        <button
          className="rush-icon"
          onClick={pause}
          onPointerDown={(event) => event.preventDefault()}
          disabled={!props.ready || state.phase === 'dead' || state.phase === 'won'}
          aria-label={state.paused ? '继续战斗' : '暂停战斗'}
        >
          <ControlGlyph id={state.paused ? 'play' : 'pause'} />
        </button>
      </div>
      <div className="rush-alerts">
        {playing && !breather && state.wave.elapsed < 0.9 && (
          <span className="rush-wave-notice" key={`${state.runId}-${state.wave.index}`}>
            {state.wave.name}
          </span>
        )}
        {boss && (
          <div
            className="rush-boss"
            role="meter"
            aria-label={state.wave.name}
            aria-valuemin={0}
            aria-valuemax={boss.maxHp}
            aria-valuenow={boss.hp}
          >
            <span>{state.wave.name}</span>
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
      </div>
      {protocols.length > 0 && (
        <div className="rush-protocols" aria-label="已接入协议">
          {protocols.map((item) => {
            const id = item.id
            return (
              <span
                key={`${state.runId}-${id}`}
                data-protocol={id}
                className={
                  connected?.id === id &&
                  connected.runId === state.runId &&
                  state.clock - connected.clock < 2.4
                    ? 'is-new'
                    : undefined
                }
                style={{ '--protocol-color': item.color } as CSSProperties}
                aria-label={item.name}
                title={item.name}
              >
                <ArmoryGlyph id={item.parts[0]} size={29} />
                <i />
                <ArmoryGlyph id={item.parts[1]} size={29} />
                <small aria-hidden="true">{item.name}</small>
              </span>
            )
          })}
        </div>
      )}
      {state.phase === 'playing' && <RushWeaponSlots state={state} />}
      {state.phase === 'playing' && <RushAbility state={state} store={store} />}
      {state.phase === 'playing' && <RushRadar state={state} />}
      {state.phase === 'playing' && (
        <button
          className={`rush-dash${dashReady ? ' is-ready' : ''}${intercepted ? ' has-counter' : ''}`}
          onClick={dash}
          onPointerDown={dashPointerDown}
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
          <span>冲刺</span>
          {intercepted && <b className="rush-counter-count">反击 ×{counter.amount}</b>}
        </button>
      )}
      {state.phase === 'playing' && state.clock < 9 && state.choices.length === 0 && (
        <span className="rush-key-hint">
          <kbd>WASD</kbd> 移动 <kbd>SPACE</kbd> 截弹反击
          <kbd>E</kbd> 机体技能
        </span>
      )}
    </div>
  )
}
