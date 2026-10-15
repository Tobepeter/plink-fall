import type { Graphics } from 'pixi.js'
import type { FrameId, Vec, WeaponReaction } from '../types'
import { palette } from './palette'
import { drawAbilityImpact } from './rush-ability'
import { drawWeaponReaction } from './rush-reactions'

export interface RushMark extends Vec {
  kind: 'ring' | 'chain' | 'cross' | 'ice' | 'arrow' | 'ability' | 'link' | 'reaction'
  life: number
  duration: number
  radius: number
  color: number
  targets: Vec[]
  frame?: FrameId
  angle: number
  reaction?: WeaponReaction
}

// 有限生命周期标记的纯绘制
export function drawRushMark(
  g: Graphics,
  mark: RushMark,
  t: number,
  alpha: number,
  reduced: boolean,
) {
  if (mark.kind === 'reaction' && mark.reaction) {
    drawWeaponReaction(g, mark.reaction, mark, mark.targets, mark.radius, t, reduced)
    return
  }
  if (mark.kind === 'ability' && mark.frame) {
    drawAbilityImpact(g, mark.frame, mark, mark.angle, t, reduced)
    return
  }
  if (mark.kind === 'link') {
    const y = mark.y - 47
    for (const side of [-1, 1]) {
      const x = mark.x + side * 14
      g.moveTo(x + side * 7, y - 6)
        .lineTo(x, y - 6)
        .lineTo(x - side * 5, y)
        .lineTo(x, y + 6)
        .lineTo(x + side * 7, y + 6)
        .stroke({ color: side < 0 ? mark.color : palette.cream, width: 2, alpha: alpha * 0.7 })
    }
    return
  }
  if (mark.kind === 'chain') {
    const points = [{ x: mark.x, y: mark.y }, ...mark.targets]
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1],
        to = points[i]
      const dx = to.x - from.x,
        dy = to.y - from.y
      const dist = Math.hypot(dx, dy) || 1
      for (let step = 1; step < 5; step++) {
        const sway = Math.sin(step * 2.4 + i * 3) * 7 * (1 - t)
        g.lineTo(
          from.x + (dx * step) / 5 - (dy / dist) * sway,
          from.y + (dy * step) / 5 + (dx / dist) * sway,
        )
      }
      g.lineTo(to.x, to.y)
    }
    g.stroke({ color: mark.color, width: 2.8, alpha })
    for (const point of points)
      g.circle(point.x, point.y, 3 + t * 6).stroke({ color: palette.cream, width: 1.2, alpha })
    return
  }
  if (mark.kind === 'arrow') {
    const target = mark.targets[0]
    if (!target) return
    const a = Math.atan2(target.y - mark.y, target.x - mark.x)
    const dx = Math.cos(a),
      dy = Math.sin(a)
    const length = mark.radius * (0.3 + t * 0.4)
    const x = mark.x + dx * length,
      y = mark.y + dy * length
    g.moveTo(mark.x - dx * 10, mark.y - dy * 10)
      .lineTo(x, y)
      .moveTo(x - dx * 11 - dy * 8, y - dy * 11 + dx * 8)
      .lineTo(x, y)
      .lineTo(x - dx * 11 + dy * 8, y - dy * 11 - dx * 8)
      .stroke({ color: mark.color, width: 2, alpha })
    return
  }
  if (mark.kind === 'ice') {
    const r = mark.radius * (0.3 + t * 0.7)
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3
      const dx = Math.cos(a),
        dy = Math.sin(a)
      g.moveTo(mark.x + dx * r * 0.45, mark.y + dy * r * 0.45)
        .lineTo(mark.x + dx * r, mark.y + dy * r)
        .lineTo(mark.x + dx * r * 0.82 - dy * 6, mark.y + dy * r * 0.82 + dx * 6)
    }
    g.stroke({ color: palette.cream, width: 2, alpha })
    return
  }
  const r = mark.radius * (0.2 + t * 0.8)
  if (mark.kind === 'cross') {
    g.moveTo(mark.x - r, mark.y)
      .lineTo(mark.x + r, mark.y)
      .moveTo(mark.x, mark.y - r)
      .lineTo(mark.x, mark.y + r)
      .stroke({ color: mark.color, width: 2.5, alpha })
  } else {
    g.circle(mark.x, mark.y, r).stroke({ color: mark.color, width: 3 * (1 - t) + 1, alpha })
    if (t < 0.12)
      g.circle(mark.x, mark.y, Math.min(18, r * 0.4)).fill({
        color: palette.cream,
        alpha: 0.3 * alpha,
      })
  }
}
