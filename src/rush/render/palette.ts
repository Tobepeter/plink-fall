import type { EnemyKind } from '../types'

export const palette = {
  ground: 0x101724,
  floor: 0x151f30,
  grid: 0x2b3a4d,
  lane: 0x465164,
  ink: 0x07121e,
  teal: 0x92e6c6,
  cream: 0xf8ead5,
  amber: 0xdfb76c,
  red: 0xf15e4c,
  violet: 0xf88c77,
}

// 同一机械军团；危险由形状与预警表达
export const foeColors: Record<EnemyKind, number> = {
  chaser: palette.red,
  charger: palette.red,
  shooter: palette.red,
  splitter: palette.red,
  brute: palette.red,
  boss: palette.red,
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))
