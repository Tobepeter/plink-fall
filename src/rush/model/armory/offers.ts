import type { RushState, WeaponBranch, WeaponId, WeaponOffer, WeaponSlot } from '../../types'
import type { Hooks } from '../math'
import { applyUpgrade } from '../progression'
import {
  activeWeaponReactions,
  weaponCapacity,
  weaponDefinitions,
  weaponName,
  weaponReactions,
} from './data'

const branches: WeaponBranch[] = ['focus', 'spread']
const copySlot = (id: WeaponId, level = 1, branch: WeaponBranch | null = null): WeaponSlot => ({
  id,
  level,
  branch,
  cooldown: 0.05,
  charge: 0,
})

export function makeWeaponOffers(s: RushState, hooks: Hooks): WeaponOffer[] {
  const make = (entry: Omit<WeaponOffer, 'id'>): WeaponOffer => ({
    ...entry,
    id: `armory-${s.runId}-${s.level}-${entry.action}-${entry.slot}-${entry.weapon ?? entry.utility}-${entry.branch ?? 'base'}`,
  })
  const growth = s.weapons.flatMap((slot, index) => {
    if (slot.level >= 5) return []
    const def = weaponDefinitions.find((item) => item.id === slot.id)!
    const level = slot.level + 1
    return (level === 3 ? branches : [slot.branch]).map((branch) =>
      make({
        action: level === 3 ? 'branch' : 'upgrade',
        weapon: slot.id,
        slot: index,
        level,
        branch,
        name: weaponName({ id: slot.id, level, branch }),
        hint:
          level === 5
            ? '觉醒 · 攻击形态突破'
            : branch
              ? def.branches[branch].hint
              : '强化火力与攻击覆盖',
        color: def.color,
      }),
    )
  })
  const missing = weaponDefinitions.filter((def) => !s.weapons.some((slot) => slot.id === def.id))
  const linked = (id: WeaponId) =>
    weaponReactions.some(
      (reaction) =>
        reaction.parts.includes(id) &&
        reaction.parts.some((part) => s.weapons.some((slot) => slot.id === part)),
    )
  const shuffled = missing
    .map((def) => ({ def, roll: hooks.random() + (s.level > 2 && linked(def.id) ? 1 : 0) }))
    .sort((a, b) => b.roll - a.roll)
    .map((entry) => entry.def)
  const empty = s.weapons.length < weaponCapacity(s)
  const target = s.weapons.reduce(
    (best, slot, index) => (slot.level <= s.weapons[best].level ? index : best),
    0,
  )
  const newWeapons = shuffled.map((def) => {
    const old = s.weapons[target]
    const level = empty ? 1 : old.level
    const branch = level >= 3 ? (hooks.random() < 0.5 ? 'focus' : 'spread') : null
    return make({
      action: empty ? 'equip' : 'replace',
      weapon: def.id,
      slot: empty ? s.weapons.length : target,
      level,
      branch,
      name: weaponName({ id: def.id, level, branch }),
      hint: empty ? def.hint : `替换${weaponName(old)} · 保留 Lv${level}`,
      color: def.color,
      ...(!empty ? { replaces: old.id } : {}),
    })
  })
  const utility = (['haste', 'vital', 'magnet'] as const)
    .map((id) =>
      make({
        action: 'utility',
        weapon: null,
        slot: -1,
        utility: id,
        level: Math.min(5, (s.upgrades[id] ?? 0) + 1),
        branch: null,
        name:
          id === 'haste'
            ? s.upgrades.haste === 5
              ? '超载补给'
              : '极速扳机'
            : id === 'vital'
              ? '修复装甲'
              : '引力回收',
        hint:
          id === 'haste'
            ? '加快武器与冲刺节奏'
            : id === 'vital'
              ? '修复生命并强化装甲'
              : '经验更快飞入机体',
        color: '#8ce6c2',
      }),
    )
    .filter((offer) => validUtility(s, offer))
  const result: WeaponOffer[] = []
  const add = (offer?: WeaponOffer) => {
    if (offer && !result.some((item) => item.id === offer.id) && result.length < 3)
      result.push(offer)
  }
  const branching = growth.find((offer) => offer.action === 'branch')
  if (branching) {
    for (const offer of growth.filter(
      (item) => item.slot === branching.slot && item.action === 'branch',
    ))
      add(offer)
    add(empty ? newWeapons[0] : (newWeapons[0] ?? utility[0]))
    return result
  }
  if (empty) add(newWeapons[0])
  // 主槽优先成型；探索位来自全武器池，永远不按机体过滤
  add(growth.find((offer) => offer.slot === 0) ?? growth[0] ?? utility[0])
  add(empty ? newWeapons[1] : newWeapons[0])
  for (const offer of [...growth, ...utility, ...newWeapons]) add(offer)
  return result
}

