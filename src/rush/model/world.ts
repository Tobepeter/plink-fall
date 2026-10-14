import type { Foe, RushState, Shot, Vec } from '../types'
import { clamp, distance, level, nearest, toward } from './math'
import type { Hooks } from './math'
import { foe } from './state'

export function hurtPlayer(s: RushState, hooks: Hooks, source: Vec) {
  const p = s.player
  if (p.invulnerable > 0 || p.dashTime > 0 || s.phase !== 'playing') return
  p.hp = Math.max(0, p.hp - 1)
  p.invulnerable = 1.05
  const a = toward(source, p)
  p.x += Math.cos(a) * 22
  p.y += Math.sin(a) * 22
  s.combo = 0
  s.comboTimer = 0
  hooks.emit({ type: 'hurt', ...p, amount: p.hp })
  if (level(s, 'vital')) blast(s, hooks, p, 120 + level(s, 'vital') * 12, 4)
  if (p.hp <= 0) endRun(s, hooks, false)
}

export function damageFoe(s: RushState, hooks: Hooks, e: Foe, amount: number) {
  if (e.hp <= 0) return
  e.hp = Math.max(0, e.hp - amount)
  e.hurt = 0.12
  hooks.emit({ type: 'hit', ...e, amount, kind: e.kind })
  if (e.hp > 0) return
  s.kills++
  s.combo++
  s.comboTimer = 1.6
  s.charge = Math.min(100, s.charge + 7 + Math.min(s.combo, 10) * 0.5)
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
      const child = foe('chaser', { x: e.x + (i ? 22 : -22), y: e.y }, e.tier, hooks)
      child.hp = child.maxHp = 2
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
  if (s.phase === 'dead' || s.phase === 'won') return
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
    e.x += Math.cos(a) * Math.min(48, radius - d + 12)
    e.y += Math.sin(a) * Math.min(48, radius - d + 12)
  }
  for (const shot of s.shots) {
    if (shot.side === 'enemy' && distance(point, shot) <= radius) shot.life = 0
  }
  hooks.emit({ type: 'explode', ...point, power: radius / 70 })
}

function segmentDistance(point: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x,
    dy = b.y - a.y
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1)
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t)
}

function strike(s: RushState, hooks: Hooks, shot: Shot, e: Foe) {
  shot.hits.push(e.id)
  damageFoe(s, hooks, e, shot.damage)
  if (level(s, 'chain') && shot.kind !== 'spark') {
    const linked = [...shot.hits]
    let point: Vec = e
    const targets: Vec[] = [{ x: e.x, y: e.y }]
    for (let i = 0; i < 2 + level(s, 'chain'); i++) {
      const next = nearest(s, point, linked, 175)
      if (!next) break
      linked.push(next.id)
      targets.push({ x: next.x, y: next.y })
      damageFoe(s, hooks, next, 0.9 + level(s, 'chain') * 0.35)
      point = next
    }
    if (targets.length > 1) hooks.emit({ type: 'chain', x: e.x, y: e.y, targets })
  }
  if (shot.kind === 'rocket') {
    blast(s, hooks, e, 94 + level(s, 'rocket') * 13, 3 + level(s, 'rocket'))
    shot.life = 0
    return
  }
  if (shot.bounce > 0) {
    const target = nearest(s, e, shot.hits, 450)
    if (target) {
      shot.bounce--
      const a = toward(e, target)
      shot.x = e.x
      shot.y = e.y
      shot.vx = Math.cos(a) * 1010
      shot.vy = Math.sin(a) * 1010
      return
    }
  }
  if (shot.pierce > 0) shot.pierce--
  else shot.life = 0
}

export function advanceShots(s: RushState, hooks: Hooks, dt: number) {
  for (const shot of s.shots) {
    shot.age += dt
    shot.life -= dt
    if (shot.life <= 0) continue
    if (shot.kind === 'rocket') {
      const target = nearest(s, shot, shot.hits)
      if (target) {
        const a = toward(shot, target)
        shot.vx = Math.cos(a) * 600
        shot.vy = Math.sin(a) * 600
      }
    }
    const prev = { x: shot.x, y: shot.y }
    shot.x += shot.vx * dt
    shot.y += shot.vy * dt
    if (shot.side === 'enemy') {
      const d = segmentDistance(s.player, prev, shot)
      if (d < s.player.radius + shot.radius) {
        shot.life = 0
        hurtPlayer(s, hooks, shot)
      } else if (!shot.grazed && d < s.player.radius + shot.radius + 16) {
        shot.grazed = true
        s.charge = Math.min(100, s.charge + 3)
      }
      continue
    }
    for (const e of [...s.enemies]) {
      if (e.hp <= 0 || shot.hits.includes(e.id)) continue
      if (segmentDistance(e, prev, shot) < e.radius + shot.radius) {
        strike(s, hooks, shot, e)
        if (shot.life <= 0 || shot.bounce > 0) break
      }
    }
  }
  s.shots = s.shots.filter((shot) => shot.life > 0 && distance(s.player, shot) < 1900).slice(-500)
  s.enemies = s.enemies.filter((e) => e.hp > 0)
}

export function advanceLoot(s: RushState, hooks: Hooks, dt: number) {
  const attraction = 185 + level(s, 'magnet') * 115
  for (const l of s.loot) {
    l.age += dt
    const d = distance(l, s.player)
    if (d < attraction || l.age > 1.1) {
      const a = toward(l, s.player)
      const speed = 520 + Math.min(650, l.age * 180)
      l.vx = Math.cos(a) * speed
      l.vy = Math.sin(a) * speed
    } else {
      l.vx *= Math.exp(-dt * 5)
      l.vy *= Math.exp(-dt * 5)
    }
    const travel = Math.hypot(l.vx, l.vy) * dt
    if (d < Math.max(19, travel)) {
      if (l.kind === 'xp') s.xp += l.value
      if (l.kind === 'heal') s.player.hp = Math.min(s.player.maxHp, s.player.hp + l.value)
      l.age = -1
      hooks.emit({ type: 'pickup', x: l.x, y: l.y, amount: l.value })
    } else {
      l.x += l.vx * dt
      l.y += l.vy * dt
    }
  }
  s.loot = s.loot.filter((l) => l.age >= 0).slice(-150)
}
