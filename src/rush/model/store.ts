import type {
  Difficulty,
  FrameId,
  MetaUpgradeId,
  RushEvent,
  RushPort,
  RushState,
  Vec,
} from '../types'
import { clamp, makeRandom } from './math'
import type { Hooks } from './math'
import { readRecord, writeRecord } from './persistence'
import type { StoragePort } from './persistence'
import { Simulation } from './simulation'
import { createState } from './state'
import { metaPrice, metaUpgrades, previewReward } from './meta/progression'
import { frameStats } from './frames'
import { activateAbility } from './combat/frame-skills'

export class RushStore implements RushPort {
  state: RushState
  private snapshot: RushState
  private simulation: Simulation
  private hooks!: Hooks
  private storage?: StoragePort
  private nextId = 0
  private snapshotClock = 0
  private listeners = new Set<() => void>()
  private events = new Set<(event: RushEvent) => void>()
  private destroyed = false

  constructor(options: { storage?: StoragePort; seed?: number } = {}) {
    try {
      this.storage =
        options.storage || (typeof localStorage !== 'undefined' ? localStorage : undefined)
    } catch {
      /* 浏览器存储可能被禁用 */
    }
    const record = readRecord(this.storage)
    this.state = createState(
      record,
      1,
      options.seed ?? Math.floor(Math.random() * 0xffffffff),
      record.selected,
      { x: 390, y: 700 },
    )
    this.state.phase = record.visited ? 'menu' : 'playing'
    record.visited = true
    writeRecord(record, this.storage)
    this.simulation = this.makeSimulation()
    this.snapshot = structuredClone(this.state)
  }

