import type { RushState } from '../types'
import { level, nearest, playerGunOrigin, visible } from './math'
import type { Hooks } from './math'
import { blast } from './combat/damage'
import { interceptShots, recallShots } from './combat/protocols'
import { metaStats } from './meta/progression'
import { frameDashCooldown, frameFireRate } from './frames'
import { advanceHazards } from './armory/hazards'
import { advanceBlades, syncBlades } from './armory/blades'
import { fireArc, fireFlame, fireLaser } from './armory/energy'
import { fireScatter, throwToxin } from './armory/projectile-weapons'

export const dashMaxCooldown = (s: RushState) => frameDashCooldown(s)

// 三个实际武器槽；没有额外基础主枪
export class Weapons {
  private targetId = 0

  constructor(
    private s: RushState,
    private hooks: Hooks,
  ) {
    this.syncSatellites()
  }

  syncSatellites() {
    syncBlades(this.s, this.hooks)
  }

  update(dt: number) {
    const s = this.s
    advanceHazards(s, this.hooks, dt)
    if (s.phase !== 'playing') return
    advanceBlades(s, this.hooks, dt * frameFireRate(s))
    const locked = s.enemies.find(
      (enemy) => enemy.id === this.targetId && enemy.hp > 0 && visible(s, enemy, 14),
    )
    const target = locked ?? nearest(s, s.player)
    this.targetId = target?.id ?? 0
    const origin = playerGunOrigin(s.player)
    const manual = s.aim.mode === 'mouse' && s.record.mouseAim && s.aim.point !== null
    const point = manual ? s.aim.point : target
    if (point) s.player.angle = Math.atan2(point.y - origin.y, point.x - origin.x)
    const rate =
      (frameFireRate(s) * (1 + level(s, 'haste') * 0.12) * (s.overdrive > 0 ? 1.45 : 1)) /
      metaStats(s.runMeta).cooldown
    for (const [index, slot] of s.weapons.entries()) {
      if (s.phase !== 'playing') break
      slot.cooldown = Math.max(-0.1, slot.cooldown - dt * rate)
      slot.charge = Math.max(0, Math.min(1, 1 - slot.cooldown / (slot.id === 'laser' ? 0.9 : 1.35)))
      if (slot.id === 'blade' || slot.cooldown > 0 || (!point && !manual)) continue
      if (slot.id === 'arc' && !target) continue
      const remainder = slot.cooldown
      const burst =
        index === 0 &&
        s.player.frame === 'runner' &&
        s.abilityActive > 0 &&
        ['laser', 'scatter', 'flame'].includes(slot.id)
          ? 3
          : 1
      for (let shot = 0; shot < burst; shot++) {
        const angle = s.player.angle + (shot - (burst - 1) / 2) * 0.2
        if (slot.id === 'laser')
          fireLaser(s, this.hooks, slot, origin, angle, shot === 0 ? target : undefined)
        if (slot.id === 'scatter') fireScatter(s, this.hooks, slot, origin, angle)
        if (slot.id === 'flame') fireFlame(s, this.hooks, slot, origin, angle, index)
        if (slot.id === 'toxin' && point) throwToxin(s, this.hooks, slot, origin, point)
        if (slot.id === 'arc' && target) fireArc(s, this.hooks, slot, origin, target)
      }
      if (s.phase !== 'playing') return
      this.hooks.emit({
        type: 'weapon',
        ...origin,
        weapon: slot.id,
        side: 'player',
        power: slot.level,
      })
      slot.cooldown = Math.max(0.015, slot.cooldown + remainder)
    }
  }

  dash() {
    const s = this.s,
      p = s.player
    if (s.phase !== 'playing' || s.paused || p.dashCooldown > 0) return false
    p.dashTime = 0.2
    p.dashCooldown = dashMaxCooldown(s)
    p.invulnerable = Math.max(0.25, p.invulnerable)
    const direction = Math.hypot(s.move.x, s.move.y) > 0.05 ? s.move : p.lastMove
    const length = Math.hypot(direction.x, direction.y) || 1
    p.lastMove = { x: direction.x / length, y: direction.y / length }
    p.intercepted = 0
    interceptShots(s, this.hooks, 90)
    recallShots(s, this.hooks)
    if (level(s, 'frost'))
      s.zones.push({
        id: this.hooks.id(),
        ...p,
        kind: 'frost',
        radius: 72 + level(s, 'frost') * 12,
        life: 3,
        duration: 3,
        tick: 0,
      })
    if (p.frame === 'warden') blast(s, this.hooks, p, 95, 2, 'pulse')
    if (level(s, 'magnet')) {
      for (const enemy of s.enemies) {
        if (Math.hypot(p.x - enemy.x, p.y - enemy.y) > 230 || enemy.kind === 'boss') continue
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x)
        enemy.x += Math.cos(angle) * 36
        enemy.y += Math.sin(angle) * 36
        enemy.slow = 0.7
      }
    }
    this.hooks.emit({
      type: 'dash',
      ...p,
      targets: [{ x: p.x + p.lastMove.x * 180, y: p.y + p.lastMove.y * 180 }],
    })
    return true
  }
}
