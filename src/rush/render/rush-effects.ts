import { Graphics } from 'pixi.js'
import type { RushEvent, Vec } from '../types'
import { palette } from './palette'

interface Particle extends Vec {
  vx: number
  vy: number
  life: number
  duration: number
  size: number
  color: number
  angle: number
}
interface Mark extends Vec {
  kind: 'ring' | 'chain' | 'cross' | 'ice' | 'arrow'
  life: number
  duration: number
  radius: number
  color: number
  targets: Vec[]
}

// 实际击中点的碎片与协议几何
export class RushEffects {
  view = new Graphics()
  private particles: Particle[] = []
  private marks: Mark[] = []
  private seed = 7231

  constructor(private getPlayer: () => Vec) {}

  render(dt: number) {
    const g = this.view.clear()
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= Math.exp(-dt * 7)
      p.vy *= Math.exp(-dt * 7)
      p.angle += dt * 8
      if (p.life <= 0) continue
      const alpha = Math.min(1, (p.life / p.duration) * 1.5)
      const size = p.size * (0.65 + (p.life / p.duration) * 0.35)
      const dx = Math.cos(p.angle) * size,
        dy = Math.sin(p.angle) * size
      g.poly([p.x + dx, p.y + dy, p.x - dy * 0.6, p.y + dx * 0.6, p.x - dx, p.y - dy]).fill({
        color: p.color,
        alpha,
      })
    }
    for (const mark of this.marks) {
      mark.life -= dt
      if (mark.life <= 0) continue
      const t = 1 - mark.life / mark.duration
      const alpha = Math.min(1, (mark.life / mark.duration) * 1.5)
      this.drawMark(mark, t, alpha)
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    this.marks = this.marks.filter((m) => m.life > 0)
  }

