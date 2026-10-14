import { Application } from 'pixi.js'
import type { RushEvent, RushPort } from './types'
import { RushInput } from './input/rush-input'
import { RushScene } from './render/rush-scene'
import { RushPresentation } from './render/rush-presentation'
import { RushSound } from './rush-sound'

// 全屏战斗与单指方向输入
export class RushGame {
  private app = new Application()
  readonly scene: RushScene
  private sound: RushSound
  readonly presentation: RushPresentation
  private canvas: HTMLCanvasElement | null = null
  private shell: HTMLElement | null = null
  private observer: ResizeObserver | null = null
  private unsubscribe: (() => void) | null = null
  private unwatch: (() => void) | null = null
  private input: RushInput | null = null
  private raf = 0
  private last = 0
  private accumulator = 0
  private impactTime = 0
  private lastImpact = 0
  private initialized = false
  private disposed = false
  private inFrame = false
  frames = 0

  constructor(readonly store: RushPort) {
    this.presentation = new RushPresentation(store.state)
    this.scene = new RushScene(() => this.presentation.state)
    this.sound = new RushSound(() => store.state)
  }

  async init(stage: HTMLElement) {
    this.shell = stage.parentElement
    await this.app.init({
      width: Math.max(1, stage.clientWidth),
      height: Math.max(1, stage.clientHeight),
      resolution: Math.min(devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      background: '#0b1223',
      preference: 'webgl',
      powerPreference: 'high-performance',
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
    this.canvas = this.app.canvas
    this.canvas.tabIndex = 0
    this.canvas.setAttribute('role', 'application')
    this.canvas.setAttribute(
      'aria-label',
      '零点突围。默认自动瞄准。WASD移动，空格或右键冲刺，E机体技能；PC可在设置开启鼠标方向瞄准，触屏轻推空地移动',
    )
    stage.appendChild(this.canvas)
    this.app.stage.addChild(this.scene.view)
    this.app.ticker.stop()
    const resize = () => {
      if (this.disposed) return
      const width = Math.max(1, stage.clientWidth),
        height = Math.max(1, stage.clientHeight)
      this.app.renderer.resolution = Math.min(devicePixelRatio || 1, 2)
      this.app.renderer.resize(width, height)
      this.presentation.reset(this.store.state)
      this.scene.resize(width, height)
      const size = this.scene.worldSize()
      this.store.setViewport(size.x, size.y)
    }
    this.observer = new ResizeObserver(resize)
    this.observer.observe(stage)
    resize()
    this.unsubscribe = this.store.onEvent((event) => {
      this.scene.event(event, this.store.state.player)
      this.sound.event(event)
      this.impact(event)
      if (event.type === 'run-end') this.cancelInput()
    })
    this.unwatch = this.store.subscribe(this.wake)
    this.input = new RushInput(this.store, this.canvas, this.scene, () => this.sound.unlock())
    window.addEventListener('click', this.unlock, { passive: true })
    window.addEventListener('pagehide', this.save)
    document.addEventListener('visibilitychange', this.visibility)
    this.last = performance.now()
    if (
      !document.hidden &&
      this.store.state.phase !== 'menu' &&
      document.activeElement === document.body
    )
      this.canvas.focus({ preventScroll: true })
    this.wake()
  }

  // 整备舱不跑战斗 RAF，开局由模型发布唤醒
  private wake = () => {
    if (this.disposed || document.hidden || this.inFrame || this.raf) return
    if (this.store.state.phase === 'menu') {
      this.sound.suspend()
      return
    }
    this.last = performance.now()
    this.accumulator = 0
    this.impactTime = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.disposed || document.hidden) return
    this.raf = 0
    this.inFrame = true
    const dt = Math.min(0.12, Math.max(0, (now - this.last) / 1000))
    this.last = now
    const active = this.store.state.phase === 'playing' && !this.store.state.paused
    if (this.presentation.sync(this.store.state)) this.accumulator = 0
    this.input?.update(active)
    const frozen = Math.min(dt, this.impactTime)
    this.impactTime = active ? Math.max(0, this.impactTime - dt) : 0
    this.accumulator += active ? dt - frozen : 0
    let steps = 0
    while (this.accumulator >= 1 / 60 && steps++ < 8) {
      this.presentation.beforeStep(this.store.state)
      this.store.update(1 / 60)
      this.presentation.afterStep(this.store.state)
      this.accumulator -= 1 / 60
      if (this.impactTime > 0) {
        this.accumulator = 0
        break
      }
    }
    if (steps >= 8) this.accumulator = 0
    const renderDt = active ? (this.impactTime ? 0 : dt - frozen) : dt
    this.presentation.render(
      this.store.state,
      this.accumulator * 60,
      renderDt,
      active && renderDt === 0,
    )
    this.scene.render(renderDt)
    this.sound.update()
    const player = this.scene.worldToScreen(this.presentation.state.player)
    this.shell?.style.setProperty('--rush-player-x', player.x + 'px')
    this.shell?.style.setProperty('--rush-player-y', player.y + 'px')
    this.app.renderer.render(this.app.stage)
    this.frames++
    this.inFrame = false
    if (this.store.state.phase === 'menu') this.sound.suspend()
    else this.raf = requestAnimationFrame(this.tick)
  }

  // 重要命中的短停顿
  private impact(event: RushEvent) {
    const duration =
      event.type === 'hurt'
        ? 0.032
        : event.type === 'counter'
          ? 0.024
          : event.type === 'boss-down'
            ? 0.06
            : 0
    const now = performance.now()
    if (!duration || (event.type !== 'hurt' && now - this.lastImpact < 250)) return
    this.impactTime = Math.max(this.impactTime, duration)
    this.lastImpact = now
  }

  private cancelInput = () => this.input?.cancel()
  private unlock = () => this.sound.unlock()
  private save = () => this.store.save()
  private visibility = () => {
    this.cancelInput()
    cancelAnimationFrame(this.raf)
    this.raf = 0
    if (document.hidden) {
      this.presentation.freeze(this.store.state)
      this.store.save()
      this.sound.suspend()
      return
    }
    this.sound.resume()
    this.last = performance.now()
    this.accumulator = 0
    this.impactTime = 0
    this.wake()
  }

  destroy() {
    if (this.disposed) return
    this.disposed = true
    this.cancelInput()
    cancelAnimationFrame(this.raf)
    this.observer?.disconnect()
    this.unsubscribe?.()
    this.unwatch?.()
    this.input?.destroy()
    this.input = null
    window.removeEventListener('click', this.unlock)
    window.removeEventListener('pagehide', this.save)
    document.removeEventListener('visibilitychange', this.visibility)
    this.store.save()
    this.sound.destroy()
    this.scene.destroy()
    if (this.initialized) this.releaseRenderer()
    this.canvas = null
    this.shell = null
  }
  private releaseRenderer() {
    if (!this.initialized) return
    this.initialized = false
    this.app.destroy({ removeView: true }, { children: true })
  }
}
