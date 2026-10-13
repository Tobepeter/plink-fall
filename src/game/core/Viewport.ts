import { DESIGN_W, DESIGN_H_MAX, DESIGN_H_MIN } from './config'

export interface ViewportInfo {
  /** CSS px size of the frame */
  cssW: number
  cssH: number
  /** design units: width is fixed, height expands for tall phones */
  designH: number
  scale: number
}

/**
 * Fit-width portrait viewport: fixed 720 logical width, height expands 1280..1600
 * for tall phones, otherwise letterboxed. Respects safe-area insets via #root padding.
 */
export class Viewport {
  info: ViewportInfo = { cssW: 0, cssH: 0, designH: DESIGN_H_MIN, scale: 1 }
  private listeners = new Set<(v: ViewportInfo) => void>()
  private raf = 0

  constructor(
    private root: HTMLElement,
    private frame: HTMLElement,
  ) {
    const schedule = () => {
      cancelAnimationFrame(this.raf)
      this.raf = requestAnimationFrame(() => this.measure())
    }
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', () => setTimeout(schedule, 120))
    window.visualViewport?.addEventListener('resize', schedule)
    new ResizeObserver(schedule).observe(root)
    this.measure()
  }

  onChange(fn: (v: ViewportInfo) => void) {
    this.listeners.add(fn)
  }

  measure() {
    const cs = getComputedStyle(this.root)
    const w = this.root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const h = this.root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    if (w <= 0 || h <= 0) return
    const designH = Math.min(DESIGN_H_MAX, Math.max(DESIGN_H_MIN, (DESIGN_W * h) / w))
    const scale = Math.min(w / DESIGN_W, h / designH)
    const cssW = Math.floor(DESIGN_W * scale)
    const cssH = Math.floor(designH * scale)
    this.frame.style.width = `${cssW}px`
    this.frame.style.height = `${cssH}px`
    this.frame.style.setProperty('--s', String(scale))
    this.info = { cssW, cssH, designH, scale }
    this.listeners.forEach((f) => f(this.info))
  }
}
