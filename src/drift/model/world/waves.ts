import type { River } from './river'

// 水面高度场：波动方程 + 环形行缓冲随镜头滚动
export class Waves {
  readonly cols = 160
  readonly rows = 288
  readonly cell = 4
  readonly x0 = -320
  h: Float32Array
  prev: Float32Array
  depth: Float32Array
  rowMin = 0 // 当前有效的最小世界行号
  private ready = false

  constructor(readonly river: River) {
    const n = this.cols * this.rows
    this.h = new Float32Array(n)
    this.prev = new Float32Array(n)
    this.depth = new Float32Array(n)
  }

  get height() {
    return this.rows * this.cell
  }

  // 保证覆盖 [top, top + 高度) 的世界行
  scroll(top: number) {
    const want = Math.floor(top / this.cell)
    if (!this.ready) {
      this.ready = true
      this.rowMin = want
      for (let r = want; r < want + this.rows; r++) this.initRow(r)
      return
    }
    if (want >= this.rowMin) return
    const from = Math.max(want, this.rowMin - this.rows)
    for (let r = from; r < this.rowMin; r++) this.initRow(r)
    this.rowMin = want
  }

  private initRow(r: number) {
    const j = mod(r, this.rows) * this.cols
    const y = (r + 0.5) * this.cell
    for (let i = 0; i < this.cols; i++) {
      const x = this.x0 + (i + 0.5) * this.cell
      this.depth[j + i] = this.river.depth(x, y)
      this.h[j + i] = 0
      this.prev[j + i] = 0
    }
  }

  // 重新计算一段行的水深（礁石碎裂等）
  refresh(y0: number, y1: number) {
    const a = Math.max(this.rowMin, Math.floor(y0 / this.cell))
    const b = Math.min(this.rowMin + this.rows - 1, Math.floor(y1 / this.cell))
    for (let r = a; r <= b; r++) {
      const j = mod(r, this.rows) * this.cols
      const y = (r + 0.5) * this.cell
      for (let i = 0; i < this.cols; i++)
        this.depth[j + i] = this.river.depth(this.x0 + (i + 0.5) * this.cell, y)
    }
  }

  step() {
    const { cols, rows, h, prev, depth } = this
    const c2 = 0.34,
      keep = 0.986
    for (let k = 0; k < rows; k++) {
      const r = this.rowMin + k
      const j = mod(r, rows) * cols
      if (k === 0 || k === rows - 1) {
        for (let i = 0; i < cols; i++) prev[j + i] = 0
        continue
      }
      const up = mod(r - 1, rows) * cols,
        dn = mod(r + 1, rows) * cols
      prev[j] = 0
      prev[j + cols - 1] = 0
      for (let i = 1; i < cols - 1; i++) {
        const p = j + i
        if (depth[p] <= 0) {
          prev[p] = 0
          continue
        }
        const lap = h[p - 1] + h[p + 1] + h[up + i] + h[dn + i] - 4 * h[p]
        prev[p] = (2 * h[p] - prev[p] + c2 * lap) * keep
      }
    }
    this.prev = h
    this.h = prev
  }

  // 落点激起涟漪：墨西哥帽波形，体积守恒不留坑
  splash(x: number, y: number, amount: number, radius = 10) {
    const { cols, rows, cell } = this
    const ci = (x - this.x0) / cell,
      cr = y / cell
    const rc = radius / cell
    const i0 = Math.max(1, Math.floor(ci - rc * 2)),
      i1 = Math.min(cols - 2, Math.ceil(ci + rc * 2))
    const r0 = Math.max(this.rowMin + 1, Math.floor(cr - rc * 2)),
      r1 = Math.min(this.rowMin + rows - 2, Math.ceil(cr + rc * 2))
    for (let r = r0; r <= r1; r++) {
      const j = mod(r, rows) * cols
      for (let i = i0; i <= i1; i++) {
        const dx = i + 0.5 - ci,
          dy = r + 0.5 - cr
        const q = (dx * dx + dy * dy) / (rc * rc)
        if (this.depth[j + i] > 0) this.h[j + i] -= amount * (1 - q) * Math.exp(-q)
      }
    }
  }

  // 双线性采样高度，并写出坡度
  sample(x: number, y: number, grad?: { x: number; y: number }) {
    const fx = (x - this.x0) / this.cell - 0.5,
      fy = y / this.cell - 0.5
    const i = Math.floor(fx),
      r = Math.floor(fy)
    if (i < 0 || i >= this.cols - 1 || r < this.rowMin || r >= this.rowMin + this.rows - 1) {
      if (grad) grad.x = grad.y = 0
      return 0
    }
    const tx = fx - i,
      ty = fy - r
    const a = mod(r, this.rows) * this.cols + i,
      b = mod(r + 1, this.rows) * this.cols + i
    const h00 = this.h[a],
      h10 = this.h[a + 1],
      h01 = this.h[b],
      h11 = this.h[b + 1]
    if (grad) {
      grad.x = ((h10 - h00) * (1 - ty) + (h11 - h01) * ty) / this.cell
      grad.y = ((h01 - h00) * (1 - tx) + (h11 - h10) * tx) / this.cell
    }
    return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty
  }
}

const mod = (a: number, n: number) => ((a % n) + n) % n
