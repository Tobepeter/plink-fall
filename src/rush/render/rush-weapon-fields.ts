import type { Graphics } from 'pixi.js'
import type { Foe, RushState } from '../types'
import { clamp, palette } from './palette'
import { weaponColors } from './rush-weapon-style'

// 友方场低填充，保留敌方红弹的对比
export function drawWeaponFields(g: Graphics, state: RushState, reduced: boolean) {
  g.clear()
  for (const zone of state.zones.slice(-32)) {
    const progress = clamp(zone.life / zone.duration, 0, 1)
    if (zone.life <= 0) continue
    const toxin = zone.kind === 'toxin' || zone.kind === 'conductor'
    const color = toxin
      ? weaponColors.toxin
      : zone.kind === 'fire'
        ? weaponColors.flame
        : palette.teal
    const radius = zone.kind === 'blast' ? zone.radius * (1 - progress * 0.3) : zone.radius
    g.circle(zone.x, zone.y, radius).fill({ color, alpha: toxin ? 0.045 : 0.035 })
    if (zone.kind === 'frost') {
      const points = Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3
        return [zone.x + Math.cos(a) * radius, zone.y + Math.sin(a) * radius]
      }).flat()
      g.poly(points).stroke({ color: palette.cream, width: 1.5, alpha: progress * 0.35 })
      continue
    }
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5
      const b = a + Math.PI * 0.29
      g.moveTo(zone.x + Math.cos(a) * radius, zone.y + Math.sin(a) * radius)
        .arc(zone.x, zone.y, radius, a, b)
        .stroke({ color, width: 1.5, alpha: 0.2 + progress * 0.2 })
      if (toxin) {
        const inner = radius * (0.35 + (i % 2) * 0.18)
        const bob = reduced ? 0 : Math.sin(state.clock * 3 + zone.id + i) * 1.5
        g.circle(
          zone.x + Math.cos(a) * inner,
          zone.y + Math.sin(a) * inner + bob,
          2 + (i % 2),
        ).stroke({ color, width: 1, alpha: 0.38 })
      }
    }
    if (zone.kind === 'conductor') {
      const r = radius * 0.55
      for (const side of [-1, 1])
        g.moveTo(zone.x - r, zone.y + side * r * 0.35)
          .lineTo(zone.x - r * 0.2, zone.y - side * 4)
          .lineTo(zone.x + r * 0.2, zone.y + side * 4)
          .lineTo(zone.x + r, zone.y - side * r * 0.35)
          .stroke({ color: weaponColors.arc, width: 1.4, alpha: 0.45 })
    }
  }
}

// 状态只取真实计时，不修改敌人颜色/命中框
export function drawWeaponStatus(g: Graphics, foe: Foe, clock: number, reduced: boolean) {
  if ((foe.burn ?? 0) > 0) {
    for (let i = 0; i < 3; i++) {
      const x = foe.x + (i - 1) * 6
      const y = foe.y + foe.radius * 0.45
      const height = reduced ? 7 : 6 + Math.sin(clock * 10 + foe.id + i * 2) * 2
      g.poly([x - 2, y, x, y - height, x + 2.5, y - 2, x + 1, y + 2]).fill({
        color: weaponColors.flame,
        alpha: 0.85,
      })
    }
  }
  if ((foe.toxin ?? 0) > 0) {
    for (let i = 0; i < 3; i++) {
      const x = foe.x + foe.radius * 0.75 + (i % 2) * 3
      const y = foe.y - 8 + i * 7
      g.circle(x, y, 1.7 + (i % 2)).fill({ color: weaponColors.toxin, alpha: 0.8 })
    }
  }
}
