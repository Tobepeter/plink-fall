import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { Art } from './art/art'
import type { DriftEvent } from '../model/types'
import type { Run } from '../model/run'
import { lanternKinds, type LanternKind } from '../data/kinds'
import { tintOf } from './art/kit'

type Particle = {
  s: Sprite
  vx: number
  vy: number
  life: number
  max: number
  s0: number
  s1: number
  a0: number
  drag: number
  spin: number
}

type Stroke = { g: Graphics; life: number; max: number }

// 粒子、光环、闪电：由运行事件驱动
export class Fx {
  private parts: Particle[] = []
  private strokes: Stroke[] = []
  shake = 0
  flash = 0 // 全局提亮

  constructor(
    readonly art: Art,
    readonly add: Container,
    readonly normal: Container,
  ) {}

  emit(e: DriftEvent, run: Run) {
    const art = this.art
    switch (e.type) {
      case 'tap':
        this.ring(e.x, e.y, 0xcfe8ff, 10, run.stats.rippleRadius * 0.9, 0.5, 0.25)
        this.burst(e.x, e.y, art.spark, 0xd8f0ff, 6, 60, 0.25, 0.08, 0.4)
        break
      case 'join': {
        const c = tintOf(lanternKinds[e.kind as LanternKind].light)
        this.ring(e.x, e.y, c, 6, 60, 0.9, 0.45)
        this.burst(e.x, e.y, art.spark, c, 14, 120, 0.6, 0.18, 0.9)
        break
      }
      case 'lose':
        this.burst(e.x, e.y, art.smoke, 0xffffff, 8, 30, 1.4, 0.5, 0.8, this.normal)
        this.burst(e.x, e.y, art.spark, 0xff9a50, 8, 90, 0.4, 0.12, 0.8)
        this.shake = Math.max(this.shake, 6)
        break
      case 'hurt':
        this.ring(e.x, e.y, 0xff6a3a, 10, 110, 1, 0.5)
        this.burst(e.x, e.y, art.spark, 0xffa060, 22, 160, 0.6, 0.2, 1)
        this.shake = Math.max(this.shake, 14)
        break
      case 'shield':
        this.ring(e.x, e.y, 0xa8d8ff, 10, 70, 1, 0.4)
        break
      case 'absorb':
        this.burst(e.x, e.y, art.spark, 0xe6ff9a, 2, 40, 0.3, 0.1, 0.6)
        break
      case 'petal':
        this.burst(e.x, e.y, art.spark, 0xffb3cf, 3, 40, 0.3, 0.1, 0.6)
        break
      case 'level':
        this.ring(run.head.x, run.head.y, 0xffd27a, 10, 220, 1, 0.9)
        this.burst(run.head.x, run.head.y, art.spark, 0xffe2a0, 40, 220, 1, 0.22, 1)
        this.flash = 0.6
        break
      case 'kill':
        this.burst(e.x, e.y, art.smoke, 0xffffff, 6, 40, 1, 0.45, 0.7, this.normal)
        this.burst(e.x, e.y, art.spark, 0xb8f4ff, 10, 120, 0.5, 0.14, 0.9)
        break
      case 'zap':
        this.lightning(e.points)
        for (const p of e.points.slice(1))
          this.burst(p.x, p.y, art.spark, 0xc8a8ff, 6, 90, 0.35, 0.14, 1)
        break
      case 'pulse':
        this.ring(e.x, e.y, 0xff8ab8, 10, 130, 0.8, 0.55)
        break
      case 'choose':
        this.ring(e.x, e.y, 0xffe6a8, 20, 260, 1, 1)
        this.burst(e.x, e.y, art.spark, 0xfff0c8, 30, 200, 1, 0.2, 1)
        this.flash = 0.5
        break
      case 'boss-tell':
        this.telegraph(e.x, e.y, e.dir)
        break
      case 'boss-stun':
        this.ring(e.x, e.y, 0xffffff, 20, 160, 1, 0.7)
        this.burst(e.x, e.y, art.spark, 0xfff4c0, 24, 200, 0.7, 0.2, 1)
        this.shake = Math.max(this.shake, 10)
        break
      case 'boss-dead':
        for (let i = 0; i < 3; i++) this.ring(e.x, e.y, 0xfff0c0, 20, 200 + i * 120, 1, 1 + i * 0.4)
        this.burst(e.x, e.y, art.spark, 0xfff4d0, 70, 300, 1.4, 0.25, 1)
        this.burst(e.x, e.y, art.smoke, 0xffffff, 20, 90, 2, 0.9, 0.8, this.normal)
        this.shake = 22
        this.flash = 1
        break
    }
  }

