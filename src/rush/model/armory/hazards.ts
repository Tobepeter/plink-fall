import type { RushState, Shot, Vec } from '../../types'
import type { Hooks } from '../math'
import { distance } from '../math'
import { clampToArena } from '../arena'
import { damageFoe } from '../combat/damage'
import { trace } from './geometry'

export function landToxin(s: RushState, hooks: Hooks, shot: Shot) {
  const slot = s.weapons.find((weapon) => weapon.id === 'toxin')
  if (!slot || s.phase !== 'playing') return
  const point = clampToArena(shot.target ?? shot, 12)
  const spread = slot.branch === 'spread'
  const radius = (spread ? 70 : 55) + slot.level * 5
  const duration = slot.branch === 'focus' ? 4.2 : 3.2
  const pools = s.zones.filter((zone) => zone.kind === 'toxin' && zone.life > 0)
  const limit = slot.level >= 5 && spread ? 5 : 3
  for (const old of pools.slice(0, Math.max(0, pools.length - limit + 1))) old.life = 0
  s.zones.push({
    id: hooks.id(),
    ...point,
    kind: 'toxin',
    weapon: 'toxin',
    sourceSlot: s.weapons.indexOf(slot),
    radius,
    duration,
    life: duration,
    tick: 0,
    damage: (slot.branch === 'focus' ? 0.9 : 0.45) + slot.level * 0.16,
  })
  trace(s, hooks, {
    weapon: 'toxin',
    kind: 'burst',
    from: point,
    targets: [],
    duration: 0.24,
    width: radius * 2,
    power: 1,
  })
}

export function addFire(s: RushState, hooks: Hooks, point: Vec, slotIndex: number) {
  if (s.phase !== 'playing') return
  const old = s.zones.filter((zone) => zone.kind === 'fire' && zone.life > 0)
  if (old.length >= 3) old[0].life = 0
  s.zones.push({
    id: hooks.id(),
    ...clampToArena(point, 12),
    kind: 'fire',
    weapon: 'flame',
    sourceSlot: slotIndex,
    radius: 66,
    life: 1.1,
    duration: 1.1,
    tick: 0,
    damage: 0.7,
  })
}

// 状态按模拟时间跳伤；池有独立寿命，不因渲染帧率增加触发
export function advanceHazards(s: RushState, hooks: Hooks, dt: number) {
  for (const mark of s.weaponTraces) mark.life -= dt
  s.weaponTraces = s.weaponTraces.filter((mark) => mark.life > 0)
  for (const enemy of [...s.enemies]) {
    if (enemy.hp <= 0) continue
    for (const kind of ['burn', 'toxin'] as const) {
      if ((enemy[kind] ?? 0) <= 0) continue
      enemy[kind] = Math.max(0, enemy[kind]! - dt)
      const tick = kind === 'burn' ? 'burnTick' : 'toxinTick'
      enemy[tick] = (enemy[tick] ?? 0) - dt
      if (enemy[tick]! <= 0) {
        enemy[tick]! += 0.5
        damageFoe(s, hooks, enemy, kind === 'burn' ? 0.8 : 0.7)
        if (s.phase !== 'playing') return
      }
    }
  }
  for (const zone of s.zones) {
    zone.life -= dt
    if (
      zone.kind === 'toxin' &&
      s.weapons.some((slot) => slot.id === 'toxin' && slot.level >= 5 && slot.branch === 'focus')
    )
      zone.radius = Math.min(132, zone.radius + dt * 16)
    if (zone.life <= 0 || !['toxin', 'fire', 'frost'].includes(zone.kind)) continue
    zone.tick -= dt
    if (zone.tick > 0) continue
    zone.tick += 0.3
    for (const enemy of [...s.enemies]) {
      if (enemy.hp <= 0 || distance(zone, enemy) > zone.radius + enemy.radius) continue
      if (zone.kind === 'toxin') {
        enemy.toxin = Math.max(enemy.toxin ?? 0, 1.3)
        enemy.slow = Math.max(enemy.slow, 0.2)
      }
      if (zone.kind === 'fire') enemy.burn = Math.max(enemy.burn ?? 0, 1.2)
      if (zone.kind === 'frost') enemy.slow = Math.max(enemy.slow, 0.45)
      damageFoe(s, hooks, enemy, zone.damage ?? 0.4)
      if (s.phase !== 'playing') return
    }
  }
  s.zones = s.zones.filter((zone) => zone.life > 0).slice(-28)
}
