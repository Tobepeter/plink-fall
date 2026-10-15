import { buildCity, type City } from './city'
import { Grid, makeObj, type Obj } from './world'
import { makeTornado, grow, massFor, topSpeed, type Tornado } from './tornado'
import { Swirl } from './swirl'
import { Movers } from './movers'
import { steerRival } from './ai'
import { makeRng, damp, clamp, type Rng } from './rng'
import { districts, type District } from '../data/districts'
import { basePerks, type Perks } from '../data/perks'
import { tiers } from '../data/props'
import type { TwEvent } from './types'

const rivalSkins = [
  { name: '赤旋', tint: '#ff7a6a' },
  { name: '紫霆', tint: '#b48cff' },
  { name: '沙暴', tint: '#f2c46a' },
  { name: '青岚', tint: '#6fe0c8' },
]

// 一个城区回合：限时成长到目标体型
export class Run {
  city: City
  grid: Grid
  objs: Obj[]
  chunks: Obj[] = [] // 散落在地上的碎块
  tornados: Tornado[] = []
  swirl: Swirl
  movers: Movers
  events: TwEvent[] = []
  rng: Rng
  district: District
  limit: number
  time = 0
  over = false
  goalHit = false
  tier = 0
  input = { x: 0, z: 0 } // 摇杆方向，模长 0..1
  scratch: Obj[] = []
  private boltTimer = 3

  constructor(
    readonly index: number,
    readonly seed: number,
    readonly perks: Perks = basePerks,
    readonly demo = false,
  ) {
    this.rng = makeRng(seed)
    this.district = districts[index]
    this.limit = this.district.time + perks.time
    this.city = buildCity(this.district.style, this.district.grid, this.rng)
    this.grid = new Grid(this.city.half)
    this.objs = this.city.objs
    this.swirl = new Swirl(this)
    this.movers = new Movers(this)
    for (const o of this.objs) {
      this.grid.add(o)
      this.movers.add(o)
    }
    const start = this.district.start + perks.start
    const p = makeTornado(
      0,
      '你',
      0,
      this.city.roads[Math.floor(this.district.grid / 2)],
      start,
      '#e8f6ff',
      true,
    )
    p.x = this.city.roads[Math.floor(this.district.grid / 2)]
    p.growth = perks.growth
    this.tornados.push(p)
    const rivals = demo ? 0 : this.district.rivals
    for (let i = 0; i < rivals; i++) {
      const s = rivalSkins[i % rivalSkins.length]
      const [x, z] = this.spawnPoint(80)
      const rival = makeTornado(i + 1, s.name, x, z, start * 0.95, s.tint)
      rival.growth = 1.5 + i * 0.15
      this.tornados.push(rival)
    }
    // 双涡：绕身小旋风，吞食归玩家
    if (perks.twin > 0) {
      const twin = makeTornado(this.tornados.length, '双涡', p.x, p.z, start * 0.6, '#d8f0ff')
      twin.feed = 0
      this.tornados.push(twin)
    }
    while (this.tier + 1 < tiers.length && tiers[this.tier + 1].s <= p.r) this.tier++
  }

  get player() {
    return this.tornados[0]
  }

  get left() {
    return Math.max(0, this.limit - this.time)
  }

  perksOf(t: Tornado) {
    return t.player ? this.perks : basePerks
  }

  addChunk(o: Obj, onGround: boolean) {
    if (onGround) {
      this.chunks.push(o)
      this.grid.add(o)
    }
  }

  // 远离玩家的出生点
  spawnPoint(min: number): [number, number] {
    const h = this.city.half - 10
    const zMax = this.city.water ?? h
    for (let i = 0; i < 20; i++) {
      const x = this.rng.range(-h, h),
        z = this.rng.range(-h, Math.min(h, zMax - 10))
      if (Math.hypot(x - this.player.x, z - this.player.z) > min) return [x, z]
    }
    return [-h, -h]
  }

  step(dt: number) {
    if (!this.demo && !this.over) this.time += dt
    this.steer(dt)
    this.movers.step(dt)
    this.swirl.step(dt)
    this.clash(dt)
    this.bolts(dt)
    this.progress()
    if (!this.demo && !this.over && this.time >= this.limit) this.finish()
    for (const o of this.objs) {
      if (o.shake <= 0) continue
      o.shake = Math.max(0, o.shake - dt * 2.5)
      o.dirty = true
    }
  }

  private steer(dt: number) {
    const half = this.city.half - 4
    const zMax = this.city.water !== null ? this.city.water + 30 : half
    for (const t of this.tornados) {
      t.guard = Math.max(0, t.guard - dt)
      t.calm = Math.max(0, t.calm - dt)
      if (!t.alive) {
        t.respawn -= dt
        if (t.respawn <= 0) this.revive(t)
        continue
      }
      if (t.feed >= 0) {
        this.orbit(t)
        continue
      }
      if (t.player && !this.demo) {
        const sp = topSpeed(t) * this.perks.speed * (this.over ? 0 : 1)
        t.vx += (this.input.x * sp - t.vx) * damp(7, dt)
        t.vz += (this.input.z * sp - t.vz) * damp(7, dt)
      } else if (!this.over) steerRival(this, t, dt, t.player ? 0.7 : 0.8)
      t.x = clamp(t.x + t.vx * dt, -half, half)
      t.z = clamp(t.z + t.vz * dt, -half, zMax)
    }
  }

