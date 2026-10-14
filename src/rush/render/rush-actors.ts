import { Container, Graphics, Sprite } from 'pixi.js'
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
  private weapon = new Sprite()
  private foes = new Map<number, Sprite>()
  private fire = 0
  private dashLines = new Graphics()
  private playerScale = 1
  private playerPoint: Vec = { x: 0, y: 0 }

  constructor(
    private textures: Texture[],
    weapon: Texture,
  ) {
    this.weapon.texture = weapon
    this.weapon.anchor.set(229 / weapon.width, 132 / weapon.height)
    this.weapon.scale.set(17 / Math.hypot(176, 44))
    this.view.addChild(
      this.telegraphs,
      this.shadows,
      this.dashLines,
      this.bodies,
      this.weapon,
      this.equipment,
    )
    this.bodies.sortableChildren = true
    this.playerScale = 52 / Math.max(...[0, 7, 8].map((i) => textures[i].height))
    this.player.zIndex = 100000
    this.bodies.addChild(this.player)
  }

  render(state: RushState, dt: number) {
    const p = state.player
    this.playerPoint = { x: p.x, y: p.y }
    const moving = Math.hypot(p.vx, p.vy) > 10
    const frame = moving ? [0, 7, 8][Math.floor(p.walk / 38) % 3] : 0
    this.player.texture = this.textures[frame]
    // 相同头盔轴、脚基线与量尺；独立裁图不改变步态尺寸
    const headAxis = frame === 0 ? 141 : frame === 7 ? 130 : 131
    this.player.anchor.set(headAxis / this.player.texture.width, 1)
    const scale = this.playerScale
    const left = moving && Math.abs(p.vx) > 1 ? p.vx < 0 : Math.cos(p.angle) < 0
    this.player.scale.set(scale * (left ? -1 : 1), scale)
    this.player.position.set(p.x, p.y + 14)
    this.player.rotation = 0
    this.player.alpha = 1
    this.player.tint = 0xffffff
    this.fire = Math.max(0, this.fire - dt)
    this.drawDash(state)
    this.drawShadows(state)
    this.drawFoes(state)
    this.drawEquipment(state)
  }

  private drawDash(state: RushState) {
    const g = this.dashLines.clear()
    const p = state.player
    if (p.dashTime <= 0) return
    const a = Math.atan2(p.vy, p.vx)
    const dx = Math.cos(a),
      dy = Math.sin(a)
    for (const offset of [-11, 0, 11]) {
      const x = p.x - dx * 12 - dy * offset
      const y = p.y - dy * 12 + dx * offset
      g.moveTo(x, y).lineTo(x - dx * (offset === 0 ? 54 : 36), y - dy * (offset === 0 ? 54 : 36))
    }
    g.stroke({ color: palette.cream, width: 2, alpha: 0.8, cap: 'round' })
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
        foe.kind === 'boss' ? 112 : foe.kind === 'brute' ? 58 : foe.kind === 'charger' ? 48 : 43
      const hurt = Math.min(1, foe.hurt / 0.1)
      const scale = size / Math.max(sprite.texture.width, sprite.texture.height)
      const faceLeft = Math.cos(foe.angle) < 0
      sprite.scale.set(
        scale * (faceLeft && foe.kind !== 'boss' ? -1 : 1) * (1 + hurt * 0.12),
        scale * (1 - hurt * 0.1),
      )
      const away = Math.atan2(foe.y - state.player.y, foe.x - state.player.x)
      sprite.position.set(foe.x + Math.cos(away) * hurt * 3, foe.y + Math.sin(away) * hurt * 3)
      sprite.rotation =
        foe.kind === 'boss'
          ? Math.sin(foe.age * 2) * 0.025
          : moving
            ? Math.sin(foe.age * 14 + foe.id) * 0.075
            : 0
      sprite.tint = foe.slow > 0 ? 0xb2dacb : 0xffffff
      sprite.blendMode = foe.hurt > 0.055 ? 'add' : 'normal'
      sprite.alpha = 1
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
    // 胸前枢轴、枪口与模型同一个起点；身体不含静态武器
    this.weapon.position.set(p.x, p.y - 16)
    this.weapon.rotation = a - Math.atan2(44, -176)
    const tip = { x: p.x + dx * 17, y: p.y - 16 + dy * 17 }
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
    this.dashLines.clear()
    this.fire = 0
  }

  destroy() {
    this.reset()
    this.view.destroy({ children: true })
  }
}
