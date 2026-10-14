import type { Difficulty, FrameId, RunSettlement, RushRecord } from '../types'
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
  const difficulty = number(data.difficulty, 3) as Difficulty
  const difficultyBonus = number(data.difficultyBonus, 143)
  return {
    outcome: data.outcome,
    base,
    kills,
    waves,
    bosses,
    victory,
    difficultyBonus,
    coins: base + kills + waves + bosses + victory + difficultyBonus,
    killCount: number(data.killCount, 100_000),
    wave: Math.max(1, number(data.wave, 9)),
    seconds: number(data.seconds, 86_400),
    difficulty,
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
    difficulty: 0,
    highestDifficulty: 0,
    difficultyWins: [0, 0, 0, 0],
    mouseAim: false,
    aimVersion: 1,
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
    const wins = number(data.wins)
    const highestDifficulty = number(data.highestDifficulty ?? (wins > 0 ? 1 : 0), 3) as Difficulty
    const difficultyWins = [0, 1, 2, 3].map((index) =>
      number(
        Array.isArray(data.difficultyWins) ? data.difficultyWins[index] : index === 0 ? wins : 0,
      ),
    ) as RushRecord['difficultyWins']
    return {
      bestTime: number(data.bestTime),
      bestKills: number(data.bestKills),
      wins,
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
      highestDifficulty,
      difficulty: number(data.difficulty, highestDifficulty) as Difficulty,
      difficultyWins,
      mouseAim: data.aimVersion === 1 && data.mouseAim === true,
      aimVersion: 1,
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
