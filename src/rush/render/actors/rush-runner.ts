import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import type { Runner } from '../../types'
import type { RushGait, RunnerFoot } from '../rush-gait'
import { palette } from '../palette'

// 固定上身轮廓与独立关节腿
export class RushRunner {
  view = new Container()
  private torso: Sprite
  private rear = new Graphics()
  private front = new Graphics()
  private texture: Texture
  private scale = 58 / 264
  private hip = { x: -52 * this.scale, y: 14 - 85 * this.scale }
  private joints: {
    hip: { x: number; y: number }
    knee: { x: number; y: number }
    ankle: { x: number; y: number }
  }[] = []

  constructor(source: Texture) {
    // 原生帧0的 trim=(150,52,239,261)，source y=235 为腰线
    this.texture = new Texture({
      source: source.source,
      frame: new Rectangle(source.frame.x, source.frame.y, source.width, 183),
    })
    this.torso = new Sprite(this.texture)
    this.torso.anchor.set(141 / this.texture.width, 0)
    this.torso.scale.set(this.scale)
    this.torso.y = 14 - source.height * this.scale
    this.view.addChild(this.rear, this.front, this.torso)
    this.view.zIndex = 100000
  }

  render(player: Runner, pose: RushGait['pose']) {
    this.view.position.set(player.x, player.y)
    this.view.scale.set(pose.face, 1)
    this.joints = []
    this.drawLeg(this.rear, pose.feet[1], true)
    this.drawLeg(this.front, pose.feet[0], false)
  }

  private drawLeg(g: Graphics, foot: RunnerFoot, rear: boolean) {
    g.clear()
    const hip = { x: this.hip.x + (rear ? -1.3 : 1.3), y: this.hip.y }
    const ankle = { x: hip.x + foot.x, y: 11 - foot.lift }
    const dx = ankle.x - hip.x,
      dy = ankle.y - hip.y
    const distance = Math.min(21.4, Math.max(1, Math.hypot(dx, dy)))
    const bend = Math.sqrt(Math.max(0, 10.8 ** 2 - (distance / 2) ** 2))
    const length = Math.hypot(dx, dy)
    const knee = {
      x: hip.x + dx / 2 + (dy / length) * bend,
      y: hip.y + dy / 2 - (dx / length) * bend,
    }
    this.joints.push({ hip, knee, ankle })
    const mint = rear ? 0x60b99b : palette.teal
    const cream = rear ? 0xddcfb8 : palette.cream
    g.moveTo(hip.x, hip.y)
      .lineTo(knee.x, knee.y)
      .stroke({ color: palette.ink, width: 7.4, cap: 'round' })
      .moveTo(hip.x, hip.y)
      .lineTo(knee.x, knee.y)
      .stroke({ color: cream, width: 4.8, cap: 'round' })
    g.moveTo(knee.x, knee.y)
      .lineTo(ankle.x, ankle.y)
      .stroke({ color: palette.ink, width: 6.7, cap: 'round' })
      .moveTo(knee.x, knee.y)
      .lineTo(ankle.x, ankle.y)
      .stroke({ color: 0x24423f, width: 4.2, cap: 'round' })
    g.circle(knee.x, knee.y, 3.6).fill(palette.ink).circle(knee.x, knee.y, 2.4).fill(mint)
    const x = ankle.x,
      y = ankle.y
    g.poly([
      x - 3.2,
      y + 2.2,
      x - 3.2,
      y - 1.7,
      x,
      y - 3,
      x + 5.7,
      y - 2,
      x + 7,
      y + 0.8,
      x + 6,
      y + 2.2,
    ])
      .fill(mint)
      .stroke({ color: palette.ink, width: 1.35, join: 'round' })
    g.moveTo(x - 2.4, y + 1.6)
      .lineTo(x + 5.8, y + 1.6)
      .stroke({ color: 0x1c343d, width: 1.3, cap: 'round' })
  }

  snapshot() {
    return {
      upperBodyFrame: {
        x: this.texture.frame.x,
        y: this.texture.frame.y,
        width: this.texture.width,
        height: this.texture.height,
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
    this.view.destroy({ children: true })
    this.texture.destroy()
  }
}
