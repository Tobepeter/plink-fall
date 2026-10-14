import type { Foe, RushState, Vec } from '../../types'
import { distance, level, toward } from '../math'
import type { Hooks } from '../math'
import { foe } from '../state'
import { metaStats } from '../meta/progression'
import { frameCharge } from '../frames'
import { difficultyStats } from '../campaign/difficulty'
import { keepInArena } from '../arena'

export function hurtPlayer(s: RushState, hooks: Hooks, source: Vec) {
  const p = s.player
  if (p.invulnerable > 0 || p.dashTime > 0 || s.phase !== 'playing') return
  p.hp = Math.max(0, p.hp - 1)
  p.invulnerable = 1.05
  const a = toward(source, p)
  p.x += Math.cos(a) * 22
  p.y += Math.sin(a) * 22
  keepInArena(p, p.radius)
  s.combo = 0
  s.comboTimer = 0
  hooks.emit({ type: 'hurt', ...p, amount: p.hp })
  if (level(s, 'vital')) blast(s, hooks, p, 120 + level(s, 'vital') * 12, 4)
  if (p.hp <= 0) endRun(s, hooks, false)
}

export function damageFoe(s: RushState, hooks: Hooks, e: Foe, amount: number) {
  if (e.hp <= 0 || s.phase === 'menu' || s.phase === 'dead' || s.phase === 'won') return
  amount *= metaStats(s.runMeta).damage
  e.hp = Math.max(0, e.hp - amount)
  e.hurt = 0.12
  if (e.kind !== 'boss') {
    const a = toward(s.player, e)
    const force = e.kind === 'brute' ? 1.5 : 3.5
    e.x += Math.cos(a) * force
    e.y += Math.sin(a) * force
    keepInArena(e, e.radius)
  }
  hooks.emit({ type: 'hit', ...e, amount, kind: e.kind })
  if (e.hp > 0) return
  s.kills++
  s.combo++
  s.comboTimer = 1.6
  s.charge = Math.min(100, s.charge + frameCharge(s, 7 + Math.min(s.combo, 10) * 0.5))
  s.scrap += Number(s.kills % 3 === 0) + (e.kind === 'boss' ? 6 : e.kind === 'brute' ? 1 : 0)
  hooks.emit({ type: 'kill', ...e, kind: e.kind, power: e.radius / 20 })
  const xp = e.kind === 'boss' ? 12 : e.kind === 'brute' ? 4 : e.kind === 'splitter' ? 2 : 1
  s.loot.push({
    id: hooks.id(),
    kind: 'xp',
    x: e.x,
    y: e.y,
    vx: (hooks.random() - 0.5) * 130,
    vy: (hooks.random() - 0.5) * 130,
    value: xp,
    age: 0,
  })
  if (s.kills % 19 === 0 || e.kind === 'boss')
    s.loot.push({
      id: hooks.id(),
      kind: 'heal',
      x: e.x + 13,
      y: e.y,
      vx: 0,
      vy: 0,
      value: 1,
      age: 0,
    })
  if (e.kind === 'splitter' && s.enemies.length < 80) {
    for (let i = 0; i < 2; i++) {
      const child = foe('chaser', { x: e.x + (i ? 22 : -22), y: e.y }, e.tier, hooks, s.difficulty)
      child.hp = child.maxHp = 2 * difficultyStats(s.difficulty).hpMultiplier
      child.radius = 12
      s.enemies.push(child)
    }
  }
  if (e.kind === 'boss') {
    s.bossesDefeated++
    s.record.bossKills++
    if (!s.record.unlocked.includes('warden')) s.record.unlocked.push('warden')
    s.shots = s.shots.filter((shot) => shot.side === 'player')
    s.player.invulnerable = Math.max(s.player.invulnerable, 1.2)
    hooks.emit({ type: 'boss-down', ...e, amount: s.bossesDefeated })
    if (s.bossesDefeated === 3) endRun(s, hooks, true)
  }
}

export function endRun(s: RushState, hooks: Hooks, won: boolean) {
  if (s.phase !== 'playing' && s.phase !== 'choice') return
  s.phase = won ? 'won' : 'dead'
  s.move = { x: 0, y: 0 }
  s.record.bestTime = Math.max(s.record.bestTime, s.clock)
  s.record.bestKills = Math.max(s.record.bestKills, s.kills)
  if (won) {
    s.record.wins++
    if (!s.record.unlocked.includes('spark')) s.record.unlocked.push('spark')
  }
  hooks.emit({ type: 'run-end', ...s.player, amount: won ? 1 : 0 })
}

export function blast(
  s: RushState,
  hooks: Hooks,
  point: Vec,
  radius: number,
  damage: number,
  kind: 'blast' | 'pulse' = 'blast',
) {
  s.zones.push({ id: hooks.id(), ...point, kind, radius, duration: 0.35, life: 0.35, tick: 0 })
  for (const e of [...s.enemies]) {
    const d = distance(point, e)
    if (d > radius + e.radius || e.hp <= 0) continue
    damageFoe(s, hooks, e, damage)
    const a = toward(point, e)
    const force = Math.max(0, Math.min(48, radius - d + 12))
    e.x += Math.cos(a) * force
    e.y += Math.sin(a) * force
    keepInArena(e, e.radius)
  }
  for (const shot of s.shots) {
    if (shot.side === 'enemy' && distance(point, shot) <= radius) shot.life = 0
  }
  hooks.emit({ type: 'explode', ...point, power: radius / 70 })
}
