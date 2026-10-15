import { Container, Sprite } from 'pixi.js'
import type { Run } from '../model/run'
import type { Rock } from '../model/world/river'
import type { Float } from '../model/world/floats'
import type { DriftEvent } from '../model/types'
import { lanternKinds } from '../data/kinds'
import { regions } from '../data/regions'
import type { Art } from './art/art'
import { WaterLayer, type LightSpot } from './water'
import { clonePalette, mixPalette, palettes, type Palette } from './palette'
import { FloatView } from './views/float-view'
import { CreaturesView } from './views/creatures-view'
import { PickupsView } from './views/pickups-view'
import { Banks } from './views/banks'
import { Fx } from './fx'
import { Keyed } from './views/keyed'

// 场景编排：分层、镜头、灯光、区域调色
export class DriftScene {
  readonly view = new Container()
  readonly world = new Container()
  readonly water: WaterLayer
  palette: Palette = clonePalette(palettes.creek)
  cam = { x: 0, y: 0, zoom: 1 }
  size = { w: 1, h: 1 }
  readonly fx: Fx
  private layers = {
    deep: new Container(),
    rock: new Container(),
    float: new Container(),
    smoke: new Container(),
    land: new Container(),
    fly: new Container(),
    top: new Container(),
    glow: new Container(),
  }
  private floats: Keyed<Float, FloatView>
  private rocks: Keyed<Rock, Sprite>
  private creatures: CreaturesView
  private pickups: PickupsView
  private banks: Banks
  private lights: LightSpot[] = []
  private nearRocks: Rock[] = []
  private from: Palette = clonePalette(palettes.creek)
  private to: Palette = palettes.creek
  private blend = 1
  private rise = 0 // 终局放灯升空

  constructor(
    readonly art: Art,
    readonly run: Run,
  ) {
    const L = this.layers
    this.water = new WaterLayer(run.waves)
    L.glow.blendMode = 'add'
    this.world.addChild(L.deep, L.rock, L.float, L.smoke, L.land, L.fly, L.top, L.glow)
    this.view.addChild(this.water.mesh, this.world)
    this.fx = new Fx(art, L.glow, L.smoke)
    this.floats = new Keyed(
      (f) => new FloatView(art, f, L.float, L.glow, run.config.boat),
      (v) => v.destroy(),
    )
    this.rocks = new Keyed(
      (rock) => {
        const s = new Sprite(art.rocks[rock.seed % art.rocks.length])
        s.anchor.set(0.5)
        s.rotation = (rock.seed % 628) / 100
        s.scale.set((rock.r * 2) / (128 * 0.8))
        s.position.set(rock.x, rock.y)
        L.rock.addChild(s)
        return s
      },
      (s) => s.destroy(),
    )
    this.creatures = new CreaturesView(art, {
      deep: L.deep,
      float: L.float,
      fly: L.fly,
      glow: L.glow,
    })
    this.pickups = new PickupsView(art, L.float, L.glow)
    this.banks = new Banks(art, L.land, L.top, L.glow)
    this.cam.x = run.head.x
    this.cam.y = run.head.y - 120
  }

  resize(w: number, h: number) {
    this.size = { w, h }
    this.cam.zoom = Math.min(w / 360, h / 700)
    this.water.resize(w, h)
  }

  get viewHeight() {
    return this.size.h / this.cam.zoom
  }

  toWorld(sx: number, sy: number) {
    return {
      x: this.cam.x + (sx - this.size.w / 2) / this.cam.zoom,
      y: this.cam.y + (sy - this.size.h / 2) / this.cam.zoom,
    }
  }

