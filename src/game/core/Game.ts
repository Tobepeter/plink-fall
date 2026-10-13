import { Application } from 'pixi.js'
import { loadAssets } from '../assets/loader'
import { PHYSICS_HZ } from './config'
import { Loop } from './Loop'
import { Viewport } from './Viewport'
import { PlinkoScene } from '../scenes/PlinkoScene'
import { AudioSystem } from '../systems/Audio'
import { Economy } from '../systems/Economy'

/** Composition root: wires renderer, viewport, loop, systems and scene. */
export class Game {
  app = new Application()
  eco = new Economy()
  audio = new AudioSystem()
  scene!: PlinkoScene
  viewport!: Viewport
  private loop!: Loop
  private hiddenAt = 0

  async init(root: HTMLElement, frame: HTMLElement, stage: HTMLElement) {
    this.eco.load()
    this.audio.muted = this.eco.muted
    this.viewport = new Viewport(root, frame)
    const { cssW, cssH } = this.viewport.info
    await this.app.init({
      width: cssW,
      height: cssH,
      antialias: true,
      backgroundColor: 0x05060f,
      resolution: Math.min(window.devicePixelRatio || 1, 2.5),
      autoDensity: true,
      powerPreference: 'high-performance',
    })
    stage.appendChild(this.app.canvas)
    this.app.ticker.stop() // we drive rendering from our own loop

    const tex = await loadAssets()
    this.scene = new PlinkoScene(tex, this.eco, this.audio)
    this.app.stage.addChild(this.scene.view)

    const applyVp = () => {
      const v = this.viewport.info
      this.app.renderer.resize(v.cssW, v.cssH)
      this.app.stage.scale.set(v.scale)
      this.scene.resize(v.designH)
    }
    this.viewport.onChange(applyVp)
    applyVp()

    this.loop = new Loop(
      PHYSICS_HZ,
      (dt) => this.scene.update(dt),
      (fdt, a) => {
        this.scene.render(fdt, a)
        this.app.renderer.render(this.app.stage)
      },
    )
    this.loop.start()

    // audio unlock on first gesture (autoplay policy)
    const unlock = () => this.audio.unlock()
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)

    // pause sim when hidden; credit background time as offline earnings
    document.addEventListener('visibilitychange', () => (document.hidden ? this.pause() : this.resume()))
    window.addEventListener('pagehide', () => this.eco.save())
    setInterval(() => this.eco.save(), 5000)
    // block context menu / gestures
    window.addEventListener('contextmenu', (e) => e.preventDefault())
    document.addEventListener('gesturestart', (e) => e.preventDefault())
    document.addEventListener('dblclick', (e) => e.preventDefault())
  }

  pause() {
    if (!this.loop.running) return
    this.hiddenAt = Date.now()
    this.loop.stop()
    this.audio.suspend()
    this.eco.save()
  }
  resume() {
    if (this.loop.running) return
    if (this.hiddenAt) this.eco.grantOffline((Date.now() - this.hiddenAt) / 1000)
    this.hiddenAt = 0
    this.loop.start()
    if (this.audio) this.audio.unlock()
  }

  buy(id: Parameters<Economy['buy']>[0]) {
    if (this.eco.buy(id)) {
      this.audio.buy()
      if (id === 'mult') this.scene.refreshMults()
      return true
    }
    return false
  }
  toggleMute() {
    this.eco.toggleMute()
    this.audio.muted = this.eco.muted
    this.audio.unlock()
  }
}
