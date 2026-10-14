import type { MineEvent, MineState } from './types'

// 钻击、落矿与绞盘音色
export class MineSound {
  private context: AudioContext | null = null
  private output: GainNode | null = null
  private noise: AudioBuffer | null = null
  private lastHit = 0
  private pickupIndex = 0

  constructor(private getState: () => MineState) {}

  unlock() {
    if (this.getState().muted) return
    try {
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Constructor) return
      if (!this.context) {
        this.context = new Constructor()
        this.output = this.context.createGain()
        this.output.gain.value = 0.19
        this.output.connect(this.context.destination)
        this.noise = this.context.createBuffer(
          1,
          this.context.sampleRate * 0.16,
          this.context.sampleRate,
        )
        const samples = this.noise.getChannelData(0)
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      }
      this.resume()
    } catch {
      /* 无音频环境保留完整操作 */
    }
  }

  resume() {
    if (!this.getState().muted && this.context?.state === 'suspended')
      void this.context.resume().catch(() => {})
  }

  suspend() {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {})
  }

  event(event: MineEvent) {
    if (this.getState().muted || this.context?.state !== 'running') return
    const now = this.context.currentTime
    if (event.type === 'hit' || event.type === 'break' || event.type === 'gas') {
      if (event.type === 'hit' && now - this.lastHit < 0.09) return
      this.lastHit = now
      this.crackle(now, event.type === 'break' ? 0.35 : 0.15, event.type === 'gas' ? 280 : 1700)
      this.tone(event.type === 'break' ? 145 : 230, now, 0.08, 0.24, 'triangle', 60)
    } else if (event.type === 'launch' || event.type === 'return') {
      this.tone(
        event.type === 'launch' ? 150 : 340,
        now,
        0.27,
        0.2,
        'sine',
        event.type === 'launch' ? 330 : 130,
      )
    } else if (event.type === 'pickup') {
      const notes = [440, 554, 659, 880, 1108]
      this.tone(notes[this.pickupIndex++ % notes.length], now, 0.11, 0.13, 'sine')
    } else if (event.type === 'pulse') {
      this.crackle(now, 0.3, 700)
      this.tone(290, now, 0.3, 0.38, 'triangle', 65)
    } else if (
      event.type === 'bank' ||
      event.type === 'install' ||
      event.type === 'travel' ||
      event.type === 'relic'
    ) {
      const notes = event.type === 'travel' ? [392, 523, 784, 1047] : [440, 554, 659]
      notes.forEach((frequency, index) =>
        this.tone(frequency, now + index * 0.055, 0.2, 0.19, 'sine'),
      )
    }
  }

  private tone(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    end = frequency,
  ) {
    if (!this.context || !this.output) return
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, time)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), time + duration)
    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(volume, time + 0.006)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration)
    oscillator.connect(envelope).connect(this.output)
    oscillator.onended = () => {
      oscillator.disconnect()
      envelope.disconnect()
    }
    oscillator.start(time)
    oscillator.stop(time + duration + 0.02)
  }

  private crackle(time: number, volume: number, cutoff: number) {
    if (!this.context || !this.output || !this.noise) return
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const envelope = this.context.createGain()
    source.buffer = this.noise
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    envelope.gain.setValueAtTime(volume, time)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.13)
    source.connect(filter).connect(envelope).connect(this.output)
    source.onended = () => {
      source.disconnect()
      filter.disconnect()
      envelope.disconnect()
    }
    source.start(time)
    source.stop(time + 0.16)
  }

  destroy() {
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
    this.output = null
    this.noise = null
  }
}
