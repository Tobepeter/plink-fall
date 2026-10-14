import type { FrameId, UpgradeDef } from '../types'

export const saveKey = 'codex-rush-save-v1'
export const upgrades: UpgradeDef[] = [
  {
    id: 'ricochet',
    name: '弹射弹',
    hint: '命中后转向下一名敌人',
    color: '#6de5cc',
    icon: 'waypoints',
    maxLevel: 5,
  },
  {
    id: 'orbit',
    name: '环刃',
    hint: '两枚环刃持续扫开身边追兵',
    color: '#b8f076',
    icon: 'orbit',
    maxLevel: 5,
  },
  {
    id: 'chain',
    name: '电链',
    hint: '命中后电弧跳向附近敌群',
    color: '#a6b7ff',
    icon: 'zap',
    maxLevel: 5,
  },
  {
    id: 'split',
    name: '散射',
    hint: '每次开火发射三路子弹',
    color: '#f5d470',
    icon: 'split',
    maxLevel: 5,
  },
  {
    id: 'pierce',
    name: '穿透',
    hint: '弹道穿过前排，继续击中后排',
    color: '#73cfeb',
    icon: 'move-up-right',
    maxLevel: 5,
  },
  {
    id: 'rocket',
    name: '追踪火箭',
    hint: '额外发射火箭，命中炸开敌群',
    color: '#ff9d73',
    icon: 'rocket',
    maxLevel: 5,
  },
  {
    id: 'drone',
    name: '伴飞炮',
    hint: '无人机独立瞄准并持续开火',
    color: '#7bdcba',
    icon: 'bot',
    maxLevel: 5,
  },
  {
    id: 'frost',
    name: '冰径',
    hint: '冲刺留下冰场，冻住路径上的追兵',
    color: '#9bdef5',
    icon: 'snowflake',
    maxLevel: 5,
  },
  {
    id: 'pulse',
    name: '震荡环',
    hint: '周期震波推开并击伤近处敌人',
    color: '#db9ffa',
    icon: 'radio',
    maxLevel: 5,
  },
  {
    id: 'haste',
    name: '极速扳机',
    hint: '开火更快，冲刺冷却更短',
    color: '#f5ca79',
    icon: 'gauge',
    maxLevel: 5,
  },
  {
    id: 'vital',
    name: '修复甲',
    hint: '修复生命，并在受击时炸开敌群',
    color: '#f494a4',
    icon: 'heart',
    maxLevel: 5,
  },
  {
    id: 'magnet',
    name: '引力核',
    hint: '远处经验飞来，冲刺牵引敌群',
    color: '#c8aaef',
    icon: 'magnet',
    maxLevel: 5,
  },
]

export const frameDefinitions: {
  id: FrameId
  name: string
  hint: string
  color: string
  unlock: string
}[] = [
  { id: 'runner', name: '疾行者', hint: '轻快移动 · 平衡射击', color: '#71ead1', unlock: '已解锁' },
  {
    id: 'warden',
    name: '守卫',
    hint: '五格装甲 · 冲刺震波',
    color: '#f4c37b',
    unlock: '击败第一个 Boss',
  },
  {
    id: 'spark',
    name: '闪电',
    hint: '高速移动 · 天生电链',
    color: '#c5adff',
    unlock: '完成一次突围',
  },
]

export const enemyStats = {
  chaser: { hp: 3, speed: 96, radius: 17 },
  charger: { hp: 5, speed: 80, radius: 22 },
  shooter: { hp: 12, speed: 66, radius: 20 },
  splitter: { hp: 7, speed: 110, radius: 24 },
  brute: { hp: 20, speed: 72, radius: 33 },
  boss: { hp: 150, speed: 50, radius: 55 },
}
