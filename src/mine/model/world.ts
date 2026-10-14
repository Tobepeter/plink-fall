import { mineralValue } from './data'
import type { Drop, MineEvent, MineState, OreNode, Probe, Vec } from '../types'

// 碰撞、碎矿与范围动作
export class MineWorld {
  private nextId: number

  constructor(
    private state: MineState,
    private emit: (event: MineEvent) => void,
  ) {
    this.nextId = Math.max(0, ...state.drops.map((drop) => drop.id)) + 1
  }

  damage(node: OreNode, amount: number, probe: Probe, effects = true) {
    if (!this.state.nodes.includes(node) || !node.revealed) return
    node.hp = Math.max(0, node.hp - amount)
    if (effects) this.emit({ type: 'hit', x: node.x, y: node.y, kind: node.kind, power: amount })
    if (node.kind === 'volatile' && node.hp < node.maxHp * 0.35 && node.variant < 10) {
      node.variant += 10
      probe.heat = Math.min(100, probe.heat + (this.state.tools.vent ? 8 : 32))
      const radius = 125
      this.emit({
        type: 'gas',
        x: node.x,
        y: node.y,
        power: this.state.tools.vent ? 0.3 : 1,
        amount: radius,
      })
      for (const other of [...this.state.nodes]) {
        if (
          other !== node &&
          other.kind !== 'relic' &&
          Math.hypot(other.x - node.x, other.y - node.y) < radius
        )
          this.damage(other, 2.1, probe, false)
      }
      for (const drop of this.state.drops) {
        const dx = drop.x - node.x
        const dy = drop.y - node.y
        const distance = Math.max(1, Math.hypot(dx, dy))
        if (drop.carrier === 'loose' && distance < radius) {
          drop.vx += (dx / distance) * 95
          drop.vy += (dy / distance) * 95
          drop.vz += 24
        }
      }
    }
    if (node.hp > 0 || !this.state.nodes.includes(node)) return
    this.state.nodes.splice(this.state.nodes.indexOf(node), 1)
    const count =
      node.id === 1 && node.kind === 'copper'
        ? 8
        : node.kind === 'relic'
          ? 1
          : node.kind === 'stone'
            ? 3
            : node.kind === 'jade'
              ? 7
              : node.kind === 'amber'
                ? 6
                : 5
    if (node.kind === 'relic' && this.state.drops.length >= 180) {
      const disposable = this.state.drops.findIndex(
        (drop) => drop.carrier === 'loose' && drop.kind !== 'relic',
      )
      if (disposable >= 0) this.state.drops.splice(disposable, 1)
    }
    for (let i = 0; i < count && this.state.drops.length < 180; i++) {
      const angle = node.angle + i * 2.399
      const drop: Drop = {
        id: this.nextId++,
        kind: node.kind,
        value: mineralValue[node.kind],
        x: node.id === 1 && i >= 5 ? 32 + (i - 5) * 8 : node.x + Math.cos(angle) * 12,
        y: node.id === 1 && i >= 5 ? 290 : node.y + Math.sin(angle) * 12,
        vx: node.id === 1 && i >= 5 ? 0 : Math.cos(angle) * 24,
        vy: node.id === 1 && i >= 5 ? 0 : Math.sin(angle) * 24,
        z: 9 + (i % 3) * 4,
        vz: 22 + (i % 4) * 6,
        age: 0,
        carrier: 'loose',
      }
      this.state.drops.push(drop)
    }
    this.emit({ type: 'break', x: node.x, y: node.y, kind: node.kind, amount: count })
  }

