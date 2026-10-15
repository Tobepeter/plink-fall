import type { Graphics } from 'pixi.js'
import type { ProtocolId, Vec, WeaponReaction } from '../types'
import { palette } from './palette'
import { reactionColors } from './rush-weapon-style'

export const isWeaponReaction = (id?: ProtocolId): id is WeaponReaction =>
  Boolean(id && id in reactionColors)

// 反应只强调模型已确认的池中心、传导节点与折射环刃
export function drawWeaponReaction(
  g: Graphics,
  reaction: WeaponReaction,
  point: Vec,
  targets: Vec[],
  radius: number,
  progress: number,
  reduced: boolean,
) {
  const colors = reactionColors[reaction]
  const alpha = Math.min(1, (1 - progress) * 1.6)
  const t = reduced ? 0.6 : progress
  if (reaction === 'combustion') {
    const r = radius * (0.35 + Math.sqrt(t) * 0.65)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      g.moveTo(point.x + Math.cos(a + 0.05) * r, point.y + Math.sin(a + 0.05) * r)
        .arc(point.x, point.y, r, a + 0.05, a + Math.PI / 4 - 0.05)
        .stroke({ color: colors[i % 2], width: 2.5 - t, alpha: alpha * 0.8 })
    }
    return
  }
  if (reaction === 'conduction') {
    for (const [index, target] of targets.slice(0, 12).entries()) {
      const dx = target.x - point.x,
        dy = target.y - point.y
      const length = Math.hypot(dx, dy) || 1
      const sway = (index % 2 ? 1 : -1) * Math.min(8, length * 0.12)
      g.moveTo(point.x, point.y)
        .lineTo(
          point.x + dx * 0.45 - (dy / length) * sway,
          point.y + dy * 0.45 + (dx / length) * sway,
        )
        .lineTo(target.x, target.y)
        .stroke({ color: colors[0], width: 2, alpha })
      g.circle(target.x, target.y, 4).stroke({ color: colors[1], width: 1.5, alpha })
    }
    return
  }
  const blade = targets[0] ?? point
  const r = 6 + t * 5
  g.poly([
    blade.x,
    blade.y - r,
    blade.x + r,
    blade.y,
    blade.x,
    blade.y + r,
    blade.x - r,
    blade.y,
  ]).stroke({ color: colors[0], width: 2, alpha })
  g.circle(blade.x, blade.y, 2).fill({ color: palette.cream, alpha })
}
