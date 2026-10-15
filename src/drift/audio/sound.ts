import { Synth, scaleFreq } from './synth'
import type { DriftEvent } from '../model/types'

// 声音：水声环境 + 生成式拨弦配乐 + 事件音效
export class DriftSound {
  private synth: Synth | null = null
  private music = 0 // 下一个拨弦时刻
  private chordAt = 0
  private chord = 0
  private pads: OscillatorNode[] = []
  private padGain: GainNode | null = null
  private root = 146.83 // D3
  private absorbStep = 0
  private bossBeat = 0
  boss = false
  muted = false

  // 首次手势后创建
  unlock() {
    if (this.synth) {
      if (this.synth.ctx.state === 'suspended' && !this.muted) void this.synth.ctx.resume()
      return
    }
    try {
      this.synth = new Synth()
    } catch {
      return
    }
    this.startAmbience()
    if (this.muted) void this.synth.ctx.suspend()
  }

  setMuted(on: boolean) {
    this.muted = on
    if (!this.synth) return
    if (on) void this.synth.ctx.suspend()
    else void this.synth.ctx.resume()
  }

  suspend() {
    if (this.synth?.ctx.state === 'running') void this.synth.ctx.suspend()
  }

  resume() {
    if (this.synth && !this.muted) void this.synth.ctx.resume()
  }

  setRegion(region: number) {
    this.root = [146.83, 174.61, 130.81][region] ?? 146.83
  }

  private startAmbience() {
    const s = this.synth!
    const src = s.loopNoise()
    const lp = s.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    const g = s.ctx.createGain()
    g.gain.value = 0.18
    const lfo = s.ctx.createOscillator()
    lfo.frequency.value = 0.13
    const depth = s.ctx.createGain()
    depth.gain.value = 0.06
    lfo.connect(depth).connect(g.gain)
    src.connect(lp).connect(g).connect(s.out)
    src.start()
    lfo.start()
    // 柔和长音垫底
    this.padGain = s.ctx.createGain()
    this.padGain.gain.value = 0.0
    const pf = s.ctx.createBiquadFilter()
    pf.type = 'lowpass'
    pf.frequency.value = 700
    this.padGain.connect(pf).connect(s.out)
    s.send(this.padGain, 0.8)
    for (let i = 0; i < 3; i++) {
      const o = s.ctx.createOscillator()
      o.type = 'triangle'
      o.detune.value = (i - 1) * 6
      o.connect(this.padGain)
      o.start()
      this.pads.push(o)
    }
    this.padGain.gain.linearRampToValueAtTime(0.035, s.now + 4)
  }

  // 每帧调度配乐
  update(intensity: number) {
    const s = this.synth
    if (!s || s.ctx.state !== 'running') return
    const t = s.now
    if (t >= this.chordAt) {
      const chords = [
        [0, 2, 4],
        [3, 5, 7],
        [1, 3, 5],
        [4, 6, 8],
      ]
      const c = chords[this.chord++ % chords.length]
      this.pads.forEach((o, i) =>
        o.frequency.setTargetAtTime(scaleFreq(this.root / 2, c[i]), t, 1.2),
      )
      this.chordAt = t + 8
    }
    if (t >= this.music) {
      const step = Math.floor(Math.random() * 8) + 5
      s.pluck(scaleFreq(this.root, step), 0.09 + intensity * 0.05, 0, 0.7)
      if (Math.random() < 0.35) s.pluck(scaleFreq(this.root, step + 2), 0.06, 0.18, 0.7)
      this.music = t + 1.4 + Math.random() * 2.6 - intensity * 0.8
    }
    if (this.boss && t >= this.bossBeat) {
      s.drum(62, 0.42)
      s.drum(62, 0.22, 0.42)
      s.drum(90, 0.18, 0.84, 0.25)
      this.bossBeat = t + 1.7
    }
  }

