import { Graphics } from 'pixi.js'
import type { RushState, Vec } from '../types'
import type { RushCamera } from './rush-camera'
import { palette } from './palette'

// 固定屏幕指针与枪口方向参照
export class RushReticle {
  view = new Graphics()
  private point: Vec | null = null

  set(point: Vec | null) {
    this.point = point
    if (!point) this.view.clear()
  }

  render(state: RushState, camera: RushCamera) {
    const g = this.view.clear()
    if (!this.point || state.phase !== 'playing' || state.paused) return
    const { x, y } = this.point
    const player = camera.worldToScreen({ x: state.player.x, y: state.player.y - 16 })
    const angle = Math.atan2(y - player.y, x - player.x)
    const color = state.abilityActive > 0 ? palette.amber : palette.teal
    g.moveTo(player.x + Math.cos(angle) * 28, player.y + Math.sin(angle) * 28)
      .lineTo(player.x + Math.cos(angle) * 55, player.y + Math.sin(angle) * 55)
      .stroke({ color, width: 1.5, alpha: 0.38 })
    g.poly([x, y - 8, x + 8, y, x, y + 8, x - 8, y])
      .stroke({ color, width: 1.5, alpha: 0.9 })
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]])
      g.moveTo(x + dx * 12, y + dy * 12).lineTo(x + dx * 17, y + dy * 17)
    g.stroke({ color, width: 2, alpha: 0.8 })
    g.circle(x, y, 1.6).fill(palette.cream)
  }

  destroy() {
    this.view.destroy()
  }
}
