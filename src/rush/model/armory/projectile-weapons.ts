import type { RushState, Vec, WeaponSlot } from '../../types'
import type { Hooks } from '../math'

export function fireScatter(
  s: RushState,
  hooks: Hooks,
  slot: WeaponSlot,
  from: Vec,
  angle: number,
) {
  const focus = slot.branch === 'focus',
    awake = slot.level >= 5
  const count = focus ? 3 : slot.branch === 'spread' ? (awake ? 12 : 7) : 5
  const step = focus ? 0.085 : awake ? (Math.PI * 2) / count : 0.17
  for (let i = 0; i < count; i++) {
    const a = angle + (i - (count - 1) / 2) * step
    s.shots.push({
      id: hooks.id(),
      x: from.x + Math.cos(a) * 17,
      y: from.y + Math.sin(a) * 17,
      side: 'player',
      kind: 'pellet',
      weapon: 'scatter',
      vx: Math.cos(a) * (focus ? 1050 : 790),
      vy: Math.sin(a) * (focus ? 1050 : 790),
      radius: focus ? 6 : 4,
      damage: (1.05 + slot.level * 0.23) * (focus ? 1.7 : 1),
      life: focus ? 0.6 : 0.4 + slot.level * 0.015,
      age: 0,
      pierce: focus ? (awake ? 3 : 1) : slot.level >= 4 ? 1 : 0,
      bounce: awake && focus ? 1 : 0,
      hits: [],
      grazed: false,
    })
  }
  slot.cooldown = focus ? 0.72 : 0.58
}

export function throwToxin(s: RushState, hooks: Hooks, slot: WeaponSlot, from: Vec, target: Vec) {
  const count = slot.branch === 'spread' ? (slot.level >= 5 ? 3 : 2) : 1
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 64
    const point = { x: target.x + offset, y: target.y + Math.abs(offset) * 0.35 }
    s.shots.push({
      id: hooks.id(),
      ...from,
      side: 'player',
      kind: 'toxin',
      weapon: 'toxin',
      origin: { ...from },
      target: point,
      duration: 0.48,
      age: 0,
      life: 0.6,
      vx: 0,
      vy: 0,
      radius: 7,
      damage: 0,
      pierce: 0,
      bounce: 0,
      hits: [],
      grazed: false,
    })
  }
  slot.cooldown = slot.branch === 'focus' ? 1.05 : 1.35
}
