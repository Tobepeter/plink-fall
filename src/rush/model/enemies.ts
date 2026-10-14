import type { EnemyKind, Foe, RushState, Vec } from '../types'
import { enemyStats } from './data'
import { distance, toward, visible } from './math'
import type { Hooks } from './math'
import { foe, initialEnemies } from './state'
import { hurtPlayer } from './world'

export class EnemyDirector {
  private spawnClock = 1.9
  private densityClock = 0.2
  private introduced = new Set<EnemyKind>()

  constructor(
    private s: RushState,
    private hooks: Hooks,
  ) {
    initialEnemies(s, hooks)
  }

  resize() {
    if (this.s.clock > 0.3) return
    this.s.enemies = []
    initialEnemies(this.s, this.hooks)
  }

  private edge(): Vec {
    const s = this.s
    const moving = Math.hypot(s.player.vx, s.player.vy) > 20
    const heading = Math.atan2(s.player.vy, s.player.vx)
    const side = this.hooks.random() > 0.5 ? 1 : -1
    const a = moving
      ? heading + side * (0.8 + this.hooks.random() * 0.7)
      : this.hooks.random() * Math.PI * 2
    const x = Math.max(140, s.viewport.x / 2 - 34)
    const y = Math.max(170, s.viewport.y / 2 - 40)
    return { x: s.player.x + Math.cos(a) * x, y: s.player.y + Math.sin(a) * y }
  }

  private spawn() {
    const s = this.s
    const roll = this.hooks.random()
    let kind: EnemyKind = 'chaser'
    if (s.clock > 3 && roll > 0.66) kind = 'charger'
    if (s.level > 1 && roll > 0.72) kind = 'shooter'
    if (s.clock > 15 && roll < 0.16) kind = 'splitter'
    if (s.clock > 25 && roll > 0.91) kind = 'brute'
    s.enemies.push(foe(kind, this.edge(), 1 + Math.floor(s.clock / 48), this.hooks))
  }

  introducePressure() {
    if (this.introduced.has('shooter')) return
    this.introduced.add('shooter')
    for (let i = 0; i < 2; i++) this.s.enemies.push(foe('shooter', this.edge(), 1, this.hooks))
  }

  private density(dt: number) {
    if (this.s.level < 2) return
    this.densityClock -= dt
    if (this.densityClock > 0) return
    this.densityClock = 0.45
    const count = this.s.enemies.filter((e) => e.hp > 0 && visible(this.s, e, -10)).length
    if (count < 6) for (let i = count; i < 9; i++) this.spawn()
  }

  private recycle(e: Foe) {
    if (visible(this.s, e, e.kind === 'boss' ? 150 : 55)) return
    const point = this.edge()
    e.x = point.x
    e.y = point.y
    e.age = 0
    e.telegraph = 0
    e.cooldown = e.kind === 'boss' ? 0 : e.kind === 'shooter' ? 0.05 : 1.1
    e.target = { x: this.s.player.x, y: this.s.player.y }
    e.vx = e.vy = 0
  }

