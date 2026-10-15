import type { CSSProperties } from 'react'
import { upgrades } from '../model/data'
import { protocolDefinitions } from '../model/combat/protocols'
import { upgradeHint } from '../model/combat/upgrade-hints'
import type { RushPort, RushState, UpgradeId } from '../types'
import { WeaponGlyph } from './weapon-glyph'
import { GameGlyph } from './game-glyph'

// 不打断战斗的三选军械槽
export function RushChoice(props: { state: RushState; store: RushPort }) {
  const { state, store } = props
  if (state.phase !== 'playing' || state.paused || state.choices.length === 0) return null
  const recommended = state.choiceRecommended ?? state.choices[0]
  const recommendation = upgrades.find((item) => item.id === recommended)
  const remaining = Math.max(0, state.choiceRemaining)
  const choose = (id: UpgradeId) => {
    if (!store.choose(id)) return
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  return (
    <div className="rush-choice" aria-label="选择本次装配">
      <div className="rush-choice-level">
        <span
          className="rush-choice-announcement"
          role="status"
          key={`${state.runId}-${state.level}`}
        >
          倒计时结束自动装配{recommendation?.name}，可提前选择其他技能
        </span>
        <GameGlyph id="time" size={24} />
        <b aria-hidden="true">{Math.ceil(remaining)}</b>
        <small>自动装配</small>
        <i className="rush-choice-time" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.min(1, remaining / 8)})` }} />
        </i>
      </div>
      <div className="rush-weapons">
        {state.choices.map((id, index) => {
          const upgrade = upgrades.find((item) => item.id === id)
          if (!upgrade) return null
          const level = state.upgrades[id] ?? 0
          const hint = upgradeHint(state, id)
          const protocol = protocolDefinitions.find((item) => item.parts.includes(id))
          const partner = protocol?.parts.find((part) => part !== id)
          const linked = partner && (state.upgrades[partner] ?? 0) > 0
          return (
            <button
              className={`rush-weapon${linked ? ' is-linked' : ''}${id === recommended ? ' is-recommended' : ''}`}
              data-upgrade={id}
              key={`${state.runId}-${state.level}-${id}`}
              onPointerDown={(event) => {
                event.preventDefault()
                if (event.pointerType !== 'mouse') choose(id)
              }}
              onClick={() => choose(id)}
              title={hint}
              style={{ '--weapon-order': index } as CSSProperties}
              aria-label={`${upgrade.name}，${hint}，等级 ${level + 1}${linked && protocol ? `，${protocol.name}` : ''}${id === recommended ? '，推荐，倒计时结束时自动装配' : ''}`}
            >
              <kbd className="rush-choice-key">{index + 1}</kbd>
              <span className="rush-weapon-device">
                <i className="rush-weapon-aura" />
                <i />
                <WeaponGlyph id={id} size={72} />
                <span className="rush-mount-pins">
                  <i />
                  <i />
                  <i />
                </span>
                {partner && (
                  <span
                    className={`rush-weapon-link${linked ? ' is-available' : ''}`}
                    aria-label={protocol?.name}
                  >
                    <WeaponGlyph id={partner} size={20} />
                    <i />
                  </span>
                )}
              </span>
              <b>{upgrade.name}</b>
              <span className="rush-weapon-rank" aria-hidden="true">
                {Array.from({ length: 5 }, (_, rank) => (
                  <i
                    key={rank}
                    className={rank < level ? 'is-owned' : rank === level ? 'is-next' : ''}
                  />
                ))}
              </span>
              {id === recommended && (
                <GameGlyph id="equip" size={24} className="rush-choice-recommended" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
