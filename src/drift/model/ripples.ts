import type { Run } from './run'

// 涟漪推力环：随水波外扩，越过的漂浮物与暗影被推开
export type Ring = {
  x: number
  y: number
  r: number
  speed: number
  max: number
  power: number
  delay: number
}

type Body = { x: number; y: number; vx: number; vy: number }

export class Ripples {
  list: Ring[] = []

  constructor(readonly run: Run) {}

  // 点水一次：主环 + 回响
  add(x: number, y: number) {
    const st = this.run.stats
    this.list.push({
      x,
      y,
      r: 0,
      speed: 230,
      max: st.rippleRadius,
      power: st.ripplePower,
      delay: 0,
    })
    for (let i = 1; i <= st.echo; i++) {
      const max = st.rippleRadius * 0.8
      this.list.push({ x, y, r: 0, speed: 230, max, power: st.ripplePower * 0.6, delay: i * 0.28 })
    }
  }

  step(dt: number) {
    const { run } = this
    const st = run.stats
    for (const ring of this.list) {
      if (ring.delay > 0) {
        ring.delay -= dt
        if (ring.delay <= 0) run.waves.splash(ring.x, ring.y, 1.8, 8)
        continue
      }
      const prev = ring.r
      ring.r += ring.speed * dt
      const crossed = (x: number, y: number) => {
        const d = Math.hypot(x - ring.x, y - ring.y)
        return d >= prev && d < ring.r && d <= ring.max ? d : -1
      }
      const push = (f: Body, k = 1) => {
        const d = crossed(f.x, f.y)
        if (d < 0) return false
        const p = ring.power * Math.pow(1 - d / ring.max, 1.1) * k
        f.vx += (d > 1 ? (f.x - ring.x) / d : 0) * p
        f.vy += (d > 1 ? (f.y - ring.y) / d : -1) * p
        return true
      }
      for (const f of run.train) if (push(f)) f.spin += (Math.random() - 0.5) * 2
      for (const f of run.loose) push(f)
      for (const p of run.petals) push(p, 0.8)
      for (const s of run.shadows) {
        if (!push(s, 1.4)) continue
        if (s.scare <= 0) s.frights++
        s.scare = Math.max(s.scare, 0.7)
        s.stun = Math.max(s.stun, st.still)
        s.hp -= st.sear
      }
      if (run.boss && st.sear > 0 && crossed(run.boss.x, run.boss.y) >= 0)
        run.boss.hurt(st.sear * 0.5)
    }
    this.list = this.list.filter((r) => r.r < r.max)
  }
}
