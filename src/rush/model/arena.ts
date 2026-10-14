import type { Vec } from '../types'

// 封锁竞技场与共享有限视区
export const arena = {
  width: 1920,
  height: 1440,
  left: -960,
  right: 960,
  top: -720,
  bottom: 720,
}

export const arenaMargin = 160

export function arenaBounds(radius = 0) {
  const inset = Math.max(0, Math.min(radius, arena.height / 2))
  return {
    left: arena.left + inset,
    right: arena.right - inset,
    top: arena.top + inset,
    bottom: arena.bottom - inset,
  }
}

export function clampToArena(point: Vec, radius = 0): Vec {
  const bounds = arenaBounds(radius)
  return {
    x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
  }
}

export function keepInArena(entity: Vec & { vx?: number; vy?: number }, radius = 0) {
  const point = clampToArena(entity, radius)
  if (point.x !== entity.x) entity.vx = 0
  if (point.y !== entity.y) entity.vy = 0
  entity.x = point.x
  entity.y = point.y
}

export function arenaView(center: Vec, size: Vec, margin = 0) {
  const width = Math.min(arena.width + margin * 2, size.x)
  const height = Math.min(arena.height + margin * 2, size.y)
  const x = Math.max(arena.left - margin + width / 2, Math.min(arena.right + margin - width / 2, center.x))
  const y = Math.max(arena.top - margin + height / 2, Math.min(arena.bottom + margin - height / 2, center.y))
  return { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 }
}
