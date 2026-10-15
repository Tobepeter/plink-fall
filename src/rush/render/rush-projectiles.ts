import { Graphics } from 'pixi.js'
import type { RushState } from '../types'
import { palette } from './palette'
import { drawWeaponFields } from './rush-weapon-fields'
import { drawWeaponTraces } from './rush-weapon-traces'
import { weaponColors } from './rush-weapon-style'

// 真实弹道、拾取物与武器场
export class RushProjectiles {
  fields = new Graphics()
  loot = new Graphics()
  shots = new Graphics()
  satellites = new Graphics()
  traces = new Graphics()
  enemyShots = new Graphics()
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private destroyed = false

  render(state: RushState) {
    if (this.destroyed) return
    drawWeaponFields(this.fields, state, this.reducedMotion.matches)
    drawWeaponTraces(this.traces, state, this.reducedMotion.matches)
    this.drawLoot(state)
    this.drawShots(state)
    this.drawSatellites(state)
  }

  private drawLoot(state: RushState) {
    const g = this.loot.clear()
    for (const drop of state.loot) {
      const bob = this.reducedMotion.matches ? 0 : Math.sin(drop.age * 6 + drop.id) * 1.2
      const x = drop.x
      const y = drop.y + bob
      g.ellipse(x, drop.y + 6, 5, 2).fill({ color: palette.ink, alpha: 0.55 })
      if (drop.kind === 'xp') {
        const r = drop.value > 2 ? 6 : 4.2
        g.poly([x, y - r, x + r * 0.7, y, x, y + r, x - r * 0.7, y])
          .fill(palette.amber)
          .stroke({ color: palette.ink, width: 1.5 })
        g.moveTo(x, y - r * 0.65)
          .lineTo(x, y + r * 0.2)
          .stroke({ color: palette.cream, width: 1 })
      } else {
        const color = palette.teal
        g.circle(x, y, 10).fill(palette.ink).stroke({ color, width: 2 })
        if (drop.kind === 'heal') {
          g.rect(x - 2, y - 6, 4, 12)
            .rect(x - 6, y - 2, 12, 4)
            .fill(color)
        } else {
          g.moveTo(x + 5, y - 1)
            .arc(x, y - 1, 5, 0, Math.PI)
            .stroke({ color, width: 3 })
          g.rect(x - 5, y - 4, 3, 4)
            .rect(x + 2, y - 4, 3, 4)
            .fill(color)
        }
      }
    }
  }

