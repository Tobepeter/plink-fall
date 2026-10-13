import { Emitter } from '../core/Emitter'
import { OFFLINE_CAP_SEC, OFFLINE_EFFICIENCY, SAVE_KEY } from '../core/config'

export type UpgradeId = 'rate' | 'value' | 'peg' | 'mult' | 'rows' | 'gold' | 'multi'

export interface UpgradeDef {
  id: UpgradeId
  name: string
  icon: string
  base: number
  growth: number
  max: number
  unlockAt: number
  effect: (lvl: number) => string
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'rate', name: '掉落速度', icon: 'timer', base: 8, growth: 1.72, max: 40, unlockAt: 0,
    effect: (l) => `${(1 / dropInterval(l)).toFixed(1)} 球/秒` },
  { id: 'value', name: '球价值', icon: 'gem', base: 20, growth: 1.95, max: 200, unlockAt: 6,
    effect: (l) => `×${fmtShort(ballValue(l))}` },
  { id: 'peg', name: '钉子收益', icon: 'sparkles', base: 45, growth: 2.0, max: 200, unlockAt: 25,
    effect: (l) => `+${fmtShort(pegValue(l))}/次` },
  { id: 'mult', name: '倍率强化', icon: 'trending', base: 300, growth: 2.5, max: 200, unlockAt: 200,
    effect: (l) => `×${multBoost(l).toFixed(2)}` },
  { id: 'rows', name: '扩展钉板', icon: 'rows', base: 1500, growth: 5, max: 8, unlockAt: 900,
    effect: (l) => `${8 + l} 行` },
  { id: 'gold', name: '金球概率', icon: 'coins', base: 5000, growth: 2.8, max: 12, unlockAt: 3000,
    effect: (l) => `${Math.round(goldChance(l) * 100)}% (×10)` },
  { id: 'multi', name: '多球齐发', icon: 'layers', base: 40000, growth: 7, max: 4, unlockAt: 20000,
    effect: (l) => `每次 ${1 + l} 球` },
]

function fmtShort(n: number) {
  return n < 10 ? n.toFixed(1).replace(/\.0$/, '') : n < 1000 ? Math.round(n).toString() : n.toExponential(1)
}
export const dropInterval = (l: number) => Math.max(0.07, 1.1 * Math.pow(0.9, l))
export const ballValue = (l: number) => 1 + l * 0.7
export const pegValue = (l: number) => 0.1 * (1 + l * 0.8)
export const multBoost = (l: number) => Math.pow(1.15, l)
export const goldChance = (l: number) => Math.min(0.36, l * 0.03)

export const PRESTIGE_MIN = 1e5
export const shardsFor = (runEarned: number) => Math.floor(Math.sqrt(runEarned / PRESTIGE_MIN) * 2)

interface SaveData {
  coins: number
  runEarned: number
  totalEarned: number
  shards: number
  levels: Record<UpgradeId, number>
  rate: number
  t: number
  muted: boolean
  prestiges: number
}

const zeroLevels = (): Record<UpgradeId, number> => ({ rate: 0, value: 0, peg: 0, mult: 0, rows: 0, gold: 0, multi: 0 })

/** All persistent game state + progression rules. UI and scene read from this. */
export class Economy extends Emitter {
  coins = 0
  runEarned = 0
  totalEarned = 0
  shards = 0
  prestiges = 0
  muted = false
  levels = zeroLevels()
  /** Smoothed income per second. */
  rate = 0
  private windowEarn = 0
  private windowT = 0
  offlineGain: { amount: number; seconds: number } | null = null
  onRowsChanged: (() => void) | null = null

  get prestigeMul() {
    return 1 + this.shards * 0.25
  }
  get rows() {
    return 8 + this.levels.rows
  }

  cost(id: UpgradeId) {
    const d = UPGRADES.find((u) => u.id === id)!
    return Math.ceil(d.base * Math.pow(d.growth, this.levels[id]))
  }
  isMaxed(id: UpgradeId) {
    return this.levels[id] >= UPGRADES.find((u) => u.id === id)!.max
  }
  unlocked(d: UpgradeDef) {
    return this.runEarned >= d.unlockAt || this.levels[d.id] > 0 || this.prestiges > 0
  }
  nextUnlock() {
    return UPGRADES.find((d) => !this.unlocked(d))
  }

  buy(id: UpgradeId) {
    const c = this.cost(id)
    if (this.coins < c || this.isMaxed(id)) return false
    this.coins -= c
    this.levels[id]++
    if (id === 'rows') this.onRowsChanged?.()
    this.emit()
    return true
  }

  earn(raw: number) {
    const v = raw * this.prestigeMul
    this.coins += v
    this.runEarned += v
    this.totalEarned += v
    this.windowEarn += v
    return v
  }

  tick(dt: number) {
    this.windowT += dt
    if (this.windowT >= 1) {
      const inst = this.windowEarn / this.windowT
      this.rate = this.rate === 0 ? inst : this.rate * 0.8 + inst * 0.2
      this.windowEarn = 0
      this.windowT = 0
    }
  }

  canPrestige() {
    return shardsFor(this.runEarned) > 0
  }
  prestige() {
    const s = shardsFor(this.runEarned)
    if (s <= 0) return
    this.shards += s
    this.prestiges++
    this.coins = 0
    this.runEarned = 0
    this.rate = 0
    this.levels = zeroLevels()
    this.onRowsChanged?.()
    this.save()
    this.emit()
  }

  toggleMute() {
    this.muted = !this.muted
    this.emit()
  }

  save() {
    const d: SaveData = {
      coins: this.coins, runEarned: this.runEarned, totalEarned: this.totalEarned, shards: this.shards,
      levels: this.levels, rate: this.rate, t: Date.now(), muted: this.muted, prestiges: this.prestiges,
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(d))
    } catch {
      /* storage full / private mode */
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Partial<SaveData>
      this.coins = d.coins ?? 0
      this.runEarned = d.runEarned ?? 0
      this.totalEarned = d.totalEarned ?? 0
      this.shards = d.shards ?? 0
      this.prestiges = d.prestiges ?? 0
      this.muted = d.muted ?? false
      this.levels = { ...zeroLevels(), ...(d.levels ?? {}) }
      this.rate = d.rate ?? 0
      if (d.t) this.grantOffline((Date.now() - d.t) / 1000)
    } catch {
      /* corrupted save: start fresh */
    }
  }

  /** Offline / background earnings estimated from smoothed rate. */
  grantOffline(seconds: number) {
    if (seconds < 30 || this.rate <= 0) return
    const s = Math.min(seconds, OFFLINE_CAP_SEC)
    const amount = this.rate * s * OFFLINE_EFFICIENCY
    this.coins += amount
    this.runEarned += amount
    this.totalEarned += amount
    this.offlineGain = { amount, seconds: s }
    this.emit()
  }
  dismissOffline() {
    this.offlineGain = null
    this.emit()
  }
}
