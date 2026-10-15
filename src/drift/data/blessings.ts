// 祝福：涟漪 / 灯火 / 灯队三系，每种最多三级
export type Stats = typeof baseStats

export const baseStats = {
  rippleRadius: 165,
  ripplePower: 120,
  echo: 0, // 回响次数
  sear: 0, // 涟漪伤害
  still: 0, // 定身秒数
  light: 1, // 光圈倍率
  burn: 1, // 灼烧倍率
  lure: 1, // 吸萤倍率
  ember: 0,
  maxTrain: 9,
  shade: 0, // 每段免伤次数
  rekindle: 0,
  crane: 0,
  koi: 0,
  thunder: 0,
  lotus: 0,
  gold: 1,
  maxFlame: 3,
}

export type BlessingId = keyof typeof blessings
export type BlessingSchool = 'ripple' | 'light' | 'train'

type Def = {
  name: string
  desc: string
  school: BlessingSchool
  max: number
  apply: (s: Stats, lv: number) => void
}

export const blessings = {
  wide: {
    name: '广澜',
    desc: '涟漪更远更强',
    school: 'ripple',
    max: 3,
    apply: (s, lv) => ((s.rippleRadius *= 1 + 0.22 * lv), (s.ripplePower *= 1 + 0.12 * lv)),
  },
  echo: {
    name: '回澜',
    desc: '涟漪回响',
    school: 'ripple',
    max: 2,
    apply: (s, lv) => (s.echo += lv),
  },
  sear: {
    name: '灼澜',
    desc: '涟漪灼伤暗影',
    school: 'ripple',
    max: 3,
    apply: (s, lv) => (s.sear += 0.6 * lv),
  },
  still: {
    name: '定澜',
    desc: '涟漪定住暗影',
    school: 'ripple',
    max: 3,
    apply: (s, lv) => (s.still += 0.7 * lv),
  },
  bright: {
    name: '长明',
    desc: '光圈扩大',
    school: 'light',
    max: 3,
    apply: (s, lv) => (s.light *= 1 + 0.2 * lv),
  },
  blaze: {
    name: '炽芯',
    desc: '灼烧更烈',
    school: 'light',
    max: 3,
    apply: (s, lv) => (s.burn *= 1 + 0.35 * lv),
  },
  lure: {
    name: '引萤',
    desc: '远处萤火飞来',
    school: 'light',
    max: 3,
    apply: (s, lv) => (s.lure *= 1 + 0.45 * lv),
  },
  ember: {
    name: '余烬',
    desc: '心灯留下火痕',
    school: 'light',
    max: 3,
    apply: (s, lv) => (s.ember += lv),
  },
  rope: {
    name: '长绳',
    desc: '灯队上限 +3',
    school: 'train',
    max: 3,
    apply: (s, lv) => (s.maxTrain += 3 * lv),
  },
  shade: {
    name: '灯罩',
    desc: '每段挡一次撞击',
    school: 'train',
    max: 2,
    apply: (s, lv) => (s.shade += lv),
  },
  rekindle: {
    name: '重燃',
    desc: '落水的灯可再拾',
    school: 'train',
    max: 1,
    apply: (s) => (s.rekindle = 1),
  },
  crane: {
    name: '纸鹤',
    desc: '纸鹤代拾萤火',
    school: 'train',
    max: 3,
    apply: (s, lv) => (s.crane += lv),
  },
  koi: { name: '锦鲤', desc: '锦鲤护航', school: 'train', max: 3, apply: (s, lv) => (s.koi += lv) },
  thunder: {
    name: '雷鸣',
    desc: '雷灯连锁更多',
    school: 'light',
    max: 3,
    apply: (s, lv) => (s.thunder += lv),
  },
  lotus: {
    name: '莲心',
    desc: '莲灯脉冲更勤',
    school: 'train',
    max: 3,
    apply: (s, lv) => (s.lotus += lv),
  },
  wish: {
    name: '金愿',
    desc: '花瓣收获更多',
    school: 'train',
    max: 3,
    apply: (s, lv) => (s.gold *= 1 + 0.4 * lv),
  },
} satisfies Record<string, Def>

export const blessingIds = Object.keys(blessings) as BlessingId[]

// 由祝福等级重算属性
export function computeStats(
  levels: Partial<Record<BlessingId, number>>,
  extra?: (s: Stats) => void,
) {
  const s = { ...baseStats }
  extra?.(s)
  for (const id of blessingIds) {
    const lv = levels[id] ?? 0
    if (lv > 0) (blessings[id] as Def).apply(s, lv)
  }
  return s
}
