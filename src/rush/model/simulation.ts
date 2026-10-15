import type { RushState } from '../types'
import { EnemyDirector } from './enemies'
import { distance, level } from './math'
import type { Hooks } from './math'
import { Weapons } from './weapons'
import { advanceLoot } from './combat/loot'
import { advanceShots } from './combat/projectiles'
import { keepInArena } from './arena'
import { frameStats } from './frames'
import { counterFire, interceptShots } from './combat/protocols'
import {
  applyWeaponOffer,
  makeWeaponOffers,
  recommendWeaponOffer,
  validWeaponOffer,
} from './armory/offers'

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

  private progression(dt: number) {
    const s = this.s
    if (s.choices.length > 0) {
      s.choiceRemaining = Math.max(0, s.choiceRemaining - dt)
      if (s.choiceRemaining < 0.000001) {
        const safe = s.weaponOffers.find(
          (offer) => offer.id === s.choiceRecommended && offer.action !== 'replace',
        )
        if (!safe || !this.choose(safe.id)) {
          s.choices = []
          s.weaponOffers = []
          s.choiceRecommended = null
          s.choiceRemaining = 0
        }
      }
      return
    }
    if (
      s.phase !== 'playing' ||
      s.xp < s.nextXp ||
      s.clock < 3.3 ||
      s.clock - this.lastChoice < 1.2
    )
      return
    s.weaponOffers = makeWeaponOffers(s, this.hooks)
    if (!s.weaponOffers.length) return
    s.choices = s.weaponOffers.map((offer) => offer.id)
    s.choiceRemaining = 8
    s.choiceRecommended = recommendWeaponOffer(s, s.weaponOffers)
    this.lastChoice = s.clock
    this.hooks.emit({ type: 'level', ...s.player, amount: s.level + 1 })
  }

  choose(id: string) {
    const s = this.s
    if (s.phase !== 'playing' || s.paused || !s.choices.includes(id) || s.xp < s.nextXp)
      return false
    const offer = s.weaponOffers.find((item) => item.id === id)
    if (!offer || !validWeaponOffer(s, offer)) return false
    if (!applyWeaponOffer(s, this.hooks, offer)) return false
    s.xp -= s.nextXp
    s.level++
    s.nextXp = Math.round(4 + s.level * 1.7)
    s.choices = []
    s.choiceRemaining = 0
    s.choiceRecommended = null
    s.weaponOffers = []
    this.lastChoice = s.clock
    s.player.invulnerable = Math.max(s.player.invulnerable, 0.25)
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
    this.weapons.update(dt)
    if (s.phase !== 'playing') return
    advanceShots(s, this.hooks, dt)
    if (s.phase !== 'playing') return
    advanceLoot(s, this.hooks, dt)
    for (const item of s.loot) keepInArena(item, 8)
    this.progression(dt)
  }
}
