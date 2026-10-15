import type { FollowerKind } from '../data/kinds'
import type { BoatId, UpgradeId } from '../data/workshop'
import { boats, kindCosts, upgrades } from '../data/workshop'
import type { RunConfig } from '../model/types'

// 局外存档：愿、夜空、解锁与修习
export const initialSave = {
  version: 1,
  wishes: 0,
  sky: 0, // 累计放飞的灯
  kinds: ['warm', 'jade'] as FollowerKind[],
  boats: ['paper'] as BoatId[],
  boat: 'paper' as BoatId,
  upgrades: { start: 0, ripple: 0, light: 0, flame: 0 } as Record<UpgradeId, number>,
  best: 0, // 最远河域序号
  runs: 0,
  wins: 0,
  lastSeen: 0,
  hinted: false,
  muted: false,
}

export type Save = typeof initialSave

const key = 'claude-drift-save-v1'

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return structuredClone(initialSave)
    const data = JSON.parse(raw) as Partial<Save>
    return {
      ...structuredClone(initialSave),
      ...data,
      upgrades: { ...initialSave.upgrades, ...data.upgrades },
    }
  } catch {
    return structuredClone(initialSave)
  }
}

export function writeSave(save: Save) {
  try {
    save.lastSeen = Date.now()
    localStorage.setItem(key, JSON.stringify(save))
  } catch {
    // 隐私模式等不可写时静默
  }
}

// 夜空星光：离线最多 8 小时，按放飞的灯数略增
export function starlight(save: Save, now = Date.now()) {
  if (!save.lastSeen) return 0
  const hours = Math.min(8, Math.max(0, (now - save.lastSeen) / 3600000))
  if (hours < 0.1) return 0
  return Math.floor(hours * (3 + Math.min(12, save.sky * 0.02)))
}

// 由存档生成开局配置
export function runConfig(save: Save, seed: number): RunConfig {
  const up = save.upgrades
  const start: FollowerKind[] = ['warm', 'jade', 'warm']
  for (let i = 0; i < up.start; i++)
    start.push(i % 2 ? 'warm' : save.kinds[(i + 1) % save.kinds.length])
  if (save.boat === 'lotus') start.unshift('rose')
  return {
    seed,
    pool: save.kinds,
    start,
    loop: save.wins,
    boat: save.boat,
    extra: (s) => {
      s.rippleRadius *= 1 + up.ripple * 0.08
      s.ripplePower *= 1 + up.ripple * 0.08
      s.light *= 1 + up.light * 0.06
      s.burn *= 1 + up.light * 0.08
      s.maxFlame += up.flame + (save.boat === 'lotus' ? 1 : 0)
      if (save.boat === 'crane') {
        s.crane += 1
        s.lure *= 1.3
      }
    },
  }
}

// 灯坊购买
export function purchase(save: Save, item: ShopKey) {
  const [type, id] = item.split(':') as [string, string]
  let cost: number
  if (type === 'kind') {
    const kind = id as FollowerKind
    if (save.kinds.includes(kind)) return false
    cost = kindCosts[kind]
    if (save.wishes < cost) return false
    save.kinds.push(kind)
  } else if (type === 'boat') {
    const boat = id as BoatId
    if (save.boats.includes(boat)) {
      save.boat = boat
      return true
    }
    cost = boats[boat].cost
    if (save.wishes < cost) return false
    save.boats.push(boat)
    save.boat = boat
  } else {
    const up = id as UpgradeId
    const lv = save.upgrades[up]
    const costs: readonly number[] = upgrades[up].costs
    if (lv >= costs.length) return false
    cost = costs[lv]
    if (save.wishes < cost) return false
    save.upgrades[up] = lv + 1
  }
  save.wishes -= cost
  writeSave(save)
  return true
}

export type ShopKey = `kind:${FollowerKind}` | `boat:${BoatId}` | `up:${UpgradeId}`
