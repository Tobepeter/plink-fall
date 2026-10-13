export type ModuleId =
  'turbo' | 'condenser' | 'splitter' | 'magnet' | 'battery' | 'prism' | 'echo' | 'insulator'
export type ResearchId = 'drill' | 'cooling' | 'value'
export type RecipeId = 'mint' | 'amber' | 'rose'

export interface OreItem {
  id: number
  progress: number
  lane: number
  kind: RecipeId
  amount: number
}

export interface ForgeState {
  started: boolean
  paused: boolean
  muted: boolean
  elapsed: number
  region: number
  orderIndex: number
  deliveries: number
  totalDeliveries: number
  goal: number
  stock: number
  coins: number
  blueprints: number
  totalProduced: number
  heat: number
  charge: number
  burstRemaining: number
  rate: number
  modules: Partial<Record<ModuleId, number>>
  research: Record<ResearchId, number>
  recipes: RecipeId[]
  choices: ModuleId[]
  items: OreItem[]
  meteor: { remaining: number; reward: number } | null
  offline: { seconds: number; stock: number; coins: number } | null
  lastReward: { coins: number; blueprints: number } | null
  savedAt: number
  notice: string
}

export interface ModuleDefinition {
  id: ModuleId
  name: string
  subtitle: string
  effect: string
  tradeoff: string
  color: string
  maxLevel: number
}

export interface ResearchDefinition {
  id: ResearchId
  name: string
  description: string
  maxLevel: number
  baseCost: number
}

export interface RegionDefinition {
  name: string
  subtitle: string
  color: string
  recipe: RecipeId
}

export interface RecipeDefinition {
  id: RecipeId
  name: string
  description: string
  color: string
}

export interface ForgeEvent {
  type: 'produce' | 'boost' | 'install' | 'delivery' | 'jump' | 'meteor' | 'research'
  amount?: number
  kind?: RecipeId
  module?: ModuleId
}
