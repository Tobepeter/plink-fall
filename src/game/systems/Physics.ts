import type { Ball } from '../entities/Ball'
import type { Board, Peg } from '../entities/Board'

export interface PhysicsEvents {
  onPegHit(ball: Ball, peg: Peg): void
}

/** Simple custom circle physics tuned for plinko feel. Runs at fixed dt. */
export class Physics {
  constructor(
    private board: Board,
    private ev: PhysicsEvents,
  ) {}

  step(b: Ball, dt: number) {
    const B = this.board
    const s = B.s
    const g = 2400 * (s / 60)
    b.px = b.x
    b.py = b.y
    b.vy += g * dt
    b.vx *= 1 - 0.4 * dt
    const vmax = 1500 * (s / 60)
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > vmax) {
      b.vx *= vmax / sp
      b.vy *= vmax / sp
    }
    b.x += b.vx * dt
    b.y += b.vy * dt

    // peg collisions: only check nearby rows/columns
    const ri = Math.round((b.y - B.top) / B.sv)
    for (let r = ri - 1; r <= ri + 1; r++) {
      const row = B.pegs[r]
      if (!row) continue
      const n = row.length
      const cj = Math.round((b.x - B.cx) / s + (n - 1) / 2)
      for (let j = cj - 1; j <= cj + 1; j++) {
        const p = row[j]
        if (!p) continue
        const dx = b.x - p.x
        const dy = b.y - p.y
        const min = b.r + B.pegR
        const d2 = dx * dx + dy * dy
        if (d2 >= min * min || d2 === 0) continue
        const d = Math.sqrt(d2)
        const nx = dx / d
        const ny = dy / d
        b.x = p.x + nx * min
        b.y = p.y + ny * min
        const vn = b.vx * nx + b.vy * ny
        if (vn < 0) {
          const e = 0.45
          b.vx -= (1 + e) * vn * nx
          b.vy -= (1 + e) * vn * ny
          // tangential nudge so balls never balance on a peg top
          const tx = -ny
          const ty = nx
          const kick = (Math.random() - 0.5) * 90 * (s / 60) + (Math.abs(nx) < 0.15 ? (Math.random() < 0.5 ? -60 : 60) * (s / 60) : 0)
          b.vx += tx * kick
          b.vy += ty * kick
          const id = r * 100 + j
          if (b.lastPeg !== id || Math.abs(vn) > 120) this.ev.onPegHit(b, p)
          b.lastPeg = id
        }
      }
    }

    // funnel walls
    const hw = B.halfWidthAt(b.y) - b.r
    const off = b.x - B.cx
    if (Math.abs(off) > hw) {
      b.x = B.cx + Math.sign(off) * hw
      if (Math.sign(b.vx) === Math.sign(off)) b.vx *= -0.4
    }
  }
}
