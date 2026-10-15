import type { PaletteId } from '../render/palette'

// 三段河域：调色、流速、暗影构成、Boss
export const regions = [
  {
    id: 'creek',
    name: '竹溪',
    palette: 'creek',
    speed: 68,
    boss: 'catfish',
    fish: 1,
    moth: 0,
    eel: 0,
    rock: 1,
  },
  {
    id: 'canal',
    name: '灯市',
    palette: 'canal',
    speed: 74,
    boss: 'ferry',
    fish: 0.7,
    moth: 1,
    eel: 0,
    rock: 0.8,
  },
  {
    id: 'cave',
    name: '萤洞',
    palette: 'cave',
    speed: 80,
    boss: 'dragon',
    fish: 0.6,
    moth: 0.3,
    eel: 1,
    rock: 1.2,
  },
] as const satisfies readonly {
  id: string
  name: string
  palette: PaletteId
  speed: number
  boss: string
  fish: number
  moth: number
  eel: number
  rock: number
}[]

export type Region = (typeof regions)[number]
export type BossId = Region['boss']

// 分叉奖励
export const forkRewards = {
  shrine: { name: '祠', desc: '选一个祝福' },
  market: { name: '市', desc: '用花瓣换灯' },
  storm: { name: '渊', desc: '暗流险恶，奖赏丰厚' },
  bloom: { name: '灯', desc: '散灯成群，心火复燃' },
} as const

export type ForkReward = keyof typeof forkRewards

export const reachLength = 2500
export const forkLength = 760
export const lakeLength = 900
