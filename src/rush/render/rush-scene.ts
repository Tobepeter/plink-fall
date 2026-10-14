import { Assets, Container, Graphics, Rectangle, Texture } from 'pixi.js'
import type { RushEvent, RushState, Vec } from '../types'
import { palette } from './palette'
import { RushActors } from './rush-actors'
import { RushCamera } from './rush-camera'
import { RushEffects } from './rush-effects'
import { RushFloor } from './rush-floor'
import { RushProjectiles } from './rush-projectiles'
import { RushMotion } from './rush-motion'
import { RushReticle } from './rush-reticle'

// 全屏弹幕追击场景
export class RushScene {
  view = new Container()
  private world = new Container()
  private camera = new RushCamera()
  private floor = new RushFloor()
  private projectiles = new RushProjectiles()
  private effects = new RushEffects(() => this.getState().player)
  private motion = new RushMotion(() => this.getState().player)
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private overlay = new Graphics()
  private stick = new Graphics()
  private reticle = new RushReticle()
  private actors?: RushActors
  private frames: Texture[] = []
  private loading?: Promise<void>
  private ready = false
  private destroyed = false
  private runId = -1
  private phase: RushState['phase'] | null = null
  private hurt = 0
  private pending: RushEvent[] = []

  constructor(private getState: () => RushState) {
    this.view.eventMode = 'none'
    this.view.addChild(this.world, this.overlay, this.stick, this.reticle.view)
  }

  async init() {
    if (this.destroyed) return
    this.loading ??= this.load()
    await this.loading
  }

  private async load() {
    const [atlas, modules] = await Promise.all([
      Assets.load<Texture>('/rush/actors-v3.webp'),
      Assets.load<Texture>('/rush/modules-v2.webp'),
    ])
    if (this.destroyed) return
    for (let i = 0; i < 9; i++) this.frames.push(this.extract(atlas, i))
    const weapon = this.extract(modules, 0, 3, 4)
    this.frames.push(weapon)
    this.actors = new RushActors(this.frames, weapon)
    this.world.addChild(
      this.floor.view,
      this.projectiles.fields,
      this.motion.view,
      this.projectiles.loot,
      this.actors.view,
      this.projectiles.satellites,
      this.projectiles.shots,
      this.effects.view,
    )
    this.ready = true
    this.resize(this.camera.width, this.camera.height)
    this.render(0)
    for (const event of this.pending) this.event(event)
    this.pending = []
  }

