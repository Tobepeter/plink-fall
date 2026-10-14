import { Assets, Container, Graphics, Rectangle, Texture } from 'pixi.js'
import type { MineEvent, MineState, Mineral, Vec } from '../types'
import { CableRig } from './cable-rig'
import { MiningTerrain } from './mining-terrain'
import { OreField } from './ore-field'
import type { OreFragments, OreTextures } from './ore-field'
import { palette } from './palette'
import { ProbeRig } from './probe-rig'
import type { ActorTextures } from './probe-rig'
import { SceneCamera } from './scene-camera'
import { SceneEffects } from './scene-effects'

// 全屏矿探针场景
export class MiningScene {
  public view = new Container()
  private world = new Container()
  private background = new Graphics()
  private aim = new Graphics()
  private camera = new SceneCamera()
  private terrain?: MiningTerrain
  private ores?: OreField
  private actors?: ProbeRig
  private cable = new CableRig()
  private effects?: SceneEffects
  private frames: Texture[] = []
  private loading?: Promise<void>
  private ready = false
  private destroyed = false
  private region = -1
  private pending: MineEvent[] = []

  constructor(private getState: () => MineState) {
    this.view.addChild(this.background, this.world)
    this.view.eventMode = 'none'
  }

  public async init(): Promise<void> {
    if (this.destroyed) return
    this.loading ??= this.load()
    await this.loading
  }

  private async load() {
    const [actors, ores, terrain] = await Promise.all([
      Assets.load<Texture>('/mine/actors.png'),
      Assets.load<Texture>('/mine/ores.png'),
      Assets.load<Texture>('/mine/terrain.png'),
    ])
    if (this.destroyed) return
    const actorTextures = {} as ActorTextures
    for (const [index, name] of ['base', 'probe', 'drill', 'drone'].entries()) {
      actorTextures[name as keyof ActorTextures] = this.extract(actors, index, 2, 2)
    }
    const oreTextures = {} as OreTextures
    const fragments = {} as OreFragments
    const minerals: Mineral[] = ['copper', 'jade', 'amber', 'stone', 'volatile', 'relic']
    for (const [index, kind] of minerals.entries()) {
      const texture = this.extract(ores, index, 3, 2)
      oreTextures[kind] = texture
      fragments[kind] = []
      for (const [x, y] of [
        [0.2, 0.28],
        [0.4, 0.5],
        [0.59, 0.3],
      ]) {
        const part = new Texture({
          source: texture.source,
          frame: new Rectangle(
            texture.frame.x + texture.width * x,
            texture.frame.y + texture.height * y,
            texture.width * 0.23,
            texture.height * 0.25,
          ),
        })
        this.frames.push(part)
        fragments[kind].push(part)
      }
    }
    this.terrain = new MiningTerrain(terrain)
    this.ores = new OreField(oreTextures, fragments, this.camera)
    this.actors = new ProbeRig(actorTextures)
    this.effects = new SceneEffects(fragments)
    this.world.addChild(
      this.terrain.view,
      this.cable.view,
      this.ores.view,
      this.aim,
      this.actors.view,
      this.effects.view,
    )
    this.ready = true
    this.resize(this.camera.width, this.camera.height)
    this.render(0)
    for (const event of this.pending) this.event(event)
    this.pending = []
  }

