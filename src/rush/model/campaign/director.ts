import type { EnemyKind, Foe, RushState, Vec } from '../../types'
import { visible } from '../math'
import type { Hooks } from '../math'
import { foe, initialEnemies } from '../state'
import { createWave, isBossWave, waveDefinitions } from './waves'

// 有限编队与波间喘息
export class WaveDirector {
  private group = 0
  private announced = false
  private lastGroup = 0
  private pending: { kind: EnemyKind; side: number; index: number; due: number }[] = []

  constructor(
    private s: RushState,
    private hooks: Hooks,
  ) {
    initialEnemies(s, hooks)
    s.wave.spawned = s.enemies.length
  }

  resize() {
    if (this.s.clock > 0.3 || this.s.wave.index !== 1) return
    this.s.enemies = []
    initialEnemies(this.s, this.hooks)
    this.s.wave.spawned = this.s.enemies.length
  }

  // 前侧与斜后方编队，保留安全距离和入场预警
  edge(side = 1, spread = 0): Vec {
    const s = this.s
    const moving = Math.hypot(s.player.vx, s.player.vy) > 20
    const heading = moving ? Math.atan2(s.player.vy, s.player.vx) : s.wave.index * 1.35
    const a = heading + side * (0.9 + spread) + (this.hooks.random() - 0.5) * 0.18
    const x = Math.max(150, Math.min(360, s.viewport.x / 2 - 32))
    const y = Math.max(180, Math.min(330, s.viewport.y / 2 - 40))
    return { x: s.player.x + Math.cos(a) * x, y: s.player.y + Math.sin(a) * y }
  }

  recycle(e: Foe) {
    // 锁定攻击必须完整发射；窄屏奔跑不能反复重置蓄力
    if ((e.kind === 'shooter' && e.telegraph > 0) || (e.kind === 'charger' && e.cooldown < 0))
      return
    if (visible(this.s, e, e.kind === 'boss' ? 140 : 75)) return
    const point = this.edge(e.id % 2 ? 1 : -1, (e.id % 3) * 0.18)
    e.x = point.x
    e.y = point.y
    e.age = 0
    e.telegraph = 0
    e.cooldown = e.kind === 'boss' ? 0 : e.kind === 'shooter' ? 0.18 : 1.1
    e.target = { x: this.s.player.x, y: this.s.player.y }
    e.vx = e.vy = 0
  }

  private add(kind: EnemyKind, side: number, index: number) {
    const s = this.s
    const e = foe(kind, this.edge(side, index * 0.48), s.wave.act, this.hooks)
    if (kind === 'boss') {
      // 普通升级也可稳定削减首 Boss，后两幕保留构筑差异
      e.hp = e.maxHp = [108, 195, 300][s.wave.act - 1]
      s.bossIndex = s.wave.act
      s.nextBoss = Infinity
      this.hooks.emit({ type: 'boss', ...e, amount: s.wave.act })
    }
    s.enemies.push(e)
    s.wave.spawned++
  }

  private start() {
    const s = this.s
    this.announced = true
    this.hooks.emit({ type: 'wave', ...s.player, amount: s.wave.index })
    if (isBossWave(s)) this.add('boss', -1, 0)
    if (s.wave.index === 2) s.notice = '冲刺切过 3 发敌弹，自动反击'
  }

  private clear() {
    const s = this.s
    s.wave.phase = 'breather'
    s.wave.elapsed = 0
    s.wave.duration = 2.5
    s.enemies = []
    s.shots = []
    s.zones = []
    this.pending = []
    s.player.invulnerable = Math.max(s.player.invulnerable, 1.2)
    s.player.dashTime = 0
    s.player.intercepted = 0
    s.player.dashCooldown = 0
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + 1)
    for (const l of s.loot) {
      if (l.kind === 'xp') s.xp += l.value
      if (l.kind === 'heal') s.player.hp = Math.min(s.player.maxHp, s.player.hp + l.value)
      this.hooks.emit({ type: 'pickup', x: l.x, y: l.y, amount: l.value })
    }
    s.loot = []
    this.hooks.emit({ type: 'wave-clear', ...s.player, amount: s.wave.index })
  }

  update(dt: number) {
    const s = this.s
    if (!this.announced) this.start()
    s.wave.elapsed += dt
    if (s.wave.phase === 'breather') {
      if (s.wave.elapsed >= s.wave.duration) {
        s.wave = createWave(s.wave.index + 1)
        this.group = 0
        this.lastGroup = 0
        this.announced = false
      }
      return
    }
    const bossWave = isBossWave(s)
    if (bossWave && s.bossesDefeated >= s.wave.act) {
      if (s.wave.index < 9) this.clear()
      return
    }
    const spent = s.wave.spawned >= s.wave.budget && s.enemies.every((e) => e.hp <= 0)
    if (!bossWave && (s.wave.elapsed >= s.wave.duration || spent)) {
      this.clear()
      return
    }
    const def = waveDefinitions[s.wave.index - 1]
    const due = bossWave
      ? [4.5, 11, 18]
      : s.wave.index === 1
        ? [3.8, 7, 9.5]
        : [0, def.duration * 0.34, def.duration * 0.69]
    const clearedPack =
      !bossWave &&
      this.group > 0 &&
      this.pending.length === 0 &&
      s.enemies.filter((e) => e.hp > 0).length <= 2 &&
      s.wave.elapsed - this.lastGroup >= 2.8
    if (this.group < 3 && (s.wave.elapsed >= due[this.group] || clearedPack)) {
      const members = def.groups[this.group]
      const sides = bossWave ? [this.group % 2 ? -1 : 1] : [1, -1]
      for (const side of sides)
        for (const [i, kind] of members.entries())
          this.pending.push({
            kind,
            side,
            index: i + (this.group % 2),
            due: s.wave.elapsed + i * 0.32 + (side < 0 ? 0.16 : 0),
          })
      this.group++
      this.lastGroup = s.wave.elapsed
    }
    for (const entry of this.pending)
      if (s.wave.elapsed >= entry.due) this.add(entry.kind, entry.side, entry.index)
    this.pending = this.pending.filter((entry) => s.wave.elapsed < entry.due)
    for (const e of s.enemies) if (e.hp > 0) this.recycle(e)
  }
}
