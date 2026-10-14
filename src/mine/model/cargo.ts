import { base } from './data'
import type { Drop, MineEvent, MineState, Probe, Vec } from '../types'

// 碎矿运动、磁吸、负重尾随与回库
export class MineCargo {
  constructor(
    private state: MineState,
    private emit: (event: MineEvent) => void,
  ) {}

  step(dt: number) {
    const state = this.state
    for (const drop of [...state.drops]) {
      drop.age += dt
      if (drop.carrier !== 'loose') {
        const probe = drop.carrier === 'drone' ? state.drone : state.probe
        const index = probe.cargo.indexOf(drop.id)
        if (index < 0) {
          drop.carrier = 'loose'
          continue
        }
        const offset = 24 + index * 12
        this.pull(
          drop,
          {
            x: probe.x - Math.cos(probe.angle) * offset,
            y: probe.y - Math.sin(probe.angle) * offset,
          },
          dt,
          30,
        )
        drop.z += (8 + (index % 3) * 2 - drop.z) * Math.min(1, dt * 7)
        continue
      }
      drop.vz -= dt * 85
      drop.z += drop.vz * dt
      if (drop.z <= 0) {
        drop.z = 0
        drop.vz = Math.abs(drop.vz) > 7 ? Math.abs(drop.vz) * 0.36 : 0
      }
      drop.x += drop.vx * dt
      drop.y += drop.vy * dt
      drop.vx *= Math.exp(-dt * 2.4)
      drop.vy *= Math.exp(-dt * 2.4)
      const carriers = [state.probe, ...(state.tools.drone ? [state.drone] : [])]
      for (const probe of carriers) {
        if (probe.mode === 'docked') continue
        const helper = probe === state.drone
        const capacity = helper ? 2 + (state.tools.drone ?? 0) : state.capacity
        if (probe.cargo.length >= capacity || (helper && drop.kind === 'relic')) continue
        const distance = Math.hypot(drop.x - probe.x, drop.y - probe.y)
        const radius = helper
          ? 64
          : probe.mode === 'returning'
            ? 70 + (state.tools.magnet ?? 0) * 65
            : 82 + (state.tools.magnet ?? 0) * 18
        const winch =
          !helper &&
          probe.mode === 'returning' &&
          state.tools.winch &&
          Math.abs(drop.x - (probe.x * (drop.y - base.y)) / Math.max(1, probe.y - base.y)) <
            26 + state.tools.winch * 10 &&
          drop.y > base.y &&
          drop.y < probe.y
        if (distance > radius && !winch) continue
        this.pull(drop, probe, dt, 18 + (state.tools.magnet ?? 0) * 9)
        if (distance < 18 || (winch && distance < 40)) {
          drop.carrier = helper ? 'drone' : 'probe'
          probe.cargo.push(drop.id)
          this.emit({ type: 'pickup', x: drop.x, y: drop.y, kind: drop.kind, amount: drop.value })
        }
        break
      }
    }
    state.drops = state.drops.filter(
      (drop) => drop.carrier !== 'loose' || drop.kind === 'relic' || drop.age < 180,
    )
  }

  private pull(drop: Drop, target: Vec, dt: number, stiffness: number) {
    drop.vx += (target.x - drop.x) * stiffness * dt
    drop.vy += (target.y - drop.y) * stiffness * dt
    const damp = Math.exp(-dt * 8)
    drop.vx *= damp
    drop.vy *= damp
    drop.x += drop.vx * dt
    drop.y += drop.vy * dt
  }

  bank(probe: Probe, helper: boolean) {
    const cargo = this.state.drops.filter((drop) => probe.cargo.includes(drop.id))
    const count = cargo.filter((drop) => drop.kind !== 'relic').length
    const coins = cargo.reduce((sum, drop) => sum + drop.value, 0)
    this.state.drops = this.state.drops.filter((drop) => !probe.cargo.includes(drop.id))
    probe.cargo = []
    probe.mode = 'docked'
    if (!helper) this.state.idleFor = 0
    probe.x = base.x
    probe.y = base.y
    probe.vx = 0
    probe.vy = 0
    this.state.coins = Math.min(1e10, this.state.coins + coins)
    this.state.banked += count
    this.state.totalBanked += count
    if (cargo.length) {
      this.state.deposits++
      if (this.state.deposits === 2) this.state.auto = true
      this.emit({
        type: 'bank',
        x: base.x,
        y: base.y,
        amount: count,
        power: coins,
        tool: helper ? 'drone' : undefined,
      })
    }
    if (cargo.some((drop) => drop.kind === 'relic')) {
      this.state.relic = true
      this.state.notice = '遗物已经运回，可以前往下一片矿区'
      this.emit({ type: 'relic', x: base.x, y: base.y, amount: 1 })
    }
  }
}
