import { River, type Rock } from './world/river'
import { Waves } from './world/waves'
import { Route, type Segment } from './route'
import { Spawner } from './spawner'
import { Combat } from './combat'
import { Boss } from './boss'
import { makeFloat, moveFloat, type Float } from './world/floats'
import { makeRng, type Rng } from './world/math'
import { burnShadow, stepShadow, type Shadow } from './shadows'
import { Ripples } from './ripples'
import { Procession } from './procession'
import {
  magnetRange,
  makeFirefly,
  makePetal,
  stepFirefly,
  stepPetal,
  type Firefly,
  type Petal,
} from './pickups'
import { regions } from '../data/regions'
import { computeStats, type BlessingId, type Stats } from '../data/blessings'
import type { FollowerKind } from '../data/kinds'
import { makeOffer, makeShop, type ShopItem } from './rewards'
import type { DriftEvent, RunConfig } from './types'

// 一局：路线推进、灯队物理、暗影、拾取、首领与奖励
export class Run {
  river: River
  waves: Waves
  route: Route
  spawner: Spawner
  combat: Combat
  ripples: Ripples
  procession: Procession
  rng: Rng
  train: Float[] = []
  loose: Float[] = []
  shadows: Shadow[] = []
  fireflies: Firefly[] = []
  petals: Petal[] = []
  events: DriftEvent[] = []
  boss: Boss | null = null
  levels: Partial<Record<BlessingId, number>> = {}
  stats: Stats
  pool: FollowerKind[]
  offer: BlessingId[] | null = null
  shop: ShopItem[] | null = null
  time = 0
  flame: number
  petalCount = 0
  glow = 0
  level = 0
  shield = 0
  over = false
  won = false
  seg: Segment
  tally = { reaches: 0, bosses: 0, kills: 0, best: 0, taps: 0 }
  rope = 30
  private near: Rock[] = []
  private flowTmp = { x: 0, y: 0 }

  constructor(readonly config: RunConfig) {
    this.rng = makeRng(config.seed)
    this.river = new River(config.seed)
    this.river.speed = regions[0].speed
    this.waves = new Waves(this.river)
    this.route = new Route(this.river, this.rng, 300)
    this.route.ensure(-3000)
    this.river.rough = (y) => this.route.rough(y)
    this.seg = this.route.at(0)
    this.spawner = new Spawner(this, -200)
    this.combat = new Combat(this)
    this.ripples = new Ripples(this)
    this.procession = new Procession(this)
    this.pool = config.pool
    this.stats = computeStats(this.levels, config.extra)
    this.flame = this.stats.maxFlame
    const head = makeFloat('head', this.river.center(0), 0, true)
    this.train.push(head)
    config.start.forEach((kind, i) =>
      this.train.push(makeFloat(kind, head.x, (i + 1) * this.rope, true)),
    )
    this.spawner.fill(head.y - 1000)
  }

  get head() {
    return this.train[0]
  }

  get difficulty() {
    return this.seg.region * 1.1 + Math.min(this.tally.reaches % 3, 2) * 0.3
  }

  get levelNeed() {
    return 6 + this.level * 4
  }

  // 点水：涟漪 + 推力环，回响追加
  tap(x: number, y: number) {
    if (this.over || this.won || this.river.depth(x, y) < 2) return false
    this.tally.taps++
    this.waves.splash(x, y, 2.6, 8)
    this.ripples.add(x, y)
    this.boss?.ripple(x, y, this)
    this.events.push({ type: 'tap', x, y })
    return true
  }

