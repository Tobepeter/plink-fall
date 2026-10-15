import type { Run } from './run'
import { blessingIds, blessings, type BlessingId } from '../data/blessings'
import type { FollowerKind } from '../data/kinds'

// 祠中祝福与夜市货品
export function makeOffer(run: Run, count = 3): BlessingId[] {
  const open = blessingIds.filter((id) => {
    if ((run.levels[id] ?? 0) >= blessings[id].max) return false
    if (id === 'thunder') return run.pool.includes('violet')
    if (id === 'lotus') return run.pool.includes('rose')
    return true
  })
  const picks: BlessingId[] = []
  // 三系各取其一，余下随机
  for (const school of ['ripple', 'light', 'train'] as const) {
    const list = open.filter((id) => blessings[id].school === school && !picks.includes(id))
    if (list.length && picks.length < count) picks.push(run.rng.pick(list))
  }
  while (picks.length < count) {
    const rest = open.filter((id) => !picks.includes(id))
    if (!rest.length) break
    picks.push(run.rng.pick(rest))
  }
  return shuffle(picks, run)
}

export type ShopItem =
  | { type: 'lantern'; kind: FollowerKind; cost: number; sold?: boolean }
  | { type: 'blessing'; id: BlessingId; cost: number; sold?: boolean }
  | { type: 'heal'; cost: number; sold?: boolean }

export function makeShop(run: Run): ShopItem[] {
  const [bless] = makeOffer(run, 1)
  const items: ShopItem[] = [
    { type: 'lantern', kind: run.rng.pick(run.pool), cost: 8 },
    { type: 'lantern', kind: run.rng.pick(run.pool), cost: 8 },
  ]
  if (bless) items.push({ type: 'blessing', id: bless, cost: 18 })
  items.push({ type: 'heal', cost: 10 })
  return items
}

// 买下一件，返回是否成功
export function buy(run: Run, item: ShopItem) {
  if (item.sold || run.petalCount < item.cost) return false
  if (item.type === 'lantern' && !run.gift(item.kind)) return false
  if (item.type === 'heal') {
    if (run.flame >= run.stats.maxFlame) return false
    run.flame++
  }
  if (item.type === 'blessing') run.pickBlessing(item.id)
  run.petalCount -= item.cost
  item.sold = true
  run.events.push({ type: 'buy', item: item.type })
  return true
}

function shuffle<T>(list: T[], run: Run) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(run.rng.next() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
