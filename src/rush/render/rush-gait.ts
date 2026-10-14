import type { Runner } from '../types'

interface FootContact {
  x: number
  y: number
  life: number
  side: number
}

export interface RunnerFoot {
  x: number
  lift: number
  planted: boolean
}

// 距离步态、交替接地与停止收步
export class RushGait {
  readonly pose = {
    face: 1,
    weight: 0,
    phase: 0,
    feet: [
      { x: 5, lift: 0, planted: true },
      { x: -5, lift: 0, planted: true },
    ] as [RunnerFoot, RunnerFoot],
  }
  contacts: FootContact[] = []
  private distance = 0
  private lastWalk: number | null = null
  private phase = 0

  update(player: Runner, dt: number) {
    if (dt <= 0 || !Number.isFinite(dt)) return this.pose
    const speed = Math.hypot(player.vx, player.vy)
    const moving = speed > 10 && speed <= 400 && player.dashTime <= 0
    const travel = this.lastWalk === null ? 0 : Math.max(0, player.walk - this.lastWalk)
    this.lastWalk = player.walk
    const before = Math.floor(this.distance / 72)
    if (moving) {
      this.distance += travel
      this.phase = (this.distance / 144) % 1
    } else if (player.dashTime <= 0 && speed <= 400) {
      const rest = Math.round(this.phase * 2) / 2
      this.phase += (rest - this.phase) * (1 - Math.exp(-dt * 20))
      this.distance = this.phase * 144
    }
    this.pose.weight += ((moving ? 1 : 0) - this.pose.weight) * (1 - Math.exp(-dt * 20))
    if (Math.abs(player.vx) > 24) this.pose.face = player.vx < 0 ? -1 : 1
    this.pose.phase = this.phase
    for (let i = 0; i < 2; i++) {
      const foot = this.pose.feet[i]!
      const cycle = (this.phase + i * 0.5) % 1
      const planted = cycle < 0.5
      const swing = (cycle - 0.5) * 2
      const smooth = swing * swing * (3 - 2 * swing)
      const x = planted ? 11 * (1 - 4 * cycle) : -11 + 22 * smooth
      const lift = planted ? 0 : Math.sin(swing * Math.PI) * 8
      const rest = i === 0 ? 5 : -5
      foot.x = rest + (x - rest) * this.pose.weight
      foot.lift = lift * this.pose.weight
      foot.planted = planted || this.pose.weight < 0.05
      if (player.dashTime > 0 || speed > 400) {
        foot.x = i === 0 ? 9 : -9
        foot.lift = i === 0 ? 6 : 3
        foot.planted = false
      }
    }
    for (const contact of this.contacts) contact.life -= dt
    this.contacts = this.contacts.filter((contact) => contact.life > 0)
    if (moving && Math.floor(this.distance / 72) > before) {
      const side = Math.floor(this.distance / 72) % 2 ? -1 : 1
      const dx = player.vx / speed,
        dy = player.vy / speed
      this.contacts.push({
        x: player.x + dx * 5 - dy * 4 * side,
        y: player.y + 10 + dy * 5 + dx * 4 * side,
        life: 0.18,
        side,
      })
    }
    this.contacts = this.contacts.slice(-4)
    return this.pose
  }

  reset() {
    this.pose.face = 1
    this.pose.weight = 0
    this.pose.phase = 0
    Object.assign(this.pose.feet[0], { x: 5, lift: 0, planted: true })
    Object.assign(this.pose.feet[1], { x: -5, lift: 0, planted: true })
    this.contacts = []
    this.distance = 0
    this.lastWalk = null
    this.phase = 0
  }
}
