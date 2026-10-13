/**
 * Fixed-timestep simulation with an accumulator, decoupled from the render rate.
 * update(dt) runs at a fixed hz; render(alpha, frameDt) runs once per rAF.
 */
export class Loop {
  private acc = 0
  private last = 0
  private raf = 0
  running = false

  constructor(
    private hz: number,
    private update: (dt: number) => void,
    private render: (frameDt: number, alpha: number) => void,
    private maxSteps = 10,
  ) {}

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.acc = 0
    const step = (now: number) => {
      if (!this.running) return
      const frameDt = Math.min(0.1, (now - this.last) / 1000)
      this.last = now
      this.acc += frameDt
      const dt = 1 / this.hz
      let n = 0
      while (this.acc >= dt && n < this.maxSteps) {
        this.update(dt)
        this.acc -= dt
        n++
      }
      if (n === this.maxSteps) this.acc = 0 // drop backlog (spiral-of-death guard)
      this.render(frameDt, this.acc * this.hz)
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }
}
