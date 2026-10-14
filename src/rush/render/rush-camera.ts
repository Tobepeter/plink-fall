import type { RushState, Vec } from '../types'
import { clamp } from './palette'

// 死区跟随与有限屏内偏移
export class RushCamera {
  width = 1
  height = 1
  zoom = 1
  x = 0
  y = 0
  center: Vec = { x: 0, y: 0 }
  private trauma = 0
  private time = 0
  private motion = matchMedia('(prefers-reduced-motion: reduce)')

  resize(width: number, height: number, state: RushState) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.zoom = clamp(Math.min(width / 390, height / 650), 0.8, 1.2)
    this.reset(state)
  }

  reset(state: RushState) {
    this.center = { x: state.player.x, y: state.player.y }
    this.trauma = 0
    this.project(0)
  }

  update(state: RushState, dt: number) {
    const p = state.player
    const size = this.worldSize()
    const deadX = Math.min(18, size.x * 0.045)
    const deadY = Math.min(22, size.y * 0.035)
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    const blend = 1 - Math.exp(-dt * 12)
    // 不引用瞬变速度；停止、折返和冲刺沿同一取景规则
    this.center.x += (dx - clamp(dx, -deadX, deadX)) * blend
    this.center.y += (dy - clamp(dy, -deadY, deadY)) * blend
    const limitX = Math.min(88, size.x * 0.22)
    const limitY = Math.min(96, size.y * 0.2)
    this.center.x = clamp(this.center.x, p.x - limitX, p.x + limitX)
    this.center.y = clamp(this.center.y, p.y - limitY, p.y + limitY)
    this.time += dt
    this.trauma = Math.max(0, this.trauma - dt * 4.6)
    this.project(this.motion.matches ? 0 : this.trauma ** 2 * 4)
  }

  private project(shake: number) {
    this.x = this.width / 2 - this.center.x * this.zoom + Math.sin(this.time * 51) * shake
    this.y = this.height / 2 - this.center.y * this.zoom + Math.sin(this.time * 67) * shake * 0.6
  }

  impact(power: number) {
    if (this.motion.matches) return
    this.trauma = Math.min(0.8, Math.max(this.trauma, power))
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
