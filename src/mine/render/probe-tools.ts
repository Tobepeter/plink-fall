import { Container, Graphics } from 'pixi.js'
import type { MineState } from '../types'
import { palette } from './palette'

// 探针工具的可见连接件
export class ProbeTools {
  view = new Container()
  private signature = ''
  private saw?: Container
  private vent?: Graphics
  private magnet?: Graphics

  sync(state: MineState) {
    const signature = JSON.stringify(state.tools)
    if (signature === this.signature) return
    this.signature = signature
    for (const child of this.view.removeChildren()) child.destroy({ children: true })
    this.saw = undefined
    this.vent = undefined
    this.magnet = undefined
    if (state.tools.pierce) {
      const g = new Graphics()
        .poly([30, -8, 46, -5, 56, 0, 46, 5, 30, 8])
        .stroke({ color: palette.red, width: 3 })
      this.view.addChild(g)
    }
    if (state.tools.chain) {
      const g = new Graphics()
        .moveTo(-3, -16)
        .lineTo(-6, -30)
        .stroke({ color: palette.ink, width: 4 })
        .circle(-6, -31, 4)
        .fill(palette.jade)
        .stroke({ color: palette.cream, width: 1 })
      this.view.addChild(g)
    }
    if (state.tools.magnet) {
      this.magnet = new Graphics()
        .arc(0, 0, 33, -Math.PI * 0.8, -Math.PI * 0.15)
        .stroke({ color: palette.copper, width: 4 })
        .arc(0, 0, 33, Math.PI * 0.15, Math.PI * 0.8)
        .stroke({ color: palette.jade, width: 4 })
      this.view.addChild(this.magnet)
    }
    if (state.tools.saw) {
      this.saw = new Container()
      const g = new Graphics()
      for (let i = 0; i < 14; i++) {
        const a = (i * Math.PI) / 7
        const x = Math.cos(a)
        const y = Math.sin(a)
        g.poly([
          x * 23,
          y * 23,
          x * 29,
          y * 29,
          Math.cos(a + 0.13) * 24,
          Math.sin(a + 0.13) * 24,
        ]).fill(palette.cream)
      }
      g.circle(0, 0, 23)
        .stroke({ color: palette.ink, width: 6 })
        .circle(0, 0, 20)
        .stroke({ color: palette.copper, width: 3 })
      this.saw.addChild(g)
      this.view.addChild(this.saw)
    }
    if (state.tools.vent) {
      const vent = new Graphics()
        .roundRect(-21, -21, 14, 8, 3)
        .fill(palette.ink)
        .roundRect(-21, 13, 14, 8, 3)
        .fill(palette.ink)
      this.vent = new Graphics()
      this.vent
        .ellipse(-30, -18, 10, 3)
        .fill({ color: palette.cream, alpha: 0.55 })
        .ellipse(-30, 18, 10, 3)
        .fill({ color: palette.cream, alpha: 0.55 })
      this.view.addChild(this.vent, vent)
    }
    if (state.tools.winch) {
      const hook = new Graphics()
        .moveTo(-29, -7)
        .lineTo(-38, -7)
        .lineTo(-38, 7)
        .lineTo(-29, 7)
        .stroke({ color: palette.copper, width: 4 })
      this.view.addChild(hook)
    }
  }

  render(state: MineState, dt: number) {
    if (this.saw) this.saw.rotation += dt * (state.probe.mode === 'mining' ? 28 : 7)
    if (this.magnet) this.magnet.alpha = 0.75 + Math.sin(state.clock * 4) * 0.18
    if (this.vent) {
      this.vent.alpha = Math.max(0.1, state.probe.heat / 100)
      this.vent.scale.x = 0.7 + Math.sin(state.clock * 12) * 0.15
    }
  }

  destroy() {
    this.view.destroy({ children: true })
  }
}
