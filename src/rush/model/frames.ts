import type { FrameId, RushState, Shot, UpgradeId } from '../types'
import { level } from './math'
import { metaStats } from './meta/progression'
import { upgrades } from './data'

export const frameStats: Record<
  FrameId,
  {
    hp: number
    speed: number
    dashCooldown: number
    startingSkill: UpgradeId
    skillName: string
    skillHint: string
    tradeoff: string
    abilityCooldown: number
    abilityDuration: number
    unlockCost: number
    bias: UpgradeId[]
  }
> = {
  runner: {
    hp: 4,
    speed: 320,
    dashCooldown: 1.45,
    startingSkill: 'ricochet',
    skillName: '破阵齐射',
    skillHint: '2.5 秒三路齐射 · 射速 ×1.8',
    tradeoff: '单发主炮伤害 -8%',
    abilityCooldown: 13,
    abilityDuration: 2.5,
    unlockCost: 0,
    bias: ['ricochet', 'split', 'pierce', 'haste'],
  },
  warden: {
    hp: 5,
    speed: 285,
    dashCooldown: 1.8,
    startingSkill: 'orbit',
    skillName: '堡垒冲击',
    skillHint: '近身震击 · 1.2 秒无敌',
    tradeoff: '移速较慢 · 主炮伤害 -15%',
    abilityCooldown: 18,
    abilityDuration: 1.2,
    unlockCost: 36,
    bias: ['orbit', 'pulse', 'vital', 'magnet'],
  },
  spark: {
    hp: 3,
    speed: 355,
    dashCooldown: 1.65,
    startingSkill: 'chain',
    skillName: '雷暴过载',
    skillHint: '最多 6 人电链 · 0.45 秒无敌',
    tradeoff: '初始装甲只有 3 格',
    abilityCooldown: 11,
    abilityDuration: 0.45,
    unlockCost: 60,
    bias: ['chain', 'frost', 'rocket', 'drone'],
  },
}

export function frameChoices(s: RushState): UpgradeId[] {
  const bias = frameStats[s.player.frame].bias.filter((id) => {
    const def = upgrades.find((item) => item.id === id)
    return def && level(s, id) < def.maxLevel
  })
  return [
    ...bias.filter((id) => level(s, id) > 0),
    ...bias.filter((id) => level(s, id) === 0),
  ].slice(0, 3)
}

export function frameDamage(s: RushState, kind?: Shot['kind']) {
  if (kind !== 'shot') return 1
  return s.player.frame === 'runner' ? 0.92 : s.player.frame === 'warden' ? 0.85 : 1
}

export const frameFireRate = (s: RushState) =>
  s.player.frame === 'runner' && s.abilityActive > 0 ? 1.8 : 1

export const frameBurstCount = (s: RushState) =>
  s.player.frame === 'runner' && s.abilityActive > 0 ? 3 : 1

export const frameDashCooldown = (s: RushState) =>
  Math.max(0.85, frameStats[s.player.frame].dashCooldown - level(s, 'haste') * 0.12) *
  metaStats(s.runMeta).cooldown

export const frameCharge = (s: RushState, amount: number) =>
  amount * (s.player.frame === 'spark' ? 1.15 : 1)
