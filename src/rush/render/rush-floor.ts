import { Graphics } from 'pixi.js'
import type { RushCamera } from './rush-camera'
import { palette } from './palette'

// 无限街机跑道的速度参照
export class RushFloor {
  view = new Graphics()
  private key = ''

  render(camera: RushCamera) {
    const size = camera.worldSize()
    const left = Math.floor((camera.center.x - size.x / 2) / 128) * 128 - 128
    const top = Math.floor((camera.center.y - size.y / 2) / 128) * 128 - 128
    const key = `${left}:${top}:${size.x}:${size.y}`
    if (this.key === key) return
    this.key = key
    const g = this.view.clear()
    const right = left + size.x + 384
    const bottom = top + size.y + 384
    g.rect(left, top, size.x + 384, size.y + 384).fill(palette.ground)
    for (let x = Math.floor(left / 64) * 64; x <= right; x += 64) {
      g.moveTo(x, top).lineTo(x, bottom)
    }
    for (let y = Math.floor(top / 64) * 64; y <= bottom; y += 64) {
      g.moveTo(left, y).lineTo(right, y)
    }
    g.stroke({ color: palette.grid, width: 1, alpha: 0.42 })
    for (let x = Math.floor(left / 384) * 384; x <= right; x += 384) {
      g.rect(x - 46, top, 92, size.y + 384).fill({ color: palette.floor, alpha: 0.55 })
      g.moveTo(x - 46, top).lineTo(x - 46, bottom)
      g.moveTo(x + 46, top).lineTo(x + 46, bottom)
      g.stroke({ color: palette.lane, width: 2, alpha: 0.42 })
      for (let y = Math.floor(top / 96) * 96; y <= bottom; y += 96) {
        g.rect(x - 2, y, 4, 26).fill({ color: palette.lane, alpha: 0.4 })
      }
    }
    for (let x = Math.floor(left / 256) * 256; x <= right; x += 256) {
      for (let y = Math.floor(top / 256) * 256; y <= bottom; y += 256) {
        g.roundRect(x + 70, y + 46, 34, 22, 3).fill({ color: palette.ink, alpha: 0.7 })
        g.rect(x + 73, y + 50, 27, 2).fill({ color: palette.lane, alpha: 0.3 })
        g.rect(x + 73, y + 57, 27, 2).fill({ color: palette.lane, alpha: 0.3 })
        g.rect(x + 73, y + 64, 27, 2).fill({ color: palette.lane, alpha: 0.3 })
        g.moveTo(x + 162, y + 155).lineTo(x + 162, y + 171)
        g.moveTo(x + 154, y + 163).lineTo(x + 170, y + 163)
        g.stroke({ color: palette.lane, width: 2, alpha: 0.6 })
      }
    }
  }

  destroy() {
    this.view.destroy()
  }
}