  step(dt: number) {
    this.time += dt
    const head = this.head
    if (!this.over && !this.won) {
      this.route.ensure(head.y - 2600)
      const seg = this.route.at(head.y)
      if (seg !== this.seg) this.enter(seg)
      this.checkFork(this.seg)
      if (this.seg.kind === 'lake') this.route.extendLake(this.seg, head.y)
      if (this.seg.kind === 'finale' && head.y < this.seg.top + 500) this.win()
      this.spawner.fill(head.y - 1000)
      this.spawner.direct(this.seg, dt)
    }
    this.ripples.step(dt)
    this.procession.step(dt)
    for (const f of this.loose) {
      const rocks = this.river.rocksNear(f.y - 40, f.y + 40, this.near)
      moveFloat(f, this.river, this.waves, rocks, dt, f.state === 'sink' ? 3 : 1.6)
      if (f.state === 'sink') f.fade += dt / 1.6
      else if (f.lit === false && f.age > 0 && f.fade > 0) f.fade += dt / 4
    }
    this.collect()
    this.stepCreatures(dt)
    this.combat.step(dt)
    this.boss?.update(this, dt)
    this.rockWash(head.y)
    this.tally.best = Math.max(this.tally.best, this.train.length - 1)
    this.loose = this.loose.filter((f) => f.fade < 1 && f.y < head.y + 900)
    this.fireflies = this.fireflies.filter((f) => !f.done && f.y < head.y + 900)
    this.petals = this.petals.filter((p) => !p.done && p.y < head.y + 900)
    this.river.prune(head.y + 1000)
  }

  // 进入新路段
  private enter(seg: Segment) {
    const prev = this.seg
    this.seg = seg
    this.shield = this.stats.shade
    if (prev.kind === 'reach') {
      this.tally.reaches++
      if (prev.mod === 'storm') {
        for (let i = 0; i < 12; i++)
          this.petals.push(
            makePetal(this.head.x + this.rng.range(-50, 50), this.head.y - 60 - i * 8),
          )
        this.openOffer()
      }
    }
    if (seg.kind === 'gate') {
      this.river.speed = regions[seg.region].speed
      this.events.push({ type: 'region', region: seg.region })
    }
    if (seg.kind === 'lake' && this.config.demo) seg.cleared = true
    else if (seg.kind === 'lake') {
      const region = regions[seg.region]
      const h = this.head
      const scale = (1 + this.config.loop * 0.4) * (0.6 + 0.1 * this.train.length)
      this.boss = new Boss(region.boss, this.river.center(h.y - 500), h.y - 520, scale)
      this.events.push({ type: 'boss', name: this.boss.name })
    }
    if (seg.kind === 'finale') this.events.push({ type: 'finale' })
    this.events.push({ type: 'segment', kind: seg.kind })
  }

  // 灯头进入支流即视为选择
  private checkFork(seg: Segment) {
    if (seg.kind !== 'fork' || seg.chosen || !seg.options || this.config.demo) return
    const h = this.head
    if (h.y > seg.bottom - 230) return
    const side = h.x < this.river.center(h.y) ? 0 : 1
    const reward = seg.options[side]
    seg.chosen = reward
    const next = this.route.segments[seg.index + 1]
    if (reward === 'shrine') this.openOffer()
    if (reward === 'market') this.shop = makeShop(this)
    if (reward === 'storm' && next) next.mod = 'storm'
    if (reward === 'bloom') {
      if (next) next.mod = 'bloom'
      this.flame = Math.min(this.stats.maxFlame, this.flame + 1)
    }
    this.events.push({ type: 'choose', reward, side, x: h.x, y: h.y })
    if (this.shop) this.events.push({ type: 'shop' })
  }

  openOffer() {
    this.offer = makeOffer(this)
    if (this.offer.length) this.events.push({ type: 'offer' })
    else this.offer = null
  }

  pickBlessing(id: BlessingId) {
    this.levels[id] = (this.levels[id] ?? 0) + 1
    const max = this.stats.maxFlame
    this.stats = computeStats(this.levels, this.config.extra)
    if (this.stats.maxFlame > max) this.flame += this.stats.maxFlame - max
    this.offer = null
    this.events.push({ type: 'bless', id })
  }

  private stepCreatures(dt: number) {
    const range = magnetRange(this)
    for (const f of this.fireflies) stepFirefly(this, f, dt, range)
    for (const p of this.petals) stepPetal(this, p, dt, range, this.flowTmp)
    for (const s of this.shadows) {
      stepShadow(this, s, dt)
      s.hp -= burnShadow(this, s, dt)
      if (s.hp <= 0 && !s.dead) {
        s.dead = true
        this.tally.kills++
        this.events.push({ type: 'kill', x: s.x, y: s.y, kind: s.kind })
        const n = s.kind === 'eel' ? 4 : 2
        for (let i = 0; i < n; i++) {
          const f = makeFirefly(s.x + this.rng.range(-10, 10), s.y + this.rng.range(-10, 10))
          f.drawn = true
          this.fireflies.push(f)
        }
      }
    }
    this.shadows = this.shadows.filter(
      (s) => !s.dead && !s.fled && Math.abs(s.y - this.head.y) < 1100,
    )
  }