  // 忽略透明柔光的主体裁切
  private extract(atlas: Texture, index: number, columns: number, rows: number) {
    const width = Math.floor(atlas.width / columns)
    const height = Math.floor(atlas.height / rows)
    const x = (index % columns) * width
    const y = Math.floor(index / columns) * height
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let left = width
    let top = height
    let right = 0
    let bottom = 0
    if (ctx) {
      ctx.drawImage(
        atlas.source.resource as CanvasImageSource,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height,
      )
      const pixels = ctx.getImageData(0, 0, width, height).data
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          if (pixels[(py * width + px) * 4 + 3] <= 16) continue
          left = Math.min(left, px)
          right = Math.max(right, px)
          top = Math.min(top, py)
          bottom = Math.max(bottom, py)
        }
      }
    }
    if (left >= right) {
      left = 0
      top = 0
      right = width - 1
      bottom = height - 1
    }
    left = Math.max(0, left - 3)
    top = Math.max(0, top - 3)
    right = Math.min(width - 1, right + 3)
    bottom = Math.min(height - 1, bottom + 3)
    const texture = new Texture({
      source: atlas.source,
      frame: new Rectangle(x + left, y + top, right - left + 1, bottom - top + 1),
    })
    this.frames.push(texture)
    return texture
  }

  public resize(width: number, height: number) {
    this.camera.resize(width, height, this.getState())
    this.terrain?.fit(this.camera.width / this.camera.zoom, this.camera.height / this.camera.zoom)
    this.background.clear().rect(0, 0, this.camera.width, this.camera.height).fill(palette.sand)
    this.transform()
  }

  public render(dt: number) {
    if (!this.ready || this.destroyed) return
    const state = this.getState()
    dt = state.paused ? 0 : Math.min(0.1, Math.max(0, dt))
    if (this.region !== state.region) {
      this.region = state.region
      this.terrain?.setRegion(state.region)
    }
    this.camera.update(state, dt)
    this.transform()
    this.ores?.render(state, dt)
    this.cable.render(state, dt)
    this.actors?.render(state, dt)
    this.effects?.update(dt)
    this.drawAim(state)
  }

  private transform() {
    this.world.scale.set(this.camera.zoom)
    this.world.position.set(this.camera.x, this.camera.y)
  }

  private drawAim(state: MineState) {
    this.aim.clear()
    if (!state.started) {
      const first = state.nodes.find((node) => node.kind === 'copper' && node.revealed)
      if (first)
        this.aim.circle(first.x, first.y, first.radius + 12).stroke({
          color: palette.cream,
          width: 2,
          alpha: 0.55 + Math.sin(state.clock * 3) * 0.15,
        })
      return
    }
    if (!state.aim || state.holding <= 0) return
    const from = state.probe
    const to = state.aim
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    for (let d = 20; d < distance; d += 22) {
      const t = d / distance
      this.aim
        .circle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 1.7)
        .fill({ color: palette.cream, alpha: 0.55 })
    }
    this.aim
      .circle(to.x, to.y, 26)
      .stroke({ color: palette.ink, width: 2, alpha: 0.35 })
      .arc(
        to.x,
        to.y,
        26,
        -Math.PI / 2,
        -Math.PI / 2 + Math.min(1, state.holding / 1.1) * Math.PI * 2,
      )
      .stroke({ color: palette.amber, width: 4 })
  }

  public event(event: MineEvent) {
    if (this.destroyed) return
    if (!this.ready) {
      if (this.pending.length < 20) this.pending.push(event)
      return
    }
    this.effects?.event(event)
    this.actors?.event(event)
    if (event.type === 'hit') {
      this.ores?.hit(event)
      this.camera.impact(event.targets?.length ? 0.1 : 0.035)
    }
    if (event.type === 'break') {
      this.terrain?.scar(event, event.kind)
      this.camera.impact(0.17)
    }
    if (event.type === 'pulse') this.camera.impact(0.2 + (event.power ?? 1) * 0.12)
    if (event.type === 'gas') this.camera.impact(0.4)
    if (event.type === 'travel')
      this.camera.resize(this.camera.width, this.camera.height, this.getState())
  }

  public screenToWorld(x: number, y: number): Vec {
    return this.camera.screenToWorld({ x, y })
  }

  public worldToScreen(point: Vec): Vec {
    return this.camera.worldToScreen(point)
  }

  public debugInfo() {
    const state = this.getState()
    return {
      viewport: { width: this.camera.width, height: this.camera.height },
      camera: { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom },
      base: this.worldToScreen({ x: 0, y: 70 }),
      probe: this.worldToScreen(state.probe),
      nodes: state.nodes.filter((node) => {
        const point = this.worldToScreen(node)
        return (
          node.revealed &&
          point.x > 0 &&
          point.x < this.camera.width &&
          point.y > 70 &&
          point.y < this.camera.height - 70
        )
      }).length,
    }
  }

  public destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.pending = []
    this.effects?.destroy()
    this.actors?.destroy()
    this.ores?.destroy()
    this.terrain?.destroy()
    this.cable.destroy()
    this.view.destroy({ children: true })
    for (const texture of this.frames) texture.destroy(false)
    this.frames = []
  }
}
