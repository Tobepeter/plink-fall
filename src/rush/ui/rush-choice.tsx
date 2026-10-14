import type { CSSProperties } from 'react'
import { upgrades } from '../model/data'
import type { RushPort, RushState } from '../types'
import { WeaponGlyph } from './weapon-glyph'

// 场景中的三选武器
export function RushChoice(props: { state: RushState; store: RushPort }) {
  const choose = (id: (typeof props.state.choices)[number]) => {
    if (!props.store.choose(id)) return
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  if (props.state.phase !== 'choice' || props.state.paused) return null
  return (
    <div className="rush-choice" aria-label="选择本次装配">
      <div className="rush-choice-title">
        <span>LEVEL UP</span>
        <b>装配武器</b>
      </div>
      <div className="rush-weapons">
        {props.state.choices.map((id, index) => {
          const upgrade = upgrades.find((item) => item.id === id)
          if (!upgrade) return null
          const level = (props.state.upgrades[id] ?? 0) + 1
          return (
            <button
              key={`${props.state.runId}-${props.state.level}-${id}`}
              className="rush-weapon"
              onClick={() => choose(id)}
              style={{ '--weapon-color': upgrade.color, '--weapon-order': index } as CSSProperties}
              aria-label={`${upgrade.name}，${upgrade.hint}，等级 ${level}`}
            >
              <span className="rush-weapon-device">
                <i />
                <WeaponGlyph id={id} size={90} />
              </span>
              <b>{upgrade.name}</b>
              <span className="rush-weapon-level">MK {level}</span>
              <small>{upgrade.hint}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
