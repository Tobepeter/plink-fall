import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { metaPrice, metaUpgrades } from '../../../model/meta/progression'
import type { MetaUpgradeId, RushPort, RushState } from '../../../types'
import { WeaponGlyph } from '../../weapon-glyph'
import { RushCoin } from '../rush-coin'

const glyphs = { firepower: 'haste', armor: 'vital', capacitor: 'pulse', magnet: 'magnet' } as const

// 永久装备沿用真实金币与等级，不复制持久状态
export function RushUpgradePage(props: { state: RushState; store: RushPort }) {
  const { record } = props.state
  const [message, setMessage] = useState('')
  const purchase = (id: MetaUpgradeId) => {
    if (!props.store.purchaseMeta(id)) return
    const upgrade = metaUpgrades.find((item) => item.id === id)!
    setMessage(`${upgrade.name} · ${upgrade.effect(props.store.state.record.meta[id])}`)
  }
  return (
    <div className="rush-upgrade-page rush-secondary">
      <div className="rush-upgrade-rack" aria-label="永久强化">
        {metaUpgrades.map((upgrade) => {
          const level = record.meta[upgrade.id]
          const maxed = level >= upgrade.maxLevel
          const cost = metaPrice(record, upgrade.id)
          const available = !maxed && record.coins >= cost
          return (
            <div
              className={`rush-upgrade-slot${maxed ? ' is-maxed' : ''}`}
              key={upgrade.id}
              style={{ '--meta-color': upgrade.color } as CSSProperties}
            >
              <WeaponGlyph id={glyphs[upgrade.id]} size={60} />
              <div className="rush-upgrade-info">
                <h2>
                  {upgrade.name}
                  <small>Lv {level}</small>
                </h2>
                <span className="rush-upgrade-current">当前 · {upgrade.effect(level)}</span>
                <strong>{maxed ? '已完成强化' : `下阶 · ${upgrade.effect(level + 1)}`}</strong>
                <span className="rush-meta-ranks" aria-hidden="true">
                  {Array.from({ length: upgrade.maxLevel }, (_, index) => (
                    <i key={index} className={index < level ? 'is-filled' : ''} />
                  ))}
                </span>
              </div>
              <button
                className="rush-meta-upgrade"
                disabled={!available}
                onClick={() => purchase(upgrade.id)}
                aria-label={`${upgrade.name}，等级 ${level}，${maxed ? '已满级' : `升级需要 ${cost} 金币`}`}
              >
                {maxed ? (
                  <Check aria-hidden="true" />
                ) : (
                  <>
                    <Plus aria-hidden="true" />
                    <span>
                      <RushCoin />
                      <b>{cost}</b>
                    </span>
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
      <p className="rush-page-status" role="status">
        {message}
      </p>
      <p className="rush-page-note">永久保留 · 下次出击生效</p>
    </div>
  )
}
