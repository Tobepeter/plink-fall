import type { Foe, RushState, Vec, WeaponTrace } from '../../types'
import type { Hooks } from '../math'
import { keepInArena } from '../arena'
import { damageFoe } from '../combat/damage'

export function segmentDistance(point: Vec, start: Vec, end: Vec) {
  const dx = end.x - start.x,
    dy = end.y - start.y
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1)),
  )
  return Math.hypot(point.x - start.x - dx * t, point.y - start.y - dy * t)
}

export function inCone(
  point: Vec,
  from: Vec,
  angle: number,
  range: number,
  halfAngle: number,
  margin = 0,
) {
  const dx = point.x - from.x,
    dy = point.y - from.y
  const along = dx * Math.cos(angle) + dy * Math.sin(angle)
  const across = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle))
  return (
    along >= -margin &&
    along <= range + margin &&
    across <= Math.max(0, along) * Math.tan(halfAngle) + margin
  )
}

export function pushFoe(enemy: Foe, from: Vec, strength: number) {
  if (enemy.kind === 'boss') return
  const angle = Math.atan2(enemy.y - from.y, enemy.x - from.x)
  enemy.x += Math.cos(angle) * strength
  enemy.y += Math.sin(angle) * strength
  keepInArena(enemy, enemy.radius)
}

export function trace(s: RushState, hooks: Hooks, data: Omit<WeaponTrace, 'id' | 'life'>) {
  if (s.phase !== 'playing') return
  s.weaponTraces.push({ ...data, id: hooks.id(), life: data.duration })
  if (s.weaponTraces.length > 36) s.weaponTraces.splice(0, s.weaponTraces.length - 36)
}

export function hitLine(
  s: RushState,
  hooks: Hooks,
  from: Vec,
  points: Vec[],
  width: number,
  damage: number,
) {
  const path = [from, ...points]
  for (const enemy of [...s.enemies]) {
    if (enemy.hp <= 0) continue
    if (
      path
        .slice(1)
        .some((end, index) => segmentDistance(enemy, path[index], end) <= width / 2 + enemy.radius)
    )
      damageFoe(s, hooks, enemy, damage)
  }
}