  private sprite(tex: Texture, layer: Container) {
    const s = new Sprite(tex)
    s.anchor.set(0.5)
    layer.addChild(s)
    return s
  }

  ring(x: number, y: number, tint: number, r0: number, r1: number, alpha: number, life: number) {
    const s = this.sprite(this.art.ring, this.add)
    s.position.set(x, y)
    s.tint = tint
    this.parts.push({
      s,
      vx: 0,
      vy: 0,
      life,
      max: life,
      s0: (r0 * 2) / 128,
      s1: (r1 * 2) / 128,
      a0: alpha,
      drag: 0,
      spin: 0,
    })
  }

  burst(
    x: number,
    y: number,
    tex: Texture,
    tint: number,
    n: number,
    speed: number,
    life: number,
    size: number,
    alpha: number,
    layer = this.add,
  ) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 500) return
      const s = this.sprite(tex, layer)
      const a = Math.random() * Math.PI * 2,
        v = speed * (0.3 + Math.random() * 0.7)
      s.position.set(x, y)
      s.tint = tint
      s.rotation = Math.random() * 6
      const l = life * (0.6 + Math.random() * 0.6)
      const k = size * (0.6 + Math.random() * 0.8)
      this.parts.push({
        s,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: l,
        max: l,
        s0: k,
        s1: k * (tex === this.art.smoke ? 2.4 : 0.2),
        a0: alpha,
        drag: 3,
        spin: (Math.random() - 0.5) * 3,
      })
    }
  }

  private lightning(points: { x: number; y: number }[]) {
    const g = new Graphics()
    for (const [w, a, c] of [
      [7, 0.25, 0x8a5cff],
      [2.2, 1, 0xf0e4ff],
    ] as const) {
      g.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1],
          p1 = points[i]
        for (let k = 1; k <= 5; k++) {
          const t = k / 5
          const j = k < 5 ? (Math.random() - 0.5) * 16 : 0
          g.lineTo(p0.x + (p1.x - p0.x) * t + j, p0.y + (p1.y - p0.y) * t + j)
        }
      }
      g.stroke({ width: w, color: c, alpha: a })
    }
    this.add.addChild(g)
    this.strokes.push({ g, life: 0.22, max: 0.22 })
  }

  // 冲撞预兆：一道渐亮的水痕
  private telegraph(x: number, y: number, dir: number) {
    const g = new Graphics()
    const len = 420
    for (let i = 0; i < 14; i++) {
      const t = i / 14
      g.circle(x + Math.cos(dir) * len * t, y + Math.sin(dir) * len * t, 10 - t * 6)
    }
    g.fill({ color: 0xff7a5a, alpha: 0.35 })
    this.add.addChild(g)
    this.strokes.push({ g, life: 1.15, max: 1.15 })
  }

  step(dt: number) {
    for (const p of this.parts) {
      p.life -= dt
      const t = 1 - Math.max(0, p.life) / p.max
      p.vx *= 1 - Math.min(1, p.drag * dt)
      p.vy *= 1 - Math.min(1, p.drag * dt)
      p.s.x += p.vx * dt
      p.s.y += p.vy * dt
      p.s.rotation += p.spin * dt
      p.s.scale.set(p.s0 + (p.s1 - p.s0) * t)
      p.s.alpha = p.a0 * (1 - t) * (p.drag === 0 ? 1 - t * 0.3 : 1)
      if (p.life <= 0) p.s.destroy()
    }
    this.parts = this.parts.filter((p) => p.life > 0)
    for (const s of this.strokes) {
      s.life -= dt
      s.g.alpha =
        Math.max(0, s.life / s.max) * (s.max > 0.5 ? 0.5 + 0.5 * Math.sin(s.life * 30) : 1)
      if (s.life <= 0) s.g.destroy()
    }
    this.strokes = this.strokes.filter((s) => s.life > 0)
    this.shake = Math.max(0, this.shake - dt * 40)
    this.flash = Math.max(0, this.flash - dt * 1.5)
  }

  destroy() {
    for (const p of this.parts) p.s.destroy()
    for (const s of this.strokes) s.g.destroy()
  }
}
