import type { RushState, UpgradeId } from '../../types'
import { level } from '../math'

// 下一级真实行为，UI 不维护第二套数值
export function upgradeHint(s: RushState, id: UpgradeId) {
  const n = Math.min(5, level(s, id) + 1)
  const number = (v: number) => Number(v.toFixed(2))
  const hints: Record<UpgradeId, string> = {
    ricochet: `命中后转向 ${n + 1} 次`,
    orbit: `${n + 1} 枚环刃 · 每击 ${number(1.8 + n * 0.45)}`,
    chain: `电弧再跳 ${n + 2} 人 · 每跳 ${number(0.9 + n * 0.35)}`,
    split: `${3 + Math.floor((n - 1) / 2) * 2} 路开火 · 单弹 ${number(1 + Math.floor(n / 2) * 0.2 + level(s, 'pierce') * 0.08)}`,
    pierce: `穿过 ${n} 个目标 · 单弹 +${number(n * 0.08)}`,
    rocket: `每 ${number(Math.max(0.5, 1.55 - n * 0.13))}s 发射 · 爆炸 ${n + 3}`,
    drone: `${1 + Math.floor((n - 1) / 2)} 架炮机 · 单弹 ${number(1.2 + n * 0.15)}`,
    frost: `冰场范围 ${72 + n * 12} · 滞留 3s`,
    pulse: `每 ${number(Math.max(1.2, 3.2 - n * 0.25))}s 震波 · 伤害 ${n + 2}`,
    haste: `射速 +${n * 23}% · 冲刺 ${number(Math.max(0.85, 1.6 - n * 0.12))}s`,
    vital: '装甲上限 +1 · 修复 2 格 · 受击爆破',
    magnet: `吸取范围 ${185 + n * 115} · 冲刺牵引近敌`,
  }
  return hints[id]
}
