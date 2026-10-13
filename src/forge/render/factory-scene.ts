import { Assets, Circle, Container, Graphics, Rectangle, Text, Texture } from 'pixi.js'
import type { ForgeEvent, ForgeState } from '../model/types'
import { FactoryLandscape } from './factory-landscape'
import { drawRoute } from './flow-route'
import { MachineRig } from './machine-rig'
import type { MachineTextures } from './machine-rig'
import { MaterialFlow } from './material-flow'
import { ModuleRig } from './module-rig'
import { designHeight, designWidth, palette, recipeColors, regionColors } from './palette'
import { SceneEffects } from './scene-effects'

// 轻量工厂场景与模型事件反馈
export class FactoryScene {
  public view = new Container()
  private world = new Container()
  private backdrop = new Graphics()
  private route = new Graphics()
  private material = new MaterialFlow()
  private effects = new SceneEffects()
  private modules = new ModuleRig()
  private landscape?: FactoryLandscape
  private machines?: MachineRig
  private meteor = new Container()
  private meteorText: Text
  private meteorGlow = new Graphics()
  private resonance = new Graphics()
  private furnaceTap = new Container()
  private frames: Texture[] = []
  private loading?: Promise<void>
  private ready = false
  private destroyed = false
  private width = designWidth
  private height = designHeight
  private scale = 1
  private offsetX = 0
  private offsetY = 0
  private time = 0
  private runningTime = 0
  private routeSignature = ''
  private region = -1
  private shake = 0
  private boostDust = 0
  private produced = 0
  private produceCooldown = 0
  private produceIndex = 0

