// 合成器底座：主输出、混响、拨弦缓存、音色
export class Synth {
  ctx: AudioContext
  out: GainNode
  wet: GainNode
  private verb: ConvolverNode
  private plucks = new Map<number, AudioBuffer>()
  private noise: AudioBuffer

  constructor() {
    this.ctx = new AudioContext()
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 4
    comp.connect(this.ctx.destination)
    this.out = this.ctx.createGain()
    this.out.gain.value = 0.8
    this.out.connect(comp)
    this.verb = this.ctx.createConvolver()
    this.verb.buffer = this.impulse(2.8)
    this.wet = this.ctx.createGain()
    this.wet.gain.value = 0.35
    this.wet.connect(this.verb)
    this.verb.connect(this.out)
    this.noise = this.makeNoise(2)
  }

  get now() {
    return this.ctx.currentTime
  }

  private impulse(sec: number) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * sec)
    const buf = this.ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
    }
    return buf
  }

  private makeNoise(sec: number) {
    const rate = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, rate * sec, rate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < d.length; i++) {
      // 偏棕噪声，水声更柔
      last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04
      d[i] = last * 3.5 + (Math.random() * 2 - 1) * 0.08
    }
    return buf
  }

  // Karplus-Strong 拨弦，按频率缓存
  private pluckBuffer(freq: number) {
    const key = Math.round(freq)
    let buf = this.plucks.get(key)
    if (buf) return buf
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * 2.2)
    buf = this.ctx.createBuffer(1, len, rate)
    const d = buf.getChannelData(0)
    const n = Math.max(2, Math.round(rate / freq))
    const ring = new Float32Array(n)
    for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1
    let p = 0
    for (let i = 0; i < len; i++) {
      const next = (p + 1) % n
      const v = 0.4985 * (ring[p] + ring[next])
      d[i] = ring[p]
      ring[p] = v
      p = next
    }
    this.plucks.set(key, buf)
    return buf
  }

  pluck(freq: number, gain = 0.3, when = 0, wet = 0.5) {
    const t = this.now + when
    const src = this.ctx.createBufferSource()
    src.buffer = this.pluckBuffer(freq)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.1)
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    src.connect(lp).connect(g)
    g.connect(this.out)
    this.send(g, wet)
    src.start(t)
  }

  // 铃：非谐波分音
  bell(freq: number, gain = 0.12, when = 0, decay = 2.4) {
    const t = this.now + when
    for (const [ratio, amp] of [
      [1, 1],
      [2.76, 0.4],
      [5.4, 0.18],
      [8.9, 0.08],
    ]) {
      const o = this.ctx.createOscillator()
      o.frequency.value = freq * ratio
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain * amp, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0005, t + decay / ratio ** 0.4)
      o.connect(g)
      g.connect(this.out)
      this.send(g, 0.7)
      o.start(t)
      o.stop(t + decay + 0.1)
    }
  }

  // 水滴：下滑正弦
  drop(gain = 0.25, pitch = 1) {
    const t = this.now
    const o = this.ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(1300 * pitch, t)
    o.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.09)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    o.connect(g)
    g.connect(this.out)
    this.send(g, 0.6)
    o.start(t)
    o.stop(t + 0.2)
  }

  // 噪声段：带通扫频
  hiss(gain: number, dur: number, from: number, to: number, q = 1, when = 0) {
    const t = this.now + when
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = q
    bp.frequency.setValueAtTime(from, t)
    bp.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.15)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(bp).connect(g)
    g.connect(this.out)
    this.send(g, 0.4)
    src.start(t, Math.random())
    src.stop(t + dur + 0.05)
  }

  // 低音鼓：太鼓/撞击
  drum(freq: number, gain: number, when = 0, dur = 0.5) {
    const t = this.now + when
    const o = this.ctx.createOscillator()
    o.frequency.setValueAtTime(freq * 1.8, t)
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.06)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(this.out)
    this.send(g, 0.3)
    o.start(t)
    o.stop(t + dur + 0.05)
    this.hiss(gain * 0.25, 0.12, 900, 300, 0.8, when)
  }

  loopNoise() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    return src
  }

  send(node: AudioNode, amount: number) {
    if (amount <= 0) return
    const g = this.ctx.createGain()
    g.gain.value = amount
    node.connect(g).connect(this.wet)
  }
}

// 五声音阶频率
export function scaleFreq(root: number, step: number) {
  const pent = [0, 2, 4, 7, 9]
  const oct = Math.floor(step / 5)
  const semi = pent[((step % 5) + 5) % 5] + oct * 12
  return root * Math.pow(2, semi / 12)
}
