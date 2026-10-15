import type { Run } from './run'
import type { Segment } from './route'
import { makeFloat } from './world/floats'
import { makeFirefly, makePetal } from './pickups'
import { makeShadow, type ShadowKind } from './shadows'
import { regions } from '../data/regions'
import type { FollowerKind } from '../data/kinds'

// 按路段铺设礁石、散灯、萤火、花瓣；按时间投放暗影
export class Spawner {
  y: number
  private timers = { fish: 2, moth: 3, eel: 6 }

  constructor(
    readonly run: Run,
    start: number,
  ) {
    this.y = start
  }

  // 分叉未选时，其后的河段先不铺设
  fill(limit: number) {
    const { route } = this.run
    while (this.y > limit) {
      const seg = route.at(this.y)
      if (!seg || this.y <= seg.top) break
      const prev = route.prev(seg)
      if (
        seg.kind === 'reach' &&
        prev?.kind === 'fork' &&
        !prev.chosen &&
        this.y < seg.bottom - 280
      )
        break
      this.chunk(seg, this.y)
      this.y -= 120
    }
  }

  private chunk(seg: Segment, y: number) {
    const { run } = this
    const rng = run.rng
    const region = regions[seg.region]
    const [left, right] = run.river.edges(y)
    const inWater = (x: number, yy: number, m: number) => run.river.depth(x, yy) > m
    const storm = seg.mod === 'storm',
      bloom = seg.mod === 'bloom'
    const fromStart = seg.bottom - y
    const calm =
      fromStart < (seg.index === 0 ? 700 : 280) || seg.kind === 'gate' || seg.kind === 'finale'
    const diff = run.difficulty
    if (seg.kind === 'reach' && !calm && !run.config.demo) {
      const pRock = 0.42 * region.rock * (1 + diff * 0.12) * (storm ? 1.45 : 1) * (bloom ? 0.5 : 1)
      if (rng.chance(pRock)) {
        const n = rng.chance(0.25 + diff * 0.05) ? rng.int(2, 3) : 1
        const x0 = rng.range(left + 70, right - 70)
        for (let i = 0; i < n; i++) {
          const r = rng.range(13, 25)
          const x = x0 + (i ? rng.range(-60, 60) : 0),
            yy = y + (i ? rng.range(-40, 40) : 0)
          if (this.roomy(x, yy, r)) run.river.addRock({ x, y: yy, r, seed: rng.int(0, 9999) })
        }
      }
    }
    if (seg.kind === 'fork' && fromStart > 260 && fromStart < 600 && rng.chance(0.25)) {
      const c = run.river.center(y)
      const x = rng.chance(0.5) ? rng.range(left + 30, c - 90) : rng.range(c + 90, right - 30)
      const r = rng.range(12, 18)
      if (this.roomy(x, y, r)) run.river.addRock({ x, y, r, seed: rng.int(0, 9999) })
    }
    const pLantern =
      seg.kind === 'finale' ? 0 : (bloom ? 0.5 : 0.15) * (seg.kind === 'lake' ? 0.4 : 1)
    if (rng.chance(pLantern)) {
      const x = rng.range(left + 30, right - 30)
      if (inWater(x, y, 24))
        run.loose.push(makeFloat(rng.pick(run.pool) as FollowerKind, x, y, false))
    }
    const pFly = seg.kind === 'finale' ? 0.9 : (bloom ? 0.42 : 0.24) * (calm ? 1.4 : 1)
    if (rng.chance(pFly)) {
      const nearBank = rng.chance(0.5)
      const x = nearBank
        ? rng.chance(0.5)
          ? left + rng.range(-10, 30)
          : right - rng.range(-10, 30)
        : rng.range(left + 40, right - 40)
      const n = rng.int(4, 7)
      for (let i = 0; i < n; i++)
        run.fireflies.push(makeFirefly(x + rng.range(-24, 24), y + rng.range(-24, 24)))
    }
    if (seg.kind !== 'finale' && rng.chance(storm ? 0.4 : 0.24)) {
      const x = rng.range(left + 30, right - 30)
      const n = rng.int(2, 4)
      for (let i = 0; i < n; i++) {
        const px = x + rng.range(-26, 26),
          py = y + rng.range(-30, 30)
        if (inWater(px, py, 14)) run.petals.push(makePetal(px, py))
      }
    }
  }

  // 礁石四周要么留出可过的水道，要么紧贴成一体，不留卡船的窄缝
  private roomy(x: number, y: number, r: number) {
    const { river } = this.run
    const gap = river.depth(x, y) - r
    if (gap < 46) return false
    for (const k of river.rocksNear(y - 90, y + 90)) {
      const g = Math.hypot(k.x - x, k.y - y) - k.r - r
      if (g > 4 && g < 42) return false
    }
    return true
  }

  // 暗影随时间投放
  direct(seg: Segment, dt: number) {
    const { run } = this
    if (run.config.demo || seg.kind === 'gate' || seg.kind === 'finale' || seg.kind === 'lake')
      return
    const region = regions[seg.region]
    const k =
      (seg.kind === 'fork' ? 0.35 : 1) *
      (seg.mod === 'storm' ? 2 : 1) *
      (seg.mod === 'bloom' ? 0.5 : 1)
    if (seg.bottom - run.head.y < 300) return
    const cap =
      2 + seg.region * 2 + (seg.mod === 'storm' ? 2 : 0) + Math.floor(run.train.length / 3)
    if (run.shadows.filter((s) => s.leave <= 0).length >= cap) return
    const rates: Record<ShadowKind, number> = {
      fish: (seg.index < 2 ? 0.12 : 0.17) * region.fish,
      moth: 0.22 * region.moth,
      eel: 0.08 * region.eel,
    }
    for (const kind of ['fish', 'moth', 'eel'] as ShadowKind[]) {
      const rate = rates[kind] * k * (1 + run.difficulty * 0.35)
      if (rate <= 0) continue
      this.timers[kind] -= dt * rate
      if (this.timers[kind] > 0) continue
      this.timers[kind] = 0.6 + run.rng.next() * 0.8
      this.spawnShadow(kind)
    }
  }

  spawnShadow(kind: ShadowKind, near?: { x: number; y: number }) {
    const { run } = this
    const rng = run.rng
    const head = near ?? run.head
    for (let tries = 0; tries < 8; tries++) {
      const behind = rng.chance(0.35)
      const y = behind ? head.y + rng.range(260, 360) : head.y - rng.range(160, 420)
      const [left, right] = run.river.edges(y)
      const side = rng.chance(0.5)
      const x =
        kind === 'moth'
          ? side
            ? left - rng.range(10, 60)
            : right + rng.range(10, 60)
          : rng.range(left + 24, right - 24)
      if (kind !== 'moth' && run.river.depth(x, y) < 24) continue
      run.shadows.push(makeShadow(kind, x, y, 1 + run.difficulty * 0.3))
      return
    }
  }
}
