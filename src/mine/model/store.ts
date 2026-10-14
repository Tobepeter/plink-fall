import { base, metaCost, metaDefinitions, tools } from './data'
import { blankProbe, loadSave, number, saveState, storage } from './persistence'
import type { MineStorage } from './persistence'
import { makeTerrain } from './terrain'
import { MineSimulation } from './simulation'
import type { MetaId, MineEvent, MinePort, MineState, ToolId, Vec } from '../types'

// 世界状态与两种输入
export class MineStore implements MinePort {
  state: MineState
  private snapshot: MineState
  private simulation: MineSimulation
  private listeners = new Set<() => void>()
  private events = new Set<(event: MineEvent) => void>()
  private storage: MineStorage | null
  private now: () => number
  private elapsedSnapshot = 0
  private elapsedSave = 0
  private lastPulse = -100
  private destroyed = false

  constructor(options: { storage?: MineStorage | null; now?: () => number } = {}) {
    this.storage = options.storage === undefined ? storage() : options.storage
    this.now = options.now ?? Date.now
    const saved = loadSave(this.storage, this.now())
    this.state = saved.state
    this.state.notice = saved.notice
    this.snapshot = structuredClone(this.state)
    this.simulation = new MineSimulation(this.state, this.emit)
    const away = Math.max(0, (this.now() - this.state.savedAt) / 1000)
    if (away >= 10) this.grantOffline(away)
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  getSnapshot = () => this.snapshot
  onEvent = (fn: (event: MineEvent) => void) => {
    this.events.add(fn)
    return () => {
      this.events.delete(fn)
    }
  }
  private emit = (event: MineEvent) => {
    if (event.type === 'bank' || event.type === 'relic') this.save()
    for (const fn of this.events) fn(event)
  }
  private publish() {
    this.elapsedSnapshot = 0
    this.snapshot = structuredClone(this.state)
    for (const fn of this.listeners) fn()
  }

  update(dt: number) {
    if (
      this.destroyed ||
      this.state.paused ||
      !this.state.started ||
      !Number.isFinite(dt) ||
      dt <= 0
    )
      return
    let remaining = Math.min(30, dt)
    const seconds = remaining
    while (remaining > 0.000001) {
      const step = Math.min(1 / 60, remaining)
      this.simulation.step(step)
      this.progress()
      remaining -= step
    }
    this.elapsedSave += seconds
    this.elapsedSnapshot += seconds
    if (this.elapsedSave >= 5) {
      this.elapsedSave = 0
      this.save()
    } else if (this.elapsedSnapshot >= 0.125) this.publish()
  }

  hold(point: Vec, seconds: number) {
    if (this.state.paused || this.destroyed || this.state.choices.length) return
    this.state.aim = this.simulation.world.clampTarget(point)
    this.state.holding = number(seconds, 0, 0, 3.5)
    this.state.idleFor = 0
    if (seconds === 0) this.publish()
  }

  release(point: Vec, seconds: number) {
    if (this.state.paused || this.destroyed) return false
    this.state.holding = 0
    this.state.idleFor = 0
    const target = this.simulation.world.clampTarget(point)
    this.state.aim = target
    const charged = number(seconds, 0, 0, 3.5) >= 0.4
    if (this.state.probe.mode === 'docked') {
      if (this.state.choices.length || Math.hypot(point.x - base.x, point.y - base.y) < 70) {
        this.publish()
        return false
      }
      this.state.started = true
      this.state.launches++
      const power = charged ? 1.35 + Math.min(1.15, seconds * 0.6) : 1
      this.simulation.launch(this.state.probe, target, power)
    } else if (charged) {
      if (this.state.clock - this.lastPulse < 1.25) {
        this.publish()
        return false
      }
      this.lastPulse = this.state.clock
      this.simulation.world.pulse(this.state.probe, 1 + Math.min(1.2, seconds * 0.7))
    } else this.simulation.recall(this.state.probe)
    this.save()
    return true
  }

  recall() {
    if (this.state.paused || this.destroyed) return false
    this.state.holding = 0
    this.state.idleFor = 0
    const success = this.simulation.recall(this.state.probe)
    if (success) this.save()
    return success
  }

  private progress() {
    if (
      this.state.probe.mode !== 'docked' ||
      this.state.choices.length ||
      this.state.banked < this.state.quota
    )
      return
    const previous = this.state.milestone
    this.state.milestone = Math.min(3, previous + 1)
    this.state.quota = previous < 3 ? [20, 45, 75][previous] : this.state.quota + 40
    this.state.cores++
    const available = tools.filter((item) => (this.state.tools[item.id] ?? 0) < 3)
    if (previous === 0 && !Object.keys(this.state.tools).length)
      this.state.choices = ['pierce', 'chain', 'magnet']
    else {
      let seed = (this.state.seed + this.state.deposits * 2654435761) >>> 0
      const candidates = [...available].sort(
        (a, b) => (this.state.tools[a.id] ?? 0) - (this.state.tools[b.id] ?? 0),
      )
      const choices: ToolId[] = []
      if (candidates.length) choices.push(candidates.shift()!.id)
      while (choices.length < 3 && candidates.length) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        choices.push(candidates.splice(seed % candidates.length, 1)[0].id)
      }
      this.state.choices = choices
    }
    if (previous === 2) {
      const relic = this.state.nodes.find((node) => node.kind === 'relic')
      if (relic) {
        relic.revealed = true
        this.emit({ type: 'relic', x: relic.x, y: relic.y, amount: 0 })
        this.state.notice = '深处出现遗物，找到它并亲自运回'
      }
    }
    this.save()
  }