  // 首领散尽：本湖清空，奖励祝福
  bossGone() {
    this.boss = null
    this.seg.cleared = true
    this.openOffer()
  }

  // 撞礁或被咬：灯头掉心火，随从落水
  bite(f: Float) {
    if (f.hurt > 0 || this.over || this.won) return
    const i = this.train.indexOf(f)
    if (i < 0) return
    if (this.shield > 0) {
      this.shield--
      f.hurt = 1
      this.events.push({ type: 'shield', x: f.x, y: f.y })
      return
    }
    f.hurt = 1.1
    if (i === 0) {
      this.flame--
      this.events.push({ type: 'hurt', x: f.x, y: f.y, flame: this.flame })
      if (this.flame <= 0) this.lose()
      return
    }
    this.train.splice(i, 1)
    f.lit = false
    if (this.stats.rekindle) {
      f.state = 'loose'
      f.fade = 0.01
      f.hurt = 0.8
    } else f.state = 'sink'
    this.loose.push(f)
    this.events.push({ type: 'lose', x: f.x, y: f.y, kind: f.kind })
  }

  // 主动收灯：按熄灯结算
  retire() {
    if (!this.over && !this.won) this.lose()
  }

  private lose() {
    this.over = true
    this.events.push({ type: 'over' })
  }

  private win() {
    this.won = true
    this.events.push({ type: 'win' })
  }

  // 灯队碰到散灯即点亮入队
  private collect() {
    const room = this.stats.maxTrain - (this.train.length - 1)
    let added = 0
    for (const f of this.loose) {
      if (f.state !== 'loose' || f.hurt > 0 || added >= room) continue
      for (const t of this.train) {
        const min = f.r + t.r + 4
        if ((f.x - t.x) ** 2 + (f.y - t.y) ** 2 > min * min) continue
        this.join(f)
        added++
        break
      }
    }
    this.loose = this.loose.filter((f) => f.state !== 'train')
  }

  join(f: Float) {
    f.state = 'train'
    f.lit = true
    f.fade = 0
    f.hurt = 0.6
    this.train.push(f)
    this.events.push({ type: 'join', x: f.x, y: f.y, kind: f.kind })
  }

  // 免费添灯：升阶、商店
  gift(kind: FollowerKind) {
    if (this.train.length - 1 >= this.stats.maxTrain) return false
    const tail = this.train[this.train.length - 1]
    this.join(makeFloat(kind, tail.x, tail.y + this.rope * 0.6, true))
    return true
  }

  absorb(x: number, y: number) {
    this.glow++
    this.events.push({ type: 'absorb', x, y })
    if (this.glow >= this.levelNeed) {
      this.glow -= this.levelNeed
      this.level++
      this.flame = Math.min(this.stats.maxFlame, this.flame + 1)
      this.gift(this.rng.pick(this.pool))
      this.events.push({ type: 'level', level: this.level })
    }
  }

  gainPetal(x: number, y: number) {
    let gold = 0
    for (const f of this.train) if (f.kind === 'gold') gold++
    const v = this.stats.gold * (1 + gold * 0.25)
    this.petalCount += v
    this.events.push({ type: 'petal', x, y })
  }

  nearestLit(x: number, y: number) {
    let best: Float | null = null,
      bd = Infinity
    for (const f of this.train) {
      const d = (f.x - x) ** 2 + (f.y - y) ** 2
      if (!f.lit || d >= bd) continue
      bd = d
      best = f
    }
    return best
  }

  // 水流冲礁，迎水面持续起细浪
  private rockWash(y: number) {
    for (const rock of this.river.rocksNear(y - 700, y + 300, this.near)) {
      if (Math.random() > 0.35) continue
      const a = Math.PI * 0.5 + (Math.random() - 0.5) * 2.2
      this.waves.splash(
        rock.x + Math.cos(a) * (rock.r + 3),
        rock.y + Math.sin(a) * (rock.r + 3),
        0.22,
        5,
      )
    }
  }
}
