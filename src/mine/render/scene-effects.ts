import { Container, Graphics, Sprite, Text } from 'pixi.js'
import type { MineEvent } from '../types'
import type { OreFragments } from './ore-field'
import { mineralColors, palette } from './palette'

type Effect = {
  view: Container
  life: number
  duration: number
  vx: number
  vy: number
  spin: number
  grow: boolean
  gravity: boolean
}

// 局部冲击与矿体碎裂
export class SceneEffects {
  view = new Container()
  private effects: Effect[] = []

  constructor(private fragments: OreFragments) {}

  private add(
    view: Container,
    duration: number,
    grow = false,
    vx = 0,
    vy = 0,
    spin = 0,
    gravity = false,
  ) {
    if (this.effects.length >= 48) this.effects.shift()?.view.destroy({ children: true })
    this.view.addChild(view)
    this.effects.push({ view, duration, life: duration, vx, vy, spin, grow, gravity })
  }

  event(event: MineEvent) {
    const color = mineralColors[event.kind ?? 'copper']
    if (event.targets?.length) {
      const path = new Graphics()
      for (const target of event.targets) {
        const dx = target.x - event.x
        const dy = target.y - event.y
        path
          .moveTo(0, 0)
          .lineTo(dx * 0.35 - dy * 0.05, dy * 0.35 + dx * 0.05)
          .lineTo(dx * 0.65 + dy * 0.04, dy * 0.65 - dx * 0.04)
          .lineTo(dx, dy)
          .stroke({ color: palette.jade, width: 3, alpha: 0.8 })
          .moveTo(0, 0)
          .lineTo(dx, dy)
          .stroke({ color: palette.cream, width: 1 })
      }
      path.position.set(event.x, event.y)
      this.add(path, 0.17)
    }
    if (event.type === 'break') {
      for (let i = 0; i < 4; i++) {
        const part = new Sprite(this.fragments[event.kind ?? 'stone'][i % 3])
        part.anchor.set(0.5)
        part.width = 18 + i * 3
        part.scale.y = part.scale.x
        part.position.set(event.x, event.y - 5)
        const angle = i * 1.6 - 0.8
        this.add(
          part,
          0.42,
          false,
          Math.cos(angle) * 80,
          Math.sin(angle) * 60 - 30,
          i % 2 ? 4 : -4,
          true,
        )
      }
      this.ring(event.x, event.y, 42, color, 0.22)
    } else if (event.type === 'hit') {
      const g = new Graphics()
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + event.x
        g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8)
          .lineTo(Math.cos(a) * 19, Math.sin(a) * 19)
          .stroke({ color: palette.cream, width: 2.5, alpha: 0.95 })
      }
      g.position.set(event.x, event.y)
      this.add(g, 0.1)
    } else if (event.type === 'pulse' || event.type === 'gas') {
      this.ring(
        event.x,
        event.y,
        event.amount ?? 120,
        event.type === 'gas' ? palette.red : palette.jade,
        0.5,
      )
    } else if (event.type === 'pickup') {
      this.ring(event.x, event.y, 11, color, 0.18)
    } else if (event.type === 'bank') {
      this.ring(0, 70, 74, palette.amber, 0.48)
      const label = new Text({
        text: `+${Math.round(event.amount ?? 0)}`,
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: 22,
          fontWeight: '800',
          fill: palette.cream,
          stroke: { color: palette.ink, width: 3 },
        },
      })
      label.anchor.set(0.5)
      label.position.set(53, 38)
      this.add(label, 1.1, false, 0, -22)
    } else if (event.type === 'relic') {
      this.ring(event.x, event.y, event.amount ? 80 : 60, palette.jade, 0.9)
    } else if (event.type === 'install') {
      this.ring(0, 105, 44, palette.amber, 0.5)
    }
  }

  private ring(x: number, y: number, radius: number, color: number, life: number) {
    const g = new Graphics()
      .circle(0, 0, radius)
      .stroke({ color, width: 3, alpha: 0.75 })
      .circle(0, 0, radius * 0.93)
      .stroke({ color: palette.cream, width: 1, alpha: 0.6 })
    g.position.set(x, y)
    this.add(g, life, true)
  }

  update(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]
      effect.life -= dt
      if (effect.life <= 0) {
        effect.view.destroy({ children: true })
        this.effects.splice(i, 1)
        continue
      }
      effect.view.x += effect.vx * dt
      effect.view.y += effect.vy * dt
      effect.view.rotation += effect.spin * dt
      if (effect.gravity) effect.vy += dt * 240
      const progress = 1 - effect.life / effect.duration
      effect.view.alpha = Math.min(1, effect.life / Math.min(0.2, effect.duration))
      if (effect.grow) effect.view.scale.set(0.2 + Math.min(1, progress * 2) * 0.8)
    }
  }

  destroy() {
    this.effects = []
    this.view.destroy({ children: true })
  }
}
