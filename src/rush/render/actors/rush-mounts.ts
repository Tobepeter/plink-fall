import { Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { RushEvent, RushState, WeaponId } from '../../types'
import { palette } from '../palette'
import { weaponColors } from '../rush-weapon-style'

const grip = {
  laser: { x: 0.73, y: 0.55, angle: 2.95, size: 39 },
  scatter: { x: 0.78, y: 0.66, angle: -2.97, size: 33 },
  flame: { x: 0.72, y: 0.72, angle: -3.1, size: 34 },
  toxin: { x: 0.6, y: 0.72, angle: -2.49, size: 31 },
  arc: { x: 0.5, y: 0.7, angle: 0, size: 28 },
  blade: { x: 0.5, y: 0.5, angle: 0, size: 19 },
} satisfies Record<WeaponId, { x: number; y: number; angle: number; size: number }>

// 三个固定挂点；枪体后坐与人体步态分离
export class RushMounts {
  view = new Container()
  private mounts = Array.from({ length: 3 }, () => {
    const view = new Container(),
      sprite = new Sprite()
    view.addChild(sprite)
    this.view.addChild(view)
    return { view, sprite, id: null as WeaponId | null }
  })
  private signals = new Graphics()
  private flash = new Map<WeaponId, number>()
  private destroyed = false

  constructor(
    private textures: Partial<Record<WeaponId, Texture>>,
    private fallback: Texture,
  ) {
    this.view.addChild(this.signals)
  }

  render(state: RushState, dt: number, reduced: boolean) {
    if (this.destroyed) return
    for (const [id, time] of this.flash) {
      const left = Math.max(0, time - dt)
      if (left) this.flash.set(id, left)
      else this.flash.delete(id)
    }
    const g = this.signals.clear()
    const p = state.player
    for (const [index, mount] of this.mounts.entries()) {
      const slot = state.weapons[index]
      mount.view.visible = Boolean(slot)
      mount.id = slot?.id ?? null
      if (!slot) continue
      const profile = grip[slot.id]
      const texture = this.textures[slot.id] ?? this.fallback
      const sprite = mount.sprite
      sprite.texture = texture
      sprite.anchor.set(profile.x, profile.y)
      const a = p.angle
      const dx = Math.cos(a),
        dy = Math.sin(a)
      const shoulder = index === 0 ? 0 : index === 1 ? -1 : 1
      mount.view.position.set(p.x + shoulder * 13, p.y - 16 - Math.abs(shoulder) * 14)
      const size = profile.size * (index ? 0.66 : 1)
      const scale = size / Math.max(texture.width, texture.height)
      const neutral = slot.id === 'arc' || slot.id === 'blade'
      const flip = neutral ? 1 : Math.cos(a) > 0 ? -1 : 1
      sprite.scale.set(scale, scale * flip)
      sprite.rotation = neutral
        ? 0
        : a - Math.atan2(Math.sin(profile.angle) * flip, Math.cos(profile.angle))
      const firing = this.flash.get(slot.id) ?? 0
      const recoil = reduced ? 0 : (firing / 0.1) * (slot.id === 'scatter' ? 4 : 1.4)
      sprite.position.set(-dx * recoil, -dy * recoil)
      if (slot.branch) {
        const x = mount.view.x + dx * 12,
          y = mount.view.y + dy * 12
        for (const side of [-1, 1]) {
          const distance = slot.branch === 'spread' ? 6 : 3
          g.moveTo(x - dy * side * distance, y + dx * side * distance)
            .lineTo(x + dx * 6 - dy * side * distance, y + dy * 6 + dx * side * distance)
            .stroke({ color: weaponColors[slot.id], width: 1.5, alpha: 0.85 })
        }
      }
      if (slot.level >= 5)
        g.circle(mount.view.x, mount.view.y, index ? 5 : 7).stroke({
          color: weaponColors[slot.id],
          width: 1.3,
          alpha: 0.75,
        })
      if (!firing || neutral) continue
      const tipX = mount.view.x + dx * (index ? 12 : 19)
      const tipY = mount.view.y + dy * (index ? 12 : 19)
      g.poly([
        tipX,
        tipY,
        tipX + dx * 8 - dy * 3.5,
        tipY + dy * 8 + dx * 3.5,
        tipX + dx * 5,
        tipY + dy * 5,
        tipX + dx * 8 + dy * 3.5,
        tipY + dy * 8 - dx * 3.5,
      ]).fill({ color: slot.id === 'scatter' ? palette.cream : weaponColors[slot.id], alpha: 0.85 })
    }
  }

  event(event: RushEvent) {
    if (this.destroyed || !event.weapon || event.side === 'enemy') return
    if (event.type === 'weapon' || event.type === 'shot') this.flash.set(event.weapon, 0.1)
  }

  snapshot() {
    return this.mounts.map((mount) => ({
      id: mount.id,
      visible: mount.view.visible,
      x: mount.view.x,
      y: mount.view.y,
      recoil: { x: mount.sprite.x, y: mount.sprite.y },
      texture: {
        x: mount.sprite.texture.frame.x,
        y: mount.sprite.texture.frame.y,
        width: mount.sprite.texture.width,
        height: mount.sprite.texture.height,
      },
    }))
  }

  pivot() {
    return { x: this.mounts[0].view.x, y: this.mounts[0].view.y }
  }

  reset() {
    if (this.destroyed) return
    this.flash.clear()
    this.signals.clear()
    for (const mount of this.mounts) {
      mount.view.visible = false
      mount.id = null
      mount.sprite.position.set(0, 0)
    }
  }

  destroy() {
    if (this.destroyed) return
    this.reset()
    this.destroyed = true
    this.view.destroy({ children: true })
  }
}
