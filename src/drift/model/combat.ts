import type { Run } from './run'
import type { Shadow } from './shadows'
import { damp } from './world/math'

// 灯种能力与随行伙伴：雷灯连锁、莲灯脉冲、余烬、锦鲤、纸鹤
export type Ember = { x: number; y: number; life: number; max: number }
export type Buddy = {
  kind: 'koi' | 'crane'
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  target: number
}

export class Combat {
  embers: Ember[] = []
  buddies: Buddy[] = []
  private zapTimer = new Map<number, number>()
  private pulseTimer = new Map<number, number>()
  private emberTimer = 0

  constructor(readonly run: Run) {}

  step(dt: number) {
    const { run } = this
    const st = run.stats
    for (const f of run.train) {
      if (f.kind === 'violet') {
        const t = (this.zapTimer.get(f.id) ?? 1.2) - dt
        if (t <= 0) {
          this.zap(f.x, f.y, 1 + st.thunder)
          this.zapTimer.set(f.id, 2.4 / (1 + st.thunder * 0.15))
        } else this.zapTimer.set(f.id, t)
      }
      if (f.kind === 'rose') {
        const t = (this.pulseTimer.get(f.id) ?? 3) - dt
        if (t <= 0) {
          this.pulse(f.x, f.y)
          this.pulseTimer.set(f.id, 7 * (1 - st.lotus * 0.18))
        } else this.pulseTimer.set(f.id, t)
      }
    }
    this.stepEmbers(dt)
    this.stepBuddies(dt)
  }

  // 雷灯：击中最近暗影并连锁
  private zap(x: number, y: number, chain: number) {
    const { run } = this
    const hit = new Set<Shadow>()
    const points = [{ x, y }]
    let cx = x,
      cy = y,
      range = 150
    for (let i = 0; i <= chain; i++) {
      let best: Shadow | null = null,
        bd = range
      for (const s of run.shadows) {
        if (s.dead || hit.has(s)) continue
        const d = Math.hypot(s.x - cx, s.y - cy)
        if (d < bd) {
          bd = d
          best = s
        }
      }
      const bossHit =
        !best && run.boss && Math.hypot(run.boss.x - cx, run.boss.y - cy) < range + run.boss.r
      if (bossHit) {
        run.boss!.hurt(0.9)
        points.push({ x: run.boss!.x, y: run.boss!.y })
        break
      }
      if (!best) break
      hit.add(best)
      best.hp -= 0.9
      best.stun = Math.max(best.stun, 0.25)
      points.push({ x: best.x, y: best.y })
      cx = best.x
      cy = best.y
      range = 100
    }
    if (points.length > 1) run.events.push({ type: 'zap', points })
  }

  // 莲灯：推开并定住周围暗影
  private pulse(x: number, y: number) {
    const { run } = this
    for (const s of run.shadows) {
      const dx = s.x - x,
        dy = s.y - y
      const d = Math.hypot(dx, dy) || 1
      if (d > 120) continue
      s.vx += (dx / d) * 260
      s.vy += (dy / d) * 260
      s.stun = Math.max(s.stun, 0.8)
      s.hp -= 0.2
    }
    run.events.push({ type: 'pulse', x, y })
  }

  private stepEmbers(dt: number) {
    const { run } = this
    const lv = run.stats.ember
    if (lv > 0) {
      this.emberTimer -= dt
      if (this.emberTimer <= 0) {
        this.emberTimer = 0.22
        const h = run.head
        this.embers.push({ x: h.x, y: h.y + 10, life: 1.6 + lv * 0.7, max: 1.6 + lv * 0.7 })
      }
    }
    for (const e of this.embers) {
      e.life -= dt
      e.y -= run.river.speed * 0.6 * dt
      for (const s of run.shadows)
        if ((s.x - e.x) ** 2 + (s.y - e.y) ** 2 < 22 * 22) s.hp -= 0.9 * lv * dt
      if (run.boss && Math.hypot(run.boss.x - e.x, run.boss.y - e.y) < run.boss.r + 16)
        run.boss.hurt(0.3 * lv * dt)
    }
    this.embers = this.embers.filter((e) => e.life > 0)
  }

  // 锦鲤护航咬暗影，纸鹤代拾萤火花瓣
  private stepBuddies(dt: number) {
    const { run } = this
    const st = run.stats
    const want = { koi: st.koi, crane: st.crane }
    for (const kind of ['koi', 'crane'] as const) {
      const have = this.buddies.filter((b) => b.kind === kind).length
      for (let i = have; i < want[kind]; i++) {
        const h = run.head
        this.buddies.push({
          kind,
          x: h.x,
          y: h.y,
          vx: 0,
          vy: 0,
          phase: Math.random() * 6,
          target: -1,
        })
      }
    }
    const h = run.head
    this.buddies.forEach((b, i) => {
      b.phase += dt
      let tx = h.x + Math.cos(b.phase * 1.4 + i * 2.1) * 56,
        ty = h.y + 30 + Math.sin(b.phase * 1.4 + i * 2.1) * 40
      if (b.kind === 'koi') {
        let best: Shadow | null = null,
          bd = 170
        for (const s of run.shadows) {
          const d = Math.hypot(s.x - b.x, s.y - b.y)
          if (s.dead || d >= bd) continue
          bd = d
          best = s
        }
        if (best) {
          tx = best.x
          ty = best.y
          if (bd < 18) best.hp -= 1.4 * dt
        }
      } else {
        const range = 70
        for (const p of run.petals)
          if (!p.drawn && (p.x - b.x) ** 2 + (p.y - b.y) ** 2 < range * range) p.drawn = true
        for (const f of run.fireflies)
          if (!f.drawn && (f.x - b.x) ** 2 + (f.y - b.y) ** 2 < range * range) f.drawn = true
        ty -= 60
      }
      const sp = b.kind === 'koi' ? 230 : 170
      const dx = tx - b.x,
        dy = ty - b.y
      const d = Math.hypot(dx, dy) || 1
      b.vx += ((dx / d) * Math.min(sp, d * 4) - b.vx) * damp(4, dt)
      b.vy += ((dy / d) * Math.min(sp, d * 4) - b.vy) * damp(4, dt)
      b.x += b.vx * dt
      b.y += b.vy * dt
    })
  }
}
