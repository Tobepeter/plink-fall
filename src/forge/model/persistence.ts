import { modules, recipes, regions } from './data'
import type { ForgeState, ModuleId, OreItem, RecipeId, ResearchId } from './types'

export const saveKey = 'codex-forge-save-v1'
export const offlineLimit = 4 * 60 * 60
export type ForgeStorage = Pick<Storage, 'getItem' | 'setItem'>

// 存档边界
export function browserStorage(): ForgeStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function orderGoal(region: number, orderIndex: number) {
  const base = [12, 55, 105, 165][orderIndex] ?? 165 + (orderIndex - 3) * 65
  return Math.ceil(base * (1 + region * 0.18))
}

export function initialState(now: number): ForgeState {
  return {
    started: false,
    paused: false,
    muted: false,
    elapsed: 0,
    region: 0,
    orderIndex: 0,
    deliveries: 0,
    totalDeliveries: 0,
    goal: 12,
    stock: 0,
    coins: 0,
    blueprints: 0,
    totalProduced: 0,
    heat: 0,
    charge: 1,
    burstRemaining: 0,
    rate: 1.05,
    modules: {},
    research: { drill: 0, cooling: 0, value: 0 },
    recipes: [],
    choices: [],
    items: [],
    meteor: null,
    offline: null,
    lastReward: null,
    savedAt: now,
    notice: '',
  }
}

export function finite(value: unknown, fallback: number, min = 0, max = 1e12) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

// 不信任存储中的数值与嵌套结构
export function sanitizeState(raw: unknown, now: number): ForgeState {
  const data = object(raw)
  const state = initialState(now)
  state.started = data.started === true
  state.paused = data.paused === true
  state.muted = data.muted === true
  state.region = Math.floor(finite(data.region, 0, 0, 999))
  state.orderIndex = Math.floor(finite(data.orderIndex, 0, 0, 9999))
  state.deliveries = Math.floor(finite(data.deliveries, state.orderIndex, 0, 9999))
  state.totalDeliveries = Math.max(
    state.deliveries,
    Math.floor(finite(data.totalDeliveries, 0, 0, 1e6)),
  )
  state.goal = orderGoal(state.region, state.orderIndex)
  for (const key of ['stock', 'coins', 'blueprints', 'totalProduced', 'elapsed'] as const) {
    state[key] = finite(data[key], 0)
  }
  state.heat = finite(data.heat, 0, 0, 100)
  state.charge = finite(data.charge, 1, 0, 1)
  state.burstRemaining = finite(data.burstRemaining, 0, 0, 13)
  state.savedAt = finite(data.savedAt, now, 0, now)
  const savedModules = object(data.modules)
  for (const definition of modules) {
    const level = Math.floor(finite(savedModules[definition.id], 0, 0, definition.maxLevel))
    if (level > 0) state.modules[definition.id] = level
  }
  const savedResearch = object(data.research)
  for (const id of ['drill', 'cooling', 'value'] as ResearchId[]) {
    state.research[id] = Math.floor(finite(savedResearch[id], 0, 0, 5))
  }
  if (Array.isArray(data.recipes)) {
    const savedRecipes = data.recipes
    state.recipes = recipes
      .filter((recipe) => savedRecipes.includes(recipe.id))
      .map((recipe) => recipe.id)
  }
  if (state.started && !state.recipes.includes(regions[state.region % regions.length].recipe)) {
    state.recipes.push(regions[state.region % regions.length].recipe)
  }
  if (Array.isArray(data.choices)) {
    const validChoices = data.choices.filter((id): id is ModuleId =>
      modules.some(
        (module) => module.id === id && (state.modules[module.id] ?? 0) < module.maxLevel,
      ),
    )
    state.choices = [...new Set(validChoices)].slice(0, 3)
  }
  if (Array.isArray(data.items)) {
    const ids = new Set<number>()
    for (const rawItem of data.items.slice(0, 80)) {
      const item = object(rawItem)
      const id = Math.floor(finite(item.id, -1, -1, 1e12))
      if (id < 0 || ids.has(id)) continue
      ids.add(id)
      state.items.push({
        id,
        progress: finite(item.progress, 0, 0, 0.9999),
        lane: Math.floor(finite(item.lane, 0, 0, 2)),
        kind: recipes.some((recipe) => recipe.id === item.kind)
          ? (item.kind as RecipeId)
          : regions[state.region % 3].recipe,
        amount: finite(item.amount, 1, 0.1, 12),
      } satisfies OreItem)
    }
  }
  const meteor = object(data.meteor)
  if (state.totalDeliveries > 0 && finite(meteor.remaining, 0, 0, 8) > 0) {
    state.meteor = {
      remaining: finite(meteor.remaining, 0, 0, 8),
      reward: finite(meteor.reward, 12, 1, 10000),
    }
  }
  return state
}

export function readSave(storage: ForgeStorage | null, now: number) {
  const initial = initialState(now)
  if (!storage) return { state: initial, notice: '浏览器暂不允许保存，本次仍可正常游玩' }
  try {
    const text = storage.getItem(saveKey)
    if (!text) return { state: initial, notice: '' }
    if (text.length > 250000) return { state: initial, notice: '存档过大，已安全开启新工坊' }
    const data = object(JSON.parse(text))
    if (data.version !== 1) return { state: initial, notice: '旧存档无法读取，已安全开启新工坊' }
    return { state: sanitizeState(data.state, now), notice: '' }
  } catch {
    return { state: initial, notice: '存档暂时无法读取，本次仍可正常游玩' }
  }
}

export function writeSave(storage: ForgeStorage | null, state: ForgeState) {
  if (!storage) return false
  try {
    storage.setItem(saveKey, JSON.stringify({ version: 1, state }))
    return true
  } catch {
    return false
  }
}
