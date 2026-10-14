import { Application } from 'pixi.js'
import type { MinePort, Vec } from './types'
import { MiningScene } from './render/mining-scene'
import { MineSound } from './mine-sound'

// 全屏运行时与真实输入
export class MineGame {
  private app = new Application()
  readonly scene: MiningScene
  private sound: MineSound
  private observer: ResizeObserver | null = null
  private unsubscribe: (() => void) | null = null
  private canvas: HTMLCanvasElement | null = null
  private anchorElement: HTMLElement | null = null
  private press: { id: number; point: Vec; start: number } | null = null
  private keyboardPress: { point: Vec; start: number } | null = null
  private aim: Vec = { x: 0, y: 300 }
  private raf = 0
  private last = 0
  private accumulator = 0
  private hiddenAt = 0
  private timer = 0
  private disposed = false
  private initialized = false
  frames = 0

  constructor(readonly store: MinePort) {
    this.scene = new MiningScene(() => store.state)
    this.sound = new MineSound(() => store.state)
  }

  async init(stage: HTMLElement) {
    this.anchorElement = stage.parentElement ?? stage
    await this.app.init({
      width: Math.max(1, stage.clientWidth),
      height: Math.max(1, stage.clientHeight),
      resolution: Math.min(devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      background: '#887b50',
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
    this.canvas = this.app.canvas
    this.canvas.tabIndex = 0
    this.canvas.setAttribute('role', 'application')
    this.canvas.setAttribute(
      'aria-label',
      '矿脉回声。点矿脉出钻，再点收缆；按住再松开释放共鸣。方向键瞄准，空格出钻或收缆，R直接收缆',
    )
    stage.appendChild(this.canvas)
    this.app.stage.addChild(this.scene.view)
    this.app.ticker.stop()
    const resize = () => {
      if (this.disposed) return
      const width = Math.max(1, stage.clientWidth)
      const height = Math.max(1, stage.clientHeight)
      this.app.renderer.resolution = Math.min(devicePixelRatio || 1, 2)
      this.app.renderer.resize(width, height)
      this.scene.resize(width, height)
    }
    this.observer = new ResizeObserver(resize)
    this.observer.observe(stage)
    resize()
    this.unsubscribe = this.store.onEvent((event) => {
      this.scene.event(event)
      this.sound.event(event)
    })
    this.canvas.addEventListener('pointerdown', this.pointerDown)
    this.canvas.addEventListener('pointermove', this.pointerMove)
    this.canvas.addEventListener('pointerup', this.pointerUp)
    this.canvas.addEventListener('pointercancel', this.cancelPress)
    this.canvas.addEventListener('blur', this.cancelPress)
    this.canvas.addEventListener('contextmenu', this.contextMenu)
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.cancelPress)
    window.addEventListener('click', this.unlock, { passive: true })
    document.addEventListener('visibilitychange', this.visibility)
    window.addEventListener('pagehide', this.save)
    this.timer = window.setInterval(this.save, 5000)
    this.last = performance.now()
    if (document.hidden) this.hiddenAt = Date.now()
    else this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.disposed || document.hidden) return
    const dt = Math.min(0.12, Math.max(0, (now - this.last) / 1000))
    this.last = now
    if (this.store.state.paused || this.store.state.choices.length) this.cancelPress()
    const held = this.press ?? this.keyboardPress
    if (held) this.store.hold(held.point, Math.min(1.8, (now - held.start) / 1000))
    this.accumulator += dt
    const fixed = 1 / 60
    let steps = 0
    while (this.accumulator >= fixed && steps++ < 8) {
      this.store.update(fixed)
      this.accumulator -= fixed
    }
    if (steps >= 8) this.accumulator = 0
    this.scene.render(this.store.state.paused ? 0 : dt)
    const base = this.scene.worldToScreen({ x: 0, y: 70 })
    this.anchorElement?.style.setProperty('--mine-base-x', `${base.x}px`)
    this.anchorElement?.style.setProperty('--mine-base-y', `${base.y}px`)
    this.app.renderer.render(this.app.stage)
    this.frames++
    this.raf = requestAnimationFrame(this.tick)
  }

  private point(event: PointerEvent) {
    const rect = this.canvas!.getBoundingClientRect()
    return this.scene.screenToWorld(event.clientX - rect.left, event.clientY - rect.top)
  }

  private pointerDown = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      this.press ||
      this.store.state.paused ||
      this.store.state.choices.length
    )
      return
    event.preventDefault()
    this.sound.unlock()
    this.canvas?.focus({ preventScroll: true })
    this.aim = this.point(event)
    this.press = { id: event.pointerId, point: this.aim, start: performance.now() }
    this.canvas?.setPointerCapture(event.pointerId)
    this.store.hold(this.aim, 0)
  }

  private pointerMove = (event: PointerEvent) => {
    if (this.store.state.paused || this.store.state.choices.length) return
    this.aim = this.point(event)
    if (this.press?.id === event.pointerId) this.press.point = this.aim
  }

  private pointerUp = (event: PointerEvent) => {
    if (this.press?.id !== event.pointerId) return
    const { point, start } = this.press
    this.press = null
    if (this.canvas?.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId)
    this.store.release(point, Math.min(1.8, (performance.now() - start) / 1000))
  }

  private keyDown = (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      if (event.repeat) return
      event.preventDefault()
      this.cancelPress()
      this.store.setPaused(!this.store.state.paused)
      return
    }
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('button, input, [role="dialog"]')
    )
      return
    if (this.store.state.paused || this.store.state.choices.length || event.repeat) return
    if (event.code === 'KeyR') {
      this.sound.unlock()
      this.store.recall()
      event.preventDefault()
      return
    }
    if (event.code === 'Space') {
      event.preventDefault()
      this.sound.unlock()
      this.keyboardPress = { point: { ...this.aim }, start: performance.now() }
      this.store.hold(this.aim, 0)
    }
    const step = 75
    if (event.code === 'ArrowLeft') this.aim.x -= step
    else if (event.code === 'ArrowRight') this.aim.x += step
    else if (event.code === 'ArrowUp') this.aim.y -= step
    else if (event.code === 'ArrowDown') this.aim.y += step
    else return
    event.preventDefault()
    this.aim = {
      x: Math.max(-600, Math.min(600, this.aim.x)),
      y: Math.max(190, Math.min(920, this.aim.y)),
    }
    this.store.hold(this.aim, 0)
  }

  private keyUp = (event: KeyboardEvent) => {
    if (event.code !== 'Space' || !this.keyboardPress) return
    event.preventDefault()
    const { point, start } = this.keyboardPress
    this.keyboardPress = null
    this.store.release(point, Math.min(1.8, (performance.now() - start) / 1000))
  }

  private cancelPress = () => {
    if (!this.press && !this.keyboardPress) return
    if (this.press && this.canvas?.hasPointerCapture(this.press.id))
      this.canvas.releasePointerCapture(this.press.id)
    this.press = null
    this.keyboardPress = null
    this.store.hold(this.aim, 0)
  }

  private contextMenu = (event: Event) => event.preventDefault()
  private unlock = () => this.sound.unlock()
  private save = () => {
    if (!document.hidden) this.store.save()
  }
  private visibility = () => {
    this.cancelPress()
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
    this.cancelPress()
    cancelAnimationFrame(this.raf)
    clearInterval(this.timer)
    this.observer?.disconnect()
    this.unsubscribe?.()
    this.canvas?.removeEventListener('pointerdown', this.pointerDown)
    this.canvas?.removeEventListener('pointermove', this.pointerMove)
    this.canvas?.removeEventListener('pointerup', this.pointerUp)
    this.canvas?.removeEventListener('pointercancel', this.cancelPress)
    this.canvas?.removeEventListener('blur', this.cancelPress)
    this.canvas?.removeEventListener('contextmenu', this.contextMenu)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('blur', this.cancelPress)
    window.removeEventListener('click', this.unlock)
    document.removeEventListener('visibilitychange', this.visibility)
    window.removeEventListener('pagehide', this.save)
    if (!document.hidden) this.store.save()
    this.sound.destroy()
    this.scene.destroy()
    if (this.initialized) this.releaseRenderer()
    this.canvas = null
    this.anchorElement = null
  }

  private releaseRenderer() {
    if (!this.initialized) return
    this.initialized = false
    this.app.destroy({ removeView: true }, { children: true })
  }
}
