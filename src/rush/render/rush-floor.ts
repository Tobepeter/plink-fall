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
    for (let x = Math.floor(left / 128) * 128; x <= right; x += 128) {
      g.moveTo(x, top).lineTo(x, bottom)
    }
    for (let y = Math.floor(top / 128) * 128; y <= bottom; y += 128) {
      g.moveTo(left, y).lineTo(right, y)
    }
    g.stroke({ color: palette.grid, width: 1, alpha: 0.3 })
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
        g.moveTo(x + 26, y + 28)
          .lineTo(x + 26, y + 18)
          .lineTo(x + 38, y + 18)
        g.moveTo(x + 228, y + 28)
          .lineTo(x + 228, y + 18)
          .lineTo(x + 216, y + 18)
        g.moveTo(x + 26, y + 226)
          .lineTo(x + 26, y + 238)
          .lineTo(x + 38, y + 238)
        g.stroke({ color: palette.lane, width: 1, alpha: 0.32 })
        for (let i = 0; i < 3; i++) g.moveTo(x + 74 + i * 9, y + 78).lineTo(x + 79 + i * 9, y + 83)
        g.stroke({ color: palette.amber, width: 2, alpha: 0.34 })
      }
    }
  }

  destroy() {
    this.view.destroy()
  }
}