  pulse(probe: Probe, power: number) {
    const radius = 102 + power * 35
    const targets = this.state.nodes.filter(
      (node) =>
        node.revealed && Math.hypot(node.x - probe.x, node.y - probe.y) < radius + node.radius,
    )
    const vent = this.state.tools.vent ?? 0
    probe.heat = Math.min(100, Math.max(0, probe.heat + 18 - vent * 18))
    this.emit({
      type: 'pulse',
      x: probe.x,
      y: probe.y,
      power,
      amount: radius,
      targets: targets.map((node) => ({ x: node.x, y: node.y })),
    })
    for (const node of targets) {
      if (vent && node.kind === 'volatile') node.variant = Math.max(10, node.variant)
      this.damage(node, 2.6 * power, probe)
    }
    for (const drop of this.state.drops) {
      const dx = drop.x - probe.x
      const dy = drop.y - probe.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      if (drop.carrier === 'loose' && distance < radius) {
        drop.vx += (dx / distance) * (vent ? 75 : 35)
        drop.vy += (dy / distance) * (vent ? 75 : 35)
        drop.vz += 20
      }
    }
  }

  drill(node: OreNode, probe: Probe, dt: number, helper = false) {
    const heatFactor = Math.max(0.38, 1 - probe.heat / 150)
    const hardness = node.kind === 'jade' || node.kind === 'stone' ? 0.6 : 1
    const damage = (helper ? 0.62 : 0.7) * probe.power * heatFactor * hardness * dt
    this.damage(node, damage, probe, false)
    const previous = probe.drillClock
    probe.drillClock += dt
    probe.heat = Math.min(100, probe.heat + dt * 4.8)
    if (Math.floor(previous / 0.18) === Math.floor(probe.drillClock / 0.18)) return
    const interval = (Math.floor(probe.drillClock / 0.18) - Math.floor(previous / 0.18)) * 0.18
    const sideDamage = (helper ? 0.62 : 0.7) * probe.power * heatFactor * interval
    this.emit({ type: 'hit', x: node.x, y: node.y, kind: node.kind, power: probe.power })
    probe.vx -= Math.cos(probe.angle) * 3 * probe.power
    probe.vy -= Math.sin(probe.angle) * 3 * probe.power
    if (helper) return
    const chain = this.state.tools.chain ?? 0
    const nearby = this.state.nodes.filter(
      (other) => other !== node && other.revealed && other.kind !== 'relic',
    )
    if (chain) {
      const targets = nearby
        .filter((other) => Math.hypot(other.x - node.x, other.y - node.y) < 175 + chain * 15)
        .slice(0, chain + 1)
      for (const other of targets)
        this.damage(other, sideDamage * (0.65 + chain * 0.25), probe, false)
      if (targets.length)
        this.emit({
          type: 'hit',
          x: node.x,
          y: node.y,
          tool: 'chain',
          power: chain,
          targets: targets.map((other) => ({ x: other.x, y: other.y })),
        })
    }
    if (this.state.tools.saw) {
      for (const other of nearby)
        if (Math.hypot(other.x - probe.x, other.y - probe.y) < 95 + this.state.tools.saw * 25)
          this.damage(other, sideDamage * (0.65 + this.state.tools.saw * 0.15), probe, false)
    }
    if (this.state.tools.split) {
      const direction = { x: Math.cos(probe.angle), y: Math.sin(probe.angle) }
      const targets = nearby
        .filter((other) => {
          const dx = other.x - node.x
          const dy = other.y - node.y
          return (
            Math.abs(dx * direction.x + dy * direction.y) < 65 &&
            Math.hypot(dx, dy) < 150 + this.state.tools.split! * 20
          )
        })
        .slice(0, 2 + this.state.tools.split)
      for (const other of targets)
        this.damage(other, sideDamage * (0.55 + this.state.tools.split * 0.15), probe, false)
    }
  }

  // 无拖拽的瞄准方向
  clampTarget(point: Vec) {
    const x = Number.isFinite(point.x) ? point.x : 0
    const y = Number.isFinite(point.y) ? point.y : 300
    return { x: Math.max(-620, Math.min(620, x)), y: Math.max(190, Math.min(920, y)) }
  }
}
