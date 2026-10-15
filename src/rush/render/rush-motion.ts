import { Easing, Group, Tween } from '@tweenjs/tween.js'
import { Graphics } from 'pixi.js'
import type { ProtocolId, RushEvent, Vec } from '../types'
import { palette } from './palette'
import { isWeaponReaction } from './rush-reactions'
import { reactionColors } from './rush-weapon-style'

type MotionKind = 'deploy' | 'assemble' | 'boost' | 'cut' | 'reward' | 'link'
interface MotionMark extends Vec {
  id: number
  kind: MotionKind
  progress: number
  protocol?: ProtocolId
}

// 游戏有效帧驱动的短机械动作
export class RushMotion {
  readonly view = new Graphics()
  private group = new Group()
  private marks = new Map<number, MotionMark>()
  private tweens = new Map<number, Tween<MotionMark>>()
  private clock = 0
  private nextId = 0
  private destroyed = false

  constructor(private player: () => Vec) {}

  launch() {
    if (this.destroyed) return
    this.add('deploy', this.player(), 360)
  }

  event(event: RushEvent) {
    if (this.destroyed) return
    if (event.type === 'upgrade') this.add('assemble', event, 320)
    if (event.type === 'protocol' && event.amount === 1)
      this.add('link', event, 460, event.protocol)
    if (event.type === 'overdrive') this.add('boost', event, 440)
    if (event.type === 'counter') this.add('cut', event, 240)
    if (
      event.type === 'pickup' &&
      Math.hypot(event.x - this.player().x, event.y - this.player().y) < 240
    )
      this.add('reward', event, 210)
  }

  private add(kind: MotionKind, point: Vec, duration: number, protocol?: ProtocolId) {
    if (this.destroyed) return
    // 有限效果，不积累离屏回收与已经结束的Tween
    if (this.tweens.size >= 24) this.tweens.values().next().value?.stop()
    const id = ++this.nextId
    const mark: MotionMark = { x: point.x, y: point.y, id, kind, progress: 0, protocol }
    const cleanup = () => {
      this.group.remove(tween)
      this.tweens.delete(id)
      this.marks.delete(id)
    }
    const tween = new Tween(mark)
      .to({ progress: 1 }, duration)
      .easing(kind === 'reward' ? Easing.Cubic.In : Easing.Cubic.Out)
      .onComplete(cleanup)
      .onStop(cleanup)
    this.marks.set(id, mark)
    this.tweens.set(id, tween)
    this.group.add(tween)
    tween.start(this.clock)
  }

  render(dt: number, reduced: boolean) {
    if (this.destroyed) return
    if (reduced) {
      this.reset()
      return
    }
    this.clock += Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) * 1000 : 0
    this.group.update(this.clock)
    const g = this.view.clear()
    for (const mark of this.marks.values()) {
      const t = mark.progress
      const p = this.player()
      if (mark.kind === 'link') {
        this.drawLink(mark, p)
        continue
      }
      if (mark.kind === 'reward') {
        const x = mark.x + (p.x - mark.x) * t
        const y = mark.y + (p.y - mark.y) * t - Math.sin(t * Math.PI) * 13
        const r = 3 * (1 - t * 0.5)
        g.poly([x, y - r, x + r, y, x, y + r, x - r, y]).fill({
          color: palette.amber,
          alpha: 1 - t * 0.7,
        })
        continue
      }
      const alpha = 1 - t
      const radius = mark.kind === 'deploy' ? 18 + (1 - t) * 58 : 19 + t * 25
      const color = mark.kind === 'boost' ? palette.amber : palette.teal
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + (mark.kind === 'assemble' ? t * 0.45 : Math.PI / 4)
        const x = p.x + Math.cos(a) * radius
        const y = p.y + Math.sin(a) * radius * 0.65
        const dx = Math.cos(a) * 8
        const dy = Math.sin(a) * 5
        g.moveTo(x - dy, y + dx)
          .lineTo(x, y)
          .lineTo(x + dx, y + dy)
          .stroke({ color, width: mark.kind === 'cut' ? 3 : 2, alpha })
      }
      if (mark.kind === 'boost' || mark.kind === 'cut')
        g.ellipse(p.x, p.y + 9, radius, radius * 0.4).stroke({
          color: mark.kind === 'cut' ? palette.cream : palette.amber,
          width: 2,
          alpha: alpha * 0.65,
        })
    }
  }

  // 双模块卡扣，接通后短暂亮芯
  private drawLink(mark: MotionMark, player: Vec) {
    const g = this.view
    const colors = isWeaponReaction(mark.protocol)
      ? reactionColors[mark.protocol]
      : mark.protocol === 'frostburst'
        ? [palette.cream, palette.amber]
        : mark.protocol === 'circuit'
          ? [palette.teal, 0xb6a5ff]
          : [palette.teal, palette.amber]
    const t = mark.progress
    const gap = 14 + Math.max(0, 1 - t / 0.65) * 20
    const y = player.y - 47
    const alpha = t < 0.7 ? 0.9 : (1 - t) / 0.3
    for (const [index, side] of [-1, 1].entries()) {
      const x = player.x + side * gap
      g.moveTo(x + side * 7, y - 6)
        .lineTo(x, y - 6)
        .lineTo(x - side * 5, y)
        .lineTo(x, y + 6)
        .lineTo(x + side * 7, y + 6)
        .stroke({ color: colors[index], width: 2, alpha })
      g.moveTo(x, y)
        .lineTo(player.x + side * 4, y)
        .stroke({ color: colors[index], width: 1.4, alpha: alpha * 0.6 })
    }
    if (t >= 0.65) {
      const r = 3.5 + (t - 0.65) * 5
      g.poly([player.x, y - r, player.x + r, y, player.x, y + r, player.x - r, y]).fill({
        color: palette.cream,
        alpha,
      })
    }
  }

  snapshot() {
    return {
      clock: this.clock,
      active: this.group.getAll().length,
      marks: [...this.marks.values()].map(({ id, kind, progress }) => ({ id, kind, progress })),
      destroyed: this.destroyed,
    }
  }

  reset() {
    if (this.destroyed) return
    for (const tween of [...this.tweens.values()]) tween.stop()
    this.group.removeAll()
    this.tweens.clear()
    this.marks.clear()
    this.clock = 0
    this.view.clear()
  }

  destroy() {
    if (this.destroyed) return
    this.reset()
    this.destroyed = true
    this.view.destroy()
  }
}
