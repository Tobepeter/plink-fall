import type { RushState, Vec } from '../types'
import { clamp } from './palette'

// 追击场景取景与世界投影
export class RushCamera {
  width = 1
  height = 1
  zoom = 1
  x = 0
  y = 0
  center: Vec = { x: 0, y: 0 }
  private trauma = 0
  private time = 0
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  resize(width: number, height: number, state: RushState) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.zoom = clamp(Math.min(width / 390, height / 650), 0.8, 1.2)
    this.center = { x: state.player.x, y: state.player.y }
    this.project(0)
  }

  reset(state: RushState) {
    this.center = { x: state.player.x, y: state.player.y }
    this.trauma = 0
    this.project(0)
  }

  update(state: RushState, dt: number) {
    const p = state.player
    const target = { x: p.x + p.vx * 0.1, y: p.y + p.vy * 0.1 }
    const blend = 1 - Math.exp(-dt * 13)
    this.center.x += (target.x - this.center.x) * blend
    this.center.y += (target.y - this.center.y) * blend
    this.time += dt
    this.trauma = Math.max(0, this.trauma - dt * 3.8)
    this.project(this.reduced ? 0 : this.trauma ** 2 * 6)
  }

  private project(shake: number) {
    this.x = this.width / 2 - this.center.x * this.zoom + Math.sin(this.time * 51) * shake
    this.y = this.height / 2 - this.center.y * this.zoom + Math.sin(this.time * 67) * shake * 0.65
  }

  impact(power: number) {
    this.trauma = Math.min(0.85, this.trauma + power)
  }

  screenToWorld(point: Vec): Vec {
    return { x: (point.x - this.x) / this.zoom, y: (point.y - this.y) / this.zoom }
  }

  worldToScreen(point: Vec): Vec {
    return { x: point.x * this.zoom + this.x, y: point.y * this.zoom + this.y }
  }

  worldSize(): Vec {
    return { x: this.width / this.zoom, y: this.height / this.zoom }
  }
}
