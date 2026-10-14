import type { Foe, RushState, Shot, Vec } from '../../types'
import { clamp, distance, level, nearest, toward } from '../math'
import type { Hooks } from '../math'
import { blast, damageFoe, hurtPlayer } from './damage'
import { frostBurst, linkArc } from './protocols'
import { arenaBounds, keepInArena } from '../arena'

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
    linkArc(s, hooks, e, e)
  }
  if (shot.kind === 'rocket') {
    if (!frostBurst(s, hooks, e))
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
    if (shot.kind === 'return') {
      const a = toward(shot, s.player)
      shot.vx = Math.cos(a) * 1150
      shot.vy = Math.sin(a) * 1150
    }
    const prev = { x: shot.x, y: shot.y }
    shot.x += shot.vx * dt
    shot.y += shot.vy * dt
    const bounds = arenaBounds(shot.radius)
    const hitX = shot.x < bounds.left || shot.x > bounds.right
    const hitY = shot.y < bounds.top || shot.y > bounds.bottom
    if (hitX || hitY) {
      if (shot.side === 'player' && shot.kind === 'shot' && shot.bounce > 0) {
        shot.bounce--
        if (hitX) shot.vx *= -1
        if (hitY) shot.vy *= -1
        // 夹坐标但保留反弹后的速度
        const velocity = { x: shot.vx, y: shot.vy }
        keepInArena(shot, shot.radius)
        shot.vx = velocity.x
        shot.vy = velocity.y
      } else {
        shot.life = 0
        continue
      }
    }
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
    if (
      shot.kind === 'return' &&
      segmentDistance(s.player, prev, shot) < s.player.radius + shot.radius
    )
      shot.life = 0
  }
  s.shots = s.shots.filter((shot) => shot.life > 0 && distance(s.player, shot) < 1900).slice(-500)
  s.enemies = s.enemies.filter((e) => e.hp > 0)
}
