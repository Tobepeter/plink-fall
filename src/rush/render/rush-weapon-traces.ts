import type { Graphics } from 'pixi.js'
import type { RushState, Vec, WeaponTrace } from '../types'
import { clamp, palette } from './palette'
import { weaponColors } from './rush-weapon-style'

// 模型提供路径，图形不参与命中与伤害
export function drawWeaponTraces(g: Graphics, state: RushState, reduced: boolean) {
  g.clear()
  for (const trace of state.weaponTraces.slice(-96)) {
    if (trace.life <= 0 || (!trace.targets.length && trace.kind !== 'burst')) continue
    const progress = clamp(trace.life / trace.duration, 0, 1)
    const alpha = Math.min(1, progress * 2.5)
    const slot = state.weapons.find((slot) => slot.id === trace.weapon)
    const awakened = (slot?.level ?? 0) >= 5
    if (trace.kind === 'flame') drawFlame(g, trace, alpha, awakened, reduced)
    else if (trace.kind === 'arc') drawArc(g, trace, alpha, awakened, reduced)
    else if (trace.kind === 'beam') drawBeam(g, trace, alpha, awakened)
    else if (trace.kind === 'slice') drawSlice(g, trace, alpha, awakened)
    else drawBurst(g, trace, alpha)
  }
}

function line(g: Graphics, from: Vec, to: Vec, color: number, width: number, alpha: number) {
  g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color, width, alpha, cap: 'round' })
}

function drawBeam(g: Graphics, trace: WeaponTrace, alpha: number, awakened: boolean) {
  const width = clamp(trace.width, 3, 32)
  let point = trace.from
  for (const target of trace.targets) {
    line(g, point, target, palette.ink, width + 3, alpha * 0.8)
    line(g, point, target, weaponColors.laser, width, alpha * 0.9)
    line(g, point, target, palette.cream, Math.max(1.4, width * 0.3), alpha)
    if (point !== trace.from)
      g.circle(point.x, point.y, width * 0.65).stroke({
        color: weaponColors.blade,
        width: 1.5,
        alpha,
      })
    if (awakened) {
      const a = Math.atan2(target.y - point.y, target.x - point.x)
      const dx = Math.cos(a),
        dy = Math.sin(a)
      for (const side of [-1, 1])
        line(
          g,
          { x: point.x - dy * width * side, y: point.y + dx * width * side },
          { x: target.x - dy * width * side, y: target.y + dx * width * side },
          weaponColors.laser,
          1,
          alpha * 0.4,
        )
    }
    point = target
  }
}

function drawFlame(
  g: Graphics,
  trace: WeaponTrace,
  alpha: number,
  awakened: boolean,
  reduced: boolean,
) {
  const target = trace.targets[0]
  const angle = Math.atan2(target.y - trace.from.y, target.x - trace.from.x)
  const range = Math.hypot(target.x - trace.from.x, target.y - trace.from.y)
  const spread = Math.atan2(trace.width / 2, range)
  const rays = awakened ? 7 : 5
  // 分离火舌留下空隙，避免不透明锥面吞掉敌弹
  for (let i = 0; i < rays; i++) {
    const offset = (i / (rays - 1) - 0.5) * 2
    const a = angle + offset * spread
    const dx = Math.cos(a),
      dy = Math.sin(a)
    const flicker = reduced ? 0.94 : 0.88 + Math.sin(trace.life * 24 + i * 2.7) * 0.1
    const length = range * (1 - Math.abs(offset) * 0.14) * flicker
    const from = { x: trace.from.x + dx * 12, y: trace.from.y + dy * 12 }
    const tip = { x: trace.from.x + dx * length, y: trace.from.y + dy * length }
    line(g, from, tip, weaponColors.flame, Math.max(3, (trace.width / rays) * 0.42), alpha * 0.7)
    line(
      g,
      from,
      { x: trace.from.x + dx * length * 0.52, y: trace.from.y + dy * length * 0.52 },
      palette.cream,
      2,
      alpha * 0.6,
    )
  }
}

function drawArc(
  g: Graphics,
  trace: WeaponTrace,
  alpha: number,
  awakened: boolean,
  reduced: boolean,
) {
  let from = trace.from
  for (const [index, target] of trace.targets.entries()) {
    const dx = target.x - from.x,
      dy = target.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const points = [from]
    for (let step = 1; step < 5; step++) {
      const sway =
        Math.sin(step * 2.4 + index * 3 + (reduced ? 0 : trace.life * 18)) * Math.min(7, length / 9)
      points.push({
        x: from.x + (dx * step) / 5 - (dy / length) * sway,
        y: from.y + (dy * step) / 5 + (dx / length) * sway,
      })
    }
    points.push(target)
    for (let i = 1; i < points.length; i++) {
      line(
        g,
        points[i - 1],
        points[i],
        weaponColors.arc,
        trace.width * (awakened ? 1.35 : 1),
        alpha * 0.85,
      )
      line(g, points[i - 1], points[i], palette.cream, 1, alpha)
    }
    g.circle(target.x, target.y, awakened ? 5 : 3).stroke({
      color: weaponColors.arc,
      width: 1.5,
      alpha,
    })
    from = target
  }
}

function drawSlice(g: Graphics, trace: WeaponTrace, alpha: number, awakened: boolean) {
  for (const target of trace.targets) {
    line(g, trace.from, target, palette.ink, trace.width + 2, alpha)
    line(g, trace.from, target, weaponColors.blade, trace.width, alpha)
    if (awakened) line(g, trace.from, target, weaponColors.laser, 1.4, alpha)
  }
}

function drawBurst(g: Graphics, trace: WeaponTrace, alpha: number) {
  const target = trace.targets[0]
  if (!target) {
    if (trace.weapon !== 'toxin') return
    const radius = (trace.width / 2) * (0.65 + (1 - trace.life / trace.duration) * 0.35)
    g.circle(trace.from.x, trace.from.y, radius).stroke({
      color: weaponColors.toxin,
      width: 2,
      alpha: alpha * 0.6,
    })
    return
  }
  const angle = Math.atan2(target.y - trace.from.y, target.x - trace.from.x)
  const dx = Math.cos(angle),
    dy = Math.sin(angle)
  const radius = Math.min(24, trace.width + 8)
  g.poly([
    trace.from.x + dx * 5,
    trace.from.y + dy * 5,
    trace.from.x + dx * radius - dy * radius * 0.45,
    trace.from.y + dy * radius + dx * radius * 0.45,
    trace.from.x + dx * radius * 0.7,
    trace.from.y + dy * radius * 0.7,
    trace.from.x + dx * radius + dy * radius * 0.45,
    trace.from.y + dy * radius - dx * radius * 0.45,
  ]).fill({ color: weaponColors[trace.weapon], alpha: alpha * 0.65 })
}
