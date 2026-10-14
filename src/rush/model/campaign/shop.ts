import type { RushState, ShopItemId } from '../../types'
import type { Hooks } from '../math'
import { level } from '../math'
import { upgrades } from '../data'
import { frameStats } from '../frames'
import { applyUpgrade } from '../progression'

export const shopPrice = (s: RushState, id: ShopItemId) =>
  id === 'repair' ? 3 : 4 + level(s, id) * 3
export const shopRerollPrice = (s: RushState) => 2 + (s.shop?.rerolls ?? 0) * 2

// 同波换货不重复售卖已购买项目
export function rollShop(s: RushState, hooks: Hooks): ShopItemId[] {
  const bought = s.shop?.purchased ?? []
  const pool: ShopItemId[] = upgrades
    .filter((u) => level(s, u.id) < u.maxLevel && !bought.includes(u.id))
    .map((u) => u.id)
  if (s.player.hp < s.player.maxHp && !bought.includes('repair')) pool.push('repair')
  const offers: ShopItemId[] = []
  const existing = pool.filter((id) => id !== 'repair' && level(s, id) > 0)
  if (existing.length) {
    const biased = existing.filter(
      (id) => id !== 'repair' && frameStats[s.player.frame].bias.includes(id),
    )
    const source = biased.length ? biased : existing
    const first = source[Math.floor(hooks.random() * source.length)]
    offers.push(first)
    pool.splice(pool.indexOf(first), 1)
  }
  while (offers.length < 3 && pool.length) {
    const weights = pool.map((id) =>
      id === 'repair'
        ? 2
        : (level(s, id) ? 3 : 1) * (frameStats[s.player.frame].bias.includes(id) ? 2 : 1),
    )
    let roll = hooks.random() * weights.reduce((sum, v) => sum + v, 0)
    let index = 0
    while (index < weights.length - 1 && roll >= weights[index]) roll -= weights[index++]
    offers.push(pool.splice(index, 1)[0])
  }
  // 全部技能满级时仍给出可理解的休整选项，满血修复不扣费
  if (offers.length === 0 && !bought.includes('repair')) offers.push('repair')
  return offers
}

export function openWaveShop(s: RushState, hooks: Hooks) {
  s.scrap += 4
  s.phase = 'shop'
  s.move = { x: 0, y: 0 }
  s.player.vx = s.player.vy = 0
  s.shop = { wave: s.wave.index, offers: [], purchased: [], rerolls: 0 }
  s.shop.offers = rollShop(s, hooks)
}

export function buyShopUpgrade(s: RushState, hooks: Hooks, id: ShopItemId) {
  const shop = s.shop
  if (
    s.phase !== 'shop' ||
    s.paused ||
    !shop ||
    !shop.offers.includes(id) ||
    shop.purchased.includes(id)
  )
    return false
  const price = shopPrice(s, id)
  if (s.scrap < price) return false
  if (id === 'repair') {
    if (s.player.hp >= s.player.maxHp) return false
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + 2)
  } else if (!applyUpgrade(s, hooks, id)) return false
  s.scrap -= price
  shop.purchased.push(id)
  return true
}

export function rerollShop(s: RushState, hooks: Hooks) {
  if (s.phase !== 'shop' || s.paused || !s.shop || s.scrap < shopRerollPrice(s)) return false
  const previous = s.shop.offers
  let offers = rollShop(s, hooks)
  for (
    let i = 0;
    i < 3 && offers.every((id) => previous.includes(id)) && offers.length === previous.length;
    i++
  )
    offers = rollShop(s, hooks)
  if (
    offers.length === 0 ||
    (offers.length === previous.length && offers.every((id) => previous.includes(id)))
  )
    return false
  s.scrap -= shopRerollPrice(s)
  s.shop.rerolls++
  s.shop.offers = offers
  return true
}

export function continueWave(s: RushState) {
  if (s.phase !== 'shop' || s.paused || !s.shop) return false
  s.shop = null
  s.phase = 'playing'
  s.wave.elapsed = Math.max(0, s.wave.duration - 0.6)
  s.player.invulnerable = Math.max(s.player.invulnerable, 0.8)
  return true
}
