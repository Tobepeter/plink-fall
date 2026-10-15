import { useTwister, type GameProps } from './app'
import { Icon } from './icons'
import { buySkin, buyUpgrade, skins, upgrades, type SkinId, type UpgradeId } from '../meta/save'

const upIcon: Record<UpgradeId, string> = { size: 'start', time: 'time', speed: 'speed' }

// 风铺：永久强化与风暴皮肤
export function Shop(props: GameProps) {
  const { game } = props
  const store = useTwister(game)
  const save = store.save
  const back = () => (store.result ? game.store.patch({ phase: 'result' }) : game.toTitle())
  return (
    <div className="pe absolute inset-0 flex flex-col bg-[#1e2a3a]/35">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button className="tw-btn ghost h-10 w-10 !rounded-full" aria-label="返回" onClick={back}>
          <Icon name="back" size={20} />
        </button>
        <div className="tw-display tw-outline text-4xl">风铺</div>
        <div className="flex-1" />
        <div className="tw-pill num flex items-center gap-1.5 px-3 py-1.5 font-black">
          <Icon name="coin" size={20} className="text-[var(--sun)]" />
          {save.coins}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="tw-card p-3">
          <div className="tw-display px-1 pb-2 text-2xl">强化</div>
          {(Object.keys(upgrades) as UpgradeId[]).map((id) => {
            const u = upgrades[id]
            const lv = save.upgrades[id]
            const costs: readonly number[] = u.costs
            const cost = costs[lv]
            return (
              <div
                key={id}
                className="flex items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-[var(--sky)]">
                  <Icon name={upIcon[id]} size={26} />
                </div>
                <div className="flex-1">
                  <div className="font-black">{u.name}</div>
                  <div className="text-xs font-semibold text-slate-500">{u.desc}</div>
                  <div className="mt-1 flex gap-1">
                    {costs.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-4 rounded-full ${i < lv ? 'bg-[var(--sky)]' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>
                {cost !== undefined ? (
                  <button
                    className="tw-btn h-10 min-w-20 px-3 text-sm"
                    disabled={save.coins < cost}
                    onClick={() => buyUpgrade(save, id) && store.emit()}
                  >
                    <Icon name="coin" size={16} />
                    {cost}
                  </button>
                ) : (
                  <div className="min-w-20 text-center text-sm font-black text-slate-400">已满</div>
                )}
              </div>
            )
          })}
        </div>
        <div className="tw-card mt-4 p-3">
          <div className="tw-display px-1 pb-2 text-2xl">风暴皮肤</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(skins) as SkinId[]).map((id) => {
              const s = skins[id]
              const owned = save.skins.includes(id)
              const active = save.skin === id
              return (
                <button
                  key={id}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 ${active ? 'border-[var(--sky)] bg-sky-50' : 'border-slate-100'}`}
                  disabled={!owned && save.coins < s.cost}
                  onClick={() => buySkin(save, id) && store.emit()}
                >
                  <Icon
                    name="swirl"
                    size={34}
                    style={{ color: s.tint, filter: 'drop-shadow(0 1px 0 #1e2a3a)' }}
                  />
                  <div className="text-sm font-black">{s.name}</div>
                  <div className="num flex items-center gap-1 text-xs font-bold text-slate-500">
                    {active ? (
                      '使用中'
                    ) : owned ? (
                      '已拥有'
                    ) : (
                      <>
                        <Icon name="coin" size={13} className="text-[var(--sun)]" />
                        {s.cost}
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
