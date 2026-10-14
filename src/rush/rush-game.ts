import { Application } from 'pixi.js'
import type { RushEvent, RushPort, Vec } from './types'
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
  private keys = new Set<string>()
  private stick: { id: number; origin: Vec; current: Vec } | null = null
  private raf = 0
  private last = 0
  private accumulator = 0
  private impactTime = 0
  private lastImpact = 0
  private initialized = false
  private disposed = false
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
      '零点突围。WASD或方向键移动，空格冲刺；手机按住空地拖动方向，自动开火',
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
      if (event.type === 'level' || event.type === 'run-end') this.cancelInput()
    })
    this.canvas.addEventListener('pointerdown', this.pointerDown)
    this.canvas.addEventListener('pointermove', this.pointerMove)
    this.canvas.addEventListener('pointerup', this.pointerUp)
    this.canvas.addEventListener('pointercancel', this.pointerUp)
    this.canvas.addEventListener('contextmenu', this.contextMenu)
    this.canvas.addEventListener('blur', this.cancelKeys)
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.cancelInput)
    window.addEventListener('click', this.unlock, { passive: true })
    window.addEventListener('pagehide', this.save)
    document.addEventListener('visibilitychange', this.visibility)
    this.last = performance.now()
    if (!document.hidden && document.activeElement === document.body)
      this.canvas.focus({ preventScroll: true })
    if (!document.hidden) this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.disposed || document.hidden) return
    const dt = Math.min(0.12, Math.max(0, (now - this.last) / 1000))
    this.last = now
    const active = this.store.state.phase === 'playing' && !this.store.state.paused
    if (this.presentation.sync(this.store.state)) this.accumulator = 0
    if (!active) this.cancelInput()
    else this.store.setMove(this.direction())
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
    this.scene.setStick(this.stick)
    this.scene.render(renderDt)
    this.sound.update()
    const player = this.scene.worldToScreen(this.presentation.state.player)
    this.shell?.style.setProperty('--rush-player-x', player.x + 'px')
    this.shell?.style.setProperty('--rush-player-y', player.y + 'px')
    this.app.renderer.render(this.app.stage)
    this.frames++
    this.raf = requestAnimationFrame(this.tick)
  }

  private direction() {
    let x =
      Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
      Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'))
    let y =
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) -
      Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'))
    if (!x && !y && this.stick) {
      x = (this.stick.current.x - this.stick.origin.x) / 52
      y = (this.stick.current.y - this.stick.origin.y) / 52
      if (Math.hypot(x, y) < 0.08) return { x: 0, y: 0 }
    }
    const length = Math.max(1, Math.hypot(x, y))
    return { x: x / length, y: y / length }
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

  private point(event: PointerEvent) {
    const rect = this.canvas!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  private pointerDown = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      this.stick ||
      this.store.state.paused ||
      this.store.state.phase !== 'playing'
    )
      return
    event.preventDefault()
    this.sound.unlock()
    this.canvas?.focus({ preventScroll: true })
    const point = this.point(event)
    this.stick = { id: event.pointerId, origin: point, current: point }
    this.canvas?.setPointerCapture(event.pointerId)
  }
  private pointerMove = (event: PointerEvent) => {
    if (this.stick?.id === event.pointerId) this.stick.current = this.point(event)
  }
  private pointerUp = (event: PointerEvent) => {
    if (this.stick?.id !== event.pointerId) return
    if (this.canvas?.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId)
    this.stick = null
    this.store.setMove(this.direction())
  }
  private keyDown = (event: KeyboardEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.isContentEditable || target?.closest('input, textarea, [role="textbox"]')) return
    if (event.repeat && (event.code === 'Escape' || event.code === 'Space')) return
    if (event.code === 'Escape') {
      event.preventDefault()
      this.cancelInput()
      this.store.setPaused(!this.store.state.paused)
      if (!this.store.state.paused) this.canvas?.focus({ preventScroll: true })
      return
    }
    if (target?.closest('button, [role="dialog"]')) return
    if (this.store.state.paused || this.store.state.phase !== 'playing') return
    if (event.code === 'Space') {
      event.preventDefault()
      this.sound.unlock()
      this.store.setMove(this.direction())
      this.store.dash()
    } else if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code)) {
      event.preventDefault()
      if (this.keys.has(event.code)) return
      this.sound.unlock()
      this.keys.add(event.code)
    }
  }
  private keyUp = (event: KeyboardEvent) => {
    if (this.keys.delete(event.code)) event.preventDefault()
  }
  private cancelKeys = () => this.keys.clear()
  private cancelInput = () => {
    this.keys.clear()
    if (this.stick && this.canvas?.hasPointerCapture(this.stick.id))
      this.canvas.releasePointerCapture(this.stick.id)
    this.stick = null
    this.store.setMove({ x: 0, y: 0 })
    this.scene.setStick(null)
  }
  private unlock = () => this.sound.unlock()
  private contextMenu = (event: Event) => event.preventDefault()
  private save = () => this.store.save()
  private visibility = () => {
    this.cancelInput()
    cancelAnimationFrame(this.raf)
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
    this.raf = requestAnimationFrame(this.tick)
  }

  destroy() {
    if (this.disposed) return
    this.disposed = true
    this.cancelInput()
    cancelAnimationFrame(this.raf)
    this.observer?.disconnect()
    this.unsubscribe?.()
    this.canvas?.removeEventListener('pointerdown', this.pointerDown)
    this.canvas?.removeEventListener('pointermove', this.pointerMove)
    this.canvas?.removeEventListener('pointerup', this.pointerUp)
    this.canvas?.removeEventListener('pointercancel', this.pointerUp)
    this.canvas?.removeEventListener('contextmenu', this.contextMenu)
    this.canvas?.removeEventListener('blur', this.cancelKeys)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('blur', this.cancelInput)
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
