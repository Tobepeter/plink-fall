import { modules, regions } from './data'
import { finite } from './persistence'
import type { ForgeEvent, ForgeState, ModuleId } from './types'

// 真实物料产线
export function productionStats(state: ForgeState, echoRecovery = 0) {
  const level = (id: ModuleId) => state.modules[id] ?? 0
  const burst = state.burstRemaining > 0 ? 2 + level('echo') * 0.35 : 1
  const heatPenalty = Math.max(0, state.heat - 65) / 35
  const heatFactor = Math.max(0.25, 1 - heatPenalty * (0.7 - level('insulator') * 0.1))
  const recoveryFactor = echoRecovery > 0 ? 0.8 : 1
  const speed =
    1.05 *
    (1 + state.region * 0.18) *
    (1 + state.research.drill * 0.12) *
    (1 + level('turbo') * 0.32) *
    (1 + level('splitter') * 0.16) *
    0.94 ** level('condenser') *
    0.92 ** level('magnet') *
    0.95 ** level('insulator') *
    burst *
    heatFactor *
    recoveryFactor
  const amount =
    (1 + level('condenser') * 0.35) *
    (1 + level('splitter') * 0.15) *
    (1 + level('prism') * 0.25) *
    (1 + state.research.value * 0.15)
  const travel = 6 * 1.16 ** level('condenser') * 1.09 ** level('splitter') * 0.92 ** level('turbo')
  return {
    speed: Math.min(10, 78 / travel, speed),
    amount: Math.min(12, amount),
    travel,
    value:
      (1 + level('magnet') * 0.45) * (1 + level('prism') * 0.2) * (1 + state.research.value * 0.15),
    cooling: 1.3 * (1 + level('insulator') * 0.8 + state.research.cooling * 0.18),
    heat: 0.85 + level('turbo') * 0.65 + level('prism') * 0.65 + level('splitter') * 0.22,
    charge: (1 + level('battery') * 0.6 + level('echo') * 0.2) / 24,
  }
}

export function moduleChoices(state: ForgeState): ModuleId[] {
  const available = modules.filter((module) => (state.modules[module.id] ?? 0) < module.maxLevel)
  let seed = (state.totalDeliveries * 2654435761 + state.region * 1013904223 + 17) >>> 0
  const random = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  const unseen = available.filter((module) => !state.modules[module.id])
  const choices: ModuleId[] = []
  if (unseen.length) choices.push(unseen[Math.floor(random() * unseen.length)].id)
  while (choices.length < Math.min(3, available.length)) {
    const candidates = available.filter((module) => !choices.includes(module.id))
    choices.push(candidates[Math.floor(random() * candidates.length)].id)
  }
  return choices
}

export class ForgeSimulation {
  private spawnCredit = 0
  private nextId: number
  private meteorClock = 0
  private echoRecovery = 0

  constructor(state: ForgeState) {
    this.nextId = Math.max(0, ...state.items.map((item) => item.id)) + 1
  }

  prime() {
    this.spawnCredit = 1
  }

  // 小步模拟保持跨帧一致
  step(state: ForgeState, dt: number, emit?: (event: ForgeEvent) => void, allowMeteor = true) {
    const stats = productionStats(state, this.echoRecovery)
    state.elapsed += dt
    state.rate = stats.speed * stats.amount
    const cooling = stats.cooling * (1 + state.heat / 50)
    state.heat = finite(
      state.heat -
        cooling * dt +
        (state.burstRemaining > 0 ? (3.8 + (state.modules.battery ?? 0) * 0.8) * dt : 0),
      0,
      0,
      100,
    )
    if (state.burstRemaining > 0) {
      state.burstRemaining = Math.max(0, state.burstRemaining - dt)
      if (!state.burstRemaining && state.modules.echo) this.echoRecovery = 3
    } else {
      this.echoRecovery = Math.max(0, this.echoRecovery - dt)
    }
    for (let i = state.items.length - 1; i >= 0; i--) {
      const item = state.items[i]
      item.progress += dt / stats.travel
      if (item.progress < 1) continue
      state.items.splice(i, 1)
      state.stock = Math.min(1e12, state.stock + item.amount)
      state.totalProduced = Math.min(1e12, state.totalProduced + item.amount)
      state.coins = Math.min(1e12, state.coins + item.amount * stats.value)
      state.charge = Math.min(1, state.charge + item.amount * stats.charge)
      state.heat = Math.min(100, state.heat + stats.heat)
      emit?.({ type: 'produce', amount: item.amount, kind: item.kind })
    }
    this.spawnCredit = Math.min(3, this.spawnCredit + stats.speed * dt)
    while (this.spawnCredit >= 1 && state.items.length < 80) {
      this.spawnCredit -= 1
      state.items.push({
        id: this.nextId++,
        progress: 0,
        lane: state.modules.splitter
          ? this.nextId % ((state.modules.splitter ?? 0) >= 2 ? 3 : 2)
          : 0,
        kind: regions[state.region % regions.length].recipe,
        amount: stats.amount,
      })
    }
    if (allowMeteor && state.totalDeliveries > 0) this.stepMeteor(state, dt, emit)
  }

  private stepMeteor(state: ForgeState, dt: number, emit?: (event: ForgeEvent) => void) {
    if (state.meteor) {
      state.meteor.remaining = Math.max(0, state.meteor.remaining - dt)
      if (!state.meteor.remaining) {
        state.meteor = null
        this.meteorClock = 0
      }
      return
    }
    this.meteorClock += dt
    if (this.meteorClock < 30) return
    this.meteorClock = 0
    state.meteor = {
      remaining: 8,
      reward: Math.round(12 * (1 + state.region * 0.18) * (1 + (state.modules.magnet ?? 0) * 0.5)),
    }
    emit?.({ type: 'meteor' })
  }
}
