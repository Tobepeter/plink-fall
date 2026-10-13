import { Container, Graphics, Text } from 'pixi.js'
import type { ForgeState, ModuleId } from '../model/types'
import { palette } from './palette'

const positions: Record<ModuleId, [number, number]> = {
  turbo: [323, 252],
  condenser: [82, 351],
  splitter: [331, 206],
  magnet: [72, 114],
  battery: [355, 231],
  prism: [82, 386],
  echo: [304, 368],
  insulator: [236, 152],
}

// 已安装模块的可见附属装置
export class ModuleRig {
  view = new Container()
  private signature = ''
  private gears: Graphics[] = []
  private lights: Graphics[] = []

  sync(state: ForgeState) {
    const signature = Object.entries(state.modules)
      .map(([id, level]) => `${id}:${level}`)
      .join(',')
    if (signature === this.signature) return
    this.signature = signature
    for (const child of this.view.removeChildren()) child.destroy({ children: true })
    this.gears = []
    this.lights = []
    for (const [key, level] of Object.entries(state.modules)) {
      if (!level) continue
      const id = key as ModuleId
      const [x, y] = positions[id]
      const body = new Container()
      body.position.set(x, y)
      const g = new Graphics()
      body.addChild(g)
      switch (id) {
        case 'turbo': {
          g.circle(0, 0, 15).fill(palette.navy).circle(0, 0, 12).fill(palette.gold)
          const fan = new Graphics()
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2
            fan
              .moveTo(0, 0)
              .lineTo(Math.cos(a) * 8, Math.sin(a) * 8)
              .lineTo(Math.cos(a + 0.6) * 6, Math.sin(a + 0.6) * 6)
              .closePath()
              .fill(palette.navy)
          }
          body.addChild(fan)
          this.gears.push(fan)
          break
        }
        case 'condenser':
          g.roundRect(-10, -18, 20, 38, 8)
            .fill(palette.navy)
            .roundRect(-7, -15, 14, 32, 6)
            .fill(palette.teal)
          for (let i = 0; i < 4; i++)
            g.moveTo(-13, -10 + i * 8)
              .lineTo(13, -10 + i * 8)
              .stroke({ color: palette.cream, width: 2 })
          break
        case 'splitter':
          g.roundRect(-15, -26, 30, 52, 10)
            .fill(palette.navy)
            .roundRect(-11, -22, 22, 43, 7)
            .fill(palette.cream)
            .roundRect(-8, -8, 16, 25, 5)
            .fill(palette.coral)
            .circle(0, -15, 3)
            .fill(palette.gold)
          break
        case 'magnet':
          g.arc(0, 0, 12, Math.PI, 0)
            .stroke({ color: palette.navy, width: 9 })
            .arc(0, 0, 12, Math.PI, 0)
            .stroke({ color: palette.coral, width: 5 })
            .rect(-16, -1, 8, 8)
            .fill(palette.cream)
            .rect(8, -1, 8, 8)
            .fill(palette.cream)
            .arc(0, 0, 22, Math.PI * 0.1, Math.PI * 0.9)
            .stroke({ color: palette.teal, alpha: 0.4, width: 2 })
          break
        case 'battery':
          g.roundRect(-8, -19, 16, 38, 5)
            .fill(palette.navy)
            .roundRect(-5, -15, 10, 29, 3)
            .fill(palette.gold)
            .rect(-4, -23, 8, 4)
            .fill(palette.navy)
            .poly([1, -10, -4, 1, 0, 1, -1, 10, 4, -1, 0, -1])
            .fill(palette.navy)
          break
        case 'prism':
          g.poly([0, -17, 14, 7, -14, 7])
            .fill(palette.gold)
            .stroke({ color: palette.navy, width: 2 })
            .poly([0, -12, 0, 4, -9, 4])
            .fill(palette.teal)
            .poly([0, -12, 9, 4, 0, 4])
            .fill(palette.coral)
          break
        case 'echo':
          g.circle(0, 0, 12)
            .fill(palette.navy)
            .circle(0, 0, 9)
            .fill(palette.teal)
            .moveTo(-4, -5)
            .lineTo(-4, 5)
            .moveTo(4, -5)
            .lineTo(4, 5)
            .stroke({ color: palette.cream, width: 2.5 })
          break
        case 'insulator':
          g.roundRect(-12, -8, 24, 16, 5)
            .fill(palette.cream)
            .stroke({ color: palette.navy, width: 2 })
          for (let i = 0; i < 3; i++)
            g.moveTo(-7 + i * 7, -5)
              .lineTo(-7 + i * 7, 5)
              .stroke({ color: palette.coral, width: 3 })
          break
      }
      const light = new Graphics().circle(11, -14, 2.5).fill(palette.white)
      body.addChild(light)
      this.lights.push(light)
      if (level > 1) {
        const text = new Text({
          text: `${level}`,
          style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 9,
            fontWeight: '800',
            fill: palette.navy,
          },
        })
        text.position.set(12, 7)
        body.addChild(text)
      }
      this.view.addChild(body)
    }
  }

  render(state: ForgeState, time: number, dt: number) {
    const running = state.started && !state.paused
    for (const gear of this.gears)
      gear.rotation += dt * (running ? (state.burstRemaining > 0 ? 13 : 4) : 0)
    for (let i = 0; i < this.lights.length; i++)
      this.lights[i].alpha = running ? 0.5 + Math.sin(time * 3 + i) * 0.4 : 0.3
  }

  position(module: ModuleId) {
    return { x: positions[module][0], y: positions[module][1] }
  }

  destroy() {
    this.view.destroy({ children: true })
  }
}
