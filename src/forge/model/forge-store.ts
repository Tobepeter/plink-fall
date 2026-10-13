import { modules, orderReward, regions, research, researchCoinCost, researchCost } from './data'
import { browserStorage, offlineLimit, orderGoal, readSave, writeSave } from './persistence'
import type { ForgeStorage } from './persistence'
import { ForgeSimulation, moduleChoices, productionStats } from './simulation'
import type { ForgeEvent, ForgeState, ModuleId, ResearchId } from './types'

// 工坊唯一状态与动作入口
export class ForgeStore {
  public state: ForgeState
  private snapshot: ForgeState
  private simulation: ForgeSimulation
  private listeners = new Set<() => void>()
  private eventListeners = new Set<(event: ForgeEvent) => void>()
  private storage: ForgeStorage | null
  private now: () => number
  private snapshotClock = 0
  private saveClock = 0
  private destroyed = false

  constructor(options: { storage?: ForgeStorage | null; now?: () => number } = {}) {
    this.storage = options.storage === undefined ? browserStorage() : options.storage
    this.now = options.now ?? Date.now
    const loaded = readSave(this.storage, this.now())
    this.state = loaded.state
    this.state.notice = loaded.notice
    this.simulation = new ForgeSimulation(this.state)
    this.state.rate = productionStats(this.state).speed * productionStats(this.state).amount
    this.snapshot = this.clone()
    const gap = Math.max(0, (this.now() - this.state.savedAt) / 1000)
    if (gap >= 5) this.grantOffline(gap)
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getSnapshot = () => this.snapshot

  onEvent(fn: (event: ForgeEvent) => void) {
    this.eventListeners.add(fn)
    return () => {
      this.eventListeners.delete(fn)
    }
  }

  private emit = (event: ForgeEvent) => {
    for (const listener of this.eventListeners) listener(event)
  }

  private clone(): ForgeState {
    return {
      ...this.state,
      modules: { ...this.state.modules },
      research: { ...this.state.research },
      recipes: [...this.state.recipes],
      choices: [...this.state.choices],
      items: this.state.items.map((item) => ({ ...item })),
      meteor: this.state.meteor ? { ...this.state.meteor } : null,
      offline: this.state.offline ? { ...this.state.offline } : null,
      lastReward: this.state.lastReward ? { ...this.state.lastReward } : null,
    }
  }

  private publish() {
    this.snapshotClock = 0
    this.snapshot = this.clone()
    for (const listener of this.listeners) listener()
  }

  private commit(event?: ForgeEvent) {
    const stats = productionStats(this.state)
    this.state.rate = stats.speed * stats.amount
    this.save()
    if (event) this.emit(event)
  }

  // 模拟暂停与快照限频
  update(dt: number) {
    if (
      this.destroyed ||
      !this.state.started ||
      this.state.paused ||
      !Number.isFinite(dt) ||
      dt <= 0
    )
      return
    const seconds = Math.min(dt, 60)
    let remaining = seconds
    while (remaining > 0.000001) {
      const step = Math.min(0.1, remaining)
      this.simulation.step(this.state, step, this.emit)
      remaining -= step
    }
    this.snapshotClock += seconds
    this.saveClock += seconds
    if (this.saveClock >= 10) {
      this.saveClock = 0
      this.save()
    } else if (this.snapshotClock >= 0.125) {
      this.publish()
    }
  }

  start() {
    if (this.state.started || this.destroyed) return
    this.state.started = true
    this.state.recipes = ['mint']
    this.simulation.prime()
    this.commit()
  }

  resonate() {
    if (
      !this.state.started ||
      this.state.paused ||
      this.state.charge < 1 ||
      this.state.burstRemaining > 0
    )
      return false
    this.state.charge = 0
    this.state.burstRemaining = 7 + (this.state.modules.battery ?? 0) * 2
    this.commit({ type: 'boost' })
    return true
  }

  collectMeteor() {
    if (!this.state.started || this.state.paused || !this.state.meteor) return false
    const amount = this.state.meteor.reward
    this.state.coins = Math.min(1e12, this.state.coins + amount)
    this.state.meteor = null
    this.state.notice = `矿星收集成功，获得 ${amount} 晶币`
    this.commit({ type: 'meteor', amount })
    return true
  }

  deliver() {
    if (
      !this.state.started ||
      this.state.paused ||
      this.state.choices.length ||
      this.state.stock < this.state.goal
    )
      return false
    const reward = orderReward(this.state)
    this.state.stock -= this.state.goal
    this.state.coins = Math.min(1e12, this.state.coins + reward.coins)
    this.state.blueprints = Math.min(1e12, this.state.blueprints + reward.blueprints)
    this.state.lastReward = reward
    this.state.deliveries++
    this.state.totalDeliveries++
    this.state.orderIndex++
    this.state.goal = orderGoal(this.state.region, this.state.orderIndex)
    this.state.choices = moduleChoices(this.state)
    this.state.notice = `第 ${this.state.totalDeliveries} 单完成，工坊又向前一步`
    this.commit({ type: 'delivery', amount: reward.coins })
    return true
  }

  choose(id: ModuleId) {
    const definition = modules.find((module) => module.id === id)
    const level = this.state.modules[id] ?? 0
    if (!definition || !this.state.choices.includes(id) || level >= definition.maxLevel)
      return false
    this.state.modules[id] = level + 1
    this.state.choices = []
    this.state.notice = `${definition.name}已安装 · ${level + 1} 级`
    this.commit({ type: 'install', module: id })
    return true
  }

  researchUpgrade(id: ResearchId) {
    const definition = research.find((item) => item.id === id)
    const level = this.state.research[id]
    if (!definition || this.state.totalDeliveries < 2 || level >= definition.maxLevel) return false
    const cost = researchCost(id, level)
    const coinCost = researchCoinCost(id, level)
    if (this.state.blueprints < cost || this.state.coins < coinCost) return false
    this.state.blueprints -= cost
    this.state.coins -= coinCost
    this.state.research[id]++
    this.state.notice = `${definition.name}升至 ${level + 1} 级，下一轮也会保留`
    this.commit({ type: 'research' })
    return true
  }

  jump() {
    if (this.state.paused || this.state.deliveries < 4 || this.state.choices.length) return false
    this.state.region++
    this.state.deliveries = 0
    this.state.orderIndex = 0
    this.state.goal = orderGoal(this.state.region, 0)
    this.state.stock = 0
    this.state.heat = 0
    this.state.charge = 1
    this.state.burstRemaining = 0
    this.state.modules = {}
    this.state.items = []
    this.state.meteor = null
    this.state.lastReward = null
    const region = regions[this.state.region % regions.length]
    if (!this.state.recipes.includes(region.recipe)) this.state.recipes.push(region.recipe)
    this.state.notice = `第 ${this.state.region + 1} 站 · ${region.name}，永久研究已随行`
    this.simulation = new ForgeSimulation(this.state)
    this.simulation.prime()
    this.commit({ type: 'jump' })
    return true
  }

  // 离开期间仍按相同产线模拟，收益减半且不推进订单
  grantOffline(seconds: number) {
    if (!this.state.started || this.state.paused || !Number.isFinite(seconds) || seconds <= 0)
      return
    const duration = Math.min(offlineLimit, Math.max(0, seconds))
    const simulated = this.clone()
    simulated.burstRemaining = 0
    simulated.meteor = null
    const simulation = new ForgeSimulation(simulated)
    let remaining = duration
    while (remaining > 0.000001) {
      const step = Math.min(0.1, remaining)
      simulation.step(simulated, step, undefined, false)
      remaining -= step
    }
    const stock = Math.floor(Math.max(0, simulated.totalProduced - this.state.totalProduced) * 0.5)
    const coins = Math.floor(Math.max(0, simulated.coins - this.state.coins) * 0.5)
    this.state.stock = Math.min(1e12, this.state.stock + stock)
    this.state.coins = Math.min(1e12, this.state.coins + coins)
    this.state.totalProduced = Math.min(1e12, this.state.totalProduced + stock)
    this.state.elapsed += duration
    this.state.heat = simulated.heat
    this.state.charge = simulated.charge
    this.state.burstRemaining = 0
    this.state.meteor = null
    this.state.items = simulated.items
    this.state.offline = stock || coins ? { seconds: duration, stock, coins } : null
    this.simulation = simulation
    this.commit()
  }

  dismissOffline() {
    this.state.offline = null
    this.commit()
  }

  toggleSound() {
    this.state.muted = !this.state.muted
    this.commit()
  }

  setPaused(paused: boolean) {
    if (this.state.paused === paused) return
    this.state.paused = paused
    this.commit()
  }

  save() {
    this.state.savedAt = this.now()
    if (!writeSave(this.storage, this.state))
      this.state.notice = '浏览器暂不允许保存，本次仍可正常游玩'
    this.publish()
  }

  destroy(save = true) {
    if (this.destroyed) return
    if (save) this.save()
    this.destroyed = true
    this.listeners.clear()
    this.eventListeners.clear()
  }
}
