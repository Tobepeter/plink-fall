import type { RushState } from '../../types'
import { distance, level, toward } from '../math'
import type { Hooks } from '../math'
import { metaStats } from '../meta/progression'

export function advanceLoot(s: RushState, hooks: Hooks, dt: number) {
  const attraction = 185 + level(s, 'magnet') * 115 + metaStats(s.runMeta).pickup
  for (const l of s.loot) {
    l.age += dt
    const d = distance(l, s.player)
    if (d < attraction || l.age > 1.1) {
      const a = toward(l, s.player)
      const speed = 520 + Math.min(650, l.age * 180)
      l.vx = Math.cos(a) * speed
      l.vy = Math.sin(a) * speed
    } else {
      l.vx *= Math.exp(-dt * 5)
      l.vy *= Math.exp(-dt * 5)
    }
    const travel = Math.hypot(l.vx, l.vy) * dt
    if (d < Math.max(19, travel)) {
      if (l.kind === 'xp') s.xp += l.value
      if (l.kind === 'heal') s.player.hp = Math.min(s.player.maxHp, s.player.hp + l.value)
      l.age = -1
      hooks.emit({ type: 'pickup', x: l.x, y: l.y, amount: l.value })
    } else {
      l.x += l.vx * dt
      l.y += l.vy * dt
    }
  }
  s.loot = s.loot.filter((l) => l.age >= 0).slice(-150)
}
