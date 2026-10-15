import { makeRng, noise1, smooth } from './math'

// 河道几何：中线、两岸、分叉岛、湖面与礁石
// 世界坐标 y 向下，顺流方向为 -y
export class River {
  islands: Island[] = []
  pools: Pool[] = []
  speed = 70
  rough: (y: number) => number = () => 1 // 岸线粗糙度，灯市驳岸更直
  private buckets = new Map<number, Rock[]>()
  private phase: number[]

  constructor(readonly seed: number) {
    const rng = makeRng(seed)
    this.phase = [0, 0, 0, 0].map(() => rng.range(0, Math.PI * 2))
  }

  center(y: number) {
    const [a, b] = this.phase
    return 58 * Math.sin(y * 0.0021 + a) + 20 * Math.sin(y * 0.0047 + b)
  }

  slope(y: number) {
    const [a, b] = this.phase
    return 58 * 0.0021 * Math.cos(y * 0.0021 + a) + 20 * 0.0047 * Math.cos(y * 0.0047 + b)
  }

  halfWidth(y: number) {
    let w = 126 + 18 * Math.sin(y * 0.0033 + this.phase[2])
    for (const it of this.islands) w += (it.r + 46) * envelope(y, it.top, it.bottom, 220)
    for (const it of this.pools) w += it.extra * envelope(y, it.top, it.bottom, 260)
    return w
  }

  // 左右岸 x，带噪声的自然岸线
  edges(y: number) {
    const c = this.center(y),
      w = this.halfWidth(y),
      s = this.seed
    const k = this.rough(y)
    const left = c - w + k * (10 * noise1(y * 0.012, s + 1) + 4 * noise1(y * 0.05, s + 2))
    const right = c + w + k * (10 * noise1(y * 0.012, s + 3) + 4 * noise1(y * 0.05, s + 4))
    return [left, right] as const
  }

  // 有符号水深：正值在水中，为到岸/岛/礁的近似距离
  depth(x: number, y: number) {
    const [left, right] = this.edges(y)
    const k = 1 / Math.sqrt(1 + this.slope(y) ** 2)
    let d = Math.min(x - left, right - x) * k
    for (const it of this.islands) {
      if (y < it.top - 200 || y > it.bottom + 200) continue
      d = Math.min(d, this.islandDist(it, x, y))
    }
    const b = Math.floor(y / bucketSize)
    for (let i = b - 1; i <= b + 1; i++) {
      const list = this.buckets.get(i)
      if (!list) continue
      for (const r of list) {
        const dd = Math.hypot(x - r.x, y - r.y) - r.r
        if (dd < d) d = dd
      }
    }
    return d
  }

  islandDist(it: Island, x: number, y: number) {
    const span = it.bottom - it.top
    const t = (it.bottom - y) / span
    const cx = this.center(y)
    if (t <= 0 || t >= 1) {
      const ty = t <= 0 ? it.bottom : it.top
      return Math.hypot(x - this.center(ty), y - ty)
    }
    const r = it.r * Math.pow(Math.sin(Math.PI * t), 0.55)
    return Math.abs(x - cx) - r
  }

  // 水流速度：沿河道切向，岸边减速并绕开障碍
  flow(x: number, y: number, out: { x: number; y: number }) {
    const s = -this.slope(y)
    const inv = 1 / Math.sqrt(1 + s * s)
    const d = this.depth(x, y)
    let slow = 1
    for (const it of this.pools) slow -= 0.45 * envelope(y, it.top, it.bottom, 300)
    const speed = this.speed * slow * (0.5 + 0.5 * smooth(0, 60, d))
    let vx = s * inv * speed,
      vy = -inv * speed
    // 主流回中：漂浮物缓缓回到所在水道中央
    const lane = this.laneCenter(x, y)
    vx += Math.max(-20, Math.min(20, (lane - x) * 0.16))
    if (d < 80) {
      const e = 3
      let nx = this.depth(x + e, y) - this.depth(x - e, y)
      let ny = this.depth(x, y + e) - this.depth(x, y - e)
      const len = Math.hypot(nx, ny) || 1
      nx /= len
      ny /= len
      const into = vx * nx + vy * ny
      if (into < 0) {
        const w = 1 - smooth(4, 80, d)
        let tx = vx - into * nx,
          ty = vy - into * ny
        const tl = Math.hypot(tx, ty)
        if (tl < 1e-3) {
          tx = -ny
          ty = nx
        } else {
          tx /= tl
          ty /= tl
        }
        vx = vx * (1 - w) + tx * speed * w
        vy = vy * (1 - w) + ty * speed * w
      }
      const push = (1 - smooth(0, 26, d)) * 34
      vx += nx * push
      vy += ny * push
    }
    out.x = vx
    out.y = vy
    return out
  }

  // 所在水道中线：分叉处按岛的左右分别计算
  laneCenter(x: number, y: number) {
    const [left, right] = this.edges(y)
    for (const it of this.islands) {
      if (y < it.top || y > it.bottom) continue
      const c = this.center(y)
      const t = (it.bottom - y) / (it.bottom - it.top)
      const r = it.r * Math.pow(Math.sin(Math.PI * t), 0.55)
      return x < c ? (left + c - r) / 2 : (c + r + right) / 2
    }
    return (left + right) / 2
  }

  addRock(rock: Rock) {
    const b = Math.floor(rock.y / bucketSize)
    let list = this.buckets.get(b)
    if (!list) this.buckets.set(b, (list = []))
    list.push(rock)
  }

  rocksNear(y0: number, y1: number, out: Rock[] = []) {
    out.length = 0
    for (let b = Math.floor(y0 / bucketSize); b <= Math.floor(y1 / bucketSize); b++) {
      const list = this.buckets.get(b)
      if (list) for (const r of list) out.push(r)
    }
    return out
  }

  // 清理镜头后方的数据
  prune(yBelow: number) {
    const b = Math.floor(yBelow / bucketSize)
    for (const key of this.buckets.keys()) if (key > b) this.buckets.delete(key)
    this.islands = this.islands.filter((it) => it.top < yBelow + 400)
    this.pools = this.pools.filter((it) => it.top < yBelow + 400)
  }
}

const bucketSize = 128

// y 区间平滑包络
function envelope(y: number, top: number, bottom: number, ramp: number) {
  if (y < top - ramp || y > bottom + ramp) return 0
  return smooth(top - ramp, top, y) * (1 - smooth(bottom, bottom + ramp, y))
}

export type Rock = { x: number; y: number; r: number; seed: number }
export type Island = { top: number; bottom: number; r: number }
export type Pool = { top: number; bottom: number; extra: number }
