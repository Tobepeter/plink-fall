import type { RushPort, Vec } from '../types'
import type { RushScene } from '../render/rush-scene'

// 键鼠瞄准与独立触屏摇杆
export class RushInput {
  private keys = new Set<string>()
  private stick: { id: number; origin: Vec; current: Vec } | null = null
  private mouse: Vec | null = null
  private pointerType = matchMedia('(pointer: fine)').matches ? 'mouse' : 'touch'

  constructor(
    private store: RushPort,
    private canvas: HTMLCanvasElement,
    private scene: RushScene,
    private unlock: () => void,
  ) {
    canvas.addEventListener('pointerdown', this.pointerDown)
    canvas.addEventListener('pointerup', this.pointerUp)
    canvas.addEventListener('pointercancel', this.pointerUp)
    canvas.addEventListener('contextmenu', this.contextMenu)
    canvas.addEventListener('blur', this.cancelKeys)
    window.addEventListener('pointermove', this.pointerMove, { passive: true })
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.cancel)
  }

  update(active: boolean) {
    if (!active) this.cancel()
    else this.store.setMove(this.direction())
    const manual = this.pointerType === 'mouse' && this.store.state.record.mouseAim
    const point = manual && this.mouse ? this.scene.screenToWorld(this.mouse.x, this.mouse.y) : null
    this.store.setAim(point, manual ? 'mouse' : 'auto')
    this.scene.setAim(active && manual ? this.mouse : null)
    this.scene.setStick(active ? this.stick : null)
  }

  private direction(): Vec {
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

  private point(event: PointerEvent): Vec {
    const rect = this.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  private pointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      this.pointerType = 'mouse'
      const point = this.point(event)
      const rect = this.canvas.getBoundingClientRect()
      this.mouse =
        point.x >= 0 && point.y >= 0 && point.x <= rect.width && point.y <= rect.height
          ? point
          : null
    } else if (this.stick?.id === event.pointerId) this.stick.current = this.point(event)
  }

  private pointerDown = (event: PointerEvent) => {
    if (this.store.state.paused || this.store.state.phase !== 'playing') return
    if (event.pointerType === 'mouse') {
      this.pointerType = 'mouse'
      this.mouse = this.point(event)
      if (event.button !== 0 && event.button !== 2) return
      event.preventDefault()
      this.canvas.focus({ preventScroll: true })
      this.unlock()
      if (event.button === 2) {
        this.store.setMove(this.direction())
        this.store.dash()
      }
      return
    }
    if (event.button !== 0 || this.stick) return
    event.preventDefault()
    this.pointerType = 'touch'
    this.unlock()
    this.canvas.focus({ preventScroll: true })
    const point = this.point(event)
    this.stick = { id: event.pointerId, origin: point, current: point }
    this.canvas.setPointerCapture(event.pointerId)
  }

  private pointerUp = (event: PointerEvent) => {
    if (this.stick?.id !== event.pointerId) return
    if (this.canvas.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId)
    this.stick = null
    this.store.setMove(this.direction())
  }

  private keyDown = (event: KeyboardEvent) => {
    const state = this.store.state
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.isContentEditable || target?.closest('input, textarea, [role="textbox"]')) return
    if (state.phase === 'menu') return
    if (
      event.repeat &&
      ['Escape', 'Space', 'KeyE', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)
    )
      return
    if (event.code === 'Escape' && state.phase === 'playing') {
      event.preventDefault()
      this.cancel()
      this.store.setPaused(!state.paused)
      if (!this.store.state.paused) {
        this.canvas.focus({ preventScroll: true })
        this.unlock()
      }
      return
    }
    if (!state.paused && state.phase === 'playing' && /^Digit[123]$/.test(event.code)) {
      const choice = state.choices[Number(event.code.slice(-1)) - 1]
      if (choice) {
        event.preventDefault()
        this.unlock()
        if (this.store.choose(choice)) this.canvas.focus({ preventScroll: true })
      }
      return
    }
    if (target?.closest('button, [role="dialog"]') || state.paused || state.phase !== 'playing')
      return
    if (event.code === 'Space' || event.code === 'KeyE') {
      event.preventDefault()
      this.unlock()
      this.store.setMove(this.direction())
      if (event.code === 'KeyE') this.store.activateAbility()
      else this.store.dash()
    } else if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code)) {
      event.preventDefault()
      if (this.keys.has(event.code)) return
      this.unlock()
      this.keys.add(event.code)
    }
  }

  private keyUp = (event: KeyboardEvent) => {
    if (this.keys.delete(event.code)) event.preventDefault()
  }
  private contextMenu = (event: Event) => event.preventDefault()
  private cancelKeys = () => this.keys.clear()

  cancel = () => {
    this.keys.clear()
    if (this.stick && this.canvas.hasPointerCapture(this.stick.id))
      this.canvas.releasePointerCapture(this.stick.id)
    this.stick = null
    this.store.setMove({ x: 0, y: 0 })
    this.scene.setStick(null)
    this.scene.setAim(null)
  }

  destroy() {
    this.cancel()
    this.canvas.removeEventListener('pointerdown', this.pointerDown)
    this.canvas.removeEventListener('pointerup', this.pointerUp)
    this.canvas.removeEventListener('pointercancel', this.pointerUp)
    this.canvas.removeEventListener('contextmenu', this.contextMenu)
    this.canvas.removeEventListener('blur', this.cancelKeys)
    window.removeEventListener('pointermove', this.pointerMove)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('blur', this.cancel)
  }
}