  private drawShots(state: RushState) {
    this.shots.clear()
    this.enemyShots.clear()
    for (const shot of state.shots) {
      const g = shot.side === 'enemy' ? this.enemyShots : this.shots
      if (shot.kind === 'toxin') {
        const progress = Math.max(0, Math.min(1, shot.age / (shot.duration ?? 1)))
        const lift = Math.sin(progress * Math.PI) * 42
        g.ellipse(shot.x, shot.y + 4, 5, 2).fill({ color: palette.ink, alpha: 0.6 })
        g.circle(shot.x, shot.y - lift, 5)
          .fill(weaponColors.toxin)
          .stroke({ color: palette.ink, width: 2 })
        g.circle(shot.x - 1.5, shot.y - lift - 1.5, 1.5).fill(palette.cream)
        continue
      }
      const a = Math.atan2(shot.vy, shot.vx)
      const dx = Math.cos(a)
      const dy = Math.sin(a)
      const r = Math.max(2.8, shot.radius)
      const length =
        shot.side === 'enemy' ? 7 : shot.kind === 'pellet' ? 6 : shot.kind === 'rocket' ? 20 : 13
      const tail = { x: shot.x - dx * length, y: shot.y - dy * length }
      if (shot.side === 'player') {
        if (shot.kind === 'counter') {
          g.poly([
            shot.x + dx * 11,
            shot.y + dy * 11,
            shot.x - dx * 5 - dy * 6,
            shot.y - dy * 5 + dx * 6,
            shot.x - dx * 19,
            shot.y - dy * 19,
            shot.x - dx * 5 + dy * 6,
            shot.y - dy * 5 - dx * 6,
          ])
            .fill(palette.cream)
            .stroke({ color: palette.ink, width: 2 })
          g.moveTo(shot.x - dx * 27, shot.y - dy * 27)
            .lineTo(shot.x - dx * 7, shot.y - dy * 7)
            .stroke({ color: palette.teal, width: 3, alpha: 0.85 })
          continue
        }
        if (shot.kind === 'return') {
          g.moveTo(shot.x - dx * 8 - dy * 7, shot.y - dy * 8 + dx * 7)
            .lineTo(shot.x + dx * 5, shot.y + dy * 5)
            .lineTo(shot.x - dx * 8 + dy * 7, shot.y - dy * 8 - dx * 7)
            .stroke({ color: palette.ink, width: 7, cap: 'round' })
          g.moveTo(shot.x - dx * 8 - dy * 7, shot.y - dy * 8 + dx * 7)
            .lineTo(shot.x + dx * 5, shot.y + dy * 5)
            .lineTo(shot.x - dx * 8 + dy * 7, shot.y - dy * 8 - dx * 7)
            .stroke({ color: palette.teal, width: 3, cap: 'round' })
          continue
        }
        const color = shot.weapon
          ? weaponColors[shot.weapon]
          : shot.kind === 'rocket'
            ? palette.amber
            : palette.teal
        g.moveTo(tail.x, tail.y)
          .lineTo(shot.x, shot.y)
          .stroke({ color: palette.ink, width: r * 2 + 3, cap: 'round' })
        g.moveTo(tail.x, tail.y)
          .lineTo(shot.x, shot.y)
          .stroke({ color, width: r * 1.5, cap: 'round' })
        g.circle(shot.x, shot.y, r * 0.75).fill(palette.cream)
        if (shot.kind === 'rocket') {
          g.moveTo(tail.x - dx * 8, tail.y - dy * 8)
            .lineTo(tail.x, tail.y)
            .stroke({ color: palette.cream, width: 2.5, cap: 'round', alpha: 0.7 })
        }
      } else {
        g.moveTo(tail.x, tail.y)
          .lineTo(shot.x, shot.y)
          .stroke({ color: palette.violet, width: r * 2, alpha: 0.2, cap: 'round' })
        g.circle(shot.x, shot.y, r + 2).fill(palette.ink)
        g.circle(shot.x, shot.y, r + 0.5).fill(palette.violet)
        g.circle(shot.x, shot.y, r * 0.45).fill(palette.cream)
      }
    }
  }

  private drawSatellites(state: RushState) {
    const g = this.satellites.clear()
    for (const sat of state.satellites) {
      const x = sat.x
      const y = sat.y
      if (sat.kind === 'blade') {
        const slot = state.weapons.find((slot) => slot.id === 'blade')
        const awakened = (slot?.level ?? 0) >= 5
        const radius = slot?.branch === 'focus' ? 14 : 11
        const a = this.reducedMotion.matches ? sat.id : state.clock * 11 + sat.id
        g.circle(x, y, radius)
          .fill(palette.ink)
          .stroke({ color: weaponColors.blade, width: awakened ? 3.5 : 2.5 })
        for (let i = 0; i < 3; i++) {
          const turn = a + (i * Math.PI * 2) / 3
          const dx = Math.cos(turn),
            dy = Math.sin(turn)
          g.poly([
            x + dx * radius * 0.7,
            y + dy * radius * 0.7,
            x + dx * (radius + 4) - dy * 3,
            y + dy * (radius + 4) + dx * 3,
            x + dx * radius + dy * 4,
            y + dy * radius - dx * 4,
          ])
            .fill(weaponColors.blade)
            .stroke({ color: palette.ink, width: 1 })
        }
        g.circle(x, y, 3).fill(awakened ? weaponColors.laser : palette.teal)
      } else {
        g.ellipse(x, y + 7, 10, 4).fill({ color: palette.ink, alpha: 0.6 })
        g.roundRect(x - 8, y - 7, 16, 13, 4)
          .fill(palette.teal)
          .stroke({ color: palette.ink, width: 2 })
        g.rect(x - 3, y - 4, 6, 3).fill(palette.cream)
        g.moveTo(x + 3, y)
          .lineTo(x + Math.cos(sat.angle) * 13, y + Math.sin(sat.angle) * 13)
          .stroke({ color: palette.cream, width: 4 })
      }
    }
  }

  reset() {
    if (this.destroyed) return
    for (const graphic of [
      this.fields,
      this.loot,
      this.shots,
      this.satellites,
      this.traces,
      this.enemyShots,
    ])
      graphic.clear()
  }

  destroy() {
    if (this.destroyed) return
    this.reset()
    this.destroyed = true
    for (const graphic of [
      this.fields,
      this.loot,
      this.shots,
      this.satellites,
      this.traces,
      this.enemyShots,
    ])
      graphic.destroy()
  }
}
