import type { PerkId } from '../data/perks'
import type { PropKind } from '../data/props'
import { loadSave, type Save } from './save'

// 界面状态：运行时写入，React 订阅版本号
export type Phase = 'title' | 'play' | 'perk' | 'result' | 'shop'

export type Rival = {
  id: number
  name: string
  tint: string
  r: number
  x: number
  y: number
  show: boolean
  alive: boolean
}

export const initialHud = {
  left: 80,
  limit: 80,
  r: 1.6,
  goal: 9.5,
  start: 1.6,
  rank: 1,
  total: 1,
  district: 0,
  coins: 0, // 本局累计
  hit: false,
  combo: 0, // 连卷件数
  rivals: [] as Rival[],
}

export type Hud = typeof initialHud

export type Result = {
  win: boolean
  district: number
  coins: number
  mass: number
  eaten: number
  final: boolean
}

export class TwisterStore {
  phase: Phase = 'title'
  paused = false
  hud: Hud = { ...initialHud }
  offer: PerkId[] = []
  levels: Partial<Record<PerkId, number>> = {}
  result: Result | null = null
  save: Save = loadSave()
  toast: { text: string; kind?: PropKind; id: number } | null = null
  banner: { title: string; sub?: string; id: number } | null = null
  hint = false
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

  patch(data: Partial<Pick<TwisterStore, 'phase' | 'paused' | 'offer' | 'result' | 'hint'>>) {
    Object.assign(this, data)
    this.emit()
  }

  showToast(text: string, kind?: PropKind) {
    this.toast = { text, kind, id: ++this.seq }
    this.emit()
  }

  showBanner(title: string, sub?: string) {
    this.banner = { title, sub, id: ++this.seq }
    this.emit()
  }
}
