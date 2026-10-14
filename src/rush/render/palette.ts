import type { EnemyKind } from '../types'

export const palette = {
  ground: 0x101f31,
  floor: 0x142639,
  grid: 0x294253,
  lane: 0x3b5360,
  ink: 0x07121e,
  teal: 0x66f4c0,
  cream: 0xf5f3d1,
  amber: 0xffce67,
  red: 0xff646f,
  violet: 0xf979ef,
}

export const foeColors: Record<EnemyKind, number> = {
  chaser: 0xff646f,
  charger: 0xff9856,
  shooter: 0xdb74f6,
  splitter: 0xff80b7,
  brute: 0xdd5062,
  boss: 0xff655f,
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))
