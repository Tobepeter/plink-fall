import type { Stats, BlessingId } from '../data/blessings'
import type { FollowerKind } from '../data/kinds'
import type { ForkReward } from '../data/regions'
import type { ShadowKind } from './shadows'
import type { BoatId } from '../data/workshop'

// 开局配置：由局外成长决定
export type RunConfig = {
  seed: number
  pool: FollowerKind[]
  start: FollowerKind[]
  loop: number // 通关轮次，首领加强
  boat?: BoatId
  demo?: boolean // 标题页漂流，无险阻
  extra?: (s: Stats) => void
}

export type DriftEvent =
  | { type: 'tap'; x: number; y: number }
  | { type: 'hurt'; x: number; y: number; flame: number }
  | { type: 'lose'; x: number; y: number; kind: string }
  | { type: 'join'; x: number; y: number; kind: string }
  | { type: 'shield'; x: number; y: number }
  | { type: 'absorb'; x: number; y: number }
  | { type: 'petal'; x: number; y: number }
  | { type: 'level'; level: number }
  | { type: 'kill'; x: number; y: number; kind: ShadowKind }
  | { type: 'zap'; points: { x: number; y: number }[] }
  | { type: 'pulse'; x: number; y: number }
  | { type: 'choose'; reward: ForkReward; side: number; x: number; y: number }
  | { type: 'offer' }
  | { type: 'shop' }
  | { type: 'bless'; id: BlessingId }
  | { type: 'buy'; item: string }
  | { type: 'segment'; kind: string }
  | { type: 'region'; region: number }
  | { type: 'boss'; name: string }
  | { type: 'boss-tell'; x: number; y: number; dir: number }
  | { type: 'boss-stun'; x: number; y: number }
  | { type: 'boss-dead'; x: number; y: number }
  | { type: 'reshape'; y0: number; y1: number }
  | { type: 'finale' }
  | { type: 'over' }
  | { type: 'win' }
