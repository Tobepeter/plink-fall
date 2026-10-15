import { useDrift, type GameProps } from './drift-app'
import { Icon, blessingGlyph } from './icons'
import { blessings, type BlessingSchool } from '../data/blessings'
import { lanternKinds } from '../data/kinds'
import { kindNotes } from '../data/workshop'
import type { ShopItem } from '../model/rewards'

const schoolTone: Record<BlessingSchool, string> = {
  ripple: '#8fd8ff',
  light: '#ffc46b',
  train: '#ff9cc2',
}

// 祠：三选一祝福
export function Offer(props: GameProps) {
  const { game } = props
  const store = useDrift(game)
  const levels = game.run.levels
  return (
    <div className="pe absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-6">
      <div className="brush drift-title mb-3 text-3xl tracking-[0.3em]">择一祝福</div>
      <div className="flex w-full max-w-md gap-2.5">
        {store.offer!.map((id) => {
          const def = blessings[id]
          const lv = levels[id] ?? 0
          const tone = schoolTone[def.school]
          return (
            <button
              key={id}
              className="drift-rise drift-panel flex flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 pt-4 pb-3 active:scale-95"
              style={{ borderColor: `${tone}55` }}
              onClick={() => game.pick(id)}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: `radial-gradient(circle, ${tone}33, transparent 70%)`,
                  color: tone,
                }}
              >
                <Icon name={blessingGlyph[id]} size={30} />
              </div>
              <div className="brush text-2xl tracking-widest">{def.name}</div>
              <div className="min-h-8 text-[11px] leading-4 text-[var(--muted)]">{def.desc}</div>
              <div className="flex gap-1">
                {Array.from({ length: def.max }, (_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-3 rounded-full"
                    style={{
                      background: i < lv ? tone : i === lv ? `${tone}99` : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 夜市：花瓣换灯、祝福、心火
export function Shop(props: GameProps) {
  const { game } = props
  const store = useDrift(game)
  const petals = store.hud.petals
  return (
    <div className="pe absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="brush drift-title text-3xl tracking-[0.3em]">夜市</div>
        <div className="drift-panel num flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm">
          <Icon name="petal" size={14} filled className="text-pink-300" />
          {petals}
        </div>
      </div>
      <div className="flex w-full max-w-md gap-2">
        {store.shop!.map((item, i) => (
          <ShopCard key={i} item={item} afford={petals >= item.cost} onBuy={() => game.buy(i)} />
        ))}
      </div>
      <button
        className="drift-btn mt-4 h-10 px-8 text-sm tracking-[0.3em]"
        onClick={() => game.closeShop()}
      >
        离开
      </button>
    </div>
  )
}

function ShopCard(props: { item: ShopItem; afford: boolean; onBuy: () => void }) {
  const { item, afford } = props
  let icon = 'flame',
    name = '心火',
    note = '复燃一格',
    color = '#ffb35c'
  if (item.type === 'lantern') {
    const k = lanternKinds[item.kind]
    icon = 'lotus'
    name = k.name
    note = kindNotes[item.kind]
    color = k.petal
  } else if (item.type === 'blessing') {
    const def = blessings[item.id]
    icon = blessingGlyph[item.id]
    name = def.name
    note = def.desc
    color = schoolTone[def.school]
  }
  return (
    <button
      className="drift-rise drift-panel flex flex-1 flex-col items-center gap-1 rounded-2xl px-1.5 pt-3 pb-2 active:scale-95 disabled:opacity-40"
      disabled={item.sold || !afford}
      onClick={props.onBuy}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ color, background: `radial-gradient(circle, ${color}30, transparent 70%)` }}
      >
        <Icon name={item.sold ? 'check' : icon} size={26} filled={icon === 'flame' && !item.sold} />
      </div>
      <div className="brush text-xl tracking-widest">{name}</div>
      <div className="min-h-8 text-[10px] leading-4 text-[var(--muted)]">{note}</div>
      <div className="num flex items-center gap-1 text-sm">
        <Icon name="petal" size={12} filled className="text-pink-300" />
        {item.cost}
      </div>
    </button>
  )
}
