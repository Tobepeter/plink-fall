import type { RushState, Vec } from '../types'

interface Point extends Vec {
  angle?: number
  walk?: number
  age?: number
}

interface SpatialFrame {
  player: Point
  enemies: Map<number, Point>
  shots: Map<number, Point>
  loot: Map<number, Point>
  zones: Map<number, Point>
  satellites: Map<number, Point>
}

// 固定物理步之间的显示坐标，不回写战斗状态
export class RushPresentation {
  state: RushState
  private previous: SpatialFrame
  private held: SpatialFrame | null = null
  private resumed: SpatialFrame | null = null
  private resumeTime = 0
  private runId: number
  private mode: string
  private clock: number

  constructor(state: RushState) {
    this.state = state
    this.previous = this.capture(state)
    this.runId = state.runId
    this.mode = this.modeOf(state)
    this.clock = state.clock
  }

  // 重开、外部 fixture 和布局重新建立基准
  reset(state: RushState) {
    this.previous = this.capture(state)
    this.held = this.resumed = null
    this.resumeTime = 0
    this.runId = state.runId
    this.mode = this.modeOf(state)
    this.clock = state.clock
    this.state = this.project(state, this.previous, 0)
  }

  sync(state: RushState) {
    const mode = this.modeOf(state)
    if (state.runId !== this.runId || Math.abs(state.clock - this.clock) > 1e-7) {
      this.reset(state)
      return true
    }
    if (mode === this.mode) return false
    this.mode = mode
    if (this.active(state)) this.thaw()
    else this.freeze(state)
    return true
  }

  beforeStep(state: RushState) {
    this.previous = this.capture(state)
  }

  afterStep(state: RushState) {
    this.clock = state.clock
    this.sync(state)
  }

  // 暂停与命中短停保留最后已经画出的空间位置
  freeze(state: RushState) {
    this.held ??= this.capture(this.state)
    this.resumed = null
    this.state = this.project(state, this.held, 0)
  }

  render(state: RushState, alpha: number, dt: number, frozen = false) {
    this.sync(state)
    if (frozen || !this.active(state)) {
      this.freeze(state)
      return this.state
    }
    this.thaw()
    const amount = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 0))
    let view = this.project(state, this.previous, amount)
    if (this.resumed) {
      this.resumeTime += Math.max(0, Number.isFinite(dt) ? dt : 0)
      // 只在真实旧画面与当前显示点之间过渡，不预测未来坐标
      view = this.project(view, this.resumed, Math.min(1, this.resumeTime * 60))
      if (this.resumeTime >= 1 / 60) this.resumed = null
    }
    this.state = view
    return view
  }

  private thaw() {
    if (!this.held) return
    this.previous = this.held
    this.resumed = this.held
    this.held = null
    this.resumeTime = 0
  }

  private active(state: RushState) {
    return state.phase === 'playing' && !state.paused
  }

  private modeOf(state: RushState) {
    return `${state.phase}:${state.paused}`
  }

  private capture(state: RushState): SpatialFrame {
    const p = state.player
    return {
      player: { x: p.x, y: p.y, angle: p.angle, walk: p.walk },
      enemies: this.points(state.enemies),
      shots: this.points(state.shots),
      loot: this.points(state.loot),
      zones: this.points(state.zones),
      satellites: this.points(state.satellites),
    }
  }

  private points(rows: (Vec & { id: number; angle?: number; age?: number })[]) {
    return new Map(rows.map((p) => [p.id, { x: p.x, y: p.y, angle: p.angle, age: p.age }]))
  }

  private project(state: RushState, previous: SpatialFrame, alpha: number): RushState {
    return {
      ...state,
      player: this.point(state.player, previous.player, alpha),
      enemies: this.rows(state.enemies, previous.enemies, alpha),
      shots: this.rows(state.shots, previous.shots, alpha),
      loot: this.rows(state.loot, previous.loot, alpha),
      zones: this.rows(state.zones, previous.zones, alpha),
      satellites: this.rows(state.satellites, previous.satellites, alpha),
    }
  }

  private rows<T extends Vec & { id: number }>(
    rows: T[],
    previous: Map<number, Point>,
    alpha: number,
  ) {
    return rows.map((p) => this.point(p, previous.get(p.id), alpha))
  }

  private point<T extends Point>(current: T, previous: Point | undefined, alpha: number): T {
    if (!previous) return { ...current }
    // 同 id 离屏回收会重置 age，不能把瞬移画成穿场运动
    if (current.age !== undefined && previous.age !== undefined && current.age < previous.age)
      return { ...current }
    const point = {
      ...current,
      x: previous.x + (current.x - previous.x) * alpha,
      y: previous.y + (current.y - previous.y) * alpha,
    }
    if (current.walk !== undefined && previous.walk !== undefined)
      point.walk = previous.walk + (current.walk - previous.walk) * alpha
    if (current.angle !== undefined && previous.angle !== undefined) {
      const difference = Math.atan2(
        Math.sin(current.angle - previous.angle),
        Math.cos(current.angle - previous.angle),
      )
      point.angle = previous.angle + difference * alpha
    }
    return point
  }
}