  private drawMark(mark: Mark, t: number, alpha: number) {
    const g = this.view
    if (mark.kind === 'chain') {
      const points = [{ x: mark.x, y: mark.y }, ...mark.targets]
      g.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1],
          to = points[i]
        const dx = to.x - from.x,
          dy = to.y - from.y
        const dist = Math.hypot(dx, dy) || 1
        for (let step = 1; step < 5; step++) {
          const sway = Math.sin(step * 2.4 + i * 3) * 7 * (1 - t)
          g.lineTo(
            from.x + (dx * step) / 5 - (dy / dist) * sway,
            from.y + (dy * step) / 5 + (dx / dist) * sway,
          )
        }
        g.lineTo(to.x, to.y)
      }
      g.stroke({ color: mark.color, width: 2.8, alpha })
      for (const point of points)
        g.circle(point.x, point.y, 3 + t * 6).stroke({ color: palette.cream, width: 1.2, alpha })
      return
    }
    if (mark.kind === 'arrow') {
      const target = mark.targets[0]
      if (!target) return
      const a = Math.atan2(target.y - mark.y, target.x - mark.x)
      const dx = Math.cos(a),
        dy = Math.sin(a)
      const length = mark.radius * (0.3 + t * 0.4)
      const x = mark.x + dx * length,
        y = mark.y + dy * length
      g.moveTo(mark.x - dx * 10, mark.y - dy * 10)
        .lineTo(x, y)
        .moveTo(x - dx * 11 - dy * 8, y - dy * 11 + dx * 8)
        .lineTo(x, y)
        .lineTo(x - dx * 11 + dy * 8, y - dy * 11 - dx * 8)
        .stroke({ color: mark.color, width: 2, alpha })
      return
    }
    if (mark.kind === 'ice') {
      const r = mark.radius * (0.3 + t * 0.7)
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        const dx = Math.cos(a),
          dy = Math.sin(a)
        g.moveTo(mark.x + dx * r * 0.45, mark.y + dy * r * 0.45)
          .lineTo(mark.x + dx * r, mark.y + dy * r)
          .lineTo(mark.x + dx * r * 0.82 - dy * 6, mark.y + dy * r * 0.82 + dx * 6)
      }
      g.stroke({ color: palette.cream, width: 2, alpha })
      return
    }
    const r = mark.radius * (0.2 + t * 0.8)
    if (mark.kind === 'cross') {
      g.moveTo(mark.x - r, mark.y)
        .lineTo(mark.x + r, mark.y)
        .moveTo(mark.x, mark.y - r)
        .lineTo(mark.x, mark.y + r)
        .stroke({ color: mark.color, width: 2.5, alpha })
    } else {
      g.circle(mark.x, mark.y, r).stroke({ color: mark.color, width: 3 * (1 - t) + 1, alpha })
      if (t < 0.12)
        g.circle(mark.x, mark.y, Math.min(18, r * 0.4)).fill({
          color: palette.cream,
          alpha: 0.3 * alpha,
        })
    }
  }

  event(e: RushEvent) {
    const p = this.getPlayer()
    const direction = Math.atan2(e.y - p.y, e.x - p.x)
    if (e.type === 'shot' && e.side === 'enemy') this.mark(e, 'ring', palette.red, 16, 0.08)
    if (e.type === 'kill') {
      this.burst(e, palette.red, 7, 150, direction)
      this.burst(e, palette.cream, 3, 105, direction)
      this.mark(e, 'cross', palette.cream, 14, 0.09)
    }
    if (e.type === 'boss-down') {
      this.burst(e, palette.red, 28, 260)
      this.burst(e, palette.cream, 14, 180)
      this.mark(e, 'ring', palette.cream, 115, 0.38)
      this.mark(e, 'cross', palette.red, 85, 0.18)
    }
    if (e.type === 'hit') {
      this.burst(e, palette.cream, 3, 110, direction)
      this.mark(e, 'cross', palette.cream, 8, 0.055)
    }
    if (e.type === 'hurt') {
      this.burst(e, palette.red, 10, 150)
      this.mark(e, 'ring', palette.cream, 30, 0.16)
    }
    if (e.type === 'dash') this.mark(e, 'ring', palette.teal, 22, 0.09)
    if (e.type === 'pickup') this.mark(e, 'cross', palette.amber, 8, 0.08)
    if (e.type === 'chain') this.mark(e, 'chain', palette.teal, 0, 0.12, e.targets)
    if (e.type === 'explode') {
      const radius = e.power ? Math.min(210, e.power * 70) : 75
      this.mark(e, 'ring', palette.cream, radius, 0.23)
      this.burst(e, palette.amber, 12, 190)
    }
    if (e.type === 'intercept') {
      for (const target of (e.targets ?? []).slice(0, 16)) {
        this.burst(target, palette.cream, 3, 100)
        this.mark(target, 'cross', palette.teal, 12, 0.11)
      }
    }
    if (e.type === 'counter') {
      this.mark(e, 'arrow', palette.cream, 70, 0.17, e.targets)
      this.mark(e, 'ring', palette.teal, 48, 0.18)
    }
    if (e.type === 'protocol') {
      if (e.protocol === 'circuit') this.mark(e, 'ring', palette.teal, 12, 0.08)
      if (e.protocol === 'frostburst') this.mark(e, 'ice', palette.cream, (e.power ?? 1) * 70, 0.3)
      if (e.protocol === 'returnfire')
        for (const target of (e.targets ?? []).slice(0, 12))
          this.mark(target, 'arrow', palette.teal, 22, 0.18, [{ x: e.x, y: e.y }])
    }
    if (e.type === 'level' || e.type === 'upgrade') this.mark(e, 'ring', palette.amber, 65, 0.23)
    if (e.type === 'overdrive') {
      this.mark(e, 'ring', palette.teal, 100, 0.24)
      this.burst(e, palette.amber, 12, 200)
    }
    if (e.type === 'boss') this.mark(e, 'ring', palette.red, 110, 0.35)
  }

  private burst(point: Vec, color: number, count: number, speed: number, direction?: number) {
    for (let i = 0; i < count; i++) {
      const angle =
        direction === undefined
          ? this.random() * Math.PI * 2
          : direction + (this.random() - 0.5) * 2.1
      const velocity = speed * (0.35 + this.random() * 0.65)
      const duration = 0.13 + this.random() * 0.16
      this.particles.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: duration,
        duration,
        size: 1.8 + this.random() * 3.5,
        color,
        angle,
      })
    }
    this.particles = this.particles.slice(-350)
  }

  private mark(
    point: Vec,
    kind: Mark['kind'],
    color: number,
    radius: number,
    duration: number,
    targets: Vec[] = [],
  ) {
    this.marks.push({
      ...point,
      kind,
      color,
      radius,
      life: duration,
      duration,
      targets: targets.map((p) => ({ ...p })),
    })
    this.marks = this.marks.slice(-80)
  }

  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  reset() {
    this.particles = []
    this.marks = []
    this.view.clear()
  }

  destroy() {
    this.reset()
    this.view.destroy()
  }
}