  event(e: DriftEvent, trainLen: number) {
    const s = this.synth
    if (!s || s.ctx.state !== 'running') return
    const r = this.root
    switch (e.type) {
      case 'tap':
        s.drop(0.22, 0.85 + Math.random() * 0.3)
        break
      case 'join':
        s.pluck(scaleFreq(r, 5 + (trainLen % 10)), 0.32)
        s.bell(scaleFreq(r * 2, 5 + (trainLen % 10)), 0.04)
        break
      case 'lose':
        s.hiss(0.18, 0.5, 2400, 600, 0.6)
        s.pluck(scaleFreq(r / 2, 2), 0.25, 0, 0.3)
        break
      case 'hurt':
        s.drum(55, 0.6, 0, 0.7)
        s.pluck(r * 0.75, 0.3, 0.02, 0.2)
        s.pluck(r * 0.8, 0.25, 0.03, 0.2)
        break
      case 'shield':
        s.bell(r * 4, 0.08, 0, 1.2)
        break
      case 'absorb':
        s.bell(scaleFreq(r * 4, this.absorbStep++ % 8), 0.025, 0, 0.9)
        break
      case 'petal':
        s.bell(r * 6, 0.02, 0, 0.6)
        break
      case 'level':
        for (let i = 0; i < 5; i++) s.pluck(scaleFreq(r, 5 + i * 2), 0.26, i * 0.09)
        s.bell(r * 4, 0.1, 0.45, 3)
        break
      case 'kill':
        s.hiss(0.1, 0.35, 600, 3000, 1.2)
        s.bell(scaleFreq(r * 4, 3 + Math.floor(Math.random() * 4)), 0.03, 0.05, 0.8)
        break
      case 'zap':
        s.hiss(0.14, 0.12, 5000, 2000, 0.5)
        break
      case 'pulse':
        s.drum(120, 0.15, 0, 0.6)
        break
      case 'choose':
        s.bell(r * 2, 0.14, 0, 3.5)
        s.bell(scaleFreq(r * 2, 2), 0.08, 0.12, 3)
        break
      case 'offer':
      case 'shop':
        for (let i = 0; i < 4; i++)
          s.bell(scaleFreq(r * 4, i * 2 + Math.floor(Math.random() * 2)), 0.035, i * 0.11, 1.5)
        break
      case 'bless':
      case 'buy':
        s.pluck(scaleFreq(r, 10), 0.3)
        s.bell(r * 4, 0.06, 0.05)
        break
      case 'boss':
        this.boss = true
        s.drum(48, 0.7, 0, 1.4)
        s.hiss(0.25, 2.5, 200, 80, 0.7)
        break
      case 'boss-tell':
        s.hiss(0.2, 1.1, 120, 400, 2)
        break
      case 'boss-stun':
        s.drop(0.35, 0.5)
        s.bell(r * 2, 0.16, 0.05, 2.5)
        break
      case 'boss-dead':
        this.boss = false
        s.drum(44, 0.8, 0, 2)
        for (let i = 0; i < 7; i++) s.pluck(scaleFreq(r, 3 + i * 2), 0.3, 0.3 + i * 0.12)
        s.bell(r * 2, 0.2, 0.3, 5)
        break
      case 'region':
        this.setRegion(e.region)
        s.bell(this.root, 0.16, 0, 5)
        s.bell(scaleFreq(this.root, 3), 0.1, 0.3, 5)
        break
      case 'over':
        this.boss = false
        for (let i = 0; i < 5; i++) s.pluck(scaleFreq(r, 9 - i * 2), 0.24, i * 0.35, 0.8)
        break
      case 'win':
        this.boss = false
        for (let i = 0; i < 10; i++) s.pluck(scaleFreq(r, 4 + i), 0.24, i * 0.14, 0.8)
        s.bell(r * 2, 0.2, 1.4, 6)
        break
    }
  }

  destroy() {
    void this.synth?.ctx.close()
    this.synth = null
  }
}