  private orbit(t: Tornado) {
    const p = this.player
    const a = this.time * 1.6
    t.r = p.r * (0.3 + this.perks.twin * 0.08)
    t.x = p.x + Math.cos(a) * (p.r * 1.8 + 4)
    t.z = p.z + Math.sin(a) * (p.r * 1.8 + 4)
  }

  // 龙卷相撞：大吞小，相近则互相弹开
  private clash(dt: number) {
    const ts = this.tornados
    for (let i = 0; i < ts.length; i++)
      for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i],
          b = ts[j]
        if (!a.alive || !b.alive || a.guard > 0 || b.guard > 0 || a.feed >= 0 || b.feed >= 0)
          continue
        const dx = b.x - a.x,
          dz = b.z - a.z
        const d = Math.hypot(dx, dz) || 0.01
        if (d > Math.max(a.r, b.r) * 0.9) continue
        const big = a.r >= b.r ? a : b,
          small = big === a ? b : a
        if (big.r > small.r * 1.12) {
          this.devour(big, small)
          continue
        }
        // 势均力敌：弹开并互损
        const push = (Math.max(a.r, b.r) * 0.9 - d) * 6
        a.vx -= (dx / d) * push * dt * 10
        a.vz -= (dz / d) * push * dt * 10
        b.vx += (dx / d) * push * dt * 10
        b.vz += (dz / d) * push * dt * 10
        const loss = dt * 0.08
        for (const t of [a, b]) {
          const k = t.player || !this.perks.wall ? 1 : 3
          t.mass *= 1 - loss * k
          grow(t, 0)
        }
      }
  }

  private devour(big: Tornado, small: Tornado) {
    grow(big, small.mass * 0.7 + 6)
    this.events.push({ type: 'devour', big: big.id, small: small.id, x: small.x, z: small.z })
    if (small.player) {
      // 玩家被吞：体型减半，换个地方重新起风
      small.mass *= 0.6
      grow(small, 0)
      big.calm = 15 // 吞过玩家后先去觅食
      const [x, z] = this.spawnPoint(90)
      small.x = x
      small.z = z
      small.vx = small.vz = 0
      small.guard = 3
      return
    }
    small.alive = false
    small.respawn = 7
  }

  private revive(t: Tornado) {
    const [x, z] = this.spawnPoint(70)
    t.x = x
    t.z = z
    t.alive = true
    t.guard = 2
    // 对手复活时略小于玩家，保持追赶感
    t.mass = Math.min(t.mass * 0.4, massFor(this.player.r * 0.8, t.base))
    grow(t, 0)
  }

  // 雷暴天赋：劈碎附近的大物件，碎块散落一地
  private bolts(dt: number) {
    const lv = this.perks.bolt
    if (!lv || this.over) return
    this.boltTimer -= dt
    if (this.boltTimer > 0) return
    this.boltTimer = 5.5 - lv * 1.2
    const p = this.player
    let best: Obj | null = null
    for (const o of this.grid.query(p.x, p.z, 30 + p.r * 3, this.scratch))
      if (o.state === 'idle' && o.s > p.r && o.s <= p.r * 4 && (!best || o.s > best.s)) best = o
    if (!best) return
    best.hp -= 0.5
    best.shake = 1
    for (let i = 0; i < 6 + lv * 2; i++) {
      const a = Math.random() * Math.PI * 2,
        r = best.s * (0.4 + Math.random() * 0.6)
      const c = makeObj(
        'chunk',
        best.x + Math.cos(a) * r,
        best.z + Math.sin(a) * r,
        Math.random() * 6,
        Math.min(p.r * 0.8, best.s * 0.18),
        best.color,
      )
      c.mass = best.mass * 0.03
      best.mass -= c.mass
      this.addChunk(c, true)
    }
    this.events.push({ type: 'bolt', x: best.x, z: best.z, h: best.h })
  }

  private progress() {
    const p = this.player
    while (this.tier + 1 < tiers.length && tiers[this.tier + 1].s <= p.r) {
      this.tier++
      if (!this.demo)
        this.events.push({ type: 'tier', name: tiers[this.tier].name, kind: tiers[this.tier].kind })
    }
    if (!this.goalHit && p.r >= this.district.goal && !this.demo) {
      this.goalHit = true
      this.events.push({ type: 'goal' })
    }
    this.chunks = this.chunks.filter((c) => c.state === 'idle')
  }

  rank() {
    return this.contenders.sort((a, b) => b.mass - a.mass).indexOf(this.player) + 1
  }

  // 参与排名的龙卷（不含双涡伙伴）
  get contenders() {
    return this.tornados.filter((t) => t.feed < 0)
  }

  private finish() {
    this.over = true
    this.events.push({ type: 'end', win: this.goalHit })
  }
}
