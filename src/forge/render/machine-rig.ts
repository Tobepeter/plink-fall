import { ColorMatrixFilter, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import type { ForgeState } from '../model/types'
import { palette, recipeColors } from './palette'

export type MachineTextures = {
  hopper: Texture
  furnace: Texture
  condenser: Texture
  rover: Texture
}
type Machine = { view: Container; sprite: Sprite; y: number }

// 独立机器精灵与动态仪表
export class MachineRig {
  view = new Container()
  private machines: Machine[] = []
  private crusher = new Graphics()
  private crusherSmall = new Graphics()
  private heat = new Graphics()
  private heatAura = new Graphics()
  private coolant = new Graphics()
  private charge = new Graphics()
  private cargo = new Graphics()
  private cargoColor?: Sprite
  private cargoTexture?: Texture
  private cargoFilter = new ColorMatrixFilter()
  private cargoKind = ''
  private labels: Text[] = []
  private heatValue = -1
  private chargeValue = -1
  private stockValue = -1

  constructor(textures: MachineTextures) {
    this.heatAura.circle(261, 211, 61).fill({ color: palette.coral, alpha: 0.22 })
    this.view.addChild(this.heatAura)
    for (const [texture, x, y, width] of [
      [textures.hopper, 147, 75, 125],
      [textures.furnace, 261, 211, 133],
      [textures.condenser, 143, 330, 119],
      [textures.rover, 255, 449, 155],
    ] as const) {
      const view = new Container()
      view.position.set(x, y)
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.width = width
      sprite.scale.y = sprite.scale.x
      view.addChild(sprite)
      if (texture === textures.rover) {
        const factor = texture.width / 566
        this.cargoTexture = new Texture({
          source: texture.source,
          frame: new Rectangle(
            texture.frame.x + 328 * factor,
            texture.frame.y + 125 * factor,
            212 * factor,
            103 * factor,
          ),
        })
        this.cargoColor = new Sprite(this.cargoTexture)
        this.cargoColor.scale.set(sprite.scale.x)
        this.cargoColor.position.set(
          -width / 2 + 328 * factor * sprite.scale.x,
          -sprite.height / 2 + 125 * factor * sprite.scale.x,
        )
        this.cargoColor.filters = [this.cargoFilter]
        view.addChild(this.cargoColor)
      }
      this.machines.push({ view, sprite, y })
      this.view.addChild(view)
    }
    this.drawGear(this.crusher, 10)
    this.drawGear(this.crusherSmall, 7)
    this.crusher.position.set(192, 134)
    this.crusherSmall.position.set(208, 145)
    this.view.addChild(
      this.crusher,
      this.crusherSmall,
      this.heat,
      this.coolant,
      this.charge,
      this.cargo,
    )
    this.coolant.ellipse(143, 332, 14, 27).fill({ color: palette.teal, alpha: 0.17 })
    for (const [label, x, y] of [
      ['01 采矿', 20, 68],
      ['02 熔炼', 289, 138],
      ['03 结晶', 23, 280],
      ['04 入库', 327, 388],
    ] as const) {
      const text = new Text({
        text: label,
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: 10,
          fontWeight: '600',
          fill: palette.navy,
          letterSpacing: 1,
        },
      })
      text.alpha = 0.6
      text.position.set(x, y)
      this.labels.push(text)
      this.view.addChild(text)
    }
  }

  resize(scale: number) {
    for (const label of this.labels) label.scale.set(Math.max(1, 0.9 / scale))
  }

  private drawGear(g: Graphics, radius: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      g.circle(x, y, radius * 0.3).fill(palette.navy)
    }
    g.circle(0, 0, radius)
      .fill(palette.navy)
      .circle(0, 0, radius * 0.65)
      .fill(palette.cream)
      .circle(0, 0, radius * 0.25)
      .fill(palette.navy)
  }

  render(state: ForgeState, time: number, dt: number) {
    const running = state.started && !state.paused
    const boost = state.burstRemaining > 0
    const speed = running ? (boost ? 6 : 1.8) * Math.min(4, state.rate) : 0
    this.crusher.rotation += speed * dt
    this.crusherSmall.rotation -= speed * 1.4 * dt
    for (let i = 0; i < this.machines.length; i++) {
      const machine = this.machines[i]
      const motion = running ? Math.sin(time * (boost ? 20 : 4) + i) * (boost ? 0.8 : 0.3) : 0
      machine.view.y = machine.y + motion
      if (i === 1)
        machine.sprite.tint = state.heat > 70 ? 0xffd7c4 : state.heat > 50 ? 0xffe9da : 0xffffff
      machine.sprite.rotation = i === 1 && state.heat > 72 ? Math.sin(time * 31) * 0.009 : 0
    }
    this.heatAura.alpha = Math.max(0, (state.heat - 45) / 55)
    const heat = Math.round(state.heat / 4) * 4
    if (heat !== this.heatValue) {
      this.heatValue = heat
      this.heat
        .clear()
        .roundRect(281, 184, 4, 36, 2)
        .fill({ color: palette.navy, alpha: 0.35 })
        .roundRect(281, 220 - heat * 0.34, 4, Math.max(2, heat * 0.34), 2)
        .fill(heat > 70 ? palette.coral : palette.gold)
    }
    const charge = Math.round(state.charge * 20) / 20
    if (charge !== this.chargeValue) {
      this.chargeValue = charge
      this.charge
        .clear()
        .roundRect(229, 266, 65, 4, 2)
        .fill({ color: palette.navy, alpha: 0.15 })
        .roundRect(229, 266, Math.max(2, charge * 65), 4, 2)
        .fill(palette.gold)
    }
    this.coolant.alpha = running ? 0.65 + Math.sin(time * 3) * 0.35 : 0.4
    const kind = state.recipes[Math.min(state.recipes.length - 1, state.region % 3)] ?? 'mint'
    if (this.cargoColor) this.cargoColor.visible = kind !== 'mint'
    if (kind !== this.cargoKind) {
      this.cargoKind = kind
      this.cargoFilter.hue(kind === 'amber' ? -130 : kind === 'rose' ? 175 : 0, false)
    }
    if (state.stock !== this.stockValue) {
      this.stockValue = state.stock
      this.cargo.clear()
      const count = Math.min(5, Math.floor(state.stock / 3))
      for (let i = 0; i < count; i++) {
        const x = 276 + i * 9
        const y = 451 - (i % 2) * 4
        this.cargo
          .poly([x, y - 9, x + 5, y - 3, x + 3, y + 4, x - 4, y + 3, x - 5, y - 4])
          .fill(recipeColors[kind])
          .stroke({ color: palette.navy, width: 1 })
      }
    }
  }

  destroy() {
    this.view.destroy({ children: true })
    this.cargoFilter.destroy()
    this.cargoTexture?.destroy(false)
  }
}
