import { Graphics } from 'pixi.js'
import type { RushEvent, Vec } from '../types'
import { foeColors, palette } from './palette'

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
  kind: 'ring' | 'chain' | 'cross'
  life: number
  duration: number
  radius: number
  color: number
  targets: Vec[]
}

// 击杀碎裂、冲刺风切与电链
export class RushEffects {
  view = new Graphics()
  private particles: Particle[] = []
  private marks: Mark[] = []
  private seed = 7231

  render(dt: number) {
    const g = this.view.clear()
    for (const particle of this.particles) {
      particle.life -= dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.vx *= Math.exp(-dt * 6)
      particle.vy *= Math.exp(-dt * 6)
      particle.angle += dt * 8
      if (particle.life <= 0) continue
      const alpha = Math.min(1, (particle.life / particle.duration) * 1.5)
      const size = particle.size * (0.65 + (particle.life / particle.duration) * 0.35)
      const dx = Math.cos(particle.angle) * size
      const dy = Math.sin(particle.angle) * size
      g.poly([
        particle.x + dx,
        particle.y + dy,
        particle.x - dy * 0.65,
        particle.y + dx * 0.65,
        particle.x - dx,
        particle.y - dy,
      ]).fill({ color: particle.color, alpha })
    }
    for (const mark of this.marks) {
      mark.life -= dt
      if (mark.life <= 0) continue
      const t = 1 - mark.life / mark.duration
      const alpha = Math.min(1, (mark.life / mark.duration) * 1.5)
      if (mark.kind === 'chain') {
        const points = [{ x: mark.x, y: mark.y }, ...mark.targets]
        g.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          const from = points[i - 1]
          const to = points[i]
          const dx = to.x - from.x
          const dy = to.y - from.y
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
        g.stroke({ color: mark.color, width: 2.5, alpha })
        for (const point of points) {
          g.circle(point.x, point.y, 5 + t * 6).stroke({ color: palette.cream, width: 1.5, alpha })
        }
      } else if (mark.kind === 'cross') {
        const r = mark.radius * (0.2 + t)
        g.moveTo(mark.x - r, mark.y)
          .lineTo(mark.x + r, mark.y)
          .moveTo(mark.x, mark.y - r)
          .lineTo(mark.x, mark.y + r)
          .stroke({ color: mark.color, width: 2.5, alpha })
      } else {
        const r = mark.radius * (0.2 + t * 0.8)
        g.circle(mark.x, mark.y, r).stroke({ color: mark.color, width: 3 * (1 - t) + 1, alpha })
        if (t < 0.18)
          g.circle(mark.x, mark.y, r * 0.6).fill({ color: palette.cream, alpha: 0.25 * alpha })
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    this.marks = this.marks.filter((m) => m.life > 0)
  }

  event(event: RushEvent) {
    const e = event
    if (e.type === 'shot' && e.side === 'enemy') this.mark(e, 'ring', palette.violet, 23, 0.09)
    if (e.type === 'kill' || e.type === 'boss-down') {
      this.burst(e, e.kind ? foeColors[e.kind] : palette.red, e.type === 'boss-down' ? 36 : 9, 170)
      this.mark(e, 'cross', palette.cream, e.type === 'boss-down' ? 70 : 18, 0.12)
    }
    if (e.type === 'hit') this.burst(e, palette.cream, 3, 75)
    if (e.type === 'hurt') {
      this.burst(e, palette.red, 12, 150)
      this.mark(e, 'ring', palette.cream, 38, 0.16)
    }
    if (e.type === 'dash') {
      this.mark(e, 'ring', palette.teal, 48, 0.16)
      this.burst(e, palette.teal, 9, 135)
    }
    if (e.type === 'pickup') this.mark(e, 'cross', palette.amber, 9, 0.1)
    if (e.type === 'chain') this.mark(e, 'chain', palette.teal, 0, 0.16, e.targets)
    if (e.type === 'explode') {
      this.mark(e, 'ring', palette.amber, e.power ? Math.min(210, e.power * 70) : 75, 0.24)
      this.burst(e, palette.amber, 14, 190)
    }
    if (e.type === 'level' || e.type === 'upgrade') this.mark(e, 'ring', palette.amber, 80, 0.26)
    if (e.type === 'overdrive') {
      this.mark(e, 'ring', palette.teal, 125, 0.26)
      this.burst(e, palette.amber, 20, 230)
    }
    if (e.type === 'boss') this.mark(e, 'ring', palette.red, 120, 0.38)
  }

  private burst(point: Vec, color: number, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2
      const velocity = speed * (0.35 + this.random() * 0.65)
      const duration = 0.18 + this.random() * 0.16
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
    this.particles = this.particles.slice(-420)
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
    this.marks = this.marks.slice(-100)
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
