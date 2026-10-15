import type { Foe, RushState, Vec, Zone } from '../../types'
import type { Hooks } from '../math'
import { distance } from '../math'
import { blast, damageFoe } from '../combat/damage'
import { activeWeaponReactions } from './data'
import { inCone, trace } from './geometry'

export const hasReaction = (s: RushState, id: 'combustion' | 'conduction' | 'prism') =>
  activeWeaponReactions(s).some((reaction) => reaction.id === id)

export function burnPools(
  s: RushState,
  hooks: Hooks,
  from: Vec,
  angle: number,
  range: number,
  halfAngle: number,
) {
  if (s.phase !== 'playing' || !hasReaction(s, 'combustion')) return
  const pools = s.zones
    .filter(
      (zone) =>
        zone.kind === 'toxin' &&
        zone.life > 0 &&
        inCone(zone, from, angle, range, halfAngle, zone.radius * 0.5),
    )
    .slice(0, 2)
  for (const pool of pools) {
    // 先消耗真实池，再爆破；爆破永不再次调用反应
    pool.life = 0
    const radius = Math.min(128, pool.radius * 1.25)
    trace(s, hooks, {
      weapon: 'flame',
      kind: 'burst',
      from: { x: pool.x, y: pool.y },
      targets: [],
      duration: 0.26,
      width: radius * 2,
      power: radius / 70,
    })
    blast(s, hooks, pool, radius, 5 + (pool.damage ?? 0) * 2)
    if (s.phase !== 'playing') return
    hooks.emit({
      type: 'reaction',
      x: pool.x,
      y: pool.y,
      reaction: 'combustion',
      weapon: 'flame',
      power: radius / 70,
      targets: [{ x: pool.x, y: pool.y }],
    })
    hooks.emit({
      type: 'protocol',
      x: pool.x,
      y: pool.y,
      protocol: 'combustion',
      reaction: 'combustion',
      amount: 0,
      power: radius / 70,
    })
  }
}

export function conductPool(s: RushState, hooks: Hooks, first: Foe) {
  if (s.phase !== 'playing' || !hasReaction(s, 'conduction')) return
  const pool = s.zones.find(
    (zone) =>
      zone.kind === 'toxin' && zone.life > 0 && distance(zone, first) <= zone.radius + first.radius,
  )
  if (!pool) return
  const targets = s.enemies
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        enemy.id !== first.id &&
        distance(pool, enemy) <= pool.radius + enemy.radius,
    )
    .slice(0, 3)
  if (!targets.length) return
  for (const enemy of targets) {
    enemy.toxin = Math.max(enemy.toxin ?? 0, 1.3)
    damageFoe(s, hooks, enemy, 1.5)
    if (s.phase !== 'playing') return
  }
  const points = targets.map((enemy) => ({ x: enemy.x, y: enemy.y }))
  const pulse: Zone = {
    id: hooks.id(),
    x: pool.x,
    y: pool.y,
    kind: 'conductor',
    weapon: 'arc',
    radius: pool.radius,
    life: 0.2,
    duration: 0.2,
    tick: 0,
  }
  s.zones.push(pulse)
  trace(s, hooks, {
    weapon: 'arc',
    kind: 'arc',
    from: { x: first.x, y: first.y },
    targets: points,
    duration: 0.16,
    width: 2,
    power: 1,
  })
  hooks.emit({
    type: 'reaction',
    x: pool.x,
    y: pool.y,
    reaction: 'conduction',
    weapon: 'arc',
    targets: points,
    power: pool.radius / 70,
  })
  hooks.emit({
    type: 'protocol',
    x: pool.x,
    y: pool.y,
    protocol: 'conduction',
    reaction: 'conduction',
    amount: 0,
    targets: points,
    power: pool.radius / 70,
  })
}
