import type { RushState } from '../../types'
import type { Hooks } from '../math'
import { distance } from '../math'
import { damageFoe } from '../combat/damage'
import { pushFoe, trace } from './geometry'

export function syncBlades(s: RushState, hooks: Hooks) {
  if (s.phase !== 'playing') {
    s.satellites = []
    return
  }
  const slot = s.weapons.find((weapon) => weapon.id === 'blade')
  const count = !slot
    ? 0
    : slot.branch === 'spread'
      ? slot.level >= 5
        ? 6
        : 4
      : slot.level >= 5
        ? 3
        : slot.level === 2
          ? 3
          : 2
  s.satellites = s.satellites.filter((satellite) => satellite.kind === 'blade').slice(0, count)
  while (s.satellites.length < count)
    s.satellites.push({ id: hooks.id(), kind: 'blade', ...s.player, angle: 0, cooldown: 0 })
}

export function advanceBlades(s: RushState, hooks: Hooks, dt: number) {
  const slot = s.weapons.find((weapon) => weapon.id === 'blade')
  if (!slot) return
  let struck = false,
    intercepted = 0
  const focus = slot.branch === 'focus'
  for (const [index, blade] of s.satellites.entries()) {
    blade.angle = s.clock * (focus ? 3.7 : 5.2) + (index * Math.PI * 2) / s.satellites.length
    const radius = focus ? (slot.level >= 5 ? 124 : 104) : 72 + slot.level * 4
    blade.x = s.player.x + Math.cos(blade.angle) * radius
    blade.y = s.player.y + Math.sin(blade.angle) * radius
    blade.cooldown = Math.max(0, blade.cooldown - dt)
    if (blade.cooldown <= 0) {
      const enemy = s.enemies.find(
        (candidate) =>
          candidate.hp > 0 && distance(blade, candidate) < candidate.radius + (focus ? 25 : 18),
      )
      if (enemy) {
        trace(s, hooks, {
          weapon: 'blade',
          kind: 'slice',
          from: { x: blade.x - 12, y: blade.y - 12 },
          targets: [{ x: blade.x + 12, y: blade.y + 12 }],
          duration: 0.14,
          width: focus ? 6 : 3,
          power: slot.level,
        })
        damageFoe(s, hooks, enemy, (1.5 + slot.level * 0.5) * (focus ? 1.55 : 1))
        if (s.phase !== 'playing') return
        pushFoe(enemy, s.player, focus ? 19 : 6)
        blade.cooldown = 0.24
        struck = true
      }
    }
    if (slot.level >= 5)
      for (const shot of s.shots)
        if (shot.side === 'enemy' && shot.life > 0 && distance(shot, blade) < 22) {
          shot.life = 0
          intercepted++
        }
  }
  if (struck)
    hooks.emit({ type: 'weapon', ...s.player, weapon: 'blade', side: 'player', power: slot.level })
  if (intercepted) {
    s.charge = Math.min(100, s.charge + intercepted)
    hooks.emit({ type: 'intercept', ...s.player, amount: intercepted })
  }
}
