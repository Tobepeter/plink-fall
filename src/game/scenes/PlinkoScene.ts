import { Container, Graphics, Sprite } from 'pixi.js'
import type { GameTextures } from '../assets/loader'
import { DESIGN_W, HUD_H, MAX_BALLS, PANEL_H } from '../core/config'
import { Pool } from '../core/Pool'
import { fmt } from '../core/format'
import { Ball } from '../entities/Ball'
import { Board, type Peg } from '../entities/Board'
import { Effects } from '../entities/Effects'
import type { AudioSystem } from '../systems/Audio'
import { ballValue, dropInterval, goldChance, multBoost, pegValue, type Economy } from '../systems/Economy'
import { Physics } from '../systems/Physics'

export class PlinkoScene {
  view = new Container()
  private bg = new Graphics()
  private blobA = new Sprite()
  private blobB = new Sprite()
  private board: Board
  private trailLayer = new Container()
  private ballLayer = new Container()
  private fx: Effects
  private balls: Pool<Ball>
  private physics: Physics
  private dropT = 0.4
  private designH = 1280
  private shake = 0
  private time = 0

  constructor(
    private tex: GameTextures,
    private eco: Economy,
    private audio: AudioSystem,
  ) {
    this.board = new Board(tex)
    this.fx = new Effects(tex)
    for (const [b, c, a] of [[this.blobA, 0x7c3aed, 0.22], [this.blobB, 0x06b6d4, 0.14]] as const) {
      b.texture = tex.glow
      b.anchor.set(0.5)
      b.tint = c
      b.alpha = a
    }
    this.view.addChild(this.bg, this.blobA, this.blobB, this.board.view, this.trailLayer, this.ballLayer, this.fx.view)
    this.balls = new Pool<Ball>(
      () => {
        const b = new Ball(this.tex, this.trailLayer)
        this.ballLayer.addChild(b.view)
        return b
      },
      () => {},
      (b) => b.setVisible(false),
      MAX_BALLS,
    )
    this.physics = new Physics(this.board, { onPegHit: (b, p) => this.onPegHit(b, p) })
    eco.onRowsChanged = () => this.rebuild()
  }

  resize(designH: number) {
    this.designH = designH
    this.rebuild()
  }

  rebuild() {
    this.balls.releaseAll()
    this.fx.clear()
    const top = HUD_H
    const h = this.designH - HUD_H - PANEL_H
    this.board.build(this.eco.rows, 0, top, DESIGN_W, h, multBoost(this.eco.levels.mult))
    this.drawBg()
  }

  refreshMults() {
    this.board.setBoost(multBoost(this.eco.levels.mult))
  }

  private drawBg() {
    const g = this.bg.clear()
    g.rect(0, 0, DESIGN_W, this.designH).fill({ color: 0x05060f })
    this.blobA.position.set(DESIGN_W / 2, this.board.top + 80)
    this.blobA.width = this.blobA.height = 1100
    this.blobB.position.set(DESIGN_W / 2, this.board.slotY)
    this.blobB.width = this.blobB.height = 900
    // grid
    for (let y = 0; y < this.designH; y += 48) g.moveTo(0, y).lineTo(DESIGN_W, y)
    for (let x = 0; x <= DESIGN_W; x += 48) g.moveTo(x, 0).lineTo(x, this.designH)
    g.stroke({ color: 0x6366f1, alpha: 0.05, width: 1 })
  }

  /** Light interaction: tapping the board drops a bonus ball at that x. */
  tapDrop(x: number) {
    if (this.tapCd > 0) return
    this.tapCd = 0.22
    const B = this.board
    const b = this.balls.acquire()
    if (!b) return
    const hw = B.halfWidthAt(B.top) - B.ballR
    const cx = Math.max(B.cx - hw, Math.min(B.cx + hw, x))
    b.spawn(cx, B.top - B.s * 0.9, B.ballR, Math.random() < goldChance(this.eco.levels.gold))
    this.fx.ring(cx, B.top - B.s * 0.9, 0x67e8f9, B.s * 1.5)
    this.audio.plink(0, false)
    this.hint = 0
  }
  private tapCd = 0
  hint = 1

  private spawn() {
    const B = this.board
    const count = 1 + this.eco.levels.multi
    for (let i = 0; i < count; i++) {
      const b = this.balls.acquire()
      if (!b) return
      const gold = Math.random() < goldChance(this.eco.levels.gold)
      const x = B.cx + (Math.random() - 0.5) * B.s * 0.5 + (i - (count - 1) / 2) * B.s * 0.35
      b.spawn(x, B.top - B.s * 0.9 - i * 6, B.ballR, gold)
    }
  }

  private onPegHit(b: Ball, p: Peg) {
    p.flash = 1
    p.glow.tint = b.gold ? 0xfbbf24 : 0x67e8f9
    const v = this.eco.earn(pegValue(this.eco.levels.peg) * (b.gold ? 5 : 1))
    this.audio.plink(p.row, b.gold)
    const crowd = this.balls.active.length
    if (Math.random() < (crowd < 12 ? 0.6 : 6 / crowd)) this.fx.float(p.x, p.y - 14, '+' + fmt(v), b.gold ? 0xfde68a : 0xa5f3fc)
    this.fx.burst(p.x, p.y, b.gold ? 0xfbbf24 : 0x67e8f9, crowd < 30 ? 3 : 1, 160, 10)
  }

  private land(b: Ball) {
    const B = this.board
    const k = B.slotIndexAt(b.x)
    const sl = B.slots[k]
    const v = this.eco.earn(ballValue(this.eco.levels.value) * sl.mult * (b.gold ? 10 : 1))
    sl.bounce = 1
    const big = sl.mult >= 5 || b.gold
    this.fx.float(sl.x, sl.y - 26, '+' + fmt(v), b.gold ? 0xfbbf24 : sl.color, true)
    this.fx.burst(sl.x, sl.y, sl.color, big ? 22 : 8, big ? 420 : 220, big ? 20 : 12)
    if (big) {
      this.fx.ring(sl.x, sl.y, sl.color, B.s * 3)
      this.shake = Math.min(1, this.shake + (b.gold ? 0.5 : 0.35))
    }
    this.audio.slot(sl.mult)
  }

  update(dt: number) {
    if (this.tapCd > 0) this.tapCd -= dt
    this.dropT -= dt
    if (this.dropT <= 0) {
      this.spawn()
      this.dropT += dropInterval(this.eco.levels.rate)
      if (this.dropT < 0) this.dropT = 0
    }
    const arr = this.balls.active
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i]
      this.physics.step(b, dt)
      if (b.y >= this.board.slotY) {
        this.land(b)
        this.balls.releaseAt(i)
      }
    }
    this.eco.tick(dt)
  }

  render(frameDt: number, alpha: number) {
    this.time += frameDt
    this.histT += frameDt
    const pushHist = this.histT >= 1 / 60
    if (pushHist) this.histT = 0
    for (const b of this.balls.active) {
      if (pushHist) b.pushHist()
      b.render(alpha)
    }
    this.board.update(frameDt)
    this.fx.update(frameDt)
    this.audio.frame(frameDt)
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - frameDt * 3)
      const m = this.shake * this.shake * 10
      this.view.position.set((Math.random() - 0.5) * m, (Math.random() - 0.5) * m)
    } else this.view.position.set(0, 0)
  }
  private histT = 0
}
