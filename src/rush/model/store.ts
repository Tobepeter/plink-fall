import type { FrameId, RushEvent, RushPort, RushState, Vec } from '../types'
import { clamp, makeRandom } from './math'
import type { Hooks } from './math'
import { readRecord, writeRecord } from './persistence'
import type { StoragePort } from './persistence'
import { Simulation } from './simulation'
import { createState } from './state'

export class RushStore implements RushPort {
  state: RushState
  private snapshot: RushState
  private simulation: Simulation
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
    this.simulation = this.makeSimulation()
    this.snapshot = structuredClone(this.state)
  }

  private makeSimulation() {
    const random = makeRandom(this.state.seed)
    const hooks: Hooks = {
      id: () => ++this.nextId,
      random,
      emit: (event) => {
        for (const fn of this.events) fn(event)
        if (event.type === 'boss-down' || event.type === 'run-end') this.save()
      },
    }
    return new Simulation(this.state, hooks)
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
    if (this.destroyed || this.state.phase === 'dead' || this.state.phase === 'won') return
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

  restart(frame: FrameId = this.state.record.selected) {
    if (this.destroyed || !this.state.record.unlocked.includes(frame)) return
    this.save()
    const record = this.state.record
    record.selected = frame
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
    s.record.bestTime = Math.max(s.record.bestTime, s.clock)
    s.record.bestKills = Math.max(s.record.bestKills, s.kills)
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
