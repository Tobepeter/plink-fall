import { BitmapText, Container, Graphics, Sprite } from 'pixi.js'
import type { GameTextures } from '../assets/loader'

export interface Peg {
  x: number
  y: number
  row: number
  glow: Sprite
  flash: number
}

export interface Slot {
  x: number
  y: number
  w: number
  h: number
  mult: number
  color: number
  view: Container
  bg: Graphics
  label: BitmapText
  bounce: number
}

export function slotColor(d: number): number {
  // center cyan -> violet -> pink -> amber at edges
  const stops = [0x22d3ee, 0x818cf8, 0xe879f9, 0xfb7185, 0xfbbf24]
  const t = Math.min(0.999, d) * (stops.length - 1)
  const i = Math.floor(t)
  const f = t - i
  const a = stops[i]
  const b = stops[i + 1]
  const lerp = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f)
  return (lerp(16) << 16) | (lerp(8) << 8) | lerp(0)
}

export function fmtMult(m: number) {
  if (m >= 1000) return Math.round(m / 100) / 10 + 'K'
  if (m >= 10) return Math.round(m).toString()
  return (Math.round(m * 10) / 10).toString()
}

/** Triangle peg board geometry + visuals. Rebuilt when rows or viewport change. */
export class Board {
  view = new Container()
  pegs: Peg[][] = []
  slots: Slot[] = []
  s = 0
  sv = 0
  top = 0
  cx = 0
  pegR = 0
  ballR = 0
  lastRowY = 0
  slotY = 0
  baseMults: number[] = []

  constructor(private tex: GameTextures) {}

  build(rows: number, x0: number, y0: number, w: number, h: number, boost: number) {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }))
    const s = Math.min((w * 0.96) / (rows + 2), h / (rows * 0.86 + 2.4))
    this.s = s
    // stretch vertical spacing to use tall screens, then center the board vertically
    this.sv = Math.min(s * 1.12, (h - s * 2.4) / Math.max(1, rows - 1 + 0.6))
    this.sv = Math.max(this.sv, s * 0.86)
    const used = (rows - 1) * this.sv + s * 2.4
    this.cx = x0 + w / 2
    this.top = y0 + s * 0.9 + Math.max(0, (h - used) / 2)
    this.pegR = Math.max(3, s * 0.11)
    this.ballR = Math.max(5, s * 0.2)
    this.lastRowY = this.top + (rows - 1) * this.sv

    const deco = new Graphics()
    this.view.addChild(deco)
    const glowLayer = new Container()
    this.view.addChild(glowLayer)
    const pegG = new Graphics()
    this.view.addChild(pegG)

    this.pegs = []
    for (let i = 0; i < rows; i++) {
      const row: Peg[] = []
      const n = i + 3
      for (let j = 0; j < n; j++) {
        const x = this.cx + (j - (n - 1) / 2) * s
        const y = this.top + i * this.sv
        pegG.circle(x, y, this.pegR).fill({ color: 0xc7d2fe, alpha: 0.9 })
        pegG.circle(x, y, this.pegR * 2).fill({ color: 0x6366f1, alpha: 0.08 })
        const glow = new Sprite(this.tex.glow)
        glow.anchor.set(0.5)
        glow.position.set(x, y)
        glow.width = glow.height = this.pegR * 9
        glow.blendMode = 'add'
        glow.alpha = 0
        glow.visible = false
        glowLayer.addChild(glow)
        row.push({ x, y, row: i, glow, flash: 0 })
      }
      this.pegs.push(row)
    }

    // slots
    const n = rows + 1
    const c = rows / 2
    const edge = 4 + rows * 1.5
    this.slotY = this.lastRowY + s * 0.62
    this.slots = []
    this.baseMults = []
    for (let k = 0; k < n; k++) {
      const d = Math.abs(k - c) / c
      const m = 0.4 + (edge - 0.4) * Math.pow(d, 3)
      this.baseMults.push(m)
      const color = slotColor(d)
      const view = new Container()
      const sw = s * 0.9
      const sh = Math.max(26, s * 0.62)
      view.position.set(this.cx + (k - c) * s, this.slotY + sh / 2)
      const bg = new Graphics()
      view.addChild(bg)
      const label = new BitmapText({
        text: '',
        style: { fontFamily: 'Arial', fontWeight: 'bold', fontSize: Math.min(26, sw * 0.42), fill: 0x0b1020 },
      })
      label.anchor.set(0.5)
      view.addChild(label)
      this.view.addChild(view)
      const slot: Slot = { x: view.x, y: this.slotY, w: sw, h: sh, mult: m, color, view, bg, label, bounce: 0 }
      this.drawSlot(slot)
      this.slots.push(slot)
    }
    this.setBoost(boost)

    // side rails (subtle)
    const hw0 = this.halfWidthAt(this.top)
    const hw1 = this.halfWidthAt(this.lastRowY)
    for (const side of [-1, 1]) {
      deco
        .moveTo(this.cx + side * hw0, this.top)
        .lineTo(this.cx + side * hw1, this.lastRowY)
        .stroke({ color: 0x6366f1, alpha: 0.25, width: 3 })
    }
  }

  private drawSlot(sl: Slot) {
    sl.bg.clear()
    sl.bg.roundRect(-sl.w / 2, -sl.h / 2, sl.w, sl.h, Math.min(10, sl.w * 0.2)).fill({ color: sl.color })
    sl.bg.roundRect(-sl.w / 2, -sl.h / 2, sl.w, sl.h * 0.45, Math.min(10, sl.w * 0.2)).fill({ color: 0xffffff, alpha: 0.18 })
  }

  setBoost(boost: number) {
    this.slots.forEach((sl, k) => {
      sl.mult = this.baseMults[k] * boost
      sl.label.text = fmtMult(sl.mult)
      const maxW = sl.w * 0.9
      sl.label.scale.set(1)
      if (sl.label.width > maxW) sl.label.scale.set(maxW / sl.label.width)
    })
  }

  /** half-width of the playable funnel at height y */
  halfWidthAt(y: number) {
    const r = Math.max(0, (y - this.top) / this.sv)
    return ((r + 2) / 2) * this.s + this.s * 0.45
  }

  slotIndexAt(x: number) {
    const n = this.slots.length
    const k = Math.round((x - this.cx) / this.s + (n - 1) / 2)
    return Math.max(0, Math.min(n - 1, k))
  }

  update(dt: number) {
    for (const row of this.pegs)
      for (const p of row) {
        if (p.flash > 0) {
          p.flash = Math.max(0, p.flash - dt * 3.2)
          p.glow.alpha = p.flash
          p.glow.visible = p.flash > 0
        }
      }
    for (const sl of this.slots) {
      if (sl.bounce > 0) {
        sl.bounce = Math.max(0, sl.bounce - dt * 4)
        const b = Math.sin(sl.bounce * Math.PI) * 0.25
        sl.view.scale.set(1 + b * 0.5, 1 - b * 0.3)
        sl.view.y = sl.y + sl.h / 2 + b * 10
      }
    }
  }
}
