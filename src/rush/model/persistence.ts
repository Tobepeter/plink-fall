import type { FrameId, RushRecord } from '../types'
import { saveKey } from './data'

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
const frames: FrameId[] = ['runner', 'warden', 'spark']
const number = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0

export function readRecord(storage?: StoragePort): RushRecord {
  const blank: RushRecord = {
    bestTime: 0,
    bestKills: 0,
    wins: 0,
    bossKills: 0,
    unlocked: ['runner'],
    selected: 'runner',
    muted: false,
  }
  try {
    const data = JSON.parse(storage?.getItem(saveKey) || 'null')
    if (!data || typeof data !== 'object') return blank
    const unlocked = frames.filter((f) => f === 'runner' || data.unlocked?.includes(f))
    return {
      bestTime: number(data.bestTime),
      bestKills: number(data.bestKills),
      wins: number(data.wins),
      bossKills: number(data.bossKills),
      unlocked,
      selected: unlocked.includes(data.selected) ? data.selected : 'runner',
      muted: data.muted === true,
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
