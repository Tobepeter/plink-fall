import { damp } from './math'
import type { River, Rock } from './river'
import type { Waves } from './waves'
import type { LanternKind } from '../../data/kinds'

// 漂浮物：随水流、随波坡滑动、撞岸回弹
export type Float = {
  id: number
  kind: LanternKind
  x: number
  y: number
  vx: number
  vy: number
  r: number
  angle: number
  spin: number
  lit: boolean
  state: 'train' | 'loose' | 'sink'
  hurt: number // 无敌剩余
  age: number
  fade: number // 熄灭/下沉进度
}

let nextId = 1

export function makeFloat(kind: LanternKind, x: number, y: number, lit: boolean): Float {
  return {
    id: nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    r: kind === 'head' ? 14 : 12,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.6,
    lit,
    state: lit ? 'train' : 'loose',
    hurt: 0,
    age: 0,
    fade: 0,
  }
}

const flow = { x: 0, y: 0 },
  grad = { x: 0, y: 0 }

// 单个漂浮物积分，返回撞礁法向速度（0 为未撞）
export function moveFloat(
  f: Float,
  river: River,
  waves: Waves,
  rocks: Rock[],
  dt: number,
  drag = 1.6,
  lag = 1,
) {
  river.flow(f.x, f.y, flow)
  waves.sample(f.x, f.y, grad)
  const k = damp(drag, dt)
  f.vx += (flow.x * lag - f.vx) * k - grad.x * 900 * dt
  f.vy += (flow.y * lag - f.vy) * k - grad.y * 900 * dt
  f.x += f.vx * dt
  f.y += f.vy * dt
  f.angle += f.spin * dt
  f.spin *= 1 - damp(0.8, dt)
  f.age += dt
  f.hurt = Math.max(0, f.hurt - dt)
  let impact = 0
  for (const rock of rocks) {
    const dx = f.x - rock.x,
      dy = f.y - rock.y
    const min = rock.r + f.r
    const d2 = dx * dx + dy * dy
    if (d2 >= min * min) continue
    const d = Math.sqrt(d2) || 1
    const nx = dx / d,
      ny = dy / d
    f.x = rock.x + nx * min
    f.y = rock.y + ny * min
    const into = f.vx * nx + f.vy * ny
    if (into < 0) {
      f.vx -= into * nx * 1.5
      f.vy -= into * ny * 1.5
      f.spin += (Math.random() - 0.5) * 4
      impact = Math.max(impact, -into)
    }
  }
  // 岸边：沿水深梯度推回
  const d = river.depth(f.x, f.y)
  if (d < f.r * 0.8) {
    const e = 2
    let nx = river.depth(f.x + e, f.y) - river.depth(f.x - e, f.y)
    let ny = river.depth(f.x, f.y + e) - river.depth(f.x, f.y - e)
    const len = Math.hypot(nx, ny) || 1
    nx /= len
    ny /= len
    const push = f.r * 0.8 - d
    f.x += nx * push
    f.y += ny * push
    const into = f.vx * nx + f.vy * ny
    if (into < 0) {
      f.vx -= into * nx * 1.3
      f.vy -= into * ny * 1.3
    }
  }
  return impact
}

// 灯队绳索约束：后一盏跟随前一盏，灯头不受牵制
export function constrainTrain(train: Float[], rope: number) {
  for (let i = 1; i < train.length; i++) {
    const a = train[i - 1],
      b = train[i]
    const dx = b.x - a.x,
      dy = b.y - a.y
    const d = Math.hypot(dx, dy) || 1
    if (d <= rope) continue
    const over = d - rope
    const wa = i === 1 ? 0 : 0.2
    a.x += (dx / d) * over * wa
    a.y += (dy / d) * over * wa
    b.x -= (dx / d) * over * (1 - wa)
    b.y -= (dy / d) * over * (1 - wa)
    // 速度跟随，避免绳子弹抖
    const pull = 0.12
    b.vx += (a.vx - b.vx) * pull
    b.vy += (a.vy - b.vy) * pull
  }
  // 互相不重叠
  for (let i = 0; i < train.length; i++)
    for (let j = i + 1; j < train.length; j++) {
      const a = train[i],
        b = train[j]
      const dx = b.x - a.x,
        dy = b.y - a.y
      const min = a.r + b.r
      const d2 = dx * dx + dy * dy
      if (d2 >= min * min) continue
      const d = Math.sqrt(d2) || 1
      const push = min - d
      const wa = i === 0 ? 0 : 0.5
      a.x -= (dx / d) * push * wa
      a.y -= (dy / d) * push * wa
      b.x += (dx / d) * push * (1 - wa)
      b.y += (dy / d) * push * (1 - wa)
    }
}

// 航迹跟随：随从被拉向灯头走过的路径上对应位置
export function followPath(train: Float[], path: number[], rope: number, dt: number) {
  let walked = 0,
    k = 0
  for (let i = 1; i < train.length; i++) {
    const want = i * rope
    while (k + 3 < path.length) {
      const seg = Math.hypot(path[k + 2] - path[k], path[k + 3] - path[k + 1])
      if (walked + seg >= want) break
      walked += seg
      k += 2
    }
    if (k + 3 >= path.length) return
    const seg = Math.hypot(path[k + 2] - path[k], path[k + 3] - path[k + 1]) || 1
    const t = Math.min(1, (want - walked) / seg)
    const tx = path[k] + (path[k + 2] - path[k]) * t,
      ty = path[k + 1] + (path[k + 3] - path[k + 1]) * t
    const f = train[i]
    f.vx += (tx - f.x) * 2.6 * dt
    f.vy += (ty - f.y) * 2.6 * dt
  }
}
