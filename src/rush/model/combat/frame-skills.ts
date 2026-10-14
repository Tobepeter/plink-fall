import type { RushState } from '../../types'
import type { Hooks } from '../math'
import { distance } from '../math'
import { frameStats } from '../frames'
import { blast, damageFoe } from './damage'

// 独立主动技能，保留原冲刺
export function activateAbility(s: RushState, hooks: Hooks) {
  if (s.phase !== 'playing' || s.paused || s.abilityCooldown > 0) return false
  const def = frameStats[s.player.frame]
  s.abilityCooldown = def.abilityCooldown
  s.abilityActive = def.abilityDuration
  if (s.player.frame === 'warden') {
    s.player.invulnerable = Math.max(s.player.invulnerable, 1.2)
    blast(s, hooks, s.player, 185, 5, 'pulse')
  } else if (s.player.frame === 'spark') {
    s.player.invulnerable = Math.max(s.player.invulnerable, 0.45)
    const targets = s.enemies
      .filter((e) => e.hp > 0 && distance(e, s.player) <= 260 + e.radius)
      .sort((a, b) => distance(a, s.player) - distance(b, s.player))
      .slice(0, 6)
    for (const [i, enemy] of targets.entries()) damageFoe(s, hooks, enemy, i === 0 ? 5 : 2.5)
    if (targets.length)
      hooks.emit({
        type: 'chain',
        ...s.player,
        targets: [{ x: s.player.x, y: s.player.y }, ...targets.map((e) => ({ x: e.x, y: e.y }))],
      })
  }
  hooks.emit({ type: 'ability', ...s.player, frame: s.player.frame, power: 1 })
  return true
}
