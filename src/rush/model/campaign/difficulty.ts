import type { Difficulty } from '../../types'

export const difficultyDefinitions = [
  {
    id: 0,
    name: '初始封锁',
    hint: '标准敌群与弹幕',
    rewardMultiplier: 1,
    hpMultiplier: 1,
    speedMultiplier: 1,
    bulletExtra: 0,
    bulletSpeedMultiplier: 1,
    cooldownMultiplier: 1,
  },
  {
    id: 1,
    name: '升温封锁',
    hint: '更强编队 · 收益 ×1.25',
    rewardMultiplier: 1.25,
    hpMultiplier: 1.25,
    speedMultiplier: 1.08,
    bulletExtra: 1,
    bulletSpeedMultiplier: 1.06,
    cooldownMultiplier: 0.94,
  },
  {
    id: 2,
    name: '高压封锁',
    hint: '密集火线 · 收益 ×1.5',
    rewardMultiplier: 1.5,
    hpMultiplier: 1.55,
    speedMultiplier: 1.16,
    bulletExtra: 2,
    bulletSpeedMultiplier: 1.12,
    cooldownMultiplier: 0.88,
  },
  {
    id: 3,
    name: '极限封锁',
    hint: '精锐追猎 · 收益 ×1.8',
    rewardMultiplier: 1.8,
    hpMultiplier: 1.95,
    speedMultiplier: 1.24,
    bulletExtra: 3,
    bulletSpeedMultiplier: 1.18,
    cooldownMultiplier: 0.82,
  },
] as const

export const difficultyStats = (difficulty: Difficulty) => difficultyDefinitions[difficulty]
