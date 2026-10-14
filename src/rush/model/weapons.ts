import type { RushState, Shot, Vec } from '../types'
import { distance, level, nearest, playerGunOrigin, toward, visible } from './math'
import type { Hooks } from './math'
import { blast, damageFoe } from './combat/damage'
import { hasProtocol, interceptShots, linkArc, recallShots } from './combat/protocols'

export const dashMaxCooldown = (s: RushState) => Math.max(0.85, 1.6 - level(s, 'haste') * 0.12)

export class Weapons {
  private shotClock = 0.05
  private rocketClock = 0.1
  private pulseClock = 0.1
  private targetId = 0

  constructor(
    private s: RushState,
    private hooks: Hooks,
  ) {
    this.syncSatellites()
  }

  syncSatellites() {
    const s = this.s
    const blades = level(s, 'orbit') ? 1 + level(s, 'orbit') : 0
    const drones = level(s, 'drone') ? 1 + Math.floor((level(s, 'drone') - 1) / 2) : 0
    for (const [kind, count] of [
      ['blade', blades],
      ['drone', drones],
    ] as const) {
      while (s.satellites.filter((v) => v.kind === kind).length < count) {
        s.satellites.push({ id: this.hooks.id(), kind, ...s.player, angle: 0, cooldown: 0 })
      }
    }
  }

  private fire(point: Vec, a: number, kind: Shot['kind'] = 'shot', extraDamage = 0) {
    const s = this.s
    const speed = kind === 'rocket' ? 600 : 1010
    s.shots.push({
      id: this.hooks.id(),
      x: point.x + Math.cos(a) * 17,
      y: point.y + Math.sin(a) * 17,
      side: 'player',
      kind,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      radius: kind === 'rocket' ? 7 : 4,
      damage: 1 + extraDamage,
      life: 1.4,
      age: 0,
      pierce: kind === 'shot' ? level(s, 'pierce') : 0,
      bounce: kind === 'shot' ? level(s, 'ricochet') + 1 * Number(level(s, 'ricochet') > 0) : 0,
      hits: [],
      grazed: false,
      scatter: kind === 'shot' && level(s, 'split') > 0,
    })
    this.hooks.emit({ type: 'shot', ...point, side: 'player', power: kind === 'rocket' ? 2 : 1 })
  }

  private satellites(dt: number) {
    const s = this.s
    const blades = s.satellites.filter((v) => v.kind === 'blade')
    const drones = s.satellites.filter((v) => v.kind === 'drone')
    for (const v of s.satellites) {
      const group = v.kind === 'blade' ? blades : drones
      const index = group.indexOf(v)
      v.angle = s.clock * (v.kind === 'blade' ? 4.8 : -1.6) + (index * Math.PI * 2) / group.length
      const radius = v.kind === 'blade' ? 72 + level(s, 'orbit') * 7 : 54
      v.x = s.player.x + Math.cos(v.angle) * radius
      v.y = s.player.y + Math.sin(v.angle) * radius
      v.cooldown -= dt
      if (v.kind === 'drone') {
        const target = nearest(s, v)
        if (target && v.cooldown <= 0) {
          this.fire(v, toward(v, target), 'spark', 0.2 + level(s, 'drone') * 0.15)
          v.cooldown = 0.5
        }
      } else if (v.cooldown <= 0) {
        const target = s.enemies.find((e) => e.hp > 0 && distance(v, e) < e.radius + 20)
        if (target) {
          damageFoe(s, this.hooks, target, 1.8 + level(s, 'orbit') * 0.45)
          if (hasProtocol(s, 'circuit')) linkArc(s, this.hooks, v, target, 'circuit')
          v.cooldown = 0.16
        }
      }
    }
  }

  private zones(dt: number) {
    const s = this.s
    for (const z of s.zones) {
      z.life -= dt
      if (z.kind !== 'frost') continue
      z.tick -= dt
      if (z.tick > 0) continue
      z.tick = 0.25
      for (const e of s.enemies) {
        if (e.hp <= 0 || distance(z, e) > z.radius + e.radius) continue
        e.slow = 0.45
        damageFoe(s, this.hooks, e, 0.2 + level(s, 'frost') * 0.12)
      }
    }
    s.zones = s.zones.filter((z) => z.life > 0).slice(-40)
  }

  update(dt: number) {
    const s = this.s
    // 没目标时不积存射击次数，波间空场不能变成60Hz补射
    this.shotClock = Math.max(0, this.shotClock - dt)
    this.rocketClock -= dt
    this.pulseClock -= dt
    const locked = s.enemies.find((e) => e.id === this.targetId && e.hp > 0 && visible(s, e, 14))
    const target = locked || nearest(s, s.player)
    this.targetId = target?.id || 0
    const origin = playerGunOrigin(s.player)
    if (target) s.player.angle = toward(origin, target)
    if (target && this.shotClock <= 0) {
      const a = s.player.angle
      const spread = level(s, 'split') || s.overdrive > 0
      const count = spread ? 3 + Math.max(0, Math.floor((level(s, 'split') - 1) / 2)) * 2 : 1
      for (let i = 0; i < count; i++)
        this.fire(
          origin,
          a + (i - (count - 1) / 2) * 0.16,
          'shot',
          level(s, 'pierce') * 0.08 + Math.floor(level(s, 'split') / 2) * 0.2,
        )
      this.shotClock += 0.24 / (1 + level(s, 'haste') * 0.23) / (s.overdrive > 0 ? 1.9 : 1)
    }
    if (target && level(s, 'rocket') && this.rocketClock <= 0) {
      this.fire(origin, s.player.angle, 'rocket', 1)
      this.rocketClock = Math.max(0.5, 1.55 - level(s, 'rocket') * 0.13)
    }
    if (level(s, 'pulse') && this.pulseClock <= 0) {
      blast(s, this.hooks, s.player, 130 + level(s, 'pulse') * 18, 2 + level(s, 'pulse'), 'pulse')
      this.pulseClock = Math.max(1.2, 3.2 - level(s, 'pulse') * 0.25)
    }
    this.satellites(dt)
    this.zones(dt)
  }

  dash() {
    const s = this.s
    const p = s.player
    if (s.phase !== 'playing' || s.paused || s.wave.phase !== 'combat' || p.dashCooldown > 0)
      return false
    p.dashTime = 0.2
    p.dashCooldown = dashMaxCooldown(s)
    p.invulnerable = Math.max(0.25, p.invulnerable)
    const direction = Math.hypot(s.move.x, s.move.y) > 0.05 ? s.move : p.lastMove
    const len = Math.hypot(direction.x, direction.y) || 1
    p.lastMove = { x: direction.x / len, y: direction.y / len }
    p.intercepted = 0
    interceptShots(s, this.hooks, 90)
    recallShots(s, this.hooks)
    if (level(s, 'frost')) {
      s.zones.push({
        id: this.hooks.id(),
        ...p,
        kind: 'frost',
        radius: 72 + level(s, 'frost') * 12,
        life: 3,
        duration: 3,
        tick: 0,
      })
    }
    if (p.frame === 'warden') blast(s, this.hooks, p, 95, 2, 'pulse')
    if (level(s, 'magnet')) {
      for (const e of s.enemies) {
        if (distance(p, e) > 230 || e.kind === 'boss') continue
        const a = toward(e, p)
        e.x += Math.cos(a) * 36
        e.y += Math.sin(a) * 36
        e.slow = 0.7
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
