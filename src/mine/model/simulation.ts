import { base } from './data'
import { MineWorld } from './world'
import { MineCargo } from './cargo'
import type { MineEvent, MineState, Probe, Vec } from '../types'

// 探针飞行、钻击、负重与真实回库
export class MineSimulation {
  world: MineWorld
  private cargo: MineCargo
  private pierced = new Map<Probe, Set<number>>()
  private collecting = new Map<Probe, number>()
  private helperClock = 0

  constructor(
    private state: MineState,
    private emit: (event: MineEvent) => void,
  ) {
    this.world = new MineWorld(state, emit)
    this.cargo = new MineCargo(state, emit)
  }

  launch(probe: Probe, point: Vec, power = 1, helper = false) {
    probe.mode = 'flying'
    probe.target = this.world.clampTarget(point)
    probe.power = power
    probe.life = 0
    probe.drillClock = 0
    probe.angle = Math.atan2(probe.target.y - probe.y, probe.target.x - probe.x)
    this.pierced.set(probe, new Set())
    this.collecting.delete(probe)
    this.emit({
      type: 'launch',
      x: probe.x,
      y: probe.y,
      power,
      tool: helper ? 'drone' : undefined,
      targets: [probe.target],
    })
  }

  recall(probe: Probe) {
    if (probe.mode === 'docked' || probe.mode === 'returning') return false
    probe.mode = 'returning'
    this.collecting.delete(probe)
    this.emit({ type: 'return', x: probe.x, y: probe.y, amount: probe.cargo.length })
    return true
  }

  step(dt: number) {
    const state = this.state
    state.clock += dt
    state.idleFor += dt
    state.capacity = 5 + state.meta.bag * 2 + (state.tools.magnet ?? 0) * 3
    for (const node of state.nodes) node.angle += node.spin * dt
    this.stepProbe(state.probe, dt)
    if (state.tools.drone) {
      this.helperClock = state.choices.length ? 0 : this.helperClock + dt
      if (state.choices.length) this.recall(state.drone)
      this.stepProbe(state.drone, dt, true)
      if (!state.choices.length && state.drone.mode === 'docked' && this.helperClock > 3) {
        const target = this.ordinaryTarget(state.drone)
        if (target) this.launch(state.drone, target, 1 + state.tools.drone * 0.2, true)
        this.helperClock = 0
      }
    }
    this.cargo.step(dt)
    if (
      state.auto &&
      state.deposits >= 2 &&
      state.idleFor >= 9 &&
      state.probe.mode === 'docked' &&
      !state.choices.length
    ) {
      const target = this.ordinaryTarget(state.probe)
      if (target) {
        this.launch(state.probe, target)
        state.launches++
      } else {
        const loose = state.drops.find((drop) => drop.carrier === 'loose' && drop.kind !== 'relic')
        if (loose) this.launch(state.probe, loose)
      }
      state.idleFor = 0
    }
  }