  private makeSimulation() {
    const random = makeRandom(this.state.seed)
    this.hooks = {
      id: () => ++this.nextId,
      random,
      emit: (event) => {
        if (event.type === 'run-end') this.settle()
        for (const fn of this.events) fn(event)
        if (event.type === 'boss-down') this.save()
      },
    }
    return new Simulation(this.state, this.hooks)
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getSnapshot = () => this.snapshot
  onEvent = (fn: (event: RushEvent) => void) => {
    this.events.add(fn)
    return () => this.events.delete(fn)
  }

  private publish() {
    this.snapshot = structuredClone(this.state)
    for (const fn of this.listeners) fn()
    this.snapshotClock = 0
  }

  update(dt: number) {
    if (this.destroyed || !Number.isFinite(dt) || dt <= 0) return
    const previous = this.state.phase
    this.simulation.update(Math.min(dt, 0.1))
    this.snapshotClock += dt
    if (this.snapshotClock >= 0.1 || previous !== this.state.phase) this.publish()
  }

  setMove(point: Vec) {
    if (this.destroyed || this.state.phase !== 'playing' || this.state.paused) return
    const x = Number.isFinite(point.x) ? clamp(point.x, -1, 1) : 0
    const y = Number.isFinite(point.y) ? clamp(point.y, -1, 1) : 0
    const len = Math.max(1, Math.hypot(x, y))
    this.state.move = { x: x / len, y: y / len }
  }

  setViewport(width: number, height: number) {
    if (this.destroyed || width <= 0 || height <= 0 || !Number.isFinite(width + height)) return
    this.state.viewport = { x: width, y: height }
    this.simulation.enemies.resize()
  }

  dash() {
    if (this.destroyed) return false
    const did = this.simulation.weapons.dash()
    if (did) this.publish()
    return did
  }

  choose(id: Parameters<RushPort['choose']>[0]) {
    if (this.destroyed) return false
    const did = this.simulation.choose(id)
    if (did) this.publish()
    return did
  }

  setPaused(paused: boolean) {
    if (
      this.destroyed ||
      this.state.phase === 'menu' ||
      this.state.phase === 'dead' ||
      this.state.phase === 'won'
    )
      return
    this.state.paused = paused
    this.state.move = { x: 0, y: 0 }
    this.publish()
  }

  toggleSound() {
    if (this.destroyed) return
    this.state.record.muted = !this.state.record.muted
    this.save()
    this.publish()
  }

  selectFrame(frame: FrameId) {
    if (this.destroyed || !this.state.record.unlocked.includes(frame)) return false
    this.state.record.selected = frame
    this.save()
    this.publish()
    return true
  }

  unlockFrame(frame: FrameId) {
    const s = this.state
    if (this.destroyed || s.phase !== 'menu' || s.record.unlocked.includes(frame)) return false
    const cost = frameStats[frame]?.unlockCost
    if (!cost || s.record.coins < cost) return false
    s.record.coins -= cost
    s.record.unlocked.push(frame)
    this.save()
    this.publish()
    return true
  }

  selectDifficulty(difficulty: Difficulty) {
    const s = this.state
    if (
      this.destroyed ||
      !['menu', 'dead', 'won'].includes(s.phase) ||
      !Number.isInteger(difficulty) ||
      difficulty < 0 ||
      difficulty > s.record.highestDifficulty
    )
      return false
    s.record.difficulty = difficulty
    if (s.phase === 'menu') s.difficulty = difficulty
    this.save()
    this.publish()
    return true
  }

  setMouseAim(enabled: boolean) {
    if (this.destroyed || typeof enabled !== 'boolean') return
    this.state.record.mouseAim = enabled
    this.state.record.aimVersion = 1
    this.state.aim = { mode: 'auto', point: null }
    this.save()
    this.publish()
  }

  setAim(point: Vec | null, mode: 'mouse' | 'auto' = point ? 'mouse' : 'auto') {
    if (this.destroyed || (point && (!Number.isFinite(point.x) || !Number.isFinite(point.y))))
      return
    if (!this.state.record.mouseAim || mode !== 'mouse' || !point)
      this.state.aim = { mode: 'auto', point: null }
    else if (this.state.phase === 'playing' && !this.state.paused)
      this.state.aim = {
        mode: 'mouse',
        point: { x: clamp(point.x, -10000, 10000), y: clamp(point.y, -10000, 10000) },
      }
  }

  activateAbility() {
    if (this.destroyed || !activateAbility(this.state, this.hooks)) return false
    this.publish()
    return true
  }

  purchaseMeta(id: MetaUpgradeId) {
    const s = this.state
    if (this.destroyed || !['menu', 'dead', 'won'].includes(s.phase)) return false
    const def = metaUpgrades.find((entry) => entry.id === id)
    if (!def || s.record.meta[id] >= def.maxLevel) return false
    const price = metaPrice(s.record, id)
    if (price <= 0 || s.record.coins < price) return false
    s.record.coins -= price
    s.record.meta[id]++
    this.save()
    this.publish()
    return true
  }

  openMenu() {
    if (this.destroyed || (this.state.phase !== 'dead' && this.state.phase !== 'won')) return
    this.state.phase = 'menu'
    this.state.paused = false
    this.state.move = { x: 0, y: 0 }
    this.state.choices = []
    this.publish()
  }

  // 单局只到账一次，重载只读取上局结算
  private settle() {
    const s = this.state
    if (s.settlement || (s.phase !== 'dead' && s.phase !== 'won')) return
    s.settlement = {
      ...previewReward(s),
      outcome: s.phase,
      killCount: s.kills,
      wave: s.wave.index,
      seconds: Math.floor(s.clock),
      difficulty: s.difficulty,
    }
    s.record.coins = Math.min(1_000_000_000, s.record.coins + s.settlement.coins)
    s.record.totalCoins = Math.min(1_000_000_000, s.record.totalCoins + s.settlement.coins)
    s.record.runs = Math.min(1_000_000_000, s.record.runs + 1)
    s.record.lastRun = structuredClone(s.settlement)
    if (s.phase === 'won') {
      s.record.difficultyWins[s.difficulty] = Math.min(
        1_000_000_000,
        s.record.difficultyWins[s.difficulty] + 1,
      )
      s.record.highestDifficulty = Math.max(
        s.record.highestDifficulty,
        Math.min(3, s.difficulty + 1),
      ) as Difficulty
    }
    this.save()
  }

  restart(frame: FrameId = this.state.record.selected) {
    if (this.destroyed || !this.state.record.unlocked.includes(frame)) return
    this.save()
    const record = this.state.record
    record.selected = frame
    writeRecord(record, this.storage)
    this.state = createState(
      record,
      this.state.runId + 1,
      (this.state.seed + 8191) >>> 0,
      frame,
      this.state.viewport,
    )
    this.nextId = 0
    this.simulation = this.makeSimulation()
    this.publish()
  }

  save() {
    const s = this.state
    if (s.phase !== 'menu') {
      s.record.bestTime = Math.max(s.record.bestTime, s.clock)
      s.record.bestKills = Math.max(s.record.bestKills, s.kills)
    }
    writeRecord(s.record, this.storage)
  }

  destroy() {
    if (this.destroyed) return
    this.save()
    this.destroyed = true
    this.listeners.clear()
    this.events.clear()
  }
}
