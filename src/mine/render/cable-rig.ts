import { Container, Graphics } from 'pixi.js'
import type { MineState, Vec } from '../types'
import { palette } from './palette'

// 放缆、负重与收缆
export class CableRig {
  view = new Container()
  private cable = new Graphics()
  private drum = new Container()
  private seam = new Graphics()
  private spool = new Graphics()

  constructor() {
    this.view.addChild(this.cable, this.drum)
    this.drum.position.set(-22, 57)
    this.spool
      .circle(0, 0, 12)
      .fill(palette.ink)
      .circle(0, 0, 9)
      .fill(palette.copper)
      .circle(0, 0, 4)
      .fill(palette.ink)
    this.seam
      .moveTo(-8, 0)
      .lineTo(8, 0)
      .moveTo(0, -8)
      .lineTo(0, 8)
      .stroke({ color: palette.cream, width: 2 })
    this.drum.addChild(this.spool, this.seam)
  }

  render(state: MineState, dt: number) {
    const p = state.probe
    const active = p.mode !== 'docked'
    this.cable.visible = active
    const dx = p.x
    const dy = p.y - 88
    const length = Math.hypot(dx, dy)
    if (active) {
      const sag = Math.min(48, length * 0.065) * (p.mode === 'returning' ? 0.28 : 1)
      const trace = () =>
        this.cable.moveTo(0, 88).quadraticCurveTo(p.x * 0.48 + sag, (p.y + 88) * 0.5, p.x, p.y)
      this.cable.clear()
      trace().stroke({ color: palette.ink, width: 4.5, alpha: 0.3 })
      trace().stroke({ color: palette.copper, width: 2.2 })
      trace().stroke({ color: palette.cream, width: 0.6, alpha: 0.8 })
      if (p.cargo.length) {
        let last: Vec = p
        for (const id of p.cargo) {
          const drop = state.drops.find((item) => item.id === id)
          if (!drop) continue
          this.cable
            .moveTo(last.x, last.y)
            .lineTo(drop.x, drop.y)
            .stroke({ color: palette.ink, width: 1, alpha: 0.38 })
          last = drop
        }
      }
    }
    const velocity = Math.hypot(p.vx, p.vy)
    this.seam.rotation += dt * velocity * (p.mode === 'returning' ? -0.09 : 0.07)
    this.drum.scale.set(state.tools.winch ? 1.15 : 1)
  }

  destroy() {
    this.view.destroy({ children: true })
  }
}
