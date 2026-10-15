import type { River } from './world/river'
import type { Rng } from './world/math'
import { forkLength, lakeLength, reachLength, regions, type ForkReward } from '../data/regions'

// 路线：河段 / 分叉 / Boss 湖 / 河域交界，按 y 向前铺设
export class Route {
  segments: Segment[] = []
  private plan: Plan[] = []
  private cursor: number

  constructor(
    readonly river: River,
    readonly rng: Rng,
    start: number,
  ) {
    this.cursor = start
    regions.forEach((_, r) => {
      if (r > 0) this.plan.push({ kind: 'gate', region: r })
      this.plan.push({ kind: 'reach', region: r }, { kind: 'fork', region: r })
      this.plan.push({ kind: 'reach', region: r }, { kind: 'fork', region: r })
      this.plan.push({ kind: 'reach', region: r }, { kind: 'lake', region: r })
    })
    this.plan.push({ kind: 'finale', region: regions.length - 1 })
  }

  // 铺设到 limit（更小的 y）
  ensure(limit: number) {
    while (this.cursor > limit && this.plan.length) {
      const last = this.segments[this.segments.length - 1]
      if (last?.kind === 'lake' && !last.cleared) return
      const next = this.plan.shift()!
      const len = lengths[next.kind]
      const seg: Segment = {
        ...next,
        bottom: this.cursor,
        top: this.cursor - len,
        index: this.segments.length,
      }
      if (seg.kind === 'fork') {
        const pool: ForkReward[] = ['shrine', 'market', 'storm', 'bloom']
        const a = this.rng.pick(pool)
        const b = this.rng.pick(pool.filter((p) => p !== a))
        seg.options = [a, b]
        this.river.islands.push({ top: seg.top + 60, bottom: seg.bottom - 140, r: 62 })
      }
      if (seg.kind === 'lake') {
        const pool = { top: seg.top, bottom: seg.bottom - 120, extra: 120 }
        seg.pool = pool
        this.river.pools.push(pool)
      }
      this.segments.push(seg)
      this.cursor = seg.top
    }
  }

  at(y: number) {
    for (const s of this.segments) if (y <= s.bottom && y > s.top) return s
    return this.segments[this.segments.length - 1]
  }

  // 岸线粗糙度：交界段平滑过渡
  rough(y: number) {
    const seg = this.at(y)
    if (!seg) return 1
    if (seg.kind !== 'gate') return roughness[seg.region]
    const t = (seg.bottom - y) / (seg.bottom - seg.top)
    const a = roughness[seg.region - 1],
      b = roughness[seg.region]
    const k = t * t * (3 - 2 * t)
    return a + (b - a) * k
  }

  prev(seg: Segment) {
    return this.segments[seg.index - 1]
  }

  // 首领倒下：湖面在前方收拢
  closeLake(seg: Segment, top: number) {
    if (!seg.pool || top <= seg.top) return
    seg.top = top
    seg.pool.top = top
    this.cursor = top
  }

  // Boss 未除时湖面向前延展，后续路段暂不铺设
  extendLake(seg: Segment, headY: number) {
    if (!seg.pool || seg.cleared) return
    const want = headY - 1300
    if (want >= seg.top) return
    seg.top = want
    seg.pool.top = want
    this.cursor = want
  }
}

const roughness = [1, 0.15, 1.3]

const lengths = { reach: reachLength, fork: forkLength, lake: lakeLength, gate: 700, finale: 1600 }

type Plan = { kind: Segment['kind']; region: number }

export type Segment = {
  kind: 'reach' | 'fork' | 'lake' | 'gate' | 'finale'
  region: number
  index: number
  top: number
  bottom: number
  mod?: 'storm' | 'bloom'
  options?: [ForkReward, ForkReward]
  chosen?: ForkReward
  pool?: { top: number; bottom: number; extra: number }
  spawned?: boolean
  cleared?: boolean
}