export function recommendWeaponOffer(s: RushState, offers: WeaponOffer[]) {
  const safe = offers.filter((offer) => offer.action !== 'replace' && validWeaponOffer(s, offer))
  return (
    (
      safe.find((offer) => offer.action === 'branch' && offer.slot === 0) ??
      safe.find((offer) => offer.action === 'equip') ??
      safe.find((offer) => offer.slot === 0) ??
      safe[0]
    )?.id ?? null
  )
}

function validUtility(s: RushState, offer: WeaponOffer) {
  const id = offer.utility
  return (
    id === 'haste' ||
    (id === 'vital' && ((s.upgrades.vital ?? 0) < 5 || s.player.hp < s.player.maxHp)) ||
    (id === 'magnet' && (s.upgrades.magnet ?? 0) < 5)
  )
}

export function validWeaponOffer(s: RushState, offer: WeaponOffer) {
  if (offer.action === 'utility') return validUtility(s, offer)
  if (!offer.weapon || !weaponDefinitions.some((def) => def.id === offer.weapon)) return false
  const old = s.weapons[offer.slot]
  if (offer.action === 'equip')
    return (
      offer.slot === s.weapons.length &&
      s.weapons.length < weaponCapacity(s) &&
      offer.level === 1 &&
      offer.branch === null &&
      !s.weapons.some((slot) => slot.id === offer.weapon)
    )
  if (!old || offer.level < 1 || offer.level > 5) return false
  if (offer.action === 'replace')
    return (
      old.id === offer.replaces &&
      old.level === offer.level &&
      !s.weapons.some((slot) => slot.id === offer.weapon) &&
      (offer.level < 3 ? offer.branch === null : branches.includes(offer.branch!))
    )
  return (
    old.id === offer.weapon &&
    offer.level === old.level + 1 &&
    old.level < 5 &&
    (offer.level === 3
      ? offer.action === 'branch' && branches.includes(offer.branch!)
      : offer.action === 'upgrade' && offer.branch === old.branch)
  )
}

export function applyWeaponOffer(s: RushState, hooks: Hooks, offer: WeaponOffer) {
  if (!validWeaponOffer(s, offer)) return false
  const previous = activeWeaponReactions(s).map((reaction) => reaction.id)
  if (offer.action === 'utility') {
    const id = offer.utility!
    if ((s.upgrades[id] ?? 0) < 5) applyUpgrade(s, hooks, id)
    else if (id === 'vital') s.player.hp = Math.min(s.player.maxHp, s.player.hp + 2)
    else {
      s.overdrive = Math.min(6, s.overdrive + 2)
      s.abilityCooldown = Math.max(0, s.abilityCooldown - 3)
    }
  } else {
    const old = s.weapons[offer.slot]
    if (old && old.id !== offer.weapon) {
      s.shots = s.shots.filter((shot) => shot.weapon !== old.id)
      s.zones = s.zones.filter((zone) => zone.sourceSlot !== offer.slot)
      s.weaponTraces = s.weaponTraces.filter((trace) => trace.weapon !== old.id)
    }
    s.weapons[offer.slot] = copySlot(offer.weapon!, offer.level, offer.branch)
    hooks.emit({ type: 'upgrade', ...s.player, weapon: offer.weapon!, amount: offer.level })
  }
  for (const reaction of activeWeaponReactions(s))
    if (!previous.includes(reaction.id))
      hooks.emit({
        type: 'protocol',
        ...s.player,
        protocol: reaction.id,
        reaction: reaction.id,
        amount: 1,
      })
  return true
}
