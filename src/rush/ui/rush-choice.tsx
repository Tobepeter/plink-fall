import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { upgrades } from '../model/data'
import { protocolDefinitions } from '../model/combat/protocols'
import { upgradeHint } from '../model/combat/upgrade-hints'
import type { RushPort, RushState, UpgradeId } from '../types'
import { WeaponGlyph } from './weapon-glyph'

// 三选军械与快速接入反馈
export function RushChoice(props: { state: RushState; store: RushPort }) {
  const { state, store } = props
  const [assembly, setAssembly] = useState<{ id: UpgradeId; runId: number } | null>(null)
  useEffect(() => {
    if (!assembly) return
    const timer = window.setTimeout(() => setAssembly(null), 220)
    return () => window.clearTimeout(timer)
  }, [assembly])
  const choose = (id: UpgradeId) => {
    if (!store.choose(id)) return
    setAssembly({ id, runId: state.runId })
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  if (state.phase !== 'choice' || state.paused) {
    return assembly && assembly.runId === state.runId ? (
      <span className="rush-assembly" aria-hidden="true">
        <WeaponGlyph id={assembly.id} size={56} />
        <i />
      </span>
    ) : null
  }
  const equipped = upgrades.filter((item) => (state.upgrades[item.id] ?? 0) > 0)
  return (
    <div className="rush-choice" aria-label="选择本次装配">
      <div className="rush-choice-title">
        <span>等级 {state.level + 1}</span>
        <b>火力接入</b>
        <i />
      </div>
      {equipped.length > 0 && (
        <div className="rush-loadout" aria-label="已装配模块">
          {equipped.map((item) => (
            <span key={item.id} aria-label={`${item.name} 等级 ${state.upgrades[item.id]}`}>
              <WeaponGlyph id={item.id} size={34} />
              <i>{state.upgrades[item.id]}</i>
            </span>
          ))}
        </div>
      )}
      <div className="rush-weapons">
        {state.choices.map((id, index) => {
          const upgrade = upgrades.find((item) => item.id === id)
          if (!upgrade) return null
          const curr = state.upgrades[id] ?? 0
          const hint = upgradeHint(state, id)
          const protocol = protocolDefinitions.find((item) => item.parts.includes(id))
          const partner = protocol?.parts.find((part) => part !== id)
          const partnerEquipped = partner && (state.upgrades[partner] ?? 0) > 0
          const active = curr > 0 && partnerEquipped
          return (
            <button
              key={`${state.runId}-${state.level}-${id}`}
              className={`rush-weapon${partnerEquipped ? ' is-linked' : ''}`}
              onClick={() => choose(id)}
              style={{ '--weapon-order': index } as CSSProperties}
              aria-label={`${upgrade.name}，${hint}，等级 ${curr + 1}${partnerEquipped && protocol ? `，${protocol.name}` : ''}`}
            >
              <span className="rush-weapon-device">
                <i />
                <WeaponGlyph id={id} size={112} />
                <span className="rush-mount-pins">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <b>{upgrade.name}</b>
              <span className="rush-weapon-level">
                {curr === 0 ? '新装配' : `等级 ${curr}`}
                <i />
                {curr + 1}
              </span>
              <small>{hint}</small>
              {protocol && partner ? (
                <span className={`rush-weapon-link${partnerEquipped ? ' is-available' : ''}`}>
                  <WeaponGlyph id={partner} size={23} />
                  <i />
                  <span>
                    {active
                      ? '协议已接入'
                      : partnerEquipped
                        ? `接入${protocol.name}`
                        : `搭配${upgrades.find((item) => item.id === partner)?.name}`}
                  </span>
                </span>
              ) : (
                <span className="rush-weapon-link is-empty" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