  choose(tool: ToolId) {
    if (
      this.destroyed ||
      this.state.paused ||
      this.state.probe.mode !== 'docked' ||
      !this.state.choices.includes(tool) ||
      (this.state.tools[tool] ?? 0) >= 3
    )
      return false
    this.state.tools[tool] = (this.state.tools[tool] ?? 0) + 1
    this.state.capacity = 5 + this.state.meta.bag * 2 + (this.state.tools.magnet ?? 0) * 3
    this.state.choices = []
    this.state.idleFor = 0
    this.state.notice = `${tools.find((item) => item.id === tool)!.name}已装上，下一钻试试看`
    this.emit({ type: 'install', ...base, tool })
    this.save()
    return true
  }

  buyMeta(id: MetaId) {
    const definition = metaDefinitions.find((item) => item.id === id)
    if (
      !definition ||
      this.destroyed ||
      this.state.paused ||
      this.state.probe.mode !== 'docked' ||
      this.state.deposits < 2 ||
      this.state.meta[id] >= 5
    )
      return false
    const cost = metaCost(id, this.state.meta[id])
    if (this.state.coins < cost.coins || this.state.cores < cost.cores) return false
    this.state.coins -= cost.coins
    this.state.cores -= cost.cores
    this.state.meta[id]++
    this.state.capacity = 5 + this.state.meta.bag * 2 + (this.state.tools.magnet ?? 0) * 3
    this.state.notice = `${definition.name}升级了，下一片矿区也会保留`
    this.emit({ type: 'install', ...base })
    this.save()
    return true
  }

  travel() {
    if (
      this.destroyed ||
      this.state.paused ||
      this.state.probe.mode !== 'docked' ||
      this.state.milestone < 3 ||
      !this.state.relic ||
      this.state.choices.length
    )
      return false
    this.state.region++
    this.state.seed = (Math.imul(this.state.seed, 1664525) + 1013904223) >>> 1
    this.state.banked = 0
    this.state.quota = 5
    this.state.milestone = 0
    this.state.relic = false
    this.state.tools = {}
    this.state.capacity = 5 + this.state.meta.bag * 2
    this.state.nodes = makeTerrain(this.state.seed, this.state.region)
    this.state.drops = []
    this.state.probe = blankProbe()
    this.state.drone = blankProbe()
    this.state.idleFor = 0
    if (!this.state.visited.includes(this.state.region)) this.state.visited.push(this.state.region)
    this.simulation = new MineSimulation(this.state, this.emit)
    this.emit({ type: 'travel', ...base, amount: this.state.region })
    this.save()
    return true
  }

  setPaused(paused: boolean) {
    this.state.paused = paused
    this.state.holding = 0
    this.save()
  }
  toggleSound() {
    this.state.muted = !this.state.muted
    this.save()
  }
  toggleAuto() {
    if (this.state.deposits < 2) return
    this.state.auto = !this.state.auto
    this.state.idleFor = 0
    this.save()
  }
  dismissOffline() {
    this.state.offline = 0
    this.save()
  }

  grantOffline(seconds: number) {
    if (
      this.destroyed ||
      this.state.paused ||
      !this.state.started ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    )
      return
    const duration = Math.min(4 * 3600, seconds)
    const rate =
      this.state.deposits >= 2
        ? 0.08 + (this.state.tools.drone ?? 0) * 0.025 + this.state.meta.spool * 0.006
        : 0.025
    const coins = Math.floor(duration * rate)
    this.state.coins = Math.min(1e10, this.state.coins + coins)
    this.state.offline = coins
    this.state.probe.heat = Math.max(0, this.state.probe.heat - duration * 1.4)
    this.state.drone.heat = Math.max(0, this.state.drone.heat - duration * 1.4)
    this.state.holding = 0
    this.save()
  }

  save() {
    this.state.savedAt = this.now()
    if (!saveState(this.storage, this.state)) this.state.notice = '浏览器暂不允许保存，仍可正常采矿'
    this.publish()
  }
  destroy(save = true) {
    if (this.destroyed) return
    if (save) this.save()
    this.destroyed = true
    this.listeners.clear()
    this.events.clear()
  }
}
