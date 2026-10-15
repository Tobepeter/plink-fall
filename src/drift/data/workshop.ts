import type { FollowerKind } from './kinds'

// 灯坊：灯种解锁、灯舟、修习
export const kindCosts: Record<FollowerKind, number> = {
  warm: 0,
  jade: 0,
  violet: 30,
  rose: 45,
  gold: 60,
}

export const kindNotes: Record<FollowerKind, string> = {
  warm: '光圈更大',
  jade: '吸引萤火',
  violet: '雷击暗影',
  rose: '脉冲驱散',
  gold: '花瓣增收',
}

export const boats = {
  paper: { name: '纸船', desc: '朴素轻盈', cost: 0 },
  lotus: { name: '莲舟', desc: '心火 +1，携莲灯启程', cost: 90 },
  crane: { name: '鹤舟', desc: '纸鹤随行，萤火易得', cost: 140 },
} as const

export type BoatId = keyof typeof boats

export const upgrades = {
  start: { name: '初灯', desc: '开局多一盏灯', costs: [12, 24, 40, 60] },
  ripple: { name: '涟漪', desc: '涟漪更远更强', costs: [10, 20, 35, 55] },
  light: { name: '灯芯', desc: '光圈与灼烧', costs: [10, 20, 35, 55] },
  flame: { name: '心火', desc: '心火上限 +1', costs: [40, 90] },
} as const

export type UpgradeId = keyof typeof upgrades
