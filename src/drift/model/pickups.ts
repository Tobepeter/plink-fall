import type { Run } from './run'
import { damp } from './world/math'

// 萤火与花瓣：靠近灯队即被吸取
export type Firefly = {
  id: number
  x: number
  y: number
  hx: number // 盘旋中心
  hy: number
  vx: number
  vy: number
  phase: number
  drawn: boolean
  done: boolean
}

export type Petal = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  drawn: boolean
  done: boolean
}

let nextId = 1

export function makeFirefly(x: number, y: number): Firefly {
  return {
    id: nextId++,
    x,
    y,
    hx: x,
    hy: y,
    vx: 0,
    vy: 0,
    phase: Math.random() * 100,
    drawn: false,
    done: false,
  }
}

export function makePetal(x: number, y: number): Petal {
  return {
    id: nextId++,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.random() * 6.28,
    spin: (Math.random() - 0.5) * 2,
    drawn: false,
    done: false,
  }
}

// 磁吸范围：心灯 + 萤灯加成
export function magnetRange(run: Run) {
  let jade = 0
  for (const f of run.train) if (f.kind === 'jade') jade++
  return (56 + jade * 22) * run.stats.lure
}

export function stepFirefly(run: Run, f: Firefly, dt: number, range: number) {
  f.phase += dt
  if (!f.drawn) {
    // 盘旋，同时随河道缓慢上行
    f.hy -= run.river.speed * 0.15 * dt
    const tx = f.hx + Math.sin(f.phase * 1.3 + f.id) * 14,
      ty = f.hy + Math.cos(f.phase * 1.7 + f.id * 0.7) * 10
    f.vx += (tx - f.x) * dt * 3 - f.vx * dt * 1.5
    f.vy += (ty - f.y) * dt * 3 - f.vy * dt * 1.5
    for (const t of run.train)
      if (t.lit && (t.x - f.x) ** 2 + (t.y - f.y) ** 2 < range * range) {
        f.drawn = true
        break
      }
  } else {
    const t = run.nearestLit(f.x, f.y)
    if (!t) return
    const dx = t.x - f.x,
      dy = t.y - f.y
    const d = Math.hypot(dx, dy) || 1
    const sp = 260 + f.phase * 40
    f.vx += ((dx / d) * sp - f.vx) * damp(6, dt)
    f.vy += ((dy / d) * sp - f.vy) * damp(6, dt)
    if (d < t.r + 4) {
      f.done = true
      run.absorb(f.x, f.y)
    }
  }
  f.x += f.vx * dt
  f.y += f.vy * dt
}

export function stepPetal(
  run: Run,
  p: Petal,
  dt: number,
  range: number,
  flow: { x: number; y: number },
) {
  p.angle += p.spin * dt
  if (!p.drawn) {
    run.river.flow(p.x, p.y, flow)
    p.vx += (flow.x - p.vx) * damp(1.2, dt)
    p.vy += (flow.y - p.vy) * damp(1.2, dt)
    for (const t of run.train) {
      const d2 = (t.x - p.x) ** 2 + (t.y - p.y) ** 2
      if (d2 < (t.r + 10) ** 2 || (t.lit && d2 < range * range * 0.5)) {
        p.drawn = true
        break
      }
    }
  } else {
    const t = run.head
    const dx = t.x - p.x,
      dy = t.y - p.y
    const d = Math.hypot(dx, dy) || 1
    p.vx += ((dx / d) * 300 - p.vx) * damp(8, dt)
    p.vy += ((dy / d) * 300 - p.vy) * damp(8, dt)
    if (d < t.r + 6) {
      p.done = true
      run.gainPetal(p.x, p.y)
    }
  }
  p.x += p.vx * dt
  p.y += p.vy * dt
}
