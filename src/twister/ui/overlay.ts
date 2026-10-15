import type { Run } from '../sim/run'
import type { Tornado } from '../sim/tornado'
import type { TwisterScene } from '../render/scene'

// 逐帧跟随的 DOM 叠层：浮动摇杆、对手名牌（不走 React，避免每帧渲染）
export class Overlay {
  private root = document.createElement('div')
  private ring = document.createElement('div')
  private knob = document.createElement('div')
  private tags: { t: Tornado; el: HTMLDivElement }[] = []

  constructor(stage: HTMLElement) {
    this.root.className = 'tw-overlay'
    this.ring.className = 'tw-stick'
    this.knob.className = 'tw-knob'
    this.ring.appendChild(this.knob)
    this.root.appendChild(this.ring)
    stage.appendChild(this.root)
  }

  stick(on: boolean, ox: number, oy: number, x: number, y: number) {
    this.ring.style.opacity = on ? '1' : '0'
    if (!on) return
    const rect = this.root.getBoundingClientRect()
    this.ring.style.transform = `translate(${ox - rect.left}px, ${oy - rect.top}px)`
    let dx = x - ox,
      dy = y - oy
    const len = Math.hypot(dx, dy)
    if (len > 46) {
      dx = (dx / len) * 46
      dy = (dy / len) * 46
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`
  }

  setRivals(list: Tornado[]) {
    for (const t of this.tags) t.el.remove()
    this.tags = list.map((t) => {
      const el = document.createElement('div')
      el.className = 'tw-tag'
      el.style.setProperty('--tint', t.tint)
      this.root.appendChild(el)
      return { t, el }
    })
  }

  labels(run: Run, scene: TwisterScene) {
    const p = run.player
    for (const { t, el } of this.tags) {
      if (!t.alive) {
        el.style.opacity = '0'
        continue
      }
      const s = scene.project(t.x, t.r * 4.8 + 6, t.z)
      const bigger = t.r > p.r * 1.12,
        smaller = p.r > t.r * 1.12
      el.textContent = `${t.name} ${t.r.toFixed(1)}`
      el.dataset.mood = bigger ? 'danger' : smaller ? 'prey' : 'even'
      el.style.opacity = s.front ? '1' : '0'
      el.style.transform = `translate(${s.x}px, ${s.y}px)`
    }
  }

  dispose() {
    this.root.remove()
  }
}
