import type { CSSProperties } from 'react'
import { upgrades } from '../model/data'
import { protocolDefinitions } from '../model/combat/protocols'
import { upgradeHint } from '../model/combat/upgrade-hints'
import type { RushPort, RushState, UpgradeId } from '../types'
import { WeaponGlyph } from './weapon-glyph'
import { Sparkles } from 'lucide-react'

// 不打断战斗的三选军械槽
export function RushChoice(props: { state: RushState; store: RushPort }) {
  const { state, store } = props
  if (state.phase !== 'playing' || state.paused || state.choices.length === 0) return null
  const choose = (id: UpgradeId) => {
    if (!store.choose(id)) return
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  return (
    <div className="rush-choice" aria-label="选择本次装配">
      <span className="rush-choice-level" role="status">
        <Sparkles size={14} aria-hidden="true" />
        <b>可装配</b>
      </span>
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
              className={`rush-weapon${linked ? ' is-linked' : ''}`}
              key={`${state.runId}-${state.level}-${id}`}
              onPointerDown={(event) => {
                event.preventDefault()
                if (event.pointerType === 'touch') choose(id)
              }}
              onClick={() => choose(id)}
              style={{ '--weapon-order': index } as CSSProperties}
              aria-label={`${upgrade.name}，${hint}，等级 ${level + 1}${linked && protocol ? `，${protocol.name}` : ''}`}
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
              <span className="rush-weapon-level">Lv{level + 1}</span>
              <small>{hint.split(' · ')[0]}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
