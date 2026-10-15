import { Container, Sprite } from 'pixi.js'
import type { Float } from '../../model/world/floats'
import { lanternKinds } from '../../data/kinds'
import type { Art } from '../art/art'
import { tintOf } from '../art/kit'
import type { BoatId } from '../../data/workshop'

// 单盏河灯：本体 + 近辉光 + 远光晕
export class FloatView {
  body: Sprite
  glow: Sprite
  halo: Sprite
  private lit: boolean
  private heading = -Math.PI / 2
  private scale = 1
  private flash = 0

  constructor(
    readonly art: Art,
    f: Float,
    bodyLayer: Container,
    glowLayer: Container,
    boat: BoatId = 'paper',
  ) {
    this.lit = f.lit
    const head = f.kind === 'head'
    this.body = new Sprite(head ? art.boats[boat] : f.lit ? art.lit[f.kind] : art.dim[f.kind])
    this.body.anchor.set(0.5)
    this.scale = ((f.r * 2) / (head ? 96 : 112)) * (head ? (boat === 'crane' ? 1.9 : 2.1) : 1.42)
    this.glow = new Sprite(art.glow)
    this.halo = new Sprite(art.glow)
    for (const s of [this.glow, this.halo]) {
      s.anchor.set(0.5)
      s.tint = tintOf(lanternKinds[f.kind].light)
    }
    bodyLayer.addChild(this.body)
    glowLayer.addChild(this.glow, this.halo)
  }

  sync(f: Float, time: number, tint: number, h: number, rise = 0) {
    if (f.lit !== this.lit && f.kind !== 'head') {
      if (f.lit) this.flash = 1
      this.lit = f.lit
      this.body.texture = f.lit ? this.art.lit[f.kind] : this.art.dim[f.kind]
    }
    this.flash = Math.max(0, this.flash - 0.04)
    this.body.position.set(f.x, f.y)
    if (f.kind === 'head') {
      if (Math.hypot(f.vx, f.vy) > 5) {
        // 船头大致朝下游，被推时最多偏 70°
        let want = Math.atan2(f.vy, f.vx)
        let off = Math.atan2(Math.sin(want + Math.PI / 2), Math.cos(want + Math.PI / 2))
        off = Math.max(-1.2, Math.min(1.2, off))
        want = -Math.PI / 2 + off
        let d = want - this.heading
        d = Math.atan2(Math.sin(d), Math.cos(d))
        this.heading += d * 0.08
      }
      this.body.rotation = this.heading + Math.PI / 2
    } else this.body.rotation = f.angle
    // 受伤闪烁
    const blink = f.hurt > 0 && f.lit && Math.sin(time * 40) > 0 ? 0.45 : 1
    this.body.tint = f.lit ? 0xffffff : tint
    this.body.alpha = (1 - f.fade) * blink
    this.body.scale.set(this.scale * (1 + h * 0.04) * (1 - f.fade * 0.3) * (1 + this.flash * 0.35))
    const on = f.lit ? 1 : 0
    const flick = 0.85 + 0.15 * Math.sin(time * 11 + f.id * 1.7)
    const size = f.kind === 'head' ? 1 : 0.62
    const pulse = 0.5 + 0.5 * Math.sin(time * 3 + f.id)
    this.glow.position.set(f.x, f.y)
    this.glow.scale.set(on ? 0.42 * size * flick * (1 + this.flash) : 0.36)
    this.glow.alpha = on ? 0.55 + this.flash * 0.4 : (0.2 + 0.2 * pulse) * (1 - f.fade)
    this.halo.position.set(f.x, f.y)
    this.halo.scale.set(1.7 * size)
    this.halo.alpha = 0.12 * on
    if (rise > 0 && f.lit && f.kind !== 'head') this.lift(rise, f.id, time)
    if (rise > 0 && f.kind === 'head') this.glow.alpha *= Math.max(0.3, 1 - rise * 0.3)
  }

  // 终局：灯离水升空，越升越近越大
  private lift(k: number, id: number, time: number) {
    const dy = -(k * k * 36 + k * 24)
    const dx = Math.sin(id * 1.7) * k * 34 + Math.sin(time * 1.3 + id) * k * 6
    const grow = 1 + k * 0.8
    const fade = Math.max(0, 1 - Math.max(0, k - 2.2) / 1.4)
    for (const s of [this.body, this.glow, this.halo]) {
      s.x += dx
      s.y += dy
    }
    this.body.scale.set(this.scale * grow)
    this.body.alpha = fade
    this.glow.scale.set(this.glow.scale.x * grow * 1.3)
    this.glow.alpha = fade * 0.8
    this.halo.alpha = fade * 0.25
  }

  destroy() {
    this.body.destroy()
    this.glow.destroy()
    this.halo.destroy()
  }
}
