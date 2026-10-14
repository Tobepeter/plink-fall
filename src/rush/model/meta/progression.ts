import type { MetaLevels, MetaUpgradeId, RewardParts, RushRecord, RushState } from '../../types'

export interface MetaUpgradeDef {
  id: MetaUpgradeId
  name: string
  hint: string
  color: string
  icon: string
  maxLevel: number
  costs: number[]
  effect(level: number): string
}

// 永久强化与单局奖励
export const metaUpgrades: MetaUpgradeDef[] = [
  {
    id: 'firepower',
    name: '高能弹芯',
    hint: '所有武器伤害提升',
    color: '#ffca72',
    icon: 'crosshair',
    maxLevel: 3,
    costs: [12, 28, 48],
    effect: (level) => `伤害 +${level * 12}%`,
  },
  {
    id: 'armor',
    name: '强化装甲',
    hint: '每次出击携带更多装甲',
    color: '#69e6de',
    icon: 'shield',
    maxLevel: 2,
    costs: [16, 36],
    effect: (level) => `初始装甲 +${level} 格`,
  },
  {
    id: 'capacitor',
    name: '极速电容',
    hint: '射击与冲刺冷却缩短',
    color: '#99aeff',
    icon: 'gauge',
    maxLevel: 3,
    costs: [14, 30, 52],
    effect: (level) => `冷却 -${level * 8}%`,
  },
  {
    id: 'magnet',
    name: '回收线圈',
    hint: '更远处的经验自动飞来',
    color: '#69e6de',
    icon: 'magnet',
    maxLevel: 3,
    costs: [10, 24, 42],
    effect: (level) => `拾取范围 +${level * 35}`,
  },
]

export const emptyMeta = (): MetaLevels => ({ firepower: 0, armor: 0, capacitor: 0, magnet: 0 })

export function metaPrice(record: RushRecord, id: MetaUpgradeId) {
  const def = metaUpgrades.find((entry) => entry.id === id)
  return def?.costs[record.meta[id]] ?? 0
}

export function metaStats(levels: MetaLevels) {
  return {
    damage: 1 + levels.firepower * 0.12,
    armor: levels.armor,
    cooldown: 1 - levels.capacitor * 0.08,
    pickup: levels.magnet * 35,
  }
}

const count = (value: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0

// 预览不入账；结算由 Store 唯一提交
export function previewReward(s: RushState): RewardParts {
  const completed = s.phase === 'won' ? 9 : s.wave.index - 1 + Number(s.wave.phase === 'breather')
  const base = 12
  const kills = Math.min(80, Math.floor(count(s.kills, 100_000) / 2))
  const waves = count(completed, 9) * 3
  const bosses = count(s.bossesDefeated, 3) * 12
  const victory = s.phase === 'won' ? 24 : 0
  return { base, kills, waves, bosses, victory, coins: base + kills + waves + bosses + victory }
}
