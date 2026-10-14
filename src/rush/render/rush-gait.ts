import type { Runner } from '../types'

interface FootContact {
  x: number
  y: number
  life: number
  side: number
}

// 距离相位、接地过渡与收步
export class RushGait {
  readonly pose = { frame: 0, face: 1, lean: 0, lift: 0, scaleX: 1, scaleY: 1, weight: 0 }
  contacts: FootContact[] = []
  private distance = 0
  private lastWalk: number | null = null
  private phase = 0
  private lean = 0

  update(player: Runner, dt: number) {
    if (dt <= 0) return this.pose
    const speed = Math.hypot(player.vx, player.vy)
    const moving = speed > 10 && player.dashTime <= 0
    const travel = this.lastWalk === null ? 0 : Math.max(0, player.walk - this.lastWalk)
    this.lastWalk = player.walk
    const before = Math.floor(this.distance / 72)
    if (moving) {
      this.distance += Math.min(travel, 400 * dt)
      this.phase = (this.distance / 144) % 1
    } else if (player.dashTime <= 0) {
      // 停步先落至最近接地姿，不强制瞬切第一帧
      const rest = Math.round(this.phase * 2) / 2
      this.phase += (rest - this.phase) * (1 - Math.exp(-dt * 20))
      this.distance = this.phase * 144
    }
    const weight = moving ? 1 : 0
    this.pose.weight += (weight - this.pose.weight) * (1 - Math.exp(-dt * (moving ? 17 : 20)))
    if (Math.abs(player.vx) > 24) this.pose.face = player.vx < 0 ? -1 : 1
    const targetLean = speed > 10 ? (player.vx / speed) * this.pose.weight * 0.026 : 0
    this.lean += (targetLean - this.lean) * (1 - Math.exp(-dt * 14))
    const flight = (1 - Math.cos(this.phase * Math.PI * 4)) * 0.5
    this.pose.frame =
      player.dashTime > 0 ? 0 : [0, 7, 8, 7][Math.floor((this.phase + 0.125) * 4) % 4]
    this.pose.lean = this.lean
    this.pose.lift = flight * this.pose.weight * 0.65
    this.pose.scaleX = 1 + (1 - flight) * this.pose.weight * 0.004
    this.pose.scaleY = 1 - (1 - flight) * this.pose.weight * 0.004
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
    Object.assign(this.pose, {
      frame: 0,
      face: 1,
      lean: 0,
      lift: 0,
      scaleX: 1,
      scaleY: 1,
      weight: 0,
    })
    this.contacts = []
    this.distance = 0
    this.lastWalk = null
    this.phase = 0
    this.lean = 0
  }
}