  private ordinaryTarget(probe: Probe) {
    const range = 690 + this.state.meta.spool * 70
    const aim = this.state.aim ?? { x: 0, y: 500 }
    return this.state.nodes
      .filter(
        (node) =>
          node.revealed &&
          ['copper', 'stone', 'amber'].includes(node.kind) &&
          Math.hypot(node.x, node.y - base.y) < range,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y) ||
          Math.hypot(a.x - probe.x, a.y - probe.y) - Math.hypot(b.x - probe.x, b.y - probe.y),
      )[0]
  }

  private stepProbe(probe: Probe, dt: number, helper = false) {
    probe.heat = Math.max(
      0,
      probe.heat - dt * (1.4 + this.state.meta.cooling * 0.28 + (this.state.tools.vent ?? 0) * 0.5),
    )
    if (probe.mode === 'docked') return
    probe.life += dt
    const capacity = helper ? 2 + (this.state.tools.drone ?? 0) : this.state.capacity
    if (probe.cargo.length >= capacity || probe.life > 24 || probe.heat >= 97) this.recall(probe)
    if (probe.mode === 'returning') {
      this.move(probe, base, dt, (helper ? 135 : 125) * (1 + (this.state.tools.winch ?? 0) * 0.25))
      if (Math.hypot(probe.x - base.x, probe.y - base.y) < 12) this.cargo.bank(probe, helper)
      return
    }
    const collecting = this.collecting.get(probe)
    if (collecting !== undefined) {
      this.collecting.set(probe, collecting - dt)
      probe.vx *= 0.8
      probe.vy *= 0.8
      if (collecting <= 0) {
        this.collecting.delete(probe)
        if (probe.cargo.length) this.recall(probe)
      }
      return
    }
    if (probe.mode === 'mining') {
      const node = this.state.nodes.find(
        (item) =>
          item.revealed && Math.hypot(item.x - probe.x, item.y - probe.y) < item.radius + 20,
      )
      if (!node) {
        probe.mode = 'flying'
        return
      }
      this.contact(probe, node, dt)
      this.world.drill(node, probe, dt, helper)
      if (!this.state.nodes.includes(node)) {
        probe.mode = 'flying'
        this.collecting.set(probe, 2)
      }
      return
    }
    this.move(
      probe,
      probe.target,
      dt,
      (helper ? 150 : 136) * (1 + this.state.meta.spool * 0.08) * (0.8 + probe.power * 0.2),
    )
    const range = 880 + this.state.meta.spool * 70
    if (Math.hypot(probe.x, probe.y - base.y) > range) {
      this.recall(probe)
      return
    }
    const node = this.state.nodes.find(
      (item) =>
        item.revealed &&
        Math.hypot(item.x - probe.x, item.y - probe.y) <= item.radius + 12 &&
        !this.pierced.get(probe)?.has(item.id),
    )
    if (node) {
      const pierce = helper ? 0 : (this.state.tools.pierce ?? 0)
      const hit = this.pierced.get(probe) ?? new Set<number>()
      if (pierce > hit.size) {
        hit.add(node.id)
        this.pierced.set(probe, hit)
        this.world.damage(node, 4.2 * probe.power, probe)
        probe.heat = Math.min(100, probe.heat + 9)
        this.emit({
          type: 'pulse',
          x: node.x,
          y: node.y,
          power: 0.65,
          tool: 'pierce',
          targets: [probe.target],
        })
        if (Math.hypot(probe.x - probe.target.x, probe.y - probe.target.y) < 160) {
          probe.target = {
            x: probe.target.x + Math.cos(probe.angle) * 150,
            y: probe.target.y + Math.sin(probe.angle) * 150,
          }
        }
      } else {
        probe.mode = 'mining'
        const distance = Math.max(0.001, Math.hypot(probe.x - node.x, probe.y - node.y))
        const nx = (probe.x - node.x) / distance
        const ny = (probe.y - node.y) / distance
        const impact = probe.vx * nx + probe.vy * ny
        if (impact < 0) {
          probe.vx -= impact * nx * 1.18
          probe.vy -= impact * ny * 1.18
        }
        probe.x = node.x + nx * (node.radius + 12)
        probe.y = node.y + ny * (node.radius + 12)
        probe.drillClock = 0
      }
    }
  }

  private move(probe: Probe, target: Vec, dt: number, speed: number) {
    const dx = target.x - probe.x
    const dy = target.y - probe.y
    const distance = Math.hypot(dx, dy)
    const load = 1 + probe.cargo.length * (0.095 - this.state.meta.bag * 0.008)
    speed *= Math.max(0.55, 1 - probe.heat / 220) / load
    const winch = probe.mode === 'returning' ? (this.state.tools.winch ?? 0) : 0
    const response =
      1 - Math.exp((-dt * (probe.mode === 'returning' ? 4.8 + winch * 1.5 : 4.2)) / load)
    const braking = Math.min(speed, Math.sqrt((Math.max(0, distance) * 340) / load))
    probe.vx += ((distance > 0.001 ? (dx / distance) * braking : 0) - probe.vx) * response
    probe.vy += ((distance > 0.001 ? (dy / distance) * braking : 0) - probe.vy) * response
    probe.x += probe.vx * dt
    probe.y += probe.vy * dt
    if (Math.hypot(probe.vx, probe.vy) > 2) probe.angle = Math.atan2(probe.vy, probe.vx)
  }

  private contact(probe: Probe, node: Vec & { radius: number }, dt: number) {
    const distance = Math.max(0.001, Math.hypot(probe.x - node.x, probe.y - node.y))
    const nx = (probe.x - node.x) / distance
    const ny = (probe.y - node.y) / distance
    probe.vx += (node.x + nx * (node.radius + 12) - probe.x) * 75 * dt
    probe.vy += (node.y + ny * (node.radius + 12) - probe.y) * 75 * dt
    probe.vx *= Math.exp(-dt * 9)
    probe.vy *= Math.exp(-dt * 9)
    probe.x += probe.vx * dt
    probe.y += probe.vy * dt
    probe.angle = Math.atan2(-ny, -nx)
    if (distance < node.radius + 10) {
      probe.x = node.x + nx * (node.radius + 10)
      probe.y = node.y + ny * (node.radius + 10)
    }
  }
}
