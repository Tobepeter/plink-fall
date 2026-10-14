import type { RushPort, RushState } from '../../types'
import { frameStats } from '../../model/frames'
import { WeaponGlyph } from '../weapon-glyph'

// 独立机体技能与有效冷却
export function RushAbility(props: { state: RushState; store: RushPort }) {
  const { state, store } = props
  const frame = frameStats[state.player.frame]
  const active = state.abilityActive > 0
  const ready = state.phase === 'playing' && !state.paused && state.abilityCooldown <= 0
  const useAbility = () => {
    if (!store.activateAbility()) return
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  return (
    <button
      className={`rush-ability${ready ? ' is-ready' : ''}${active ? ' is-active' : ''}`}
      onClick={useAbility}
      disabled={!ready}
      aria-label={`机体技能：${frame.skillName}`}
    >
      <svg className="rush-ability-charge" viewBox="0 0 66 66" aria-hidden="true">
        <path d="M11 2h44l9 9v44l-9 9H11l-9-9V11z" />
        <path
          d="M11 2h44l9 9v44l-9 9H11l-9-9V11z"
          pathLength="100"
          style={{
            strokeDashoffset: Math.min(100, (state.abilityCooldown / frame.abilityCooldown) * 100),
          }}
        />
      </svg>
      <WeaponGlyph id={frame.startingSkill} size={42} />
      <kbd>E</kbd>
      <span>{frame.skillName}</span>
      {state.abilityCooldown > 0 && !active && <b>{Math.ceil(state.abilityCooldown)}</b>}
      {active && <b className="rush-ability-active">发动中</b>}
    </button>
  )
}
