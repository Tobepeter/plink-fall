import { Container, MeshRope, Point, Sprite } from 'pixi.js'
import type { Run } from '../../model/run'
import type { Shadow } from '../../model/shadows'
import type { Buddy } from '../../model/combat'
import type { Boss } from '../../model/boss'
import type { Art } from '../art/art'
import { Keyed } from './keyed'

type Layers = { deep: Container; float: Container; fly: Container; glow: Container }

// 暗影、伙伴、首领的显示
export class CreaturesView {
  private shadows: Keyed<Shadow, ShadowView>
  private buddies: Keyed<Buddy, Sprite>
  private boss: BossView | null = null

  constructor(
    readonly art: Art,
    readonly layers: Layers,
  ) {
    this.shadows = new Keyed(
      (s) => new ShadowView(art, s, layers),
      (v) => v.destroy(),
    )
    this.buddies = new Keyed(
      (b) => {
        const s = new Sprite(b.kind === 'koi' ? art.koi : art.crane)
        s.anchor.set(0.5)
        s.scale.set(b.kind === 'koi' ? 0.42 : 0.4)
        ;(b.kind === 'koi' ? layers.deep : layers.fly).addChild(s)
        return s
      },
      (s) => s.destroy(),
    )
  }

  sync(run: Run, time: number, lightAt: (x: number, y: number) => number) {
    for (const s of run.shadows) this.shadows.get(s).sync(s, time, lightAt(s.x, s.y))
    this.shadows.sweep()
    for (const b of run.combat.buddies) {
      const s = this.buddies.get(b)
      s.position.set(b.x, b.y)
      if (Math.hypot(b.vx, b.vy) > 4) s.rotation = Math.atan2(b.vy, b.vx) + Math.PI / 2
      s.tint = b.kind === 'koi' ? 0xffffff : lightAt(b.x, b.y)
      s.alpha = b.kind === 'koi' ? 0.85 : 1
      if (b.kind === 'crane') s.scale.y = 0.4 * (0.75 + 0.25 * Math.sin(time * 9 + b.phase))
    }
    this.buddies.sweep()
    const boss = run.boss
    if (boss && (!this.boss || this.boss.boss !== boss)) {
      this.boss?.destroy()
      this.boss = new BossView(this.art, boss, this.layers)
    }
    if (!boss && this.boss) {
      this.boss.destroy()
      this.boss = null
    }
    this.boss?.sync(time)
  }

  destroy() {
    this.shadows.clear()
    this.buddies.clear()
    this.boss?.destroy()
  }
}

class ShadowView {
  body: Sprite | MeshRope
  eyes: Sprite[] = []
  private points: Point[] = []
  private heading = 0

  constructor(art: Art, s: Shadow, layers: Layers) {
    if (s.kind === 'eel') {
      for (let i = 0; i < 12; i++) this.points.push(new Point(s.x, s.y + i * 7))
      this.body = new MeshRope({ texture: art.eel, points: this.points })
      layers.deep.addChild(this.body)
    } else {
      const sp = new Sprite(s.kind === 'fish' ? art.fish : art.moth)
      sp.anchor.set(0.5)
      sp.scale.set(s.kind === 'fish' ? 0.5 : 0.42)
      ;(s.kind === 'fish' ? layers.deep : layers.fly).addChild(sp)
      this.body = sp
    }
    for (let i = 0; i < 2; i++) {
      const e = new Sprite(art.spark)
      e.anchor.set(0.5)
      e.scale.set(0.2)
      e.tint = s.kind === 'moth' ? 0xd8b8ff : 0x9fe8ff
      layers.glow.addChild(e)
      this.eyes.push(e)
    }
    this.heading = Math.atan2(s.vy, s.vx)
  }

  sync(s: Shadow, time: number, tint: number) {
    const life = Math.max(0.25, s.hp / s.max)
    const fadeIn = Math.min(1, s.age * 1.5) * (s.leave > 0 ? s.leave / 1.6 : 1)
    if (Math.hypot(s.vx, s.vy) > 8) {
      let d = Math.atan2(s.vy, s.vx) - this.heading
      d = Math.atan2(Math.sin(d), Math.cos(d))
      this.heading += d * 0.15
    }
    const burning = s.burn > 0.05
    if (this.body instanceof MeshRope) {
      const p = this.points
      p[0].set(s.x, s.y)
      for (let i = 1; i < p.length; i++) {
        const dx = p[i].x - p[i - 1].x,
          dy = p[i].y - p[i - 1].y
        const d = Math.hypot(dx, dy) || 1
        const w = Math.sin(time * 7 - i * 0.7) * 1.5
        p[i].set(
          p[i - 1].x + (dx / d) * 7 + w * (-dy / d),
          p[i - 1].y + (dy / d) * 7 + w * (dx / d),
        )
      }
      this.body.alpha = 0.85 * fadeIn * (0.4 + 0.6 * life)
      this.body.tint = s.dash > 0 && s.dash > 0.45 ? 0x9fd8ff : burning ? 0xffb38a : 0xffffff
    } else {
      const b = this.body
      b.position.set(s.x, s.y)
      b.rotation = this.heading + Math.PI / 2
      if (s.kind === 'fish') {
        b.skew.x = Math.sin(time * 12 + s.id) * 0.12
        b.alpha = 0.8 * fadeIn * (0.35 + 0.65 * life)
        b.tint = burning ? 0xff9a6a : 0xffffff
      } else {
        b.scale.x = 0.42 * (0.55 + 0.45 * Math.abs(Math.sin(time * 16 + s.id)))
        b.alpha = fadeIn * (0.4 + 0.6 * life)
        b.tint = burning ? 0xffb090 : tint
      }
    }
    // 眼睛
    const fx = Math.cos(this.heading),
      fy = Math.sin(this.heading)
    const fwd = s.kind === 'moth' ? 4 : s.kind === 'eel' ? 2 : 11
    this.eyes.forEach((e, i) => {
      const side = i ? 1 : -1
      e.position.set(s.x + fx * fwd - fy * side * 4, s.y + fy * fwd + fx * side * 4)
      e.alpha = fadeIn * (s.stun > 0 ? 0.3 : 0.9) * life
    })
  }

