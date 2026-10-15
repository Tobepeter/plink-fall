import { Color, Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { FrameId, Runner } from '../../types'
import type { RushGait, RunnerFoot } from '../rush-gait'
import { palette } from '../palette'
import { frameArt } from '../../frame-art'
import { runnerProfiles } from './runner-profile'

// 固定上身轮廓与独立关节腿
export class RushRunner {
  view = new Container()
  private torso: Sprite
  private rear = new Graphics()
  private front = new Graphics()
  private frame: FrameId = 'runner'
  private scale = 1
  private accent = palette.teal
  private rearAccent = palette.teal
  private destroyed = false
  private joints: {
    hip: { x: number; y: number }
    knee: { x: number; y: number }
    ankle: { x: number; y: number }
  }[] = []

  constructor(private textures: Record<FrameId, Texture>) {
    this.torso = new Sprite(textures.runner)
    this.setFrame('runner')
    this.view.addChild(this.rear, this.front, this.torso)
    this.view.zIndex = 100000
  }

  render(player: Runner, pose: RushGait['pose']) {
    if (this.destroyed) return
    if (this.frame !== player.frame) this.setFrame(player.frame)
    this.view.position.set(player.x, player.y)
    this.view.scale.set(pose.face, 1)
    this.joints = []
    this.drawLeg(this.rear, pose.feet[1], true)
    this.drawLeg(this.front, pose.feet[0], false)
  }

  // 同一个上身 Sprite，只在机体变化时换派生纹理
  private setFrame(frame: FrameId) {
    this.frame = frame
    const texture = this.textures[frame]
    const profile = runnerProfiles[frame]
    this.scale = profile.torsoHeight / texture.height
    this.torso.texture = texture
    this.torso.anchor.set(frameArt[frame].torso.hipX / texture.width, 1)
    this.torso.scale.set(this.scale)
    this.torso.y = profile.hipY + 1
    this.accent = new Color(frameArt[frame].accent).toNumber()
    this.rearAccent =
      (Math.round(((this.accent >> 16) & 255) * 0.73) << 16) |
      (Math.round(((this.accent >> 8) & 255) * 0.73) << 8) |
      Math.round((this.accent & 255) * 0.73)
  }

  private drawLeg(g: Graphics, foot: RunnerFoot, rear: boolean) {
    g.clear()
    const profile = runnerProfiles[this.frame]
    const hip = { x: rear ? -profile.hipSpread : profile.hipSpread, y: profile.hipY }
    const ankle = { x: hip.x + foot.x, y: 11 - foot.lift }
    const dx = ankle.x - hip.x,
      dy = ankle.y - hip.y
    const distance = Math.min(profile.segment * 2 - 0.2, Math.max(1, Math.hypot(dx, dy)))
    const bend = Math.sqrt(Math.max(0, profile.segment ** 2 - (distance / 2) ** 2))
    const length = Math.max(1, Math.hypot(dx, dy))
    const knee = {
      x: hip.x + dx / 2 + (dy / length) * bend,
      y: hip.y + dy / 2 - (dx / length) * bend,
    }
    this.joints.push({ hip, knee, ankle })
    const accent = rear ? this.rearAccent : this.accent
    const armor = rear ? profile.rearArmor : profile.armor
    g.moveTo(hip.x, hip.y)
      .lineTo(knee.x, knee.y)
      .stroke({ color: palette.ink, width: profile.thigh + 2.6, cap: 'round' })
      .moveTo(hip.x, hip.y)
      .lineTo(knee.x, knee.y)
      .stroke({ color: armor, width: profile.thigh, cap: 'round' })
    g.moveTo(knee.x, knee.y)
      .lineTo(ankle.x, ankle.y)
      .stroke({ color: palette.ink, width: profile.shin + 2.5, cap: 'round' })
      .moveTo(knee.x, knee.y)
      .lineTo(ankle.x, ankle.y)
      .stroke({ color: profile.dark, width: profile.shin, cap: 'round' })
    this.drawKnee(g, knee, accent)
    const x = ankle.x,
      y = ankle.y
    g.poly([
      x - profile.heel,
      y + 2.2,
      x - profile.heel,
      y - 1.7,
      x,
      y - profile.bootHeight,
      x + profile.toe - 1.3,
      y - profile.bootHeight + 1,
      x + profile.toe,
      y + 0.8,
      x + profile.toe - 1,
      y + 2.2,
    ])
      .fill(accent)
      .stroke({ color: palette.ink, width: 1.35, join: 'round' })
    g.moveTo(x - profile.heel + 0.8, y + 1.6)
      .lineTo(x + profile.toe - 1.2, y + 1.6)
      .stroke({ color: profile.dark, width: this.frame === 'warden' ? 1.8 : 1.3, cap: 'round' })
    if (this.frame === 'spark')
      g.moveTo(knee.x, knee.y + 1)
        .lineTo(ankle.x, ankle.y - 1)
        .stroke({ color: accent, width: 1.1, cap: 'round' })
  }

  private drawKnee(g: Graphics, knee: { x: number; y: number }, accent: number) {
    const radius = runnerProfiles[this.frame].knee
    if (this.frame === 'warden') {
      g.roundRect(knee.x - 4.3, knee.y - 3.6, 8.6, 7.2, 1.3)
        .fill(palette.ink)
        .roundRect(knee.x - 3.2, knee.y - 2.5, 6.4, 5, 0.8)
        .fill(accent)
      return
    }
    if (this.frame === 'spark') {
      g.poly([knee.x, knee.y - 3.3, knee.x + 3, knee.y, knee.x, knee.y + 3.3, knee.x - 3, knee.y])
        .fill(palette.ink)
        .circle(knee.x, knee.y, radius)
        .fill(accent)
      return
    }
    g.circle(knee.x, knee.y, radius + 1.2).fill(palette.ink).circle(knee.x, knee.y, radius).fill(accent)
  }

  snapshot() {
    const texture = this.torso.texture
    return {
      frame: this.frame,
      torsoSprites: this.view.children.filter((child) => child instanceof Sprite).length,
      torsoHeight: runnerProfiles[this.frame].torsoHeight,
      hip: { x: 0, y: runnerProfiles[this.frame].hipY },
      accent: this.accent,
      upperBodyFrame: {
        x: texture.frame.x,
        y: texture.frame.y,
        width: texture.width,
        height: texture.height,
      },
      joints: this.joints.map((joint) => ({
        hip: { ...joint.hip },
        knee: { ...joint.knee },
        ankle: { ...joint.ankle },
      })),
      scale: { x: this.scale * this.view.scale.x, y: this.scale },
      position: { x: this.view.x, y: this.view.y },
      alpha: this.view.alpha,
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.view.destroy({ children: true })
  }
}
