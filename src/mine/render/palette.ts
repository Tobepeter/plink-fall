import type { Mineral } from '../types'

export const palette = {
  ink: 0x183f3b,
  sand: 0xaf9560,
  cream: 0xf4e5bd,
  copper: 0xeea16b,
  jade: 0x66dcc0,
  amber: 0xffc44d,
  red: 0xf56d45,
  stone: 0x98a9a0,
}

export const mineralColors: Record<Mineral, number> = {
  stone: palette.stone,
  copper: palette.copper,
  jade: palette.jade,
  amber: palette.amber,
  volatile: palette.red,
  relic: palette.jade,
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))
