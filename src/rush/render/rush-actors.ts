import { ColorMatrixFilter, Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { EnemyKind, Foe, RushEvent, RushState, Vec } from '../types'
import { clamp, foeColors, palette } from './palette'

const frameIndex: Record<EnemyKind, number> = {
  chaser: 1,
  charger: 2,
  shooter: 3,
  splitter: 4,
  brute: 5,
  boss: 6,
}

// 角色跑姿、武器动作与冲锋预兆
export class RushActors {
  view = new Container()
  private shadows = new Graphics()
  private telegraphs = new Graphics()
  private bodies = new Container()
  private equipment = new Graphics()
  private player = new Sprite()
  private playerLight = new ColorMatrixFilter()
  private foes = new Map<number, Sprite>()
  private ghosts: Array<Vec & { life: number; angle: number; texture: Texture }> = []
  private ghostSprites: Sprite[] = []
  private fire = 0
  private dashClock = 0
  private playerPoint: Vec = { x: 0, y: 0 }

  constructor(private textures: Texture[]) {
    this.view.addChild(this.telegraphs, this.shadows, this.bodies, this.equipment)
    this.bodies.sortableChildren = true
    this.player.anchor.set(0.5, 0.68)
    this.playerLight.brightness(1.35, false)
    this.player.filters = [this.playerLight]
    this.player.zIndex = 100000
    this.bodies.addChild(this.player)
  }

  render(state: RushState, dt: number) {
    const p = state.player
    this.playerPoint = { x: p.x, y: p.y }
    const moving = Math.hypot(p.vx, p.vy) > 10
    const frame = moving ? [0, 7, 8][Math.floor(p.walk / 24) % 3] : 0
    this.player.texture = this.textures[frame]
    const scale = 43 / this.player.texture.height
    const left = moving && Math.abs(p.vx) > 1 ? p.vx < 0 : Math.cos(p.angle) < 0
    this.player.scale.set(scale * (left ? -1 : 1), scale)
    this.player.position.set(p.x, p.y + (moving ? Math.sin(state.clock * 22) * 1.2 : 0))
    this.player.rotation = p.dashTime > 0 ? Math.sign(p.vx || 1) * 0.16 : 0
    this.player.alpha = p.invulnerable > 0 && Math.floor(state.clock * 18) % 2 ? 0.78 : 1
    this.player.tint = p.frame === 'spark' ? 0xbdedff : p.frame === 'warden' ? 0xdefff0 : 0xffffff
    this.fire = Math.max(0, this.fire - dt)
    this.dashClock -= dt
    if (p.dashTime > 0 && this.dashClock <= 0) {
      this.ghosts.push({
        x: p.x,
        y: p.y,
        life: 0.16,
        angle: this.player.rotation,
        texture: this.player.texture,
      })
      this.dashClock = 0.025
    }
    this.drawGhosts(dt)
    this.drawShadows(state)
    this.drawFoes(state)
    this.drawEquipment(state)
  }

  private drawGhosts(dt: number) {
    for (const ghost of this.ghosts) ghost.life -= dt
    this.ghosts = this.ghosts.filter((g) => g.life > 0).slice(-8)
    while (this.ghostSprites.length < this.ghosts.length) {
      const sprite = new Sprite()
      sprite.anchor.set(0.5, 0.68)
      this.ghostSprites.push(sprite)
      this.bodies.addChildAt(sprite, 0)
    }
    for (const [i, sprite] of this.ghostSprites.entries()) {
      const ghost = this.ghosts[i]
      sprite.visible = !!ghost
      if (!ghost) continue
      sprite.texture = ghost.texture
      sprite.position.set(ghost.x, ghost.y)
      sprite.scale.copyFrom(this.player.scale)
      sprite.rotation = ghost.angle
      sprite.tint = palette.teal
      sprite.alpha = (ghost.life / 0.16) * 0.32
    }
  }

  private drawShadows(state: RushState) {
    const g = this.shadows.clear()
    const p = state.player
    g.ellipse(p.x, p.y + 9, 15, 6).fill({ color: palette.ink, alpha: 0.65 })
    g.circle(p.x, p.y, p.radius + 5).stroke({ color: palette.teal, width: 1.5, alpha: 0.32 })
    for (const foe of state.enemies) {
      g.ellipse(foe.x, foe.y + foe.radius * 0.55, foe.radius * 0.95, foe.radius * 0.38).fill({
        color: palette.ink,
        alpha: 0.6,
      })
    }
  }

  private drawFoes(state: RushState) {
    const live = new Set<number>()
    this.telegraphs.clear()
    for (const foe of state.enemies) {
      live.add(foe.id)
      let sprite = this.foes.get(foe.id)
      if (!sprite) {
        sprite = new Sprite(this.textures[frameIndex[foe.kind]])
        sprite.anchor.set(0.5, 0.62)
        this.foes.set(foe.id, sprite)
        this.bodies.addChild(sprite)
      }
      const moving = Math.hypot(foe.vx, foe.vy) > 20
      const size =
        foe.kind === 'boss' ? 102 : foe.kind === 'brute' ? 48 : foe.kind === 'charger' ? 39 : 34
      const hurtScale = foe.hurt > 0 ? 1 + Math.min(0.12, foe.hurt * 0.6) : 1
      const scale = (size / Math.max(sprite.texture.width, sprite.texture.height)) * hurtScale
      const faceLeft = Math.cos(foe.angle) < 0
      sprite.scale.set(scale * (faceLeft && foe.kind !== 'boss' ? -1 : 1), scale)
      sprite.position.set(foe.x, foe.y + (moving ? Math.sin(foe.age * 18 + foe.id) * 1.2 : 0))
      sprite.rotation =
        foe.kind === 'boss'
          ? Math.sin(foe.age * 2) * 0.025
          : moving
            ? Math.sin(foe.age * 14 + foe.id) * 0.075
            : 0
      sprite.tint = foe.hurt > 0 ? 0xffb5b5 : foe.slow > 0 ? 0xa8dfff : 0xffffff
      sprite.blendMode = foe.hurt > 0 ? 'add' : 'normal'
      sprite.alpha = foe.hurt > 0 ? 0.76 : 1
      sprite.zIndex = foe.y
      this.foeSignals(foe)
    }
    for (const [id, sprite] of this.foes) {
      if (live.has(id)) continue
      sprite.destroy()
      this.foes.delete(id)
    }
  }

  private foeSignals(foe: Foe) {
    const g = this.telegraphs
    if (foe.age < 0.25) {
      const entrance = 1 - foe.age / 0.25
      g.circle(foe.x, foe.y, foe.radius + 4 + entrance * 9).stroke({
        color: foeColors[foe.kind],
        width: 1.5,
        alpha: entrance * 0.65,
      })
    }
    if (foe.telegraph > 0) {
      const a = Math.atan2(foe.target.y - foe.y, foe.target.x - foe.x)
      const length = foe.kind === 'charger' ? 180 : 70
      const x = foe.x + Math.cos(a) * length
      const y = foe.y + Math.sin(a) * length
      const color = foeColors[foe.kind]
      if (foe.kind === 'boss') {
        g.circle(foe.x, foe.y, foe.radius + 18).stroke({ color, width: 2, alpha: 0.35 })
        for (let i = 0; i < 8; i++) {
          const turn = (i * Math.PI) / 4 + foe.age * 0.55
          g.moveTo(
            foe.x + Math.cos(turn) * (foe.radius + 12),
            foe.y + Math.sin(turn) * (foe.radius + 12),
          ).lineTo(
            foe.x + Math.cos(turn) * (foe.radius + 27),
            foe.y + Math.sin(turn) * (foe.radius + 27),
          )
        }
        g.stroke({ color, width: 2, alpha: 0.6 })
      } else {
        g.moveTo(foe.x, foe.y)
          .lineTo(x, y)
          .stroke({ color, width: foe.kind === 'charger' ? 18 : 3, alpha: 0.12 })
        g.moveTo(foe.x, foe.y).lineTo(x, y).stroke({ color, width: 1.7, alpha: 0.65 })
        if (foe.kind === 'shooter') {
          const spread = (1 + foe.tier) * 0.19
          g.moveTo(foe.x, foe.y)
            .arc(foe.x, foe.y, 75, a - spread, a + spread)
            .closePath()
            .fill({ color, alpha: 0.08 })
        }
      }
      g.circle(foe.x, foe.y, foe.radius + 9).stroke({ color, width: 2, alpha: 0.8 })
    }
    if (foe.hurt > 0 && foe.kind !== 'boss') {
      const width = Math.max(20, foe.radius * 2)
      g.rect(foe.x - width / 2, foe.y - foe.radius - 12, width, 3).fill(palette.ink)
      g.rect(
        foe.x - width / 2,
        foe.y - foe.radius - 12,
        width * Math.max(0, foe.hp / foe.maxHp),
        3,
      ).fill(foeColors[foe.kind])
    }
  }

  private drawEquipment(state: RushState) {
    const p = state.player
    const g = this.equipment.clear()
    g.ellipse(p.x, p.y + 8, 17, 7).stroke({ color: palette.teal, width: 1.8, alpha: 0.72 })
    const overdrive = state.overdrive > 0
    const progress = clamp(overdrive ? state.overdrive / 3 : state.charge / 100, 0, 1)
    if (progress > 0.01) {
      const start = -Math.PI / 2
      const radius = 22
      g.moveTo(p.x + Math.cos(start) * radius, p.y + Math.sin(start) * radius)
        .arc(p.x, p.y, radius, start, start + progress * Math.PI * 2)
        .stroke({ color: overdrive ? palette.amber : palette.teal, width: 2, alpha: 0.82 })
    }
    const a = p.angle
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    const recoil = this.fire > 0 ? 2 : 0
    const start = { x: p.x + dx * (9 - recoil), y: p.y + dy * (9 - recoil) }
    const tip = { x: p.x + dx * (21 - recoil), y: p.y + dy * (21 - recoil) }
    g.moveTo(start.x, start.y)
      .lineTo(tip.x, tip.y)
      .stroke({ color: palette.ink, width: 7, cap: 'round' })
    g.moveTo(start.x, start.y)
      .lineTo(tip.x, tip.y)
      .stroke({
        color: state.overdrive > 0 ? palette.amber : palette.teal,
        width: 3.5,
        cap: 'round',
      })
    if (this.fire > 0) {
      g.poly([
        tip.x + dx * 13,
        tip.y + dy * 13,
        tip.x - dy * 5,
        tip.y + dx * 5,
        tip.x + dx * 3,
        tip.y + dy * 3,
        tip.x + dy * 5,
        tip.y - dx * 5,
      ]).fill(palette.cream)
    }
  }

  event(event: RushEvent) {
    if (event.type !== 'shot' || event.side === 'enemy') return
    if (Math.hypot(event.x - this.playerPoint.x, event.y - this.playerPoint.y) < 32)
      this.fire = 0.055
  }

  reset() {
    for (const sprite of this.foes.values()) sprite.destroy()
    this.foes.clear()
    this.ghosts = []
    for (const sprite of this.ghostSprites) sprite.visible = false
    this.fire = 0
    this.dashClock = 0
  }

  destroy() {
    this.reset()
    this.view.destroy({ children: true })
    this.playerLight.destroy()
  }
}
