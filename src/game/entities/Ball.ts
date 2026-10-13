import { Container, Sprite } from 'pixi.js'
import type { GameTextures } from '../assets/loader'

export const TRAIL_LEN = 7

export class Ball {
  x = 0
  y = 0
  px = 0
  py = 0
  vx = 0
  vy = 0
  r = 8
  gold = false
  lastPeg = -1
  hist: number[] = new Array(TRAIL_LEN * 2).fill(0)
  histHead = 0
  view = new Container()
  core: Sprite
  halo: Sprite
  trail: Sprite[] = []

  constructor(tex: GameTextures, trailLayer: Container) {
    this.halo = new Sprite(tex.glow)
    this.halo.anchor.set(0.5)
    this.halo.blendMode = 'add'
    this.core = new Sprite(tex.dot)
    this.core.anchor.set(0.5)
    this.view.addChild(this.halo, this.core)
    for (let i = 0; i < TRAIL_LEN; i++) {
      const t = new Sprite(tex.glow)
      t.anchor.set(0.5)
      t.blendMode = 'add'
      trailLayer.addChild(t)
      this.trail.push(t)
    }
  }

  spawn(x: number, y: number, r: number, gold: boolean) {
    this.x = this.px = x
    this.y = this.py = y
    this.vx = (Math.random() - 0.5) * 30
    this.vy = 0
    this.r = r
    this.gold = gold
    this.lastPeg = -1
    for (let i = 0; i < TRAIL_LEN; i++) {
      this.hist[i * 2] = x
      this.hist[i * 2 + 1] = y
    }
    const tint = gold ? 0xfbbf24 : 0x67e8f9
    this.core.width = this.core.height = r * 2
    this.core.tint = gold ? 0xffe08a : 0xffffff
    this.halo.width = this.halo.height = r * (gold ? 7 : 5)
    this.halo.tint = tint
    this.halo.alpha = gold ? 0.9 : 0.55
    this.trail.forEach((t, i) => {
      t.tint = tint
      t.width = t.height = r * 2.6 * (1 - i / TRAIL_LEN)
      t.alpha = 0
    })
    this.setVisible(true)
  }

  setVisible(v: boolean) {
    this.view.visible = v
    this.trail.forEach((t) => (t.visible = v))
  }

  pushHist() {
    this.histHead = (this.histHead + 1) % TRAIL_LEN
    this.hist[this.histHead * 2] = this.x
    this.hist[this.histHead * 2 + 1] = this.y
  }

  render(alpha: number) {
    const x = this.px + (this.x - this.px) * alpha
    const y = this.py + (this.y - this.py) * alpha
    this.view.position.set(x, y)
    for (let i = 0; i < TRAIL_LEN; i++) {
      const h = (this.histHead - i + TRAIL_LEN) % TRAIL_LEN
      const t = this.trail[i]
      t.position.set(this.hist[h * 2], this.hist[h * 2 + 1])
      t.alpha = (1 - i / TRAIL_LEN) * (this.gold ? 0.5 : 0.32)
    }
  }
}