  // 镜头：灯头位于屏幕下方约 2/3，首领战略微拉远
  follow(dt: number) {
    const head = this.run.head
    const lift = this.run.config.demo ? 0.02 : this.run.boss ? 0.2 : 0.16
    const ty = head.y - this.viewHeight * lift
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 4)
    const tx = this.run.river.center(head.y - 120) * 0.7 + head.x * 0.3
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 1.5)
  }

  handle(events: DriftEvent[]) {
    for (const e of events) {
      this.fx.emit(e, this.run)
      if (e.type === 'region') this.shiftPalette(regions[e.region].palette)
      if (e.type === 'reshape') this.banks.invalidate(e.y0, e.y1)
    }
  }

  private shiftPalette(id: keyof typeof palettes) {
    this.from = clonePalette(this.palette)
    this.to = palettes[id]
    this.blend = 0
  }

  release() {
    this.rise = 0.0001
  }

  render(time: number, dt: number) {
    const { cam, size, run, fx } = this
    fx.step(dt)
    if (this.rise > 0) this.rise += dt
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 6)
      mixPalette(this.from, this.to, this.blend, this.palette)
    }
    const sx = (Math.random() - 0.5) * fx.shake,
      sy = (Math.random() - 0.5) * fx.shake
    const view = { x: cam.x + sx / cam.zoom, y: cam.y + sy / cam.zoom, zoom: cam.zoom }
    this.world.position.set(size.w / 2 - view.x * cam.zoom, size.h / 2 - view.y * cam.zoom)
    this.world.scale.set(cam.zoom)
    const top = cam.y - this.viewHeight / 2,
      bottom = cam.y + this.viewHeight / 2
    this.collectLights(time)
    const lightAt = (x: number, y: number) => this.lightAt(x, y)
    this.banks.sync(run, top, bottom, time, this.lights, lightAt)
    for (const rock of run.river.rocksNear(top - 60, bottom + 60, this.nearRocks))
      this.rocks.get(rock).tint = this.lightAt(rock.x, rock.y)
    this.rocks.sweep()
    for (const f of run.loose)
      this.floats.get(f).sync(f, time, this.lightAt(f.x, f.y), run.waves.sample(f.x, f.y))
    run.train.forEach((f, i) =>
      this.floats
        .get(f)
        .sync(f, time, 0xffffff, run.waves.sample(f.x, f.y), Math.max(0, this.rise - i * 0.12)),
    )
    this.floats.sweep()
    this.creatures.sync(run, time, lightAt)
    this.pickups.sync(run, time, lightAt)
    this.lights.sort((a, b) => b.power - a.power)
    this.water.setLights(this.lights)
    const exposure = this.palette.exposure
    const dim = this.rise > 0 ? 1 - Math.min(0.45, this.rise * 0.18) : 1
    this.palette.exposure = exposure * (1 + fx.flash * 0.35) * dim
    this.water.update(view, time, run.river.speed, this.palette)
    this.palette.exposure = exposure
  }

  private collectLights(time: number) {
    const list = this.lights
    list.length = 0
    for (const f of this.run.train) {
      if (!f.lit) continue
      const head = f.kind === 'head'
      const flick = 0.92 + 0.08 * Math.sin(time * 13 + f.id * 2.3) * Math.sin(time * 7.7 + f.id)
      list.push({
        x: f.x,
        y: f.y,
        radius: (head ? 200 : 125) * this.run.stats.light,
        power: (head ? 1.2 : 0.6) * flick,
        color: lanternKinds[f.kind].light,
        height: head ? 30 : 22,
      })
    }
    const b = this.run.boss
    if (b?.id === 'ferry')
      list.push({ x: b.x, y: b.y, radius: 160, power: 0.9, color: [0.5, 1, 0.75], height: 40 })
  }

  // 逐物体光照：环境光 + 灯光衰减
  lightAt(x: number, y: number) {
    const a = this.palette.ambient
    let r = a[0] * 0.95,
      g = a[1] * 0.95,
      b = a[2] * 0.95
    for (const l of this.lights) {
      const d = Math.hypot(l.x - x, l.y - y)
      if (d >= l.radius) continue
      const t = 1 - d / l.radius
      const k = t * t * (3 - 2 * t) * l.power
      r += l.color[0] * k
      g += l.color[1] * k
      b += l.color[2] * k
    }
    return (to255(r) << 16) | (to255(g) << 8) | to255(b)
  }

  destroy() {
    this.floats.clear()
    this.rocks.clear()
    this.creatures.destroy()
    this.pickups.destroy()
    this.banks.destroy()
    this.fx.destroy()
    this.view.destroy({ children: true })
  }
}

const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)))
