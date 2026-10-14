import type { Foe, RushState, Vec } from '../types'

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
export const toward = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x)
export const level = (s: RushState, id: keyof RushState['upgrades']) => s.upgrades[id] || 0
export const playerGunOrigin = (p: Vec) => ({ x: p.x, y: p.y - 16 })

export function visible(s: RushState, e: Vec, margin = 0) {
  return (
    Math.abs(e.x - s.player.x) < s.viewport.x / 2 + margin &&
    Math.abs(e.y - s.player.y) < s.viewport.y / 2 + margin
  )
}

export function nearest(
  s: RushState,
  point: Vec,
  exclude: number[] = [],
  range = Infinity,
): Foe | undefined {
  let best: Foe | undefined
  let min = range
  for (const e of s.enemies) {
    if (e.hp <= 0 || exclude.includes(e.id) || !visible(s, e, 14)) continue
    const d = distance(point, e)
    if (d < min) {
      best = e
      min = d
    }
  }
  return best
}

export interface Hooks {
  id(): number
  random(): number
  emit: (event: import('../types').RushEvent) => void
}

export function makeRandom(seed: number) {
  let n = seed >>> 0
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0
    return n / 4294967296
  }
}
