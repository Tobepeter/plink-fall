import type { BlessingId } from '../data/blessings'
import type { ForkReward } from '../data/regions'
import type { ShopItem } from '../model/rewards'
import { loadSave, type Save } from './save'

// 界面状态仓库：运行时写入，React 订阅版本号
export const initialHud = {
  flame: 3,
  maxFlame: 3,
  glow: 0,
  need: 6,
  level: 0,
  petals: 0,
  train: 0,
  maxTrain: 9,
  region: 0,
  step: 0, // 本河域第几段
  forks: [null, null] as (ForkReward | null)[],
  boss: null as { name: string; hp: number } | null,
  shield: 0,
}

export type Hud = typeof initialHud
export type Phase = 'title' | 'play' | 'ending' | 'result' | 'workshop'

export type Result = {
  won: boolean
  region: number
  lanterns: number
  kills: number
  level: number
  reaches: number
  bosses: number
  wishes: number
}

export class DriftStore {
  phase: Phase = 'title'
  paused = false
  hud: Hud = { ...initialHud }
  offer: BlessingId[] | null = null
  shop: ShopItem[] | null = null
  result: Result | null = null
  save: Save = loadSave()
  banner: { title: string; sub?: string; id: number } | null = null
  toast: { text: string; id: number } | null = null
  hint = false
  gift = 0 // 离线星光
  version = 0
  private listeners = new Set<() => void>()
  private seq = 0

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getVersion = () => this.version

  emit() {
    this.version++
    for (const fn of this.listeners) fn()
  }

  patch(
    data: Partial<
      Pick<DriftStore, 'phase' | 'paused' | 'offer' | 'shop' | 'result' | 'hint' | 'gift'>
    >,
  ) {
    Object.assign(this, data)
    this.emit()
  }

  showBanner(title: string, sub?: string) {
    this.banner = { title, sub, id: ++this.seq }
    this.emit()
  }

  showToast(text: string) {
    this.toast = { text, id: ++this.seq }
    this.emit()
  }
}
