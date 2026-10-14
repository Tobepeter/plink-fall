import type { Foe, ProtocolId, RushState, UpgradeId, Vec } from '../../types'
import { distance, level, nearest, toward } from '../math'
import type { Hooks } from '../math'
import { blast, damageFoe } from './damage'

export const protocolDefinitions: {
  id: ProtocolId
  name: string
  parts: [UpgradeId, UpgradeId]
  hint: string
  color: string
}[] = [
  {
    id: 'circuit',
    name: '电磁回路',
    parts: ['chain', 'orbit'],
    hint: '环刃接触敌人，将电弧送入敌群',
    color: '#99aeff',
  },
  {
    id: 'frostburst',
    name: '霜爆协议',
    parts: ['frost', 'rocket'],
    hint: '火箭命中冻结目标，引发霜爆并留下冰场',
    color: '#69e6de',
  },
  {
    id: 'returnfire',
    name: '折返弹幕',
    parts: ['ricochet', 'split'],
    hint: '冲刺召回在场散射弹，折返弹穿过敌人',
    color: '#ffca72',
  },
]

export const activeProtocols = (s: RushState): ProtocolId[] =>
  protocolDefinitions.filter((p) => p.parts.every((id) => level(s, id) > 0)).map((p) => p.id)

export const hasProtocol = (s: RushState, id: ProtocolId) => activeProtocols(s).includes(id)

// 电弧目标与伤害都来自当前敌人
export function linkArc(
  s: RushState,
  hooks: Hooks,
  source: Vec,
  first: Foe,
  protocol?: ProtocolId,
) {
  const linked = [first.id]
  const targets: Vec[] = [
    { x: source.x, y: source.y },
    { x: first.x, y: first.y },
  ]
  let point: Vec = first
  for (let i = 0; i < 2 + level(s, 'chain'); i++) {
    const next = nearest(s, point, linked, protocol ? 215 : 175)
    if (!next) break
    linked.push(next.id)
    targets.push({ x: next.x, y: next.y })
    damageFoe(s, hooks, next, 0.9 + level(s, 'chain') * 0.35 + (protocol ? 0.4 : 0))
    point = next
  }
  if (targets.length > 2) hooks.emit({ type: 'chain', x: source.x, y: source.y, targets, protocol })
  if (protocol) hooks.emit({ type: 'protocol', ...source, targets, protocol, amount: 0 })
}

export function frostBurst(s: RushState, hooks: Hooks, target: Foe) {
  const frozen =
    target.slow > 0 &&
    s.zones.some(
      (zone) =>
        zone.kind === 'frost' &&
        zone.life > 0 &&
        distance(zone, target) < zone.radius + target.radius,
    )
  if (!hasProtocol(s, 'frostburst') || !frozen) return false
  const radius = 125 + level(s, 'frost') * 12
  for (const e of s.enemies) if (e.hp > 0 && distance(target, e) < radius + e.radius) e.slow = 1.1
  blast(s, hooks, target, radius, 4 + level(s, 'rocket') * 1.4)
  s.zones.push({
    id: hooks.id(),
    x: target.x,
    y: target.y,
    kind: 'frost',
    radius,
    life: 2,
    duration: 2,
    tick: 0,
  })
  hooks.emit({
    type: 'protocol',
    x: target.x,
    y: target.y,
    protocol: 'frostburst',
    amount: 0,
    power: radius / 70,
  })
  return true
}

export function recallShots(s: RushState, hooks: Hooks) {
  if (!hasProtocol(s, 'returnfire')) return
  const shots = s.shots.filter(
    (shot) => shot.side === 'player' && shot.kind === 'shot' && shot.scatter && shot.life > 0,
  )
  for (const shot of shots) {
    shot.kind = 'return'
    shot.hits = []
    shot.pierce = 999
    shot.bounce = 0
    shot.life = 1.6
    shot.damage *= 1.25
  }
  if (shots.length)
    hooks.emit({
      type: 'protocol',
      ...s.player,
      protocol: 'returnfire',
      amount: 0,
      targets: shots.map((shot) => ({ x: shot.x, y: shot.y })),
    })
}

export function interceptShots(s: RushState, hooks: Hooks, radius: number) {
  const removed = s.shots.filter(
    (shot) => shot.life > 0 && shot.side === 'enemy' && distance(s.player, shot) <= radius,
  )
  if (!removed.length) return
  for (const shot of removed) shot.life = 0
  s.player.intercepted += removed.length
  s.charge = Math.min(100, s.charge + removed.length * 3)
  s.shots = s.shots.filter((shot) => shot.life > 0)
  hooks.emit({
    type: 'intercept',
    ...s.player,
    amount: removed.length,
    targets: removed.map((shot) => ({ x: shot.x, y: shot.y })),
  })
}

export function counterFire(s: RushState, hooks: Hooks) {
  const intercepted = s.player.intercepted
  s.player.intercepted = 0
  if (intercepted < 3) return
  const count = Math.min(6, 3 + Math.floor((intercepted - 3) / 2))
  const target = nearest(s, s.player)
  const a = target ? toward(s.player, target) : Math.atan2(s.player.lastMove.y, s.player.lastMove.x)
  for (let i = 0; i < count; i++) {
    const direction = a + (i - (count - 1) / 2) * 0.16
    s.shots.push({
      id: hooks.id(),
      ...s.player,
      kind: 'counter',
      side: 'player',
      vx: Math.cos(direction) * 1150,
      vy: Math.sin(direction) * 1150,
      radius: 6,
      damage: 2.4,
      life: 1.5,
      age: 0,
      pierce: 2,
      bounce: 0,
      hits: [],
      grazed: false,
    })
  }
  hooks.emit({
    type: 'counter',
    ...s.player,
    amount: count,
    power: intercepted,
    targets: [{ x: s.player.x + Math.cos(a) * 180, y: s.player.y + Math.sin(a) * 180 }],
  })
}
