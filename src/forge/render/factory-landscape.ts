import { Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { designHeight, designWidth, palette, regionColors } from './palette'

// 月面地形与区域色调
export class FactoryLandscape {
  view = new Container()
  private ground = new Graphics()
  private moon: Sprite
  private sky = new Graphics()
  private dust: Graphics[] = []

  constructor(texture: Texture) {
    this.moon = new Sprite(texture)
    this.moon.width = designWidth
    this.moon.scale.y = this.moon.scale.x
    this.moon.y = -8
    this.moon.alpha = 0.3
    this.view.addChild(this.sky, this.moon, this.ground)
    for (let i = 0; i < 16; i++) {
      const dot = new Graphics().circle(0, 0, i % 3 ? 1 : 1.8).fill(palette.navy)
      dot.position.set(22 + ((i * 79) % 347), 24 + ((i * 83) % 458))
      dot.alpha = 0.13
      this.dust.push(dot)
      this.view.addChild(dot)
    }
    this.setRegion(0)
  }

  setRegion(region: number) {
    const colors = regionColors[region % regionColors.length]
    this.sky.clear().rect(0, 0, designWidth, designHeight).fill(colors.sky)
    this.moon.tint = colors.sky
    const g = this.ground.clear()
    g.poly([
      0, 382, 34, 372, 49, 390, 80, 387, 115, 403, 169, 396, 212, 414, 246, 403, 286, 421, 322, 397,
      363, 405, 390, 394, 390, 525, 0, 525,
    ]).fill({ color: colors.ground, alpha: 0.42 })
    g.ellipse(140, 119, 58, 9).fill({ color: palette.navy, alpha: 0.08 })
    g.ellipse(262, 265, 65, 10).fill({ color: palette.navy, alpha: 0.08 })
    g.ellipse(144, 385, 60, 9).fill({ color: palette.navy, alpha: 0.08 })
    g.ellipse(263, 501, 91, 10).fill({ color: palette.navy, alpha: 0.1 })
    for (const [x, y, width] of [
      [38, 267, 17],
      [341, 362, 14],
      [66, 460, 22],
      [351, 82, 12],
    ]) {
      g.poly([
        x - width,
        y + 8,
        x - width * 0.4,
        y - 8,
        x + width * 0.3,
        y - 11,
        x + width,
        y + 4,
      ]).fill({ color: colors.ground, alpha: 0.9 })
      g.moveTo(x - width, y + 9)
        .lineTo(x + width + 5, y + 9)
        .stroke({ color: palette.navy, width: 1.5, alpha: 0.2 })
    }
    if (region % 3 === 1) {
      g.poly([26, 204, 33, 181, 42, 197, 52, 178, 62, 204]).fill(palette.gold)
      g.poly([345, 449, 349, 429, 359, 440, 366, 427, 373, 449]).fill(palette.gold)
    }
    if (region % 3 === 2) {
      for (const [x, y] of [
        [43, 320],
        [344, 152],
        [67, 497],
      ]) {
        g.poly([x, y - 19, x + 6, y - 7, x + 4, y + 1, x - 5, y + 2, x - 7, y - 9]).fill({
          color: colors.accent,
          alpha: 0.8,
        })
      }
    }
  }

  render(time: number, running: boolean) {
    for (let i = 0; i < this.dust.length; i++) {
      const dot = this.dust[i]
      dot.alpha = 0.07 + (Math.sin(time * 0.9 + i) + 1) * 0.035
      dot.rotation = time * 0.08
      if (running) dot.y = 24 + ((i * 83 + time * 1.3) % 458)
    }
  }

  destroy() {
    this.dust = []
    this.view.destroy({ children: true })
  }
}
