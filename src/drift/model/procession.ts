import type { Run } from './run'
import type { Rock } from './world/river'
import { constrainTrain, followPath, moveFloat } from './world/floats'

// 灯队行进：漂流积分、航迹跟随、绳索约束、卡住自救、尾波
export class Procession {
  private path: number[] = [] // 灯头航迹，新点在前
  private stuck = 0
  private near: Rock[] = []
  private flow = { x: 0, y: 0 }

  constructor(readonly run: Run) {}

  step(dt: number) {
    const { run } = this
    const train = run.train
    const h = train[0]
    const near = run.river.rocksNear(h.y - 80, h.y + train.length * run.rope + 80, this.near)
    for (let i = 0; i < train.length; i++) {
      const f = train[i]
      const impact = moveFloat(f, run.river, run.waves, near, dt, 2.1, i === 0 ? 1 : 0.93)
      if (impact > 30 && f.hurt <= 0) run.bite(f)
      if (Math.random() < dt * 9)
        run.waves.splash(f.x, f.y + f.r * 0.6, 0.12 + Math.hypot(f.vx, f.vy) * 0.002, 5)
    }
    this.record()
    followPath(train, this.path, run.rope, dt)
    constrainTrain(train, run.rope)
    this.unstick(dt)
  }

  private record() {
    const { run, path } = this
    const h = run.head
    if (path.length && Math.hypot(h.x - path[0], h.y - path[1]) < 4) return
    path.unshift(h.x, h.y)
    const max = Math.ceil(((run.train.length + 2) * run.rope) / 4) * 2 + 8
    if (path.length > max) path.length = max
  }

  // 灯头被卡住时，水流把它轻轻送回主流
  private unstick(dt: number) {
    const { run } = this
    const h = run.head
    const flow = run.river.flow(h.x, h.y, this.flow)
    if (h.vx * flow.x + h.vy * flow.y < Math.hypot(flow.x, flow.y) * 8) this.stuck += dt
    else this.stuck = 0
    if (this.stuck < 1.2) return
    this.stuck = 0
    const lane = run.river.laneCenter(h.x, h.y)
    h.vx += Math.sign(lane - h.x) * 90
    h.vy += 40
  }
}
