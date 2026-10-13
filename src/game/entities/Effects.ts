import { BitmapText, Container, Sprite } from 'pixi.js'
import type { GameTextures } from '../assets/loader'
import { Pool } from '../core/Pool'
import { MAX_FLOATERS, MAX_PARTICLES } from '../core/config'

interface Particle {
  s: Sprite
  vx: number
  vy: number
  life: number
  max: number
  size: number
}
interface Floater {
  t: BitmapText
  vy: number
  life: number
  max: number
  big: boolean
}

/** Pooled particles, floating numbers, shockwave rings. */
export class Effects {
  view = new Container()
  private pLayer = new Container()
  private fLayer = new Container()
  private particles: Pool<Particle>
  private floaters: Pool<Floater>
  private rings: Pool<Particle>

  constructor(tex: GameTextures) {
    this.view.addChild(this.pLayer, this.fLayer)
    this.particles = new Pool<Particle>(
      () => {
        const s = new Sprite(tex.glow)
        s.anchor.set(0.5)
        s.blendMode = 'add'
        this.pLayer.addChild(s)
        return { s, vx: 0, vy: 0, life: 0, max: 1, size: 1 }
      },
      (p) => (p.s.visible = true),
      (p) => (p.s.visible = false),
      MAX_PARTICLES,
    )
    this.rings = new Pool<Particle>(
      () => {
        const s = new Sprite(tex.ring)
        s.anchor.set(0.5)
        s.blendMode = 'add'
        this.pLayer.addChild(s)
        return { s, vx: 0, vy: 0, life: 0, max: 1, size: 1 }
      },
      (p) => (p.s.visible = true),
      (p) => (p.s.visible = false),
      24,
    )
    this.floaters = new Pool<Floater>(
      () => {
        const t = new BitmapText({
          text: '',
          style: { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 30, fill: 0xffffff, stroke: { color: 0x05060f, width: 5 } },
        })
        t.anchor.set(0.5)
        this.fLayer.addChild(t)
        return { t, vy: 0, life: 0, max: 1, big: false }
      },
      (f) => (f.t.visible = true),
      (f) => (f.t.visible = false),
      MAX_FLOATERS,
    )
  }

  burst(x: number, y: number, color: number, n: number, speed: number, size: number) {
    for (let i = 0; i < n; i++) {
      const p = this.particles.acquire()
      if (!p) return
      const a = Math.random() * Math.PI * 2
      const v = speed * (0.4 + Math.random() * 0.8)
      p.vx = Math.cos(a) * v
      p.vy = Math.sin(a) * v - speed * 0.4
      p.max = p.life = 0.35 + Math.random() * 0.45
      p.size = size * (0.6 + Math.random() * 0.8)
      p.s.tint = color
      p.s.position.set(x, y)
    }
  }

  ring(x: number, y: number, color: number, size: number) {
    const p = this.rings.acquire()
    if (!p) return
    p.max = p.life = 0.45
    p.size = size
    p.s.tint = color
    p.s.position.set(x, y)
  }

  float(x: number, y: number, text: string, color: number, big = false) {
    const f = this.floaters.acquire()
    if (!f) return
    f.t.text = text
    f.t.tint = color
    f.t.position.set(x, y)
    f.vy = big ? -120 : -80
    f.max = f.life = big ? 1.2 : 0.7
    f.big = big
  }

  update(dt: number) {
    const ps = this.particles.active
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.releaseAt(i)
        continue
      }
      p.vy += 600 * dt
      p.s.x += p.vx * dt
      p.s.y += p.vy * dt
      const k = p.life / p.max
      p.s.alpha = k
      p.s.width = p.s.height = p.size * (0.5 + k * 0.5)
    }
    const rs = this.rings.active
    for (let i = rs.length - 1; i >= 0; i--) {
      const p = rs[i]
      p.life -= dt
      if (p.life <= 0) {
        this.rings.releaseAt(i)
        continue
      }
      const k = 1 - p.life / p.max
      p.s.alpha = (1 - k) * 0.9
      p.s.width = p.s.height = p.size * (0.3 + k * 1.2)
    }
    const fs = this.floaters.active
    for (let i = fs.length - 1; i >= 0; i--) {
      const f = fs[i]
      f.life -= dt
      if (f.life <= 0) {
        this.floaters.releaseAt(i)
        continue
      }
      f.t.y += f.vy * dt
      f.vy *= 1 - 3 * dt
      const k = f.life / f.max
      const age = 1 - k
      const pop = f.big ? (age < 0.15 ? 0.6 + (age / 0.15) * 0.7 : 1.3 - Math.min(0.3, (age - 0.15) * 1.5)) : age < 0.1 ? 0.7 + age * 3 : 1
      f.t.scale.set(pop * (f.big ? 1.25 : 0.7))
      f.t.alpha = Math.min(1, k * 2.5)
    }
  }

  clear() {
    this.particles.releaseAll()
    this.floaters.releaseAll()
    this.rings.releaseAll()
  }
}