  private bullets(e: Foe, a: number, count: number, spread: number, radial = false) {
    const s = this.s
    const speed = e.kind === 'boss' ? 225 + e.tier * 25 : 365
    for (let i = 0; i < count; i++) {
      const direction = radial ? a + (i * Math.PI * 2) / count : a + (i - (count - 1) / 2) * spread
      s.shots.push({
        id: this.hooks.id(),
        x: e.x + Math.cos(direction) * e.radius,
        y: e.y + Math.sin(direction) * e.radius,
        side: 'enemy',
        kind: 'shot',
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        radius: e.kind === 'boss' ? 7 : 6,
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
      e.vx = Math.cos(e.angle) * 560
      e.vy = Math.sin(e.angle) * 560
      if (e.cooldown === 0) e.cooldown = 3.6
      return
    }
    e.cooldown -= dt
    if (e.cooldown <= 0) {
      e.target = {
        x: this.s.player.x + this.s.player.vx * 0.25,
        y: this.s.player.y + this.s.player.vy * 0.25,
      }
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
        e.cooldown = 2.5
      })
    ) {
      e.vx = e.vy = 0
      return
    }
    e.cooldown -= dt
    if (e.cooldown <= 0 && visible(this.s, e, -10)) {
      const p = this.s.player
      const dx = p.x - e.x,
        dy = p.y - e.y
      const a = p.vx * p.vx + p.vy * p.vy - 365 * 365
      const b = 2 * (dx * p.vx + dy * p.vy),
        c = dx * dx + dy * dy
      const discriminant = b * b - 4 * a * c
      const roots =
        discriminant >= 0 && Math.abs(a) > 1
          ? [(-b + Math.sqrt(discriminant)) / (2 * a), (-b - Math.sqrt(discriminant)) / (2 * a)]
          : []
      const intercept = roots.filter((time) => time > 0).sort((x, y) => x - y)[0] ?? 0.8
      const lead = Math.min(2.5, intercept) + 0.55
      e.target = {
        x: this.s.player.x + this.s.player.vx * lead,
        y: this.s.player.y + this.s.player.vy * lead,
      }
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
        const a = toward(e, this.s.player)
        this.bullets(e, e.age * 0.55, 12 + e.tier * 4, 0, true)
        if (e.tier > 1) this.bullets(e, a, 3 + e.tier, 0.13)
        e.cooldown = Math.max(1, 1.8 - e.tier * 0.2)
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
    e.angle = toward(e, this.s.player)
    e.vx = Math.cos(e.angle) * speed
    e.vy = Math.sin(e.angle) * speed
  }

  update(dt: number) {
    const s = this.s
    for (const e of s.enemies) this.recycle(e)
    this.density(dt)
    for (const [time, kind] of [
      [3, 'charger'],
      [8, 'shooter'],
      [15, 'splitter'],
      [25, 'brute'],
    ] as const) {
      if (s.clock >= time && !this.introduced.has(kind)) {
        this.introduced.add(kind)
        s.enemies.push(foe(kind, this.edge(), 1 + Math.floor(s.clock / 48), this.hooks))
      }
    }
    this.spawnClock -= dt
    if (this.spawnClock <= 0 && s.enemies.length < 13) {
      this.spawn()
      if (s.clock > 8) this.spawn()
      if (s.clock > 18 && this.hooks.random() > 0.6) this.spawn()
      this.spawnClock = Math.max(0.35, 1.3 - s.clock / 80)
    }
    if (s.clock >= s.nextBoss && s.bossIndex < 3 && !s.enemies.some((e) => e.kind === 'boss')) {
      s.bossIndex++
      const boss = foe('boss', this.edge(), s.bossIndex, this.hooks)
      s.enemies.push(boss)
      s.nextBoss = [25, 75, 130, Infinity][s.bossIndex]
      this.hooks.emit({ type: 'boss', ...boss, amount: s.bossIndex })
    }
    for (const e of s.enemies) {
      if (e.hp <= 0) continue
      e.age += dt
      e.hurt = Math.max(0, e.hurt - dt)
      e.slow = Math.max(0, e.slow - dt)
      if (e.age < 0.25) continue
      if (e.kind === 'charger') this.charger(e, dt)
      else if (e.kind === 'shooter') this.shooter(e, dt)
      else if (e.kind === 'boss') this.boss(e, dt)
      else this.pursue(e, enemyStats[e.kind].speed + Math.min(70, s.clock * 0.3))
      const factor = e.slow > 0 ? 0.24 : 1
      e.x += e.vx * dt * factor
      e.y += e.vy * dt * factor
      if (distance(e, s.player) < e.radius + s.player.radius - 4) hurtPlayer(s, this.hooks, e)
    }
  }
}
