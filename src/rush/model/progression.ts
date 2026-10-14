import type { RushState, UpgradeId } from '../types'
import type { Hooks } from './math'
import { level } from './math'
import { upgrades } from './data'
import { blast } from './combat/damage'
import { activeProtocols } from './combat/protocols'

// 经验选装与零件强化共用同一真实技能升级
export function applyUpgrade(s: RushState, hooks: Hooks, id: UpgradeId) {
  const def = upgrades.find((item) => item.id === id)
  if (!def || level(s, id) >= def.maxLevel) return false
  const previous = activeProtocols(s)
  s.upgrades[id] = level(s, id) + 1
  if (id === 'vital') {
    s.player.maxHp++
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + 2)
    blast(s, hooks, s.player, 130, 3)
  }
  if (id === 'frost')
    s.zones.push({
      id: hooks.id(),
      ...s.player,
      kind: 'frost',
      radius: 84,
      life: 3,
      duration: 3,
      tick: 0,
    })
  hooks.emit({ type: 'upgrade', ...s.player, upgrade: id, amount: level(s, id) })
  for (const protocol of activeProtocols(s)) {
    if (!previous.includes(protocol))
      hooks.emit({ type: 'protocol', ...s.player, protocol, amount: 1 })
  }
  return true
}
