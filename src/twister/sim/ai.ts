import type { Run } from './run'
import type { Tornado } from './tornado'
import { topSpeed } from './tornado'
import { damp } from './rng'

// 对手龙卷：饿了找密集处，见小的追，见大的逃
export function steerRival(run: Run, t: Tornado, dt: number, pace = 0.8) {
  const p = run.player
  t.think -= dt
  if (t.think <= 0 || !t.goal) {
    t.think = 0.7 + Math.random() * 0.6
    const d = Math.hypot(p.x - t.x, p.z - t.z)
    if (
      t.calm <= 0 &&
      p.alive &&
      p.guard <= 0 &&
      t.r > p.r * 1.15 &&
      d < Math.min(80, 40 + t.r * 2)
    )
      t.goal = { x: p.x + p.vx * 0.6, z: p.z + p.vz * 0.6 }
    else if (p.alive && p.r > t.r * 1.1 && d < 40 + p.r * 3) {
      const k = (60 + p.r * 2) / (d || 1)
      t.goal = { x: t.x + (t.x - p.x) * k, z: t.z + (t.z - p.z) * k }
    } else t.goal = forage(run, t)
  }
  const g = t.goal!
  const dx = g.x - t.x,
    dz = g.z - t.z
  const d = Math.hypot(dx, dz) || 1
  const sp = topSpeed(t) * pace * Math.min(1, d / 12)
  t.vx += ((dx / d) * sp - t.vx) * damp(3, dt)
  t.vz += ((dz / d) * sp - t.vz) * damp(3, dt)
}

// 采样附近若干格，找能卷的东西最多的方向
function forage(run: Run, t: Tornado) {
  const half = run.city.half - 8
  let best = { x: t.x, z: t.z },
    score = -1
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2,
      dist = 20 + Math.random() * (60 + t.r * 3)
    const x = Math.max(-half, Math.min(half, t.x + Math.cos(a) * dist))
    const z = Math.max(-half, Math.min(half, t.z + Math.sin(a) * dist))
    let s = 0
    for (const o of run.grid.query(x, z, 14 + t.r, run.scratch))
      if (o.state === 'idle' && o.s <= t.r * 1.6) s += o.mass
    // 别和玩家挤在一起
    s -= Math.max(0, 40 - Math.hypot(x - run.player.x, z - run.player.z)) * 0.5
    if (s > score) {
      score = s
      best = { x, z }
    }
  }
  return best
}
