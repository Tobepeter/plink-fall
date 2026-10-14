import type { FrameId, RunSettlement, RushRecord } from '../types'
import { saveKey } from './data'
import { emptyMeta, metaUpgrades } from './meta/progression'

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
const frames: FrameId[] = ['runner', 'warden', 'spark']
const number = (v: unknown, max = 1_000_000_000) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0

function readSettlement(value: unknown): RunSettlement | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (data.outcome !== 'dead' && data.outcome !== 'won') return null
  const base = number(data.base, 12)
  const kills = number(data.kills, 80)
  const waves = number(data.waves, 27)
  const bosses = number(data.bosses, 36)
  const victory = data.outcome === 'won' ? number(data.victory, 24) : 0
  return {
    outcome: data.outcome,
    base,
    kills,
    waves,
    bosses,
    victory,
    coins: base + kills + waves + bosses + victory,
    killCount: number(data.killCount, 100_000),
    wave: Math.max(1, number(data.wave, 9)),
    seconds: number(data.seconds, 86_400),
  }
}

export function readRecord(storage?: StoragePort): RushRecord {
  const blank: RushRecord = {
    bestTime: 0,
    bestKills: 0,
    wins: 0,
    bossKills: 0,
    unlocked: ['runner'],
    selected: 'runner',
    muted: false,
    visited: false,
    coins: 0,
    totalCoins: 0,
    runs: 0,
    meta: emptyMeta(),
    lastRun: null,
  }
  try {
    const data = JSON.parse(storage?.getItem(saveKey) || 'null')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return blank
    const unlocked = frames.filter(
      (f) => f === 'runner' || (Array.isArray(data.unlocked) && data.unlocked.includes(f)),
    )
    const meta = emptyMeta()
    for (const def of metaUpgrades) meta[def.id] = number(data.meta?.[def.id], def.maxLevel)
    const legacy = ['bestTime', 'bestKills', 'selected', 'unlocked', 'muted'].some((key) =>
      Object.hasOwn(data, key),
    )
    const coins = number(data.coins)
    return {
      bestTime: number(data.bestTime),
      bestKills: number(data.bestKills),
      wins: number(data.wins),
      bossKills: number(data.bossKills),
      unlocked,
      selected: unlocked.includes(data.selected) ? data.selected : 'runner',
      muted: data.muted === true,
      visited: data.visited === true || (data.visited === undefined && legacy),
      coins,
      totalCoins: Math.max(coins, number(data.totalCoins)),
      runs: number(data.runs),
      meta,
      lastRun: readSettlement(data.lastRun),
    }
  } catch {
    return blank
  }
}

export function writeRecord(record: RushRecord, storage?: StoragePort) {
  try {
    storage?.setItem(saveKey, JSON.stringify(record))
  } catch {
    /* 存储不可用时仍可继续当前局 */
  }
}
