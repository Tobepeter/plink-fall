import type { Foe, RushState, Vec, WeaponSlot } from '../../types'
import type { Hooks } from '../math'
import { distance, nearest } from '../math'
import { damageFoe } from '../combat/damage'
import { addFire } from './hazards'
import { hitLine, inCone, trace } from './geometry'
import { burnPools, conductPool, hasReaction } from './reactions'

export function fireLaser(
  s: RushState,
  hooks: Hooks,
  slot: WeaponSlot,
  from: Vec,
  angle: number,
  target?: Foe,
) {
  const spread = slot.branch === 'spread',
    awake = slot.level >= 5
  const count = spread ? (awake ? 3 : 2) : 1
  const range = slot.branch === 'focus' ? (awake ? 740 : 630) : 510
  const width = slot.branch === 'focus' ? (awake ? 24 : 15) : 9
  for (let i = 0; i < count; i++) {
    if (s.phase !== 'playing') return
    const a = angle + (i - (count - 1) / 2) * 0.19
    let points: Vec[] = [{ x: from.x + Math.cos(a) * range, y: from.y + Math.sin(a) * range }]
    if (i === 0 && target && hasReaction(s, 'prism')) {
      const blade = s.satellites.find((satellite) => satellite.kind === 'blade')
      if (blade) {
        const direction = Math.atan2(target.y - blade.y, target.x - blade.x)
        points = [
          { x: blade.x, y: blade.y },
          { x: blade.x + Math.cos(direction) * range, y: blade.y + Math.sin(direction) * range },
        ]
        hooks.emit({
          type: 'reaction',
          ...from,
          weapon: 'laser',
          reaction: 'prism',
          targets: points,
          power: 1,
        })
        hooks.emit({
          type: 'protocol',
          ...from,
          protocol: 'prism',
          reaction: 'prism',
          amount: 0,
          targets: points,
          power: 1,
        })
      }
    }
    trace(s, hooks, {
      weapon: 'laser',
      kind: 'beam',
      from,
      targets: points,
      duration: awake ? 0.25 : 0.17,
      width,
      power: slot.level,
    })
    hitLine(s, hooks, from, points, width, (2.7 + slot.level * 0.65) * (spread ? 0.78 : 1.25))
  }
  slot.cooldown = spread ? 0.95 : 0.82
}

export function fireFlame(
  s: RushState,
  hooks: Hooks,
  slot: WeaponSlot,
  from: Vec,
  angle: number,
  index: number,
) {
  const spread = slot.branch === 'spread',
    awake = slot.level >= 5
  const range = slot.branch === 'focus' ? (awake ? 290 : 240) : 170 + slot.level * 6
  const half = spread ? 0.7 : 0.31
  const end = { x: from.x + Math.cos(angle) * range, y: from.y + Math.sin(angle) * range }
  trace(s, hooks, {
    weapon: 'flame',
    kind: 'flame',
    from,
    targets: [end],
    duration: 0.16,
    width: Math.tan(half) * range * 2,
    power: range / 100,
  })
  for (const enemy of [...s.enemies]) {
    if (enemy.hp <= 0 || !inCone(enemy, from, angle, range, half, enemy.radius)) continue
    enemy.burn = Math.max(enemy.burn ?? 0, slot.branch === 'focus' ? 2.2 : 1.4)
    damageFoe(s, hooks, enemy, 0.55 + slot.level * 0.15)
    if (s.phase !== 'playing') return
  }
  burnPools(s, hooks, from, angle, range, half)
  if (awake && Math.floor(s.clock * 5) % 5 === 0) addFire(s, hooks, end, index)
  slot.cooldown = 0.18
}

export function fireArc(s: RushState, hooks: Hooks, slot: WeaponSlot, from: Vec, first: Foe) {
  const spread = slot.branch === 'spread',
    awake = slot.level >= 5
  const count = spread ? (awake ? 8 : 5) : slot.branch === 'focus' ? 3 : 3
  const linked: number[] = [],
    points: Vec[] = []
  let enemy: Foe | undefined = first
  for (let i = 0; i < count && enemy; i++) {
    linked.push(enemy.id)
    points.push({ x: enemy.x, y: enemy.y })
    const damage =
      (1.65 + slot.level * 0.35) * (i === 0 && slot.branch === 'focus' ? (awake ? 2.8 : 1.8) : 1)
    if (awake && slot.branch === 'focus') enemy.slow = Math.max(enemy.slow, 0.55)
    if (i === 0) conductPool(s, hooks, enemy)
    if (s.phase !== 'playing') return
    damageFoe(s, hooks, enemy, damage)
    const origin: Foe = enemy
    const next: Foe | undefined = s.enemies
      .filter(
        (candidate) =>
          candidate.hp > 0 &&
          !linked.includes(candidate.id) &&
          distance(origin, candidate) < (spread ? 240 : 180),
      )
      .sort((a, b) => {
        const ta = (a.toxin ?? 0) > 0 ? 1 : 0,
          tb = (b.toxin ?? 0) > 0 ? 1 : 0
        return tb - ta || distance(origin, a) - distance(origin, b)
      })[0]
    enemy = next ?? nearest(s, origin, linked, spread ? 240 : 180)
  }
  trace(s, hooks, {
    weapon: 'arc',
    kind: 'arc',
    from,
    targets: points,
    duration: 0.16,
    width: slot.branch === 'focus' ? 4 : 2.5,
    power: slot.level,
  })
  slot.cooldown = spread ? 0.86 : 0.72
}
