import type { MetaId, ToolDefinition } from '../types'

// 作用于轨迹、碰撞与回收的工具
export const tools: ToolDefinition[] = [
  {
    id: 'pierce',
    name: '穿岩钻',
    effect: '穿过第一块矿壳，继续钻向后方目标',
    color: '#eda86c',
    icon: 'drill',
  },
  {
    id: 'chain',
    name: '连锁芯',
    effect: '命中时把冲击传给相邻矿体',
    color: '#deb65f',
    icon: 'chain',
  },
  {
    id: 'magnet',
    name: '拾矿帆',
    effect: '返航展开拾矿帆，扫回散矿并多装 3 件',
    color: '#82b89c',
    icon: 'magnet',
  },
  {
    id: 'drone',
    name: '助手机',
    effect: '独立小探针开采普通矿并运回基地',
    color: '#8abcc7',
    icon: 'drone',
  },
  {
    id: 'split',
    name: '散射钻',
    effect: '每次钻击分出侧向冲击，剥掉两侧矿壳',
    color: '#b4a3cb',
    icon: 'split',
  },
  { id: 'saw', name: '环锯', effect: '钻探时切开身边一圈矿体', color: '#cbaa7e', icon: 'saw' },
  {
    id: 'vent',
    name: '冷却喷口',
    effect: '共鸣喷出冷雾，熄灭气泡并推开碎矿',
    color: '#92c9c2',
    icon: 'vent',
  },
  {
    id: 'winch',
    name: '快收绞盘',
    effect: '返航提速，并把沿缆矿石直接卷回',
    color: '#d69caf',
    icon: 'winch',
  },
]

export const regions = [
  { name: '浅铜矿湾', color: '#cbdac7', ground: '#c8b7a0', mineral: 'copper' },
  { name: '琥珀裂谷', color: '#ded0ab', ground: '#aa8972', mineral: 'amber' },
  { name: '翠玉深境', color: '#bdcfc9', ground: '#748e88', mineral: 'jade' },
] as const

export const metaDefinitions = [
  {
    id: 'spool' as MetaId,
    name: '长缆轴',
    description: '扩大可到达的矿场，出钻更有力',
    effect: '缆长 +70，发射速度 +8%',
    maxLevel: 5,
    baseCost: 60,
  },
  {
    id: 'cooling' as MetaId,
    name: '循环散热',
    description: '钻头更快散去热量',
    effect: '持续散热 +20%',
    maxLevel: 5,
    baseCost: 80,
  },
  {
    id: 'bag' as MetaId,
    name: '矿袋',
    description: '保留更多可见的随行矿石',
    effect: '载荷上限 +2，负重影响减轻',
    maxLevel: 5,
    baseCost: 70,
  },
]

export function metaCost(id: MetaId, level: number) {
  const base = metaDefinitions.find((item) => item.id === id)?.baseCost ?? 60
  return { coins: Math.round(base * 1.65 ** Math.max(0, level)), cores: 1 + Math.floor(level / 2) }
}

export const base = { x: 0, y: 70 }
export const bounds = { minX: -620, maxX: 620, minY: 190, maxY: 920 }

export const mineralValue = { stone: 1, copper: 2, amber: 4, jade: 6, volatile: 4, relic: 0 }
