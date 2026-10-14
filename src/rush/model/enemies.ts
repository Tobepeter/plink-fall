import type { Foe, RushState } from '../types'
import { enemyStats } from './data'
import { distance, toward, visible } from './math'
import type { Hooks } from './math'
import { WaveDirector } from './campaign/director'
import { hurtPlayer } from './combat/damage'
import { clampToArena, keepInArena } from './arena'
import { difficultyStats } from './campaign/difficulty'

export class EnemyDirector {
  readonly waves: WaveDirector

  constructor(
    private s: RushState,
    private hooks: Hooks,
  ) {
    this.waves = new WaveDirector(s, hooks)
  }

  resize() {
    this.waves.resize()
  }

  private bulletSpeed(e: Foe) {
    const speed = e.kind === 'boss' ? 225 + e.tier * 25 : 435 + e.tier * 15
    return speed * difficultyStats(this.s.difficulty).bulletSpeedMultiplier
  }

  private bullets(e: Foe, a: number, count: number, spread: number, radial = false) {
    const s = this.s
    const speed = this.bulletSpeed(e)
    count += difficultyStats(s.difficulty).bulletExtra
    for (let i = 0; i < count; i++) {
      const direction = radial ? a + (i * Math.PI * 2) / count : a + (i - (count - 1) / 2) * spread
      const radius = e.kind === 'boss' ? 7 : 6
      const origin = clampToArena(
        { x: e.x + Math.cos(direction) * e.radius, y: e.y + Math.sin(direction) * e.radius },
        radius,
      )
      s.shots.push({
        id: this.hooks.id(),
        ...origin,
        side: 'enemy',
        kind: 'shot',
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        radius,
        damage: 1,
        life: 4.6,
        age: 0,
        pierce: 0,
        bounce: 0,
        hits: [],
        grazed: false,
      })
    }
    this.hooks.emit({ type: 'shot', ...e, side: 'enemy', amount: count })
  }

  private wind(e: Foe, dt: number, finish: () => void) {
    if (e.telegraph > 0) {
      e.telegraph = Math.max(0, e.telegraph - dt)
      if (e.telegraph === 0) finish()
      return true
    }
    return false
  }

  private charger(e: Foe, dt: number) {
    if (
      this.wind(e, dt, () => {
        e.cooldown = -0.32
      })
    ) {
      e.vx = e.vy = 0
      return
    }
    if (e.cooldown < 0) {
      e.cooldown = Math.min(0, e.cooldown + dt)
      const speed = 560 * difficultyStats(this.s.difficulty).speedMultiplier
      e.vx = Math.cos(e.angle) * speed
      e.vy = Math.sin(e.angle) * speed
      if (e.cooldown === 0) e.cooldown = 3.6 * difficultyStats(this.s.difficulty).cooldownMultiplier
      return
    }
    e.cooldown -= dt
    if (e.cooldown <= 0) {
      e.target = clampToArena(
        {
          x: this.s.player.x + this.s.player.vx * 0.25,
          y: this.s.player.y + this.s.player.vy * 0.25,
        },
        this.s.player.radius,
      )
      e.angle = toward(e, e.target)
      e.telegraph = 0.65
      e.vx = e.vy = 0
      return
    }
    this.pursue(e, 75)
  }

  private shooter(e: Foe, dt: number) {
    if (
      this.wind(e, dt, () => {
        this.bullets(e, toward(e, e.target), 3 + e.tier * 2, 0.19)
        e.cooldown =
          Math.max(1.8, 3 - e.tier * 0.3) * difficultyStats(this.s.difficulty).cooldownMultiplier
      })
    ) {
      e.vx = e.vy = 0
      return
    }
    e.cooldown -= dt
    if (e.cooldown <= 0 && visible(this.s, e, -10)) {
      const p = this.s.player
      const dx = p.x + p.vx * 0.55 - e.x,
        dy = p.y + p.vy * 0.55 - e.y
      const speed = this.bulletSpeed(e)
      const a = p.vx * p.vx + p.vy * p.vy - speed ** 2
      const b = 2 * (dx * p.vx + dy * p.vy),
        c = dx * dx + dy * dy
      const discriminant = b * b - 4 * a * c
      const roots =
        discriminant >= 0 && Math.abs(a) > 1
          ? [(-b + Math.sqrt(discriminant)) / (2 * a), (-b - Math.sqrt(discriminant)) / (2 * a)]
          : []
      const intercept = roots.filter((time) => time > 0).sort((x, y) => x - y)[0] ?? 0.8
      const lead = e.id % 2 ? Math.min(4.1, intercept) + 0.55 : 0.55
      e.target = clampToArena(
        {
          x: this.s.player.x + this.s.player.vx * lead,
          y: this.s.player.y + this.s.player.vy * lead,
        },
        this.s.player.radius,
      )
      e.telegraph = 0.55
      e.vx = e.vy = 0
    } else
      this.pursue(
        e,
        distance(e, this.s.player) > 225 ? 65 : distance(e, this.s.player) < 155 ? -46 : 0,
      )
  }

  private boss(e: Foe, dt: number) {
    if (
      this.wind(e, dt, () => {
        const a = toward(e, e.target)
        this.bullets(e, e.age * 0.55, 12 + e.tier * 4, 0, true)
        if (e.tier > 1) this.bullets(e, a, 3 + e.tier, 0.13)
        e.cooldown =
          Math.max(1, 1.8 - e.tier * 0.2) * difficultyStats(this.s.difficulty).cooldownMultiplier
      })
    ) {
      e.vx = e.vy = 0
      return
    }
    e.cooldown -= dt
    if (e.cooldown <= 0) {
      e.telegraph = 0.65
      e.target = { ...this.s.player }
    }
    this.pursue(e, distance(e, this.s.player) > 190 ? 45 + e.tier * 6 : -20)
  }

  private pursue(e: Foe, speed: number) {
    speed *= difficultyStats(this.s.difficulty).speedMultiplier
    e.angle = toward(e, this.s.player)
    e.vx = Math.cos(e.angle) * speed
    e.vy = Math.sin(e.angle) * speed
  }

  update(dt: number) {
    const s = this.s
    this.waves.update(dt)
    if (s.wave.phase === 'breather') return
    for (const e of s.enemies) {
      keepInArena(e, e.radius)
      e.target = clampToArena(e.target)
      if (e.hp <= 0) continue
      e.age += dt
      e.hurt = Math.max(0, e.hurt - dt)
      e.slow = Math.max(0, e.slow - dt)
      if (e.age < 0.5) continue
      if (e.kind === 'charger') this.charger(e, dt)
      else if (e.kind === 'shooter') this.shooter(e, dt)
      else if (e.kind === 'boss') this.boss(e, dt)
      else this.pursue(e, enemyStats[e.kind].speed + (s.wave.act - 1) * 14)
      const frozen =
        e.slow > 0 &&
        s.zones.some(
          (zone) =>
            zone.kind === 'frost' && zone.life > 0 && distance(zone, e) < zone.radius + e.radius,
        )
      const factor = frozen ? 0.04 : e.slow > 0 ? 0.24 : 1
      e.x += e.vx * dt * factor
      e.y += e.vy * dt * factor
      keepInArena(e, e.radius)
      if (distance(e, s.player) < e.radius + s.player.radius - 4) hurtPlayer(s, this.hooks, e)
    }
  }
}
