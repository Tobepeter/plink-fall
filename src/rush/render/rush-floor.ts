import { Graphics } from 'pixi.js'
import { arena, arenaMargin } from '../model/arena'
import { palette } from './palette'

// 有实体围墙的有限封锁场地
export class RushFloor {
  view = new Graphics()
  private built = false

  render() {
    if (this.built) return
    this.built = true
    const g = this.view.clear()
    const { left, top, right, bottom, width, height } = arena
    g.rect(left - arenaMargin, top - arenaMargin, width + arenaMargin * 2, height + arenaMargin * 2).fill(palette.ink)
    g.rect(left, top, width, height).fill(palette.ground)
    for (let x = left + 64; x < right; x += 128) g.moveTo(x, top).lineTo(x, bottom)
    for (let y = top + 64; y < bottom; y += 128) g.moveTo(left, y).lineTo(right, y)
    g.stroke({ color: palette.grid, width: 1, alpha: 0.3 })
    for (const x of [-640, 0, 640]) {
      g.rect(x - 46, top + 26, 92, height - 52).fill({ color: palette.floor, alpha: 0.75 })
      g.moveTo(x - 46, top + 28).lineTo(x - 46, bottom - 28)
      g.moveTo(x + 46, top + 28).lineTo(x + 46, bottom - 28)
      g.stroke({ color: palette.lane, width: 2, alpha: 0.45 })
      for (let y = top + 64; y < bottom - 40; y += 96)
        g.rect(x - 2, y, 4, 26).fill({ color: palette.lane, alpha: 0.35 })
    }
    for (let x = left + 64; x < right - 150; x += 256) {
      for (let y = top + 100; y < bottom - 100; y += 256) {
        g.roundRect(x + 70, y + 46, 34, 22, 3).fill({ color: palette.ink, alpha: 0.75 })
        for (let i = 0; i < 3; i++)
          g.rect(x + 74, y + 50 + i * 7, 26, 2).fill({ color: palette.lane, alpha: 0.3 })
        g.moveTo(x + 162, y + 155).lineTo(x + 162, y + 171)
          .moveTo(x + 154, y + 163).lineTo(x + 170, y + 163)
          .stroke({ color: palette.lane, width: 2, alpha: 0.45 })
      }
    }
    g.circle(0, 0, 145).stroke({ color: palette.lane, width: 2, alpha: 0.32 })
    g.circle(0, 0, 112).stroke({ color: palette.grid, width: 1, alpha: 0.7 })
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6
      g.moveTo(Math.cos(a) * 142, Math.sin(a) * 142)
        .lineTo(Math.cos(a) * 151, Math.sin(a) * 151)
        .stroke({ color: palette.teal, width: 2, alpha: 0.25 })
    }
    g.rect(left, top, width, height).stroke({ color: palette.ink, width: 26 })
    g.rect(left + 5, top + 5, width - 10, height - 10).stroke({ color: palette.lane, width: 6 })
    g.rect(left + 18, top + 18, width - 36, height - 36)
      .stroke({ color: palette.teal, width: 2, alpha: 0.65 })
    for (let x = left + 48; x < right - 32; x += 80) {
      for (const y of [top + 7, bottom - 7])
        g.moveTo(x, y - 5).lineTo(x + 10, y + 5)
          .stroke({ color: palette.amber, width: 4, alpha: 0.9 })
    }
    for (let y = top + 48; y < bottom - 32; y += 80) {
      for (const x of [left + 7, right - 7])
        g.moveTo(x - 5, y).lineTo(x + 5, y + 10)
          .stroke({ color: palette.amber, width: 4, alpha: 0.9 })
    }
    for (const x of [left + 28, right - 28]) {
      for (const y of [top + 28, bottom - 28]) {
        g.roundRect(x - 12, y - 12, 24, 24, 3).fill(palette.ink)
          .stroke({ color: palette.lane, width: 3 })
        g.circle(x, y, 5).fill(palette.teal)
      }
    }
  }

  destroy() {
    this.view.destroy()
  }
}
