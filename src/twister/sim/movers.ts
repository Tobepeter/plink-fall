import type { Run } from './run'
import type { Driver, Obj, Walker } from './world'
import { damp } from './rng'

// 行人绕街区散步、见风逃跑；车辆沿路网右侧行驶
export class Movers {
  list: Obj[] = []

  constructor(readonly run: Run) {}

  add(o: Obj) {
    if (o.move) this.list.push(o)
  }

  step(dt: number) {
    for (const o of this.list) {
      if (o.state !== 'idle' || !o.move) continue
      if (o.move.kind === 'walk') this.walk(o, o.move, dt)
      else this.drive(o, o.move, dt)
      o.dirty = true
      this.run.grid.update(o)
    }
    this.list = this.list.filter((o) => o.state === 'idle' && o.move)
  }

  private walk(o: Obj, w: Walker, dt: number) {
    // 最近的龙卷
    let best = Infinity,
      fx = 0,
      fz = 0
    for (const t of this.run.tornados) {
      if (!t.alive) continue
      const d = Math.hypot(o.x - t.x, o.z - t.z)
      const scare = t.r * 3 + 10
      if (d < scare && d < best) {
        best = d
        fx = (o.x - t.x) / (d || 1)
        fz = (o.z - t.z) / (d || 1)
      }
    }
    if (best < Infinity) w.flee = 2.5
    if (w.flee > 0) {
      w.flee -= dt
      if (best < Infinity) {
        o.x += fx * 3.4 * dt
        o.z += fz * 3.4 * dt
        o.rot += (Math.atan2(fx, fz) - o.rot) * damp(10, dt)
      }
      if (w.flee <= 0) o.move = null
      return
    }
    const [x0, z0, x1, z1] = w.loop
    const wl = x1 - x0,
      hl = z1 - z0
    const per = 2 * (wl + hl)
    w.t = (((w.t + (w.dir * w.speed * dt) / per) % 1) + 1) % 1
    // 沿矩形周长取点：上 → 右 → 下 → 左
    const d = w.t * per
    let rot: number
    if (d < wl) {
      o.x = x0 + d
      o.z = z0
      rot = Math.PI / 2
    } else if (d < wl + hl) {
      o.x = x1
      o.z = z0 + d - wl
      rot = 0
    } else if (d < 2 * wl + hl) {
      o.x = x1 - (d - wl - hl)
      o.z = z1
      rot = -Math.PI / 2
    } else {
      o.x = x0
      o.z = z1 - (d - 2 * wl - hl)
      rot = Math.PI
    }
    o.rot = w.dir > 0 ? rot : rot + Math.PI
  }

  private drive(o: Obj, c: Driver, dt: number) {
    const { nodes, adj } = this.run.city
    c.t += (c.speed * dt) / 52
    while (c.t >= 1) {
      c.t -= 1
      const prev = c.from
      c.from = c.to
      const next = adj[c.from].filter((n) => n !== prev)
      c.to = next.length ? next[Math.floor(Math.random() * next.length)] : prev
    }
    const a = nodes[c.from],
      b = nodes[c.to]
    const dx = b.x - a.x,
      dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    const ux = dx / len,
      uz = dz / len
    // 靠右行驶：右手侧 = (-uz, ux)
    o.x = a.x + dx * c.t - uz * 1.8
    o.z = a.z + dz * c.t + ux * 1.8
    const want = Math.atan2(ux, uz)
    let diff = want - c.head
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    c.head += diff * damp(9, dt)
    o.rot = c.head
  }
}