  constructor(
    private getState: () => ForgeState,
    private onAction: (action: 'meteor' | 'resonate') => void,
  ) {
    this.meteorText = new Text({
      text: '点我拾取',
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
        fill: palette.navy,
      },
    })
    this.meteorText.anchor.set(0.5)
    this.meteorText.y = 31
    this.view.addChild(this.backdrop, this.world)
    this.setupMeteor()
    this.furnaceTap.hitArea = new Rectangle(204, 148, 116, 130)
    this.furnaceTap.eventMode = 'static'
    this.furnaceTap.on('pointertap', () => {
      const state = this.getState()
      if (state.started && !state.paused && state.charge >= 1) this.onAction('resonate')
    })
  }

  public async init(): Promise<void> {
    if (this.destroyed) return
    this.loading ??= this.load()
    await this.loading
  }

  private async load() {
    const [atlas, moon] = await Promise.all([
      Assets.load<Texture>('/forge/machines.png'),
      Assets.load<Texture>('/forge/moon.png'),
    ])
    if (this.destroyed) return
    const cell = atlas.width / 2
    // Alpha 微噪点不参与裁切，按当前图集主体范围留 8px
    const boxes = [
      [33, 63, 526, 560],
      [27, 73, 574, 526],
      [89, 32, 489, 529],
      [27, 158, 566, 391],
    ]
    const names = ['hopper', 'furnace', 'condenser', 'rover'] as const
    const textures = {} as MachineTextures
    for (let i = 0; i < names.length; i++) {
      const [x, y, width, height] = boxes[i].map((value) => (value * cell) / 627)
      const texture = new Texture({
        source: atlas.source,
        frame: new Rectangle((i % 2) * cell + x, Math.floor(i / 2) * cell + y, width, height),
      })
      textures[names[i]] = texture
      this.frames.push(texture)
    }
    this.landscape = new FactoryLandscape(moon)
    this.machines = new MachineRig(textures)
    this.resonance.circle(261, 211, 63).stroke({ color: palette.gold, width: 2, alpha: 0.7 })
    this.world.addChild(
      this.landscape.view,
      this.route,
      this.resonance,
      this.machines.view,
      this.material.view,
      this.modules.view,
      this.furnaceTap,
      this.effects.view,
      this.meteor,
    )
    this.ready = true
    this.resize(this.width, this.height)
    this.render(0)
  }

  private setupMeteor() {
    this.meteorGlow
      .circle(0, 0, 26)
      .fill({ color: palette.gold, alpha: 0.14 })
      .circle(0, 0, 21)
      .stroke({ color: palette.gold, width: 1.5, alpha: 0.65 })
    const tail = new Graphics()
      .poly([-7, 8, -28, 25, -22, 6, -9, -7])
      .fill({ color: palette.gold, alpha: 0.6 })
    const core = new Graphics()
      .poly([0, -14, 10, -8, 14, 3, 6, 12, -7, 11, -13, -1, -9, -10])
      .fill(palette.gold)
      .stroke({ color: palette.navy, width: 2 })
      .circle(4, -3, 3)
      .fill(palette.cream)
      .circle(-5, 4, 2)
      .fill(palette.coral)
    this.meteor.addChild(this.meteorGlow, tail, core, this.meteorText)
    this.meteor.hitArea = new Circle(0, 0, 35)
    this.meteor.eventMode = 'static'
    this.meteor.cursor = 'pointer'
    this.meteor.visible = false
    this.meteor.on('pointertap', () => {
      const state = this.getState()
      if (state.meteor && !state.paused) this.onAction('meteor')
    })
  }

  public resize(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.scale = Math.min(this.width / designWidth, this.height / designHeight)
    this.offsetX = (this.width - designWidth * this.scale) / 2
    this.offsetY = (this.height - designHeight * this.scale) / 2
    this.world.scale.set(this.scale)
    this.machines?.resize(this.scale)
    this.world.position.set(this.offsetX, this.offsetY)
    this.drawBackdrop()
  }

  private drawBackdrop() {
    const color = regionColors[((this.getState().region % 3) + 3) % 3].sky
    this.backdrop.clear().rect(0, 0, this.width, this.height).fill(color)
  }

  public render(dt: number) {
    if (!this.ready || this.destroyed) return
    dt = Math.max(0, Math.min(0.1, dt))
    const state = this.getState()
    const running = state.started && !state.paused
    this.time += dt
    if (running) this.runningTime += dt
    if (state.region !== this.region) {
      this.region = state.region
      this.landscape?.setRegion(state.region)
      this.drawBackdrop()
    }
    const signature = `${state.region}:${state.modules.splitter ?? 0}`
    if (signature !== this.routeSignature) {
      this.routeSignature = signature
      drawRoute(this.route, state.modules.splitter ?? 0, regionColors[state.region % 3].accent)
    }
    this.material.render(state, this.runningTime)
    this.machines?.render(state, this.runningTime, running ? dt : 0)
    this.modules.sync(state)
    this.modules.render(state, this.runningTime, dt)
    this.landscape?.render(this.time, running)
    this.produceCooldown -= dt
    if (this.produced > 0 && this.produceCooldown <= 0) {
      this.effects.float(
        286 + (this.produceIndex++ % 3) * 12,
        407,
        `+${Number(this.produced.toFixed(1))}`,
      )
      this.produced = 0
      this.produceCooldown = 0.45
    }
    this.effects.update(dt)
    const boosted = state.burstRemaining > 0
    this.resonance.visible = boosted || state.charge >= 1
    this.resonance.alpha = boosted
      ? 0.35 + Math.sin(this.time * 12) * 0.25
      : 0.25 + Math.sin(this.time * 3) * 0.15
    this.furnaceTap.cursor = state.charge >= 1 ? 'pointer' : 'default'
    this.meteor.visible = Boolean(state.meteor)
    this.meteor.eventMode = state.meteor && !state.paused ? 'static' : 'none'
    if (state.meteor) {
      this.meteor.position.set(
        48 + Math.sin(this.time * 0.8) * 6,
        198 + Math.sin(this.time * 1.8) * 5,
      )
      this.meteorGlow.scale.set(1 + Math.sin(this.time * 3) * 0.08)
      this.meteorText.text = `拾取 +${state.meteor.reward}`
    }
    this.boostDust -= dt
    if (boosted && running && this.boostDust <= 0) {
      this.boostDust = 0.16
      this.effects.burst(261 + (Math.random() - 0.5) * 50, 150, palette.gold, 1)
    }
    this.shake = Math.max(0, this.shake - dt * 3)
    const amount = this.shake * this.scale
    this.world.position.set(
      this.offsetX + Math.sin(this.time * 39) * amount,
      this.offsetY + Math.sin(this.time * 46) * amount * 0.5,
    )
  }

  public event(evt: ForgeEvent) {
    if (!this.ready || this.destroyed) return
    switch (evt.type) {
      case 'produce':
        this.effects.burst(307, 447, recipeColors[evt.kind ?? 'mint'], 7)
        this.produced += evt.amount ?? 1
        break
      case 'boost':
        this.effects.burst(261, 211, palette.gold, 22)
        this.effects.float(261, 161, '共振启动')
        this.shake = 1.4
        break
      case 'install': {
        const point = this.modules.position(evt.module ?? 'turbo')
        this.effects.burst(point.x, point.y, palette.teal, 18)
        this.effects.float(point.x, point.y - 18, '装配完成')
        break
      }
      case 'delivery':
        this.effects.burst(274, 439, palette.gold, 28)
        this.effects.float(258, 405, '订单完成')
        this.shake = 1.1
        break
      case 'jump':
        this.effects.burst(145, 76, palette.gold, 30)
        this.effects.float(195, 24, '发现新矿脉')
        break
      case 'meteor':
        if (evt.amount === undefined) break
        this.effects.burst(this.meteor.x, this.meteor.y, palette.gold, 18)
        this.effects.float(this.meteor.x + 7, this.meteor.y - 17, `+${evt.amount ?? 0}`)
        break
      case 'research':
        this.effects.burst(147, 76, palette.teal, 16)
        this.effects.float(147, 29, '研究完成')
    }
  }

  public destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.meteor.removeAllListeners()
    this.furnaceTap.removeAllListeners()
    this.material.destroy()
    this.effects.destroy()
    this.modules.destroy()
    this.machines?.destroy()
    this.landscape?.destroy()
    this.view.destroy({ children: true })
    for (const texture of this.frames) texture.destroy(false)
    this.frames = []
  }
}
