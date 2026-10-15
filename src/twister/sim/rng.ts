// 可复现随机
export function makeRng(seed: number) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (a: number, b: number) => a + (b - a) * next(),
    int: (a: number, b: number) => Math.floor(a + (b - a + 1) * next()),
    pick: <T>(list: readonly T[]) => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
  }
}

export type Rng = ReturnType<typeof makeRng>

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)
