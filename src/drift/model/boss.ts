import type { Run } from './run'
import type { BossId } from '../data/regions'
import { damp } from './world/math'
import { burnShadow, type Shadow } from './shadows'
import { makeFirefly, makePetal } from './pickups'

// 湖中首领：盘旋 → 预兆 → 冲撞 / 召唤；预兆期点中它会翻身失衡，受光灼烧加倍
export type BossMode = 'enter' | 'circle' | 'tell' | 'lunge' | 'stun' | 'summon' | 'die'

const specs = {
  catfish: { name: '老鲶', hp: 20, r: 44, speed: 230, lunge: 430, orbit: 175, summon: 'fish' },
  ferry: { name: '夜渡舟', hp: 30, r: 40, speed: 200, lunge: 380, orbit: 190, summon: 'moth' },
  dragon: { name: '影龙', hp: 42, r: 40, speed: 260, lunge: 480, orbit: 185, summon: 'eel' },
} as const

export class Boss {
  readonly name: string
  x: number
  y: number
  vx = 0
  vy = 0
  r: number
  hp: number
  max: number
  mode: BossMode = 'enter'
  timer = 2
  angle = 0
  dir = 0 // 冲撞方向
  cycle = 0
  burn = 0
  private bodyBite = 0
  trail: { x: number; y: number }[] = [] // 龙身
  private spec: (typeof specs)[BossId]

  constructor(
    readonly id: BossId,
    x: number,
    y: number,
    scale: number,
  ) {
    this.spec = specs[id]
    this.name = this.spec.name
    this.x = x
    this.y = y
    this.r = this.spec.r
    this.hp = this.max = this.spec.hp * scale
    for (let i = 0; i < 14; i++) this.trail.push({ x, y: y + i * 16 })
  }

  get vulnerable() {
    return this.mode === 'stun'
  }

  hurt(amount: number) {
    if (this.mode === 'die' || this.mode === 'enter') return
    this.hp -= amount * (this.vulnerable ? 2.6 : 1)
  }

  // 涟漪击中：预兆中则失衡
  ripple(x: number, y: number, run: Run) {
    if (this.mode !== 'tell' && this.mode !== 'circle') return
    if (Math.hypot(x - this.x, y - this.y) > this.r + 34) return
    this.mode = 'stun'
    this.timer = 3
    run.events.push({ type: 'boss-stun', x: this.x, y: this.y })
  }

  step(run: Run, dt: number) {
    const h = run.head
    this.timer -= dt
    this.angle += dt
    const flow = run.river.speed
    let tx = this.x,
      ty = this.y,
      sp: number = this.spec.speed
    switch (this.mode) {
      case 'enter':
        tx = h.x
        ty = h.y - 230
        if (this.timer <= 0) this.next('circle', 3.2)
        break
      case 'circle': {
        const a = this.angle * 0.9
        tx = h.x + Math.cos(a) * this.spec.orbit
        ty = h.y - 40 + Math.sin(a) * this.spec.orbit * 0.75
        if (this.timer <= 0) {
          this.cycle++
          if (this.cycle % 3 === 0) this.next('summon', 1.2)
          else {
            this.next('tell', 1.15)
            this.dir = Math.atan2(h.y - 30 - this.y, h.x - this.x)
            run.events.push({ type: 'boss-tell', x: this.x, y: this.y, dir: this.dir })
          }
        }
        break
      }
      case 'tell':
        sp = 20
        if (this.timer <= 0) this.next('lunge', 0.75)
        break
      case 'lunge':
        this.vx = Math.cos(this.dir) * this.spec.lunge
        this.vy = Math.sin(this.dir) * this.spec.lunge - flow
        this.move(dt)
        for (const f of [...run.train]) {
          if (Math.hypot(f.x - this.x, f.y - this.y) < this.r + f.r - 6) run.bite(f)
        }
        if (this.timer <= 0) this.next('circle', 2.6 + Math.random())
        return
      case 'stun':
        sp = 0
        tx = this.x
        ty = this.y - flow * dt
        if (this.timer <= 0) this.next('circle', 2.4)
        break
      case 'summon':
        sp = 40
        if (this.timer <= 0) {
          const n = this.id === 'ferry' ? 4 : 2
          for (let i = 0; i < n; i++)
            run.spawner.spawnShadow(this.spec.summon, { x: this.x, y: this.y })
          this.next('circle', 3)
        }
        break
      case 'die':
        this.vx *= 0.9
        this.vy = -flow
        this.move(dt)
        return
    }
    const dx = tx - this.x,
      dy = ty - this.y
    const d = Math.hypot(dx, dy) || 1
    const v = Math.min(sp, d * 2.2)
    this.vx += ((dx / d) * v - this.vx) * damp(3, dt)
    this.vy += ((dy / d) * v - flow - this.vy) * damp(3, dt)
    if (this.mode === 'stun') {
      this.vx *= 0.9
      this.vy = -flow
    }
    this.move(dt)
  }

  private move(dt: number) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    // 龙身跟随
    let px = this.x,
      py = this.y
    for (const p of this.trail) {
      const dx = p.x - px,
        dy = p.y - py
      const d = Math.hypot(dx, dy) || 1
      if (d > 16) p.x = px + (dx / d) * 16
      if (d > 16) p.y = py + (dy / d) * 16
      px = p.x
      py = p.y
    }
  }

  private next(mode: BossMode, timer: number) {
    this.mode = mode
    this.timer = timer
  }

  kill() {
    this.mode = 'die'
    this.timer = 2.5
  }

  // 一帧首领战：行动、受光灼烧、龙身扫咬、倒下结算
  update(run: Run, dt: number) {
    this.step(run, dt)
    const probe = { x: this.x, y: this.y, r: this.r } as Shadow
    // 平时光灼只伤皮毛，翻身失衡时才烧得透
    const k = this.mode === 'stun' ? 0.55 : 0.16
    if (this.mode !== 'die' && this.mode !== 'enter') this.hurt(burnShadow(run, probe, dt) * k)
    this.burn = probe.burn
    this.bodyBite -= dt
    if (this.id === 'dragon' && this.mode === 'lunge' && this.bodyBite <= 0) {
      // 龙身每 0.45 秒至多咬落一盏
      for (const p of this.trail.slice(3)) {
        const f = run.train.find((t) => t.hurt <= 0 && Math.hypot(t.x - p.x, t.y - p.y) < t.r + 12)
        if (!f) continue
        run.bite(f)
        this.bodyBite = 0.45
        break
      }
    }
    if (this.hp <= 0 && this.mode !== 'die') this.fall(run)
    if (this.mode !== 'die') return
    this.timer -= dt
    if (this.timer <= 0) run.bossGone()
  }

  private fall(run: Run) {
    this.kill()
    run.tally.bosses++
    run.events.push({ type: 'boss-dead', x: this.x, y: this.y })
    for (let i = 0; i < 36; i++) {
      const f = makeFirefly(this.x + run.rng.range(-60, 60), this.y + run.rng.range(-60, 60))
      f.drawn = i < 24
      run.fireflies.push(f)
    }
    for (let i = 0; i < 14; i++)
      run.petals.push(makePetal(this.x + run.rng.range(-50, 50), this.y + run.rng.range(-50, 50)))
    run.flame = Math.min(run.stats.maxFlame, run.flame + 1)
    // 湖面在前方收拢，接回河道
    const top = run.head.y - 520
    run.route.closeLake(run.seg, top)
    run.waves.refresh(top - 900, top + 700)
    run.events.push({ type: 'reshape', y0: top - 900, y1: top + 700 })
  }
}
