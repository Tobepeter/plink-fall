import type { RushEvent, RushState, WeaponId } from './types'

// 节奏底鼓、枪火与击杀音色
export class RushSound {
  private context: AudioContext | null = null
  private output: GainNode | null = null
  private noise: AudioBuffer | null = null
  private voices = new Map<AudioScheduledSourceNode, () => void>()
  private lastShot = 0
  private lastHit = 0
  private lastCut = 0
  private nextBeat = 0
  private beat = 0
  private lastWeapons = new Map<WeaponId, number>()
  private lastReaction = -1
  constructor(private getState: () => RushState) {}
  unlock() {
    if (
      document.hidden ||
      this.getState().record.muted ||
      this.getState().paused ||
      this.getState().phase === 'menu'
    )
      return
    try {
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Constructor) return
      if (!this.context) {
        this.context = new Constructor()
        this.output = this.context.createGain()
        this.output.gain.value = 0.18
        this.output.connect(this.context.destination)
        this.noise = this.context.createBuffer(
          1,
          this.context.sampleRate * 0.12,
          this.context.sampleRate,
        )
        const data = this.noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      }
      this.resume()
    } catch {
      /* 无音频设备仍可战斗 */
    }
  }
  resume() {
    if (
      document.hidden ||
      this.getState().record.muted ||
      this.getState().paused ||
      this.getState().phase === 'menu'
    )
      return
    if (this.output) this.output.gain.value = 0.18
    if (this.context?.state === 'suspended') {
      void this.context.resume().catch(() => {})
      this.nextBeat = 0
    }
  }
  suspend() {
    if (this.getState().phase === 'menu') this.stopVoices()
    if (this.output) this.output.gain.value = 0
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {})
  }
  update() {
    const s = this.getState()
    if (this.output)
      this.output.gain.value =
        document.hidden || s.record.muted || s.paused || s.phase === 'menu' ? 0 : 0.18
    if (
      document.hidden ||
      s.record.muted ||
      s.paused ||
      s.phase !== 'playing' ||
      this.context?.state !== 'running'
    )
      return
    const now = this.context.currentTime
    if (now < this.nextBeat) return
    const step = this.beat++ % 16
    const notes = [
      261.6, 0, 311.1, 392, 349.2, 0, 311.1, 0, 261.6, 392, 466.2, 0, 392, 349.2, 311.1, 0,
    ]
    if (step % 2 === 0) this.tone(step < 8 ? 65.4 : 77.8, now, 0.13, 0.15, 'triangle', 45)
    if (notes[step] && (s.wave.phase === 'combat' || step % 2 === 0))
      this.tone(notes[step], now, 0.09, 0.065, 'triangle')
    if (step % 4 === 2) this.crackle(now, 0.075, 3400)
    this.nextBeat = now + 30 / (s.wave.phase === 'breather' ? 112 : s.overdrive > 0 ? 158 : 144)
  }
  event(event: RushEvent) {
    if (
      document.hidden ||
      this.getState().record.muted ||
      this.getState().paused ||
      this.getState().phase === 'menu' ||
      this.context?.state !== 'running'
    )
      return
    const now = this.context.currentTime
    if (event.type === 'weapon' && event.weapon) {
      this.weapon(event.weapon, now)
    } else if (event.type === 'reaction') {
      if (now - this.lastReaction < 0.18) return
      this.lastReaction = now
      if (event.reaction === 'combustion') {
        this.crackle(now, 0.17, 750)
        this.tone(150, now, 0.14, 0.12, 'triangle', 48)
      } else if (event.reaction === 'conduction') {
        this.crackle(now, 0.08, 4000)
        this.tone(1240, now, 0.07, 0.055, 'triangle', 620)
      } else this.tone(1568, now, 0.09, 0.065, 'sine', 2093)
    } else if (event.type === 'shot') {
      if (event.weapon) return
      if (event.side === 'enemy' || now - this.lastShot < 0.08) return
      this.lastShot = now
      this.tone(740 + (this.beat % 3) * 60, now, 0.045, 0.07, 'triangle', 370)
    } else if (event.type === 'hit' || event.type === 'kill') {
      if (now - this.lastHit < 0.045) return
      this.lastHit = now
      this.crackle(now, event.type === 'kill' ? 0.15 : 0.07, 1600)
      if (event.type === 'kill') this.tone(145, now, 0.065, 0.1, 'triangle', 90)
    } else if (event.type === 'intercept') {
      if (now - this.lastCut < 0.065) return
      this.lastCut = now
      this.tone(1280, now, 0.04, 0.08, 'triangle', 720)
    } else if (event.type === 'counter') {
      this.crackle(now, 0.26, 650)
      this.tone(280, now, 0.11, 0.18, 'sawtooth', 80)
      this.tone(950, now + 0.025, 0.08, 0.1, 'triangle', 510)
    } else if (event.type === 'protocol' && event.amount === 1) {
      const notes = [523, 659, 784, 1047]
      notes.forEach((note, i) => this.tone(note, now + i * 0.045, 0.13, 0.14, 'triangle'))
    } else if (event.type === 'wave-clear') {
      this.tone(392, now, 0.18, 0.12, 'triangle')
      this.tone(523, now + 0.075, 0.18, 0.1, 'triangle')
    } else if (event.type === 'hurt' || event.type === 'explode') {
      this.crackle(now, 0.35, 500)
      this.tone(190, now, 0.17, 0.23, 'sawtooth', 50)
    } else if (event.type === 'ability') {
      this.tone(330, now, 0.16, 0.16, 'triangle', 880)
      this.tone(660, now + 0.05, 0.2, 0.12, 'triangle', 1320)
    } else if (event.type === 'dash') {
      this.tone(500, now, 0.12, 0.18, 'sine', 100)
      this.crackle(now, 0.1, 2400)
    } else if (
      event.type === 'upgrade' ||
      event.type === 'level' ||
      event.type === 'overdrive' ||
      event.type === 'boss-down'
    ) {
      const notes = event.type === 'overdrive' ? [330, 440, 660, 880] : [523, 659, 784]
      notes.forEach((note, i) => this.tone(note, now + i * 0.045, 0.12, 0.16, 'triangle'))
    } else if (event.type === 'boss') {
      this.tone(110, now, 0.5, 0.19, 'sawtooth', 75)
    } else if (event.type === 'run-end') {
      const notes = this.getState().phase === 'won' ? [523, 659, 784, 1047] : [330, 277, 220]
      notes.forEach((note, i) => this.tone(note, now + i * 0.1, 0.3, 0.14, 'triangle'))
    }
  }
  // 每类枪声独立节流
  private weapon(weapon: WeaponId, now: number) {
    if (now - (this.lastWeapons.get(weapon) ?? -1) < (weapon === 'flame' ? 0.14 : 0.1)) return
    this.lastWeapons.set(weapon, now)
    if (weapon === 'laser') {
      this.tone(950, now, 0.075, 0.065, 'sine', 1800)
      this.tone(330, now, 0.055, 0.035, 'triangle', 190)
    } else if (weapon === 'scatter') {
      this.crackle(now, 0.12, 1300)
      this.tone(190, now, 0.065, 0.09, 'triangle', 65)
    } else if (weapon === 'flame') this.crackle(now, 0.045, 1600)
    else if (weapon === 'toxin') {
      this.tone(145, now, 0.09, 0.07, 'sine', 330)
      this.crackle(now, 0.025, 550)
    } else if (weapon === 'arc') {
      this.tone(1500, now, 0.055, 0.045, 'triangle', 500)
      this.crackle(now, 0.035, 4400)
    } else this.crackle(now, 0.045, 3000)
  }
  private tone(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    end = frequency,
  ) {
    if (!this.context || !this.output || this.voices.size >= 48) return
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, time)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), time + duration)
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(volume, time + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
    oscillator.connect(gain).connect(this.output)
    this.trackVoice(oscillator, [gain])
    oscillator.start(time)
    oscillator.stop(time + duration + 0.015)
  }
  private crackle(time: number, volume: number, cutoff: number) {
    if (!this.context || !this.output || !this.noise || this.voices.size >= 48) return
    const source = this.context.createBufferSource(),
      filter = this.context.createBiquadFilter(),
      gain = this.context.createGain()
    source.buffer = this.noise
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09)
    source.connect(filter).connect(gain).connect(this.output)
    this.trackVoice(source, [filter, gain])
    source.start(time)
    source.stop(time + 0.12)
  }
  private trackVoice(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    const cleanup = () => {
      if (!this.voices.delete(source)) return
      source.onended = null
      source.disconnect()
      for (const node of nodes) node.disconnect()
    }
    this.voices.set(source, cleanup)
    source.onended = cleanup
  }
  // 整备前清掉已排程音符，不让旧结算声在新局恢复
  private stopVoices() {
    this.lastWeapons.clear()
    this.lastReaction = -1
    for (const [source, cleanup] of [...this.voices]) {
      source.onended = null
      try {
        source.stop()
      } catch {
        /* 已停止的音源仍需断开 */
      }
      cleanup()
    }
  }
  destroy() {
    this.stopVoices()
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
    this.output = null
    this.noise = null
  }
}
