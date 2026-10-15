import type { Float } from './world/floats'
import type { Run } from './run'
import { clamp, damp } from './world/math'

// 暗影：被灯光吸引，咬落灯队，被光圈灼烧
export type ShadowKind = 'fish' | 'moth' | 'eel'

export type Shadow = {
  id: number
  kind: ShadowKind
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  max: number
  r: number
  stun: number
  scare: number // 受惊逃离
  burn: number // 本帧受灼，供渲染
  age: number
  dash: number // 鳗：蓄力/冲刺计时
  dir: number
  leave: number // 叼走灯后潜离倒计时
  frights: number // 被涟漪惊扰次数
  dead: boolean
  fled: boolean
}

const specs = {
  fish: { hp: 0.85, speed: 86, r: 12 },
  moth: { hp: 0.55, speed: 125, r: 9 },
  eel: { hp: 2.6, speed: 70, r: 14 },
}

let nextId = 1

export function makeShadow(kind: ShadowKind, x: number, y: number, scale = 1): Shadow {
  const s = specs[kind]
  return {
    id: nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: s.hp * scale,
    max: s.hp * scale,
    r: s.r,
    stun: 0,
    scare: 0,
    burn: 0,
    age: 0,
    dash: 0,
    dir: 0,
    leave: 0,
    frights: 0,
    dead: false,
    fled: false,
  }
}

// 选目标：偏好灯队尾部；鱼与蛾只偷随灯，灯队空了才扑心灯
function target(run: Run, s: Shadow) {
  const train = run.train
  let best: Float | null = null,
    score = Infinity
  const from = s.kind !== 'eel' && train.length > 1 ? 1 : 0
  for (let i = from; i < train.length; i++) {
    const f = train[i]
    const d = Math.hypot(f.x - s.x, f.y - s.y)
    const k = d - i * 18
    if (k < score) {
      score = k
      best = f
    }
  }
  return best
}

export function stepShadow(run: Run, s: Shadow, dt: number) {
  s.age += dt
  if (run.over || run.won) s.scare = Math.max(s.scare, 1)
  // 久攻不下或屡受惊扰便潜走
  if (s.leave <= 0 && (s.age > 16 || s.frights >= 3)) s.leave = 1.6
  if (s.leave > 0) {
    s.leave -= dt
    s.scare = Math.max(s.scare, 0.5)
    if (s.leave <= 0) s.fled = true
  }
  s.stun = Math.max(0, s.stun - dt)
  s.scare = Math.max(0, s.scare - dt)
  const spec = specs[s.kind]
  const flowSpeed = run.river.speed
  if (s.stun > 0) {
    s.vx *= 1 - damp(4, dt)
    s.vy += (-flowSpeed - s.vy) * damp(2, dt)
  } else {
    const t = target(run, s)
    if (!t) return
    const dx = t.x - s.x,
      dy = t.y - s.y
    const d = Math.hypot(dx, dy) || 1
    let ax = dx / d,
      ay = dy / d
    if (s.scare > 0) {
      ax = -ax
      ay = -ay
    }
    if (s.kind === 'eel') stepEel(s, ax, ay, d, dt, flowSpeed)
    else {
      // 摆尾蛇行
      const wig =
        Math.sin(s.age * (s.kind === 'moth' ? 11 : 6) + s.id) * (s.kind === 'moth' ? 0.9 : 0.45)
      const wx = ax - ay * wig,
        wy = ay + ax * wig
      const sp = spec.speed * (s.scare > 0 ? 1.3 : 1)
      s.vx += (wx * sp + 0 - s.vx) * damp(2.4, dt)
      s.vy += (wy * sp - flowSpeed * 0.9 - s.vy) * damp(2.4, dt)
    }
    if (d < s.r + t.r && s.scare <= 0 && s.leave <= 0 && !run.over) {
      run.bite(t)
      s.scare = 2.2
      s.leave = 1.6
    }
  }
  s.x += s.vx * dt
  s.y += s.vy * dt
  // 鱼与鳗不上岸
  if (s.kind !== 'moth') {
    const depth = run.river.depth(s.x, s.y)
    if (depth < 6) {
      const c = run.river.center(s.y)
      s.x += Math.sign(c - s.x) * (6 - depth)
    }
  }
  if (s.scare > 0 && s.age > 4 && Math.abs(s.y - run.head.y) > 520) s.fled = true
}

// 鳗：游近蓄力，沿直线突刺
function stepEel(s: Shadow, ax: number, ay: number, d: number, dt: number, flow: number) {
  if (s.dash > 0) {
    s.dash -= dt
    if (s.dash < 0.45) {
      s.vx = Math.cos(s.dir) * 380
      s.vy = Math.sin(s.dir) * 380 - flow
    } else {
      s.vx *= 1 - damp(6, dt)
      s.vy += (-flow - s.vy) * damp(6, dt)
    }
    return
  }
  s.vx += (ax * 70 - s.vx) * damp(2, dt)
  s.vy += (ay * 70 - flow - s.vy) * damp(2, dt)
  if (d < 170 && d > 60 && s.scare <= 0) {
    s.dash = 1.2
    s.dir = Math.atan2(ay, ax)
  }
}

// 光圈灼烧，返回本帧伤害
export function burnShadow(run: Run, s: Shadow, dt: number) {
  const st = run.stats
  let dmg = 0
  for (const f of run.train) {
    if (!f.lit) continue
    const head = f.kind === 'head'
    const radius = (head ? 74 : f.kind === 'warm' ? 58 : 48) * st.light * (1 + run.level * 0.05)
    const d = Math.hypot(f.x - s.x, f.y - s.y)
    if (d > radius + s.r) continue
    const base = head ? 0.85 : f.kind === 'warm' ? 0.55 : 0.36
    dmg += base * (1 - clamp(d / (radius + s.r), 0, 1) * 0.5)
  }
  dmg *= st.burn * (1 + run.level * 0.08) * dt
  s.burn = dmg / dt
  return dmg
}
