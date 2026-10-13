import { Application } from 'pixi.js'
import type { ForgeStore } from './model/forge-store'
import { FactoryScene } from './render/factory-scene'
import { ForgeSound } from './forge-sound'

// 工厂生命周期与固定步长
export class ForgeGame {
  private app = new Application()
  private scene: FactoryScene
  private sound: ForgeSound
  private observer: ResizeObserver | null = null
  private unsubscribe: (() => void) | null = null
  private raf = 0
  private last = 0
  private accumulator = 0
  private hiddenAt = 0
  private saveTimer = 0
  private disposed = false
  private initialized = false
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  frames = 0

  constructor(readonly store: ForgeStore) {
    this.scene = new FactoryScene(
      () => store.state,
      (action) => {
        if (action === 'meteor') store.collectMeteor()
        else store.resonate()
      },
    )
    this.sound = new ForgeSound(() => store.state)
  }

  async init(stage: HTMLElement) {
    await this.app.init({
      width: Math.max(1, stage.clientWidth),
      height: Math.max(1, stage.clientHeight),
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      preference: 'webgl',
      powerPreference: 'low-power',
      autoStart: false,
    })
    this.initialized = true
    if (this.disposed) {
      this.releaseRenderer()
      return
    }
    await this.scene.init()
    if (this.disposed) {
      this.releaseRenderer()
      return
    }
    stage.appendChild(this.app.canvas)
    this.app.canvas.setAttribute('aria-label', '自动加工产线：矿石经过熔炼和冷凝变成晶体')
    this.app.canvas.setAttribute('role', 'img')
    this.app.stage.addChild(this.scene.view)
    this.app.ticker.stop()
    this.unsubscribe = this.store.onEvent((event) => {
      this.scene.event(event)
      this.sound.event(event)
    })
    const resize = () => {
      if (this.disposed) return
      const width = Math.max(1, stage.clientWidth)
      const height = Math.max(1, stage.clientHeight)
      this.app.renderer.resolution = Math.min(window.devicePixelRatio || 1, 2)
      this.app.renderer.resize(width, height)
      this.scene.resize(width, height)
    }
    this.observer = new ResizeObserver(resize)
    this.observer.observe(stage)
    resize()
    window.addEventListener('pointerdown', this.unlock, { passive: true })
    window.addEventListener('click', this.unlock, { passive: true })
    document.addEventListener('visibilitychange', this.visibility)
    window.addEventListener('pagehide', this.save)
    this.saveTimer = window.setInterval(this.save, 5000)
    this.last = performance.now()
    if (document.hidden) this.hiddenAt = Date.now()
    else this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.disposed || document.hidden) return
    const dt = Math.min(0.12, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.accumulator += dt
    const fixed = 1 / 30
    let steps = 0
    while (this.accumulator >= fixed && steps++ < 5) {
      this.store.update(fixed)
      this.accumulator -= fixed
    }
    if (steps >= 5) this.accumulator = 0
    this.scene.render(this.store.state.paused ? 0 : this.reducedMotion ? dt * 0.4 : dt)
    this.app.renderer.render(this.app.stage)
    this.frames++
    this.raf = requestAnimationFrame(this.tick)
  }

  private unlock = () => this.sound.unlock()
  private save = () => {
    if (!document.hidden) this.store.save()
  }

  private visibility = () => {
    if (document.hidden) {
      this.hiddenAt = Date.now()
      cancelAnimationFrame(this.raf)
      this.store.save()
      this.sound.suspend()
      return
    }
    if (this.hiddenAt) this.store.grantOffline((Date.now() - this.hiddenAt) / 1000)
    this.hiddenAt = 0
    this.sound.resume()
    this.last = performance.now()
    this.accumulator = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  destroy() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    clearInterval(this.saveTimer)
    this.observer?.disconnect()
    this.unsubscribe?.()
    window.removeEventListener('pointerdown', this.unlock)
    window.removeEventListener('click', this.unlock)
    document.removeEventListener('visibilitychange', this.visibility)
    window.removeEventListener('pagehide', this.save)
    if (!document.hidden) this.store.save()
    this.sound.destroy()
    this.scene.destroy()
    if (this.initialized) this.releaseRenderer()
  }

  private releaseRenderer() {
    if (!this.initialized) return
    this.initialized = false
    this.app.destroy({ removeView: true }, { children: true })
  }
}
