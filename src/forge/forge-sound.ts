import type { ForgeEvent, ForgeState } from './model/types'

// 轻量工坊音色
export class ForgeSound {
  private context: AudioContext | null = null
  private output: GainNode | null = null
  private lastNote = 0
  private noteIndex = 0

  constructor(private getState: () => ForgeState) {}

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
        this.output.gain.value = 0.14
        this.output.connect(this.context.destination)
      }
      this.resume()
    } catch {
      // 静音环境仍可游玩
    }
  }

  event(event: ForgeEvent) {
    if (this.getState().muted || this.context?.state !== 'running') return
    const now = this.context.currentTime
    if (event.type === 'produce') {
      if (now - this.lastNote < 0.2) return
      this.lastNote = now
      const notes = [523, 659, 784, 880, 1047]
      this.tone(notes[this.noteIndex++ % notes.length], now, 0.11, 0.12)
      return
    }
    const notes =
      event.type === 'delivery' || event.type === 'jump'
        ? [392, 523, 659, 784]
        : event.type === 'boost'
          ? [262, 392, 523]
          : [659, 880]
    notes.forEach((frequency, index) => this.tone(frequency, now + index * 0.07, 0.24, 0.25))
  }

  suspend() {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {})
  }

  resume() {
    if (!this.getState().muted && this.context?.state === 'suspended') {
      void this.context.resume().catch(() => {})
    }
  }

  destroy() {
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
    this.output = null
  }

  private tone(frequency: number, time: number, duration: number, volume: number) {
    if (!this.context || !this.output) return
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(volume, time + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration)
    oscillator.connect(envelope).connect(this.output)
    oscillator.onended = () => {
      oscillator.disconnect()
      envelope.disconnect()
    }
    oscillator.start(time)
    oscillator.stop(time + duration + 0.02)
  }
}
