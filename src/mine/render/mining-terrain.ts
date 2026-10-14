import { Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { mineralColors, palette } from './palette'
import type { Mineral, Vec } from '../types'

// 采石地面与开采后遗迹
export class MiningTerrain {
  view = new Container()
  private ground: Sprite
  private marks = new Container()
  private count = 0
  private region = -1

  constructor(texture: Texture) {
    const extension = new Graphics().rect(-2200, -1600, 4400, 4200).fill(palette.sand)
    this.ground = new Sprite(texture)
    this.ground.anchor.set(0.5, 0)
    this.ground.position.set(0, -150)
    this.ground.width = 2400
    this.ground.scale.y = this.ground.scale.x
    this.view.addChild(extension, this.ground, this.marks)
  }

  fit(width: number, height: number) {
    const ratio = this.ground.texture.width / this.ground.texture.height
    this.ground.width = Math.max(2400, width + 240, (1080 + height * 0.8) * ratio)
    this.ground.scale.y = this.ground.scale.x
    this.ground.y = -Math.max(150, height * 0.24)
  }

  setRegion(region: number) {
    if (this.region === region) return
    this.region = region
    this.ground.tint = [0xffffff, 0xf4ebcb, 0xdbefdc][region % 3]
    for (const mark of this.marks.removeChildren()) mark.destroy()
    this.count = 0
  }

  scar(point: Vec, kind: Mineral = 'stone') {
    if (this.count++ >= 100) return
    const g = new Graphics()
      .ellipse(0, 0, 24, 12)
      .fill({ color: palette.ink, alpha: 0.1 })
      .ellipse(0, 0, 17, 8)
      .stroke({ color: palette.ink, alpha: 0.2, width: 2 })
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + point.x
      g.circle(Math.cos(a) * 20, Math.sin(a) * 9, 1.5 + (i % 2)).fill({
        color: mineralColors[kind],
        alpha: 0.65,
      })
    }
    g.position.set(point.x, point.y)
    this.marks.addChild(g)
  }

  destroy() {
    this.view.destroy({ children: true })
  }
}
