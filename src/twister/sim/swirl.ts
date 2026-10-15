import type { Run } from './run'
import type { Tornado } from './tornado'
import { grow } from './tornado'
import { makeObj, type Obj } from './world'
import { damp } from './rng'

// 吸卷：吸力拖拽、卷起绕柱上升、侵蚀大建筑掉碎块
export class Swirl {
  lifted: Obj[] = []
  private near: Obj[] = []

  constructor(readonly run: Run) {}

  step(dt: number) {
    for (const t of this.run.tornados) if (t.alive) this.pull(t, dt)
    this.rise(dt)
  }

  private pull(t: Tornado, dt: number) {
    const { run } = this
    const perks = run.perksOf(t)
    const reach = t.r * 2.3 * perks.pull
    const list = run.grid.query(t.x, t.z, reach + 16, this.near)
    for (const o of list) {
      if (o.state !== 'idle') continue
      const dx = o.x - t.x,
        dz = o.z - t.z
      const d = Math.hypot(dx, dz) || 0.01
      if (o.s <= t.r) {
        if (d < t.r * 0.95) this.lift(o, t)
        else if (d < reach) {
          // 越近越吸，行人挣扎不过
          const k = 1 - d / reach
          const sp = (2 + t.r * 0.7) * k * k * perks.pull
          o.x -= (dx / d) * sp * dt
          o.z -= (dz / d) * sp * dt
          o.shake = Math.max(o.shake, k * 0.5)
          o.dirty = true
          run.grid.update(o)
        }
        continue
      }
      if (d > t.r + o.s * 0.45) continue
      if (o.s <= t.r * 1.8 * Math.sqrt(perks.crush)) this.erode(o, t, dt, perks.crush)
      else o.shake = Math.max(o.shake, 0.25)
    }
  }

  lift(o: Obj, t: Tornado) {
    this.run.grid.remove(o)
    o.state = 'lift'
    o.owner = t.id
    o.ang = Math.atan2(o.z - t.z, o.x - t.x)
    o.rad = Math.hypot(o.x - t.x, o.z - t.z)
    o.t = 0
    o.spin = (Math.random() - 0.5) * 8
    o.move = null
    this.lifted.push(o)
    if (o.kind !== 'chunk') this.run.events.push({ type: 'lift', obj: o, owner: t.id })
  }

  // 风眼内侵蚀：周期掉碎块，耗尽后整栋飞起
  private erode(o: Obj, t: Tornado, dt: number, crush: number) {
    o.shake = 1
    o.hp -= dt * 0.45 * (t.r / o.s) * crush
    o.t += dt
    const every = 0.11
    while (o.t > every) {
      o.t -= every
      const size = Math.min(t.r * 0.7, Math.max(0.5, o.s * 0.16)) * (0.6 + Math.random() * 0.6)
      const a = Math.random() * Math.PI * 2
      const off = o.s * 0.35 * Math.random()
      const c = makeObj(
        'chunk',
        o.x + Math.cos(a) * off,
        o.z + Math.sin(a) * off,
        Math.random() * 6,
        size,
        o.color,
      )
      c.y = Math.random() * o.h * 0.7
      c.mass = Math.min(o.mass * 0.05, size * size * 1.2)
      o.mass -= c.mass
      this.run.addChunk(c, false)
      this.lift(c, t)
      if (Math.random() < 0.3) this.run.events.push({ type: 'crumble', obj: o, owner: t.id })
    }
    if (o.hp <= 0) this.lift(o, t)
  }

  // 卷起的物件绕柱螺旋上升，越过顶端即被吞并
  private rise(dt: number) {
    const { run } = this
    for (const o of this.lifted) {
      const t = run.tornados[o.owner]
      if (!t || !t.alive) {
        o.state = 'gone'
        o.dirty = true
        continue
      }
      o.t += dt
      const w = 2.6 + 10 / (o.rad + 2)
      o.ang += w * dt
      o.rad += (t.r * 0.5 + o.s * 0.25 - o.rad) * damp(1.4, dt)
      o.y += (2.5 + t.r * 0.9) * (0.5 + o.t * 1.4) * dt
      o.tumble += o.spin * dt
      o.x = t.x + Math.cos(o.ang) * o.rad
      o.z = t.z + Math.sin(o.ang) * o.rad
      o.dirty = true
      if (o.y > t.r * 3.4 + o.s * 0.6) {
        o.state = 'gone'
        const eater = t.feed >= 0 ? run.tornados[t.feed] : t
        grow(eater, o.mass)
        eater.eaten++
        if (o.kind !== 'chunk') run.events.push({ type: 'eat', obj: o, owner: eater.id })
        else if (eater.player) run.events.push({ type: 'bit', mass: o.mass })
      }
    }
    this.lifted = this.lifted.filter((o) => o.state === 'lift')
  }
}
