import type {
  ForgeState,
  ModuleDefinition,
  RecipeDefinition,
  RegionDefinition,
  ResearchDefinition,
  ResearchId,
} from './types'

// 构筑模块
export const modules: ModuleDefinition[] = [
  {
    id: 'turbo',
    name: '涡轮矿钻',
    subtitle: '让整条产线跑起来',
    effect: '采矿速度 +32%，输送速度 +8%',
    tradeoff: '每颗矿石额外产生热量',
    color: '#ffb575',
    maxLevel: 3,
  },
  {
    id: 'condenser',
    name: '凝晶舱',
    subtitle: '慢一点，长大一点',
    effect: '每颗结晶产量 +35%',
    tradeoff: '采矿速度 -6%，加工时间 +16%',
    color: '#90dcc9',
    maxLevel: 3,
  },
  {
    id: 'splitter',
    name: '双生分流器',
    subtitle: '矿石走上第二条路',
    effect: '采矿速度 +16%，每颗产量 +15%',
    tradeoff: '加工时间 +9%，热量小幅增加',
    color: '#aeb7ff',
    maxLevel: 3,
  },
  {
    id: 'magnet',
    name: '星尘磁环',
    subtitle: '把散落的价值吸回来',
    effect: '晶币收益 +45%，矿星奖励 +50%',
    tradeoff: '采矿速度 -8%',
    color: '#e9bdff',
    maxLevel: 3,
  },
  {
    id: 'battery',
    name: '共振电池',
    subtitle: '把下一次爆发攒好',
    effect: '充能速度 +60%，共振延长 2 秒',
    tradeoff: '共振期间热量增加',
    color: '#e9de8c',
    maxLevel: 3,
  },
  {
    id: 'prism',
    name: '棱镜晶核',
    subtitle: '每一颗都更明亮',
    effect: '每颗产量 +25%，晶币收益 +20%',
    tradeoff: '每颗矿石额外产生热量',
    color: '#ffa9be',
    maxLevel: 3,
  },
  {
    id: 'echo',
    name: '回声线圈',
    subtitle: '让爆发的余韵更长',
    effect: '共振加速额外 +35%，充能速度 +20%',
    tradeoff: '共振结束后恢复速度需要 3 秒',
    color: '#91d7ef',
    maxLevel: 3,
  },
  {
    id: 'insulator',
    name: '霜雾护套',
    subtitle: '高温构筑的好搭档',
    effect: '冷却速度 +80%，过热降速减轻',
    tradeoff: '采矿速度 -5%',
    color: '#b5e6ed',
    maxLevel: 3,
  },
]

export const research: ResearchDefinition[] = [
  { id: 'drill', name: '精密钻头', description: '永久增加 12% 采矿速度', maxLevel: 5, baseCost: 2 },
  {
    id: 'cooling',
    name: '循环冷却',
    description: '永久增加 18% 冷却速度',
    maxLevel: 5,
    baseCost: 4,
  },
  {
    id: 'value',
    name: '结晶学',
    description: '永久增加 15% 产量和晶币收益',
    maxLevel: 5,
    baseCost: 7,
  },
]

export const regions: RegionDefinition[] = [
  { name: '薄荷原野', subtitle: '第一颗晶石，从这里启程', color: '#95debf', recipe: 'mint' },
  { name: '琥珀沙洲', subtitle: '暖风里，藏着更富饶的矿脉', color: '#ffc785', recipe: 'amber' },
  { name: '玫瑰星谷', subtitle: '在夜色中，点亮你的新产线', color: '#e6a6d3', recipe: 'rose' },
]

export const recipes: RecipeDefinition[] = [
  { id: 'mint', name: '薄荷晶', description: '清亮的第一份结晶，来自薄荷原野', color: '#95debf' },
  { id: 'amber', name: '琥珀晶', description: '凝住一束暖光，来自琥珀沙洲', color: '#ffc785' },
  { id: 'rose', name: '玫瑰晶', description: '带着星光的余温，来自玫瑰星谷', color: '#e6a6d3' },
]

export function researchCost(id: ResearchId, level: number) {
  const base = research.find((item) => item.id === id)?.baseCost ?? 2
  return base + Math.max(0, Math.floor(level)) * 3
}

export function researchCoinCost(id: ResearchId, level: number) {
  const base = { drill: 40, cooling: 60, value: 90 }[id]
  return Math.round(base * 1.8 ** Math.max(0, Math.floor(level)))
}

export function orderReward(state: ForgeState) {
  return {
    coins: Math.round(state.goal * (1.8 + state.region * 0.25)),
    blueprints: state.orderIndex === 0 ? 2 : 3 + Math.floor(state.orderIndex / 3),
  }
}
