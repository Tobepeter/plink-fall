import { Container, Sprite } from 'pixi.js'
import type { Run } from '../../model/run'
import type { Firefly, Petal } from '../../model/pickups'
import type { Ember } from '../../model/combat'
import type { Art } from '../art/art'
import { Keyed } from './keyed'

// 萤火、花瓣、余烬
export class PickupsView {
  private flies: Keyed<Firefly, Sprite[]>
  private petals: Keyed<Petal, Sprite>
  private embers: Keyed<Ember, Sprite>

  constructor(art: Art, float: Container, glow: Container) {
    this.flies = new Keyed(
      () => {
        const halo = new Sprite(art.glow)
        const core = new Sprite(art.spark)
        for (const s of [halo, core]) s.anchor.set(0.5)
        halo.tint = 0xb8ff7a
        core.tint = 0xf4ffd0
        glow.addChild(halo, core)
        return [halo, core]
      },
      (list) => list.forEach((s) => s.destroy()),
    )
    this.petals = new Keyed(
      () => {
        const s = new Sprite(art.petal)
        s.anchor.set(0.5)
        s.scale.set(0.6)
        float.addChild(s)
        return s
      },
      (s) => s.destroy(),
    )
    this.embers = new Keyed(
      () => {
        const s = new Sprite(art.glow)
        s.anchor.set(0.5)
        s.tint = 0xff8a3a
        glow.addChild(s)
        return s
      },
      (s) => s.destroy(),
    )
  }

  sync(run: Run, time: number, lightAt: (x: number, y: number) => number) {
    for (const f of run.fireflies) {
      const [halo, core] = this.flies.get(f)
      const blink = 0.55 + 0.45 * Math.sin(time * 5 + f.id * 1.9)
      halo.position.set(f.x, f.y)
      core.position.set(f.x, f.y)
      halo.scale.set(0.2 + blink * 0.08)
      halo.alpha = 0.35 * blink
      core.scale.set(0.16 + blink * 0.06)
      core.alpha = 0.6 + 0.4 * blink
    }
    this.flies.sweep()
    for (const p of run.petals) {
      const s = this.petals.get(p)
      s.position.set(p.x, p.y)
      s.rotation = p.angle
      s.tint = lightAt(p.x, p.y)
    }
    this.petals.sweep()
    for (const e of run.combat.embers) {
      const s = this.embers.get(e)
      const k = e.life / e.max
      s.position.set(e.x, e.y)
      s.scale.set(0.16 + 0.1 * k)
      s.alpha = k * (0.6 + 0.4 * Math.sin(time * 20 + e.x))
    }
    this.embers.sweep()
  }

  destroy() {
    this.flies.clear()
    this.petals.clear()
    this.embers.clear()
  }
}
