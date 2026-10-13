/** Synthesized Web Audio SFX. Context is created/resumed on the first user gesture (autoplay policy). */
export class AudioSystem {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private budget = 0
  muted = false

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.35
      const comp = this.ctx.createDynamicsCompressor()
      this.master.connect(comp).connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }
  suspend() {
    if (this.ctx?.state === 'running') void this.ctx.suspend()
  }
  /** Refill the per-frame voice budget so dense moments don't overload audio. */
  frame(dt: number) {
    this.budget = Math.min(6, this.budget + dt * 28)
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 1) {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running' || this.budget < 1) return
    this.budget--
    const t = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  plink(row: number, gold: boolean) {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36]
    const semi = scale[row % scale.length]
    const f = 520 * Math.pow(2, semi / 12) * (0.99 + Math.random() * 0.02)
    this.tone(gold ? f * 1.5 : f, 0.09, gold ? 'triangle' : 'sine', 0.12)
  }
  slot(mult: number) {
    const big = mult >= 5
    this.tone(big ? 330 : 180, big ? 0.35 : 0.14, big ? 'square' : 'triangle', big ? 0.08 : 0.1, big ? 2 : 0.6)
  }
  buy() {
    this.budget = 6
    this.tone(660, 0.12, 'square', 0.06, 1.5)
  }
}
