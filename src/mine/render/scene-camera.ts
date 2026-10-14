import type { MineState, Vec } from '../types'
import { clamp } from './palette'

// 世界取景与指针投影
export class SceneCamera {
  width = 1
  height = 1
  zoom = 1
  x = 0
  y = 0
  private center = { x: 0, y: 70 }
  private trauma = 0
  private time = 0
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  resize(width: number, height: number, state: MineState) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.zoom = this.portrait
      ? clamp(width / 375, 0.94, 1.16)
      : clamp(Math.min(width / 1450, height / 900), 0.74, 1.15)
    this.center = this.target(state)
    this.project(0)
  }

  get portrait() {
    return this.width < 700 && this.height > this.width * 1.05
  }

  private target(state: MineState) {
    if (state.holding > 0) return this.center
    const probe = state.probe
    const resting = probe.mode === 'docked'
    const homeY = 70 + (this.height * 0.28) / this.zoom
    if (resting) return { x: 0, y: homeY }
    const look = probe.mode === 'returning' ? 0 : 22
    const edge = (this.width * 0.16) / this.zoom
    return {
      x: this.portrait
        ? (Math.abs(probe.x) < edge ? 0 : probe.x - Math.sign(probe.x) * edge) +
          Math.cos(probe.angle) * look
        : probe.x * 0.12,
      y: this.portrait
        ? Math.max(homeY, probe.y + (this.height * 0.08) / this.zoom)
        : Math.max(homeY, probe.y + (this.height * 0.04) / this.zoom),
    }
  }

  update(state: MineState, dt: number) {
    const target = this.target(state)
    const blend = 1 - Math.exp(-dt * (state.probe.mode === 'docked' ? 4 : 5.5))
    this.center.x += (target.x - this.center.x) * blend
    this.center.y += (target.y - this.center.y) * blend
    this.time += dt
    this.trauma = Math.max(0, this.trauma - dt * 2.7)
    this.project(this.reduced ? 0 : this.trauma ** 2 * 5)
  }

  private project(shake: number) {
    this.x = this.width * 0.5 - this.center.x * this.zoom + Math.sin(this.time * 41) * shake
    this.y =
      this.height * 0.5 - this.center.y * this.zoom + Math.sin(this.time * 57 + 2) * shake * 0.6
  }

  impact(power: number) {
    this.trauma = Math.min(0.85, this.trauma + Math.max(0, power))
  }

  screenToWorld(point: Vec): Vec {
    return { x: (point.x - this.x) / this.zoom, y: (point.y - this.y) / this.zoom }
  }

  worldToScreen(point: Vec): Vec {
    return { x: point.x * this.zoom + this.x, y: point.y * this.zoom + this.y }
  }
}
