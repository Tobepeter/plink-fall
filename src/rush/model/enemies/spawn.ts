import type { RushState, Vec } from '../../types'
import { arenaBounds, arenaMargin, arenaView, clampToArena } from '../arena'

// 有限视区入场；朝墙的编队改从安全的场内边缘进场
export function enemySpawnPoint(
  state: RushState,
  radius: number,
  side = 1,
  spread = 0,
  random: () => number = Math.random,
): Vec {
  const p = state.player
  const origin = clampToArena(p, radius)
  const bounds = arenaBounds(radius)
  const view = arenaView(p, state.viewport, arenaMargin)
  const moving = Math.hypot(p.vx, p.vy) > 20
  const heading = moving ? Math.atan2(p.vy, p.vx) : state.wave.index * 1.35
  const angle = heading + side * (0.9 + spread) + (random() - 0.5) * 0.18
  const padding = radius + 32
  const minimum = Math.max(180, radius + p.radius + 100)
  const outside = {
    left: view.left - padding,
    right: view.right + padding,
    top: view.top - padding,
    bottom: view.bottom + padding,
  }
  let best = origin
  let bestDistance = 0
  for (let i = 0; i < 16; i++) {
    const offset = (Math.ceil(i / 2) * (i % 2 ? 1 : -1) * Math.PI) / 8
    const direction = { x: Math.cos(angle + offset), y: Math.sin(angle + offset) }
    const wall = rayDistance(origin, direction, bounds)
    const screen = rayDistance(origin, direction, outside)
    const travel = Math.min(wall, Math.max(screen, minimum + 24))
    const point = clampToArena(
      { x: origin.x + direction.x * travel, y: origin.y + direction.y * travel },
      radius,
    )
    const distance = Math.hypot(point.x - p.x, point.y - p.y)
    if (distance >= minimum) return point
    if (distance > bestDistance) {
      best = point
      bestDistance = distance
    }
  }
  return best
}

function rayDistance(
  origin: Vec,
  direction: Vec,
  bounds: { left: number; right: number; top: number; bottom: number },
) {
  const x =
    Math.abs(direction.x) < 1e-8
      ? Infinity
      : ((direction.x > 0 ? bounds.right : bounds.left) - origin.x) / direction.x
  const y =
    Math.abs(direction.y) < 1e-8
      ? Infinity
      : ((direction.y > 0 ? bounds.bottom : bounds.top) - origin.y) / direction.y
  return Math.max(0, Math.min(x, y))
}
