import { Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { MineEvent, MineState, Probe } from '../types'
import { clamp, palette } from './palette'
import { ProbeTools } from './probe-tools'

export type ActorTextures = { base: Texture; probe: Texture; drill: Texture; drone: Texture }
type Actor = {
  view: Container
  shadow: Graphics
  body: Sprite
  drills: Sprite[]
  flame: Graphics
  spin: number
  freeze: number
  recoil: number
  angle: number
}

// 探针装配、旋钻与基地装载
export class ProbeRig {
  view = new Container()
  private base = new Container()
  private hopper = new Graphics()
  private glow = new Graphics()
  private actor: Actor
  private helper: Actor
  private tools = new ProbeTools()
  private bankImpulse = 0
  private lastBanked = -1

  constructor(textures: ActorTextures) {
    const shadow = new Graphics().ellipse(0, 91, 68, 19).fill({ color: palette.ink, alpha: 0.2 })
    const base = new Sprite(textures.base)
    base.anchor.set(0.5)
    base.width = 156
    base.scale.y = base.scale.x
    this.base.position.set(0, 62)
    this.base.addChild(base, this.hopper)
    this.glow.circle(0, 70, 80).fill({ color: palette.amber, alpha: 0.1 })
    this.actor = this.createActor(textures.probe, textures.drill, 57, false)
    this.helper = this.createActor(textures.drone, textures.drill, 39, true)
    this.actor.view.addChild(this.tools.view)
    this.view.addChild(
      shadow,
      this.glow,
      this.base,
      this.actor.shadow,
      this.helper.shadow,
      this.helper.view,
      this.actor.view,
    )
  }

  private createActor(texture: Texture, drill: Texture, width: number, helper: boolean): Actor {
    const view = new Container()
    const shadow = new Graphics()
      .ellipse(0, 0, width * 0.48, width * 0.2)
      .fill({ color: palette.ink, alpha: 0.23 })
    const body = new Sprite(texture)
    body.anchor.set(0.5)
    body.width = width
    body.scale.y = body.scale.x
    const drills: Sprite[] = []
    for (let i = 0; i < 2; i++) {
      const bit = new Sprite(drill)
      bit.anchor.set(0.28, 0.5)
      bit.width = helper ? 20 : 34
      bit.scale.y = bit.scale.x
      bit.position.set(helper ? 12 : 22, 0)
      drills.push(bit)
    }
    const flame = new Graphics()
      .poly([-25, -7, -47, 0, -25, 7])
      .fill({ color: palette.copper, alpha: 0.75 })
      .poly([-25, -3, -36, 0, -25, 3])
      .fill(palette.cream)
    view.addChild(flame, body, ...drills)
    return { view, body, shadow, drills, flame, spin: 0, freeze: 0, recoil: 0, angle: Math.PI / 2 }
  }

  render(state: MineState, dt: number) {
    this.tools.sync(state)
    this.tools.render(state, state.paused ? 0 : dt)
    this.pose(this.actor, state.probe, state, dt, false)
    this.helper.view.visible = Boolean(state.tools.drone)
    this.helper.shadow.visible = this.helper.view.visible
    if (state.tools.drone) this.pose(this.helper, state.drone, state, dt, true)
    this.bankImpulse = Math.max(0, this.bankImpulse - dt * 2.5)
    this.base.scale.set(1 + Math.sin(this.bankImpulse * Math.PI) * 0.045)
    this.glow.alpha = state.choices.length ? 0.65 + Math.sin(state.clock * 2) * 0.18 : 0.3
    if (this.lastBanked !== state.banked) {
      this.lastBanked = state.banked
      this.hopper.clear()
      const ratio = clamp(
        (state.banked % Math.max(1, state.quota)) / Math.max(1, state.quota),
        0,
        1,
      )
      for (let i = 0; i < Math.ceil(ratio * 7); i++) {
        const x = 18 + (i % 4) * 9
        const y = 29 - Math.floor(i / 4) * 8
        this.hopper
          .poly([x - 5, y, x - 2, y - 7, x + 4, y - 5, x + 6, y + 1])
          .fill(palette.copper)
          .stroke({ color: palette.ink, width: 1 })
      }
    }
  }

  private pose(actor: Actor, probe: Probe, state: MineState, dt: number, helper: boolean) {
    const running = !state.paused
    const mining = probe.mode === 'mining'
    const moving = probe.mode === 'flying' || probe.mode === 'returning'
    actor.freeze = Math.max(0, actor.freeze - dt)
    actor.recoil = Math.max(0, actor.recoil - dt * 12)
    if (running && actor.freeze <= 0) actor.spin += dt * (mining ? 42 : moving ? 15 : 0)
    actor.view.position.set(probe.x, probe.y - (moving ? 4 : 0))
    actor.shadow.position.set(probe.x, probe.y + 11)
    const turn = Math.atan2(
      Math.sin(probe.angle - actor.angle),
      Math.cos(probe.angle - actor.angle),
    )
    actor.angle += turn * Math.min(1, dt * 14)
    actor.view.rotation = actor.angle
    const weight = Math.min(1, probe.cargo.length / Math.max(1, state.capacity))
    const lunge = mining ? Math.sin((probe.drillClock / 0.18) * Math.PI * 2) * 2 : 0
    actor.body.x = -actor.recoil * 4 + lunge - weight
    actor.body.scale.y = actor.body.scale.x * (1 + actor.recoil * 0.08)
    actor.body.tint = probe.heat > 70 ? 0xffd3b8 : 0xffffff
    actor.flame.visible = moving && running && Math.hypot(probe.vx, probe.vy) > 15
    actor.flame.scale.x = moving ? 0.65 + Math.sin(state.clock * 30) * 0.2 : 0
    actor.flame.alpha = probe.mode === 'returning' ? 0.4 : 0.75
    const split = !helper && Boolean(state.tools.split)
    for (let i = 0; i < actor.drills.length; i++) {
      const bit = actor.drills[i]
      bit.visible = i === 0 || split
      bit.y = split ? (i ? 10 : -10) : 0
      bit.x = (helper ? 12 : 22) + lunge * 1.4 - actor.recoil * 3
      bit.scale.y = bit.scale.x * (0.72 + Math.abs(Math.cos(actor.spin + i)) * 0.28)
      bit.rotation = split ? (i ? 0.12 : -0.12) : 0
      bit.tint = state.tools.pierce && !helper ? 0xffdcc8 : 0xffffff
    }
    if (!helper) this.tools.view.x = actor.body.x
  }

  event(event: MineEvent) {
    if (event.type === 'hit') {
      const actor =
        Math.hypot(this.helper.view.x - event.x, this.helper.view.y - event.y) <
        Math.hypot(this.actor.view.x - event.x, this.actor.view.y - event.y)
          ? this.helper
          : this.actor
      actor.recoil = 1
      actor.freeze = 0.035
    }
    if (event.type === 'bank' || event.type === 'install') this.bankImpulse = 1
  }

  destroy() {
    this.tools.destroy()
    this.view.destroy({ children: true })
  }
}