  // 裁掉透明外边，只派生 frame 不修改纹理源
  private extract(atlas: Texture, index: number, cols = 3, rows = 3) {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = Math.floor((col * atlas.width) / cols)
    const y = Math.floor((row * atlas.height) / rows)
    const width = Math.floor(((col + 1) * atlas.width) / cols) - x
    const height = Math.floor(((row + 1) * atlas.height) / rows) - y
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
          if (pixels[(py * width + px) * 4 + 3] < 128) continue
          left = Math.min(left, px)
          right = Math.max(right, px)
          top = Math.min(top, py)
          bottom = Math.max(bottom, py)
        }
      }
    }
    if (left >= right || top >= bottom)
      return new Texture({ source: atlas.source, frame: new Rectangle(x, y, width, height) })
    left = Math.max(0, left - 2)
    top = Math.max(0, top - 2)
    right = Math.min(width - 1, right + 2)
    bottom = Math.min(height - 1, bottom + 2)
    return new Texture({
      source: atlas.source,
      frame: new Rectangle(x + left, y + top, right - left + 1, bottom - top + 1),
    })
  }

  resize(width: number, height: number) {
    this.camera.resize(width, height, this.getState())
    this.transform()
    if (this.ready) this.floor.render()
  }

  render(dt: number) {
    if (!this.ready || this.destroyed) return
    const state = this.getState()
    if (state.runId !== this.runId || (state.phase === 'menu' && this.phase !== 'menu')) {
      this.runId = state.runId
      this.actors?.reset()
      this.effects.reset()
      this.motion.reset()
      if (state.phase === 'playing') this.motion.launch()
      this.camera.reset(state)
      this.hurt = 0
    }
    this.phase = state.phase
    this.view.visible = state.phase !== 'menu'
    if (state.phase === 'menu') return
    const active = state.phase === 'playing' && !state.paused
    const realDt = Math.min(0.1, Math.max(0, dt))
    const effectsDt = state.paused ? 0 : realDt
    dt = active ? realDt : 0
    this.camera.update(state, effectsDt)
    this.transform()
    this.floor.render()
    this.projectiles.render(state)
    this.actors?.render(state, dt)
    this.effects.render(effectsDt)
    this.motion.render(effectsDt, this.reducedMotion.matches)
    this.reticle.render(state, this.camera)
    this.hurt = Math.max(0, this.hurt - effectsDt)
    this.drawOverlay(state)
  }

  private transform() {
    this.world.scale.set(this.camera.zoom)
    this.world.position.set(this.camera.x, this.camera.y)
  }

  private drawOverlay(state: RushState) {
    const g = this.overlay.clear()
    const w = this.camera.width
    const h = this.camera.height
    const low = state.player.hp <= state.player.maxHp * 0.3
    const alpha = this.hurt * 0.55 + (low ? 0.07 + Math.sin(state.clock * 6) * 0.035 : 0)
    if (alpha <= 0) return
    g.rect(0, 0, w, 7)
      .rect(0, h - 7, w, 7)
      .rect(0, 7, 7, h - 14)
      .rect(w - 7, 7, 7, h - 14)
      .fill({ color: palette.red, alpha: Math.min(0.4, alpha) })
  }

  event(event: RushEvent, actualPlayer?: Vec) {
    if (this.destroyed) return
    if (!this.ready) {
      if (this.pending.length < 30) this.pending.push(event)
      return
    }
    this.effects.event(event)
    this.motion.event(event)
    this.actors?.event(event, actualPlayer)
    if (event.type === 'hurt') {
      this.camera.impact(0.6)
      this.hurt = 0.3
    }
    if (event.type === 'boss-down') this.camera.impact(0.75)
    if (event.type === 'counter') this.camera.impact(0.35)
  }

  screenToWorld(x: number, y: number): Vec {
    return this.camera.screenToWorld({ x, y })
  }

  worldToScreen(point: Vec): Vec {
    return this.camera.worldToScreen(point)
  }

  worldSize(): Vec {
    return this.camera.worldSize()
  }

  motionSnapshot() {
    return this.motion.snapshot()
  }

  gaitSnapshot() {
    return this.actors?.gaitSnapshot() ?? null
  }

  setStick(input: { origin: Vec; current: Vec } | null) {
    const g = this.stick.clear()
    if (!input || this.destroyed) return
    const { origin, current } = input
    const dx = current.x - origin.x
    const dy = current.y - origin.y
    const distance = Math.hypot(dx, dy)
    const limit = Math.min(42, distance) / (distance || 1)
    const x = origin.x + dx * limit
    const y = origin.y + dy * limit
    g.circle(origin.x, origin.y, 48)
      .fill({ color: palette.ink, alpha: 0.22 })
      .stroke({ color: palette.cream, width: 1.5, alpha: 0.22 })
    g.moveTo(origin.x, origin.y).lineTo(x, y).stroke({ color: palette.teal, width: 3, alpha: 0.4 })
    g.circle(x, y, 18)
      .fill({ color: palette.teal, alpha: 0.14 })
      .stroke({ color: palette.teal, width: 2, alpha: 0.6 })
  }

  setAim(point: Vec | null) {
    this.reticle.set(point)
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.pending = []
    this.actors?.destroy()
    this.floor.destroy()
    this.projectiles.destroy()
    this.effects.destroy()
    this.motion.destroy()
    this.overlay.destroy()
    this.stick.destroy()
    this.reticle.destroy()
    this.view.destroy({ children: true })
    for (const texture of this.frames) texture.destroy(false)
    this.frames = []
  }
}
