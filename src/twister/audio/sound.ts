import type { Run } from '../sim/run'
import type { TwEvent } from '../sim/types'

// 声音：随体型与速度变化的风声，卷起物件的啵声，坍塌、雷鸣、升档提示
export class TwisterSound {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private wind: GainNode | null = null
  private windFilter: BiquadFilterNode | null = null
  private noise: AudioBuffer | null = null
  private pops = 0
  muted = false

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.muted) void this.ctx.resume()
      return
    }
    try {
      this.ctx = new AudioContext()
    } catch {
      return
    }
    const ctx = this.ctx
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.connect(ctx.destination)
    this.out = ctx.createGain()
    this.out.gain.value = 0.85
    this.out.connect(comp)
    const len = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = (last + 0.05 * (Math.random() * 2 - 1)) / 1.05
      d[i] = last * 3 + (Math.random() * 2 - 1) * 0.15
    }
    // 风声：带通噪声，频率与音量随风力变化
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.Q.value = 0.8
    this.windFilter.frequency.value = 400
    this.wind = ctx.createGain()
    this.wind.gain.value = 0
    src.connect(this.windFilter).connect(this.wind).connect(this.out)
    src.start()
    if (this.muted) void ctx.suspend()
  }

  setMuted(on: boolean) {
    this.muted = on
    if (!this.ctx) return
    if (on) void this.ctx.suspend()
    else void this.ctx.resume()
  }

  suspend() {
    if (this.ctx?.state === 'running') void this.ctx.suspend()
  }

  resume() {
    if (this.ctx && !this.muted) void this.ctx.resume()
  }

  update(run: Run, dt: number, live: boolean) {
    this.pops = Math.max(0, this.pops - dt * 30)
    if (!this.ctx || !this.wind || !this.windFilter) return
    const p = run.player
    const sp = Math.hypot(p.vx, p.vz)
    const k = live ? Math.min(1, 0.25 + p.r / 20) : 0.12
    const t = this.ctx.currentTime
    this.wind.gain.setTargetAtTime(0.06 + k * 0.22 + Math.min(0.1, sp * 0.004), t, 0.2)
    this.windFilter.frequency.setTargetAtTime(220 + 600 / (1 + p.r * 0.15) + sp * 8, t, 0.3)
  }

  private tone(
    freq: number,
    gain: number,
    dur: number,
    type: OscillatorType = 'sine',
    slide = 0.5,
    when = 0,
  ) {
    const ctx = this.ctx!
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(this.out!)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private burst(gain: number, dur: number, freq: number, q = 1, when = 0) {
    const ctx = this.ctx!
    const t = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(f).connect(g).connect(this.out!)
    src.start(t, Math.random())
    src.stop(t + dur + 0.05)
  }

  chime() {
    if (!this.ready) return
    ;[0, 4, 7, 12].forEach((n, i) =>
      this.tone(523 * 2 ** (n / 12), 0.12, 0.6, 'triangle', 1, i * 0.07),
    )
  }

  private get ready() {
    return this.ctx?.state === 'running' && !!this.out
  }

  event(e: TwEvent) {
    if (!this.ready) return
    const mine = 'owner' in e && e.owner === 0
    switch (e.type) {
      case 'eat': {
        if (!mine || this.pops > 6) return
        this.pops++
        const s = e.obj.s
        // 小东西清脆，大东西低沉
        const f = 900 / Math.sqrt(0.4 + s * 0.6)
        this.tone(
          f * (0.9 + Math.random() * 0.2),
          0.1 + Math.min(0.2, s * 0.02),
          0.12 + s * 0.02,
          'triangle',
          1.6,
        )
        if (s > 6) this.burst(0.25, 0.6, 180, 0.7)
        break
      }
      case 'crumble':
        if (mine) this.burst(0.12, 0.25, 500 + Math.random() * 400, 1.5)
        break
      case 'devour':
        this.burst(0.4, 1.2, 160, 0.6)
        this.tone(e.big === 0 ? 220 : 110, 0.25, 0.8, 'sawtooth', e.big === 0 ? 2 : 0.4)
        break
      case 'bolt':
        this.burst(0.5, 1.4, 90, 0.4)
        this.burst(0.3, 0.2, 2400, 0.5)
        break
      case 'tier':
        this.chime()
        break
      case 'goal':
        ;[0, 4, 7, 12, 16].forEach((n, i) =>
          this.tone(392 * 2 ** (n / 12), 0.14, 0.8, 'triangle', 1, i * 0.09),
        )
        break
      case 'end':
        ;(e.win ? [0, 4, 7, 12] : [7, 4, 0, -5]).forEach((n, i) =>
          this.tone(330 * 2 ** (n / 12), 0.14, 0.7, 'triangle', 1, i * 0.12),
        )
        break
    }
  }

  destroy() {
    void this.ctx?.close()
    this.ctx = null
  }
}
