import { useTwister, type GameProps } from './app'
import { Icon } from './icons'
import { districts } from '../data/districts'

// 结算：横扫全城或止步某区
export function Result(props: GameProps) {
  const { game } = props
  const store = useTwister(game)
  const r = store.result!
  const title = r.final ? '横扫全城！' : r.win ? '过关' : '风停了'
  const stats = [
    { label: '止步', value: districts[r.district].name },
    { label: '卷起', value: `${r.eaten} 件` },
    { label: '体重', value: `${r.mass} 吨` },
  ]
  return (
    <div className="pe absolute inset-0 flex items-center justify-center bg-[#1e2a3a]/45 px-6">
      <div className="tw-card tw-popin flex w-full max-w-xs flex-col items-center px-6 pt-7 pb-6">
        <div className="tw-display text-5xl">{title}</div>
        {!r.win && (
          <div className="mt-2 text-sm font-bold text-slate-500">没在时限内长到目标大小</div>
        )}
        <div className="mt-5 grid w-full grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-2xl bg-sky-50 py-2.5">
              <div className="text-[11px] font-bold text-slate-400">{s.label}</div>
              <div className="mt-0.5 text-sm font-black">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          <Icon name="coin" size={30} className="text-[var(--sun)]" />
          <span className="num text-4xl font-black text-[var(--sun)]">+{r.coins}</span>
        </div>
        <button
          className="tw-btn hot tw-display mt-6 h-16 w-full text-3xl"
          onClick={() => game.start()}
        >
          再来一局
        </button>
        <div className="mt-3 flex w-full gap-2">
          <button className="tw-btn ghost h-12 flex-1" onClick={() => game.openShop()}>
            <Icon name="shop" size={18} className="text-[var(--hot)]" />
            风铺
          </button>
          <button className="tw-btn ghost h-12 flex-1" onClick={() => game.toTitle()}>
            <Icon name="home" size={18} />
            标题
          </button>
        </div>
      </div>
    </div>
  )
}