  destroy() {
    this.body.destroy()
    for (const e of this.eyes) e.destroy()
  }
}

class BossView {
  body: Sprite
  eyes: Sprite[] = []
  lamp: Sprite | null = null
  rope: MeshRope | null = null
  private points: Point[] = []
  private heading = -Math.PI / 2

  constructor(
    readonly art: Art,
    readonly boss: Boss,
    readonly layers: Layers,
  ) {
    const tex =
      boss.id === 'catfish' ? art.catfish : boss.id === 'ferry' ? art.ferry : art.dragonHead
    this.body = new Sprite(tex)
    this.body.anchor.set(0.5, boss.id === 'catfish' ? 0.47 : 0.5)
    this.body.scale.set(boss.id === 'catfish' ? 0.62 : boss.id === 'ferry' ? 0.55 : 0.5)
    if (boss.id === 'dragon') {
      for (const p of boss.trail) this.points.push(new Point(p.x, p.y))
      this.rope = new MeshRope({ texture: art.dragonBody, points: this.points })
      layers.deep.addChild(this.rope)
    }
    ;(boss.id === 'ferry' ? layers.float : layers.deep).addChild(this.body)
    for (let i = 0; i < 2; i++) {
      const e = new Sprite(art.spark)
      e.anchor.set(0.5)
      e.scale.set(0.42)
      e.tint = boss.id === 'dragon' ? 0x8fd8ff : 0xffe28a
      layers.glow.addChild(e)
      this.eyes.push(e)
    }
    if (boss.id === 'ferry') {
      this.lamp = new Sprite(art.glow)
      this.lamp.anchor.set(0.5)
      this.lamp.tint = 0x9dffcf
      layers.glow.addChild(this.lamp)
    }
  }

  sync(time: number) {
    const b = this.boss
    if (Math.hypot(b.vx, b.vy) > 10 && b.mode !== 'stun') {
      let d = Math.atan2(b.vy, b.vx) - this.heading
      d = Math.atan2(Math.sin(d), Math.cos(d))
      this.heading += d * (b.mode === 'lunge' ? 0.3 : 0.06)
    }
    const dying = b.mode === 'die' ? Math.max(0, b.timer / 2.5) : 1
    this.body.position.set(b.x, b.y)
    this.body.rotation =
      this.heading + Math.PI / 2 + (b.mode === 'stun' ? Math.sin(time * 3) * 0.25 : 0)
    this.body.skew.x = b.id === 'ferry' ? 0 : Math.sin(time * 4) * 0.06
    const tell = b.mode === 'tell' ? 0.5 + 0.5 * Math.sin(time * 30) : 0
    this.body.alpha = (b.id === 'ferry' ? 1 : 0.88) * dying
    this.body.tint = b.mode === 'stun' ? 0x8a9ab0 : b.burn > 0.1 ? 0xffc2a0 : 0xffffff
    const fx = Math.cos(this.heading),
      fy = Math.sin(this.heading)
    const fwd = b.id === 'catfish' ? 44 : b.id === 'ferry' ? -26 : 26
    this.eyes.forEach((e, i) => {
      const side = i ? 1 : -1
      const spread = b.id === 'ferry' ? 0 : 16
      e.position.set(b.x + fx * fwd - fy * side * spread, b.y + fy * fwd + fx * side * spread)
      e.alpha =
        (b.mode === 'stun' ? 0.2 : 0.7 + tell * 0.3) * dying * (b.id === 'ferry' && i ? 0 : 1)
      e.scale.set(0.42 + tell * 0.35)
    })
    if (this.lamp) {
      this.lamp.position.set(b.x + fx * 30, b.y + fy * 30)
      this.lamp.scale.set(0.5 + 0.05 * Math.sin(time * 6))
      this.lamp.alpha = 0.7 * dying
    }
    if (this.rope) {
      b.trail.forEach((p, i) => this.points[i].set(p.x, p.y))
      this.rope.alpha = 0.85 * dying
      this.rope.tint = this.body.tint
    }
  }

  destroy() {
    this.body.destroy()
    for (const e of this.eyes) e.destroy()
    this.lamp?.destroy()
    this.rope?.destroy()
  }
}
