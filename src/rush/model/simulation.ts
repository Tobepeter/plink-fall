import type { RushState, UpgradeId } from '../types'
import { upgrades } from './data'
import { EnemyDirector } from './enemies'
import { distance, level } from './math'
import type { Hooks } from './math'
import { Weapons } from './weapons'
import { advanceLoot } from './combat/loot'
import { advanceShots } from './combat/projectiles'
import { keepInArena } from './arena'
import { frameChoices, frameStats } from './frames'
import { applyUpgrade } from './progression'
import {
  counterFire,
  interceptShots,
  protocolDefinitions,
} from './combat/protocols'

export class Simulation {
  readonly enemies: EnemyDirector
  readonly weapons: Weapons
  private lastChoice = -4

  constructor(
    private s: RushState,
    private hooks: Hooks,
  ) {
    this.enemies = new EnemyDirector(s, hooks)
    this.weapons = new Weapons(s, hooks)
  }

  private movement(dt: number) {
    const s = this.s,
      p = s.player
    p.dashCooldown = Math.max(0, p.dashCooldown - dt)
    p.invulnerable = Math.max(0, p.invulnerable - dt)
    const dash = p.dashTime > 0
    p.dashTime = Math.max(0, p.dashTime - dt)
    const move = dash ? p.lastMove : s.move
    const speed = dash ? 940 : frameStats[p.frame].speed
    p.vx = move.x * speed
    p.vy = move.y * speed
    if (!dash && Math.hypot(move.x, move.y) > 0.05) p.lastMove = { ...move }
    const previous = { x: p.x, y: p.y }
    p.x += p.vx * dt
    p.y += p.vy * dt
    keepInArena(p, p.radius)
    p.walk += Math.hypot(p.x - previous.x, p.y - previous.y)
    if (dash) {
      interceptShots(s, this.hooks, 80)
      if (
        level(s, 'frost') &&
        s.zones.filter((z) => z.kind === 'frost').every((z) => distance(z, p) > 50)
      ) {
        s.zones.push({
          id: this.hooks.id(),
          ...p,
          kind: 'frost',
          radius: 72 + level(s, 'frost') * 12,
          life: 3,
          duration: 3,
          tick: 0,
        })
      }
      if (p.dashTime === 0) counterFire(s, this.hooks)
    }
  }

  private progression() {
    const s = this.s
    if (s.phase !== 'playing' || s.xp < s.nextXp || s.clock < 3.3 || s.clock - this.lastChoice < 7)
      return
    const choices = s.level === 1 ? frameChoices(s) : this.rollChoices()
    if (!choices.length) return
    s.phase = 'choice'
    s.move = { x: 0, y: 0 }
    s.player.vx = s.player.vy = 0
    s.choices = choices
    this.lastChoice = s.clock
    this.hooks.emit({ type: 'level', ...s.player, amount: s.level + 1 })
  }

  private rollChoices(): UpgradeId[] {
    const pool = upgrades.filter((u) => level(this.s, u.id) < u.maxLevel).map((u) => u.id)
    const choices: UpgradeId[] = []
    while (choices.length < 3 && pool.length) {
      const weights = pool.map((id) => {
        const paired = protocolDefinitions.some(
          (p) =>
            p.parts.includes(id) && p.parts.some((part) => part !== id && level(this.s, part) > 0),
        )
        return paired && level(this.s, id) === 0 ? 3 : level(this.s, id) > 0 ? 1.4 : 1
      })
      let roll = this.hooks.random() * weights.reduce((sum, value) => sum + value, 0)
      let index = 0
      while (index < weights.length - 1 && roll >= weights[index]) roll -= weights[index++]
      choices.push(pool.splice(index, 1)[0])
    }
    return choices
  }

  choose(id: UpgradeId) {
    const s = this.s
    if (s.phase !== 'choice' || s.paused || !s.choices.includes(id)) return false
    const def = upgrades.find((item) => item.id === id)
    if (!def || level(s, id) >= def.maxLevel) return false
    s.xp -= s.nextXp
    s.level++
    s.nextXp = Math.round(4 + s.level * s.level * 0.9)
    s.phase = 'playing'
    s.choices = []
    s.move = { x: 0, y: 0 }
    s.player.invulnerable = Math.max(s.player.invulnerable, 0.6)
    s.shots = s.shots.filter((shot) => shot.side === 'player' || distance(s.player, shot) > 180)
    for (const e of s.enemies) {
      if (e.hp <= 0 || distance(s.player, e) >= 110 + e.radius) continue
      const a =
        distance(s.player, e) < 1 ? e.id * 2.4 : Math.atan2(e.y - s.player.y, e.x - s.player.x)
      e.x = s.player.x + Math.cos(a) * (110 + e.radius)
      e.y = s.player.y + Math.sin(a) * (110 + e.radius)
      keepInArena(e, e.radius)
      e.slow = Math.max(e.slow, 0.4)
    }
    applyUpgrade(s, this.hooks, id)
    this.weapons.syncSatellites()
    return true
  }

  update(dt: number) {
    const s = this.s
    if (s.phase !== 'playing' || s.paused) return
    s.clock += dt
    s.abilityCooldown = Math.max(0, s.abilityCooldown - dt)
    s.abilityActive = Math.max(0, s.abilityActive - dt)
    if (s.wave.elapsed > 3) s.notice = ''
    s.overdrive = Math.max(0, s.overdrive - dt)
    s.comboTimer = Math.max(0, s.comboTimer - dt)
    if (s.comboTimer === 0) s.combo = 0
    if (s.charge >= 100 && s.overdrive === 0) {
      s.charge = 0
      s.overdrive = 3
      this.hooks.emit({ type: 'overdrive', ...s.player, power: 1 })
    }
    this.movement(dt)
    this.enemies.update(dt)
    if (s.phase !== 'playing') return
    if (s.wave.phase === 'breather') return
    this.weapons.update(dt)
    advanceShots(s, this.hooks, dt)
    advanceLoot(s, this.hooks, dt)
    for (const item of s.loot) keepInArena(item, 8)
    this.progression()
  }
}
