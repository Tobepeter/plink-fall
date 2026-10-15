import type { Graphics } from 'pixi.js'
import type { FrameId, Runner, Vec } from '../types'
import { clamp, palette } from './palette'

export const abilityColors = {
  runner: { main: palette.teal, core: palette.amber },
  warden: { main: palette.amber, core: palette.cream },
  spark: { main: 0xb6a5ff, core: 0x8fe7ee },
} satisfies Record<FrameId, { main: number; core: number }>

// 起手收束、冲击展开、空心消退
export function drawAbilityImpact(
  g: Graphics,
  frame: FrameId,
  point: Vec,
  angle: number,
  progress: number,
  reduced: boolean,
) {
  const colors = abilityColors[frame]
  const t = reduced ? 0.42 : progress
  const alpha = (1 - progress) * (reduced ? 0.55 : 0.9)
  const start = t < 0.16
  const spread = start ? 1 - t / 0.16 : Math.pow((t - 0.16) / 0.84, 0.55)
  if (frame === 'runner') {
    for (const offset of [-0.3, 0, 0.3]) {
      const a = angle + offset
      const dx = Math.cos(a),
        dy = Math.sin(a)
      const radius = start ? 37 - spread * 10 : 34 + spread * 48
      const x = point.x + dx * radius
      const y = point.y - 16 + dy * radius
      g.moveTo(x - dx * 10 - dy * 5, y - dy * 10 + dx * 5)
        .lineTo(x, y)
        .lineTo(x - dx * 10 + dy * 5, y - dy * 10 - dx * 5)
        .stroke({ color: colors.main, width: 2.3, alpha })
      if (!start)
        g.moveTo(x - dx * 20, y - dy * 20)
          .lineTo(x - dx * 11, y - dy * 11)
          .stroke({ color: colors.core, width: 1.5, alpha })
    }
    return
  }
  if (frame === 'warden') {
    const radius = start ? 28 + spread * 9 : 30 + spread * 155
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      const gap = 0.08 + spread * 0.03
      g.moveTo(point.x + Math.cos(a + gap) * radius, point.y + Math.sin(a + gap) * radius)
        .arc(point.x, point.y, radius, a + gap, a + Math.PI / 4 - gap)
        .stroke({ color: colors.main, width: start ? 2 : 3 - spread * 1.5, alpha })
      if (!start) {
        const x = point.x + Math.cos(a) * radius
        const y = point.y + Math.sin(a) * radius
        g.moveTo(x, y)
          .lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10)
          .stroke({ color: colors.core, width: 1.4, alpha: alpha * 0.65 })
      }
    }
    return
  }
  const radius = start ? 28 + spread * 11 : 31 + spread * 50
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2
    const dx = Math.cos(a),
      dy = Math.sin(a)
    const x = point.x + dx * radius
    const y = point.y - 12 + dy * radius
    g.moveTo(point.x + dx * radius * 0.55, point.y - 12 + dy * radius * 0.55)
      .lineTo(x - dx * 11 - dy * 5, y - dy * 11 + dx * 5)
      .lineTo(x - dx * 7 + dy * 4, y - dy * 7 - dx * 4)
      .lineTo(x, y)
      .stroke({ color: colors.main, width: 2.2, alpha })
    g.circle(x, y, 1.8).fill({ color: colors.core, alpha })
  }
}

// 持续状态贴身、后置；不铺满伤害范围
export function drawAbilityAura(
  g: Graphics,
  player: Runner,
  active: number,
  clock: number,
  reduced: boolean,
) {
  if (active <= 0) return
  const colors = abilityColors[player.frame]
  const pulse = reduced ? 1 : 0.84 + Math.sin(clock * 9) * 0.16
  const alpha = clamp(active / 0.16, 0, 1) * pulse * 0.72
  const x = player.x,
    y = player.y - 11
  if (player.frame === 'runner') {
    for (const side of [-1, 1]) {
      const a = player.angle + Math.PI + side * 0.65
      const dx = Math.cos(a),
        dy = Math.sin(a)
      for (let i = 0; i < 2; i++) {
        const distance = 24 + i * 7
        g.moveTo(x + dx * distance - dy * 4, y + dy * distance + dx * 4)
          .lineTo(x + dx * (distance + 4), y + dy * (distance + 4))
          .lineTo(x + dx * distance + dy * 4, y + dy * distance - dx * 4)
          .stroke({ color: i ? colors.core : colors.main, width: 1.6, alpha })
      }
    }
    return
  }
  if (player.frame === 'warden') {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3
      const b = a + Math.PI / 3
      const radius = 32
      g.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius * 0.9)
        .lineTo(x + Math.cos(b) * radius, y + Math.sin(b) * radius * 0.9)
        .stroke({ color: i % 2 ? colors.core : colors.main, width: 2, alpha })
    }
    return
  }
  for (const side of [-1, 1]) {
    const railX = x + side * 27
    g.moveTo(railX, y - 25)
      .lineTo(railX - side * 5, y - 13)
      .lineTo(railX + side * 3, y - 16)
      .lineTo(railX - side * 2, y + 6)
      .stroke({ color: colors.main, width: 2, alpha })
    g.circle(railX, y - 25, 2).fill({ color: colors.core, alpha })
    g.circle(railX - side * 2, y + 6, 1.5).fill({ color: colors.core, alpha })
  }
}
