// 风暴天赋：过关后三选一，整局叠加
export type Perks = typeof basePerks

export const basePerks = {
  speed: 1,
  pull: 1, // 吸力范围
  crush: 1, // 侵蚀速度
  growth: 1, // 质量增益
  time: 0, // 每区加时
  start: 0, // 起始半径加成
  bolt: 0, // 雷暴等级
  twin: 0, // 小旋风伙伴
  wall: 0, // 风墙：撞开对手
}

type Def = { name: string; desc: string; icon: string; max: number; apply: (p: Perks) => void }

export const perks = {
  speed: { name: '疾风', desc: '移动更快', icon: 'speed', max: 3, apply: (p) => (p.speed *= 1.18) },
  pull: {
    name: '吸力',
    desc: '吸取范围更大',
    icon: 'pull',
    max: 3,
    apply: (p) => (p.pull *= 1.25),
  },
  crush: {
    name: '碎墙',
    desc: '更快拆掉大楼',
    icon: 'crush',
    max: 3,
    apply: (p) => (p.crush *= 1.5),
  },
  growth: {
    name: '卷积',
    desc: '成长更快',
    icon: 'growth',
    max: 3,
    apply: (p) => (p.growth *= 1.15),
  },
  time: { name: '续风', desc: '每区多 10 秒', icon: 'time', max: 2, apply: (p) => (p.time += 10) },
  start: { name: '起势', desc: '开局更大', icon: 'start', max: 2, apply: (p) => (p.start += 0.8) },
  bolt: {
    name: '雷暴',
    desc: '雷击劈碎附近建筑',
    icon: 'bolt',
    max: 3,
    apply: (p) => (p.bolt += 1),
  },
  twin: { name: '双涡', desc: '小旋风随行吞食', icon: 'twin', max: 2, apply: (p) => (p.twin += 1) },
  wall: {
    name: '风墙',
    desc: '撞开对手并削其体型',
    icon: 'wall',
    max: 1,
    apply: (p) => (p.wall += 1),
  },
} satisfies Record<string, Def>

export type PerkId = keyof typeof perks
export const perkIds = Object.keys(perks) as PerkId[]

export function computePerks(levels: Partial<Record<PerkId, number>>) {
  const p = { ...basePerks }
  for (const id of perkIds) for (let i = 0; i < (levels[id] ?? 0); i++) perks[id].apply(p)
  return p
}
