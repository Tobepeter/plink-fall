// 局外存档：金币、强化、风暴皮肤
export const skins = {
  plain: { name: '白风', tint: '#e8f6ff', cost: 0 },
  sand: { name: '沙暴', tint: '#f2c98a', cost: 120 },
  fire: { name: '火旋', tint: '#ff8a5a', cost: 220 },
  aqua: { name: '水龙', tint: '#7ad8ff', cost: 320 },
  night: { name: '夜岚', tint: '#b9a2ff', cost: 450 },
} as const

export type SkinId = keyof typeof skins

export const upgrades = {
  size: { name: '风眼', desc: '每区开局更大', costs: [40, 90, 160] },
  time: { name: '风期', desc: '每区多 5 秒', costs: [50, 110, 190] },
  speed: { name: '风速', desc: '移动更快', costs: [40, 90, 160] },
} as const

export type UpgradeId = keyof typeof upgrades

export const initialSave = {
  version: 1,
  coins: 0,
  best: 0, // 最远城区
  runs: 0,
  wins: 0,
  upgrades: { size: 0, time: 0, speed: 0 } as Record<UpgradeId, number>,
  skins: ['plain'] as SkinId[],
  skin: 'plain' as SkinId,
  muted: false,
  hinted: false,
}

export type Save = typeof initialSave

const key = 'claude-twister-save-v1'

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
    localStorage.setItem(key, JSON.stringify(save))
  } catch {
    // 隐私模式不可写时忽略
  }
}

export function buyUpgrade(save: Save, id: UpgradeId) {
  const lv = save.upgrades[id]
  const costs: readonly number[] = upgrades[id].costs
  if (lv >= costs.length || save.coins < costs[lv]) return false
  save.coins -= costs[lv]
  save.upgrades[id] = lv + 1
  writeSave(save)
  return true
}

export function buySkin(save: Save, id: SkinId) {
  if (save.skins.includes(id)) {
    save.skin = id
    writeSave(save)
    return true
  }
  if (save.coins < skins[id].cost) return false
  save.coins -= skins[id].cost
  save.skins.push(id)
  save.skin = id
  writeSave(save)
  return true
}
