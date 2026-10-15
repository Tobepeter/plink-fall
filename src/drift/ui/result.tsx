import { useDrift, type GameProps } from './drift-app'
import { Icon } from './icons'
import { regions } from '../data/regions'

// 结算：灯升入夜空后的回顾
export function Result(props: GameProps) {
  const { game } = props
  const store = useDrift(game)
  const r = store.result!
  const stats = [
    { icon: 'lotus', value: r.lanterns, label: '升空' },
    { icon: 'shadow', value: r.kills, label: '驱影' },
    { icon: 'firefly', value: r.level, label: '萤阶' },
  ]
  return (
    <div className="pe absolute inset-0 flex items-center justify-center bg-black/35">
      <div className="drift-rise drift-panel flex w-[300px] flex-col items-center rounded-3xl px-6 pt-8 pb-6">
        <div className="brush drift-title text-5xl tracking-[0.25em]">
          {r.won ? '抵达星河' : '灯熄'}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm tracking-[0.3em] text-[var(--muted)]">
          <Icon name="river" size={16} />
          {r.won ? '三程皆渡' : `止于${regions[r.region].name}`}
        </div>
        <div className="mt-6 grid w-full grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 py-3"
            >
              <Icon name={s.icon} size={20} className="text-[var(--muted)]" />
              <div className="num text-xl">{s.value}</div>
              <div className="text-[10px] tracking-widest text-[var(--muted)]">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2">
          <Icon name="wish" size={26} className="text-[var(--amber)]" />
          <span className="num text-4xl text-[var(--amber)]">+{r.wishes}</span>
        </div>
        <div className="mt-1 text-[11px] tracking-widest text-[var(--muted)]">
          残灯化愿，夜空留痕
        </div>
        <button
          className="drift-btn primary brush mt-7 h-14 w-full text-2xl tracking-[0.3em]"
          onClick={() => game.start()}
        >
          再放一盏
        </button>
        <div className="mt-3 flex w-full gap-2">
          <button
            className="drift-btn h-10 flex-1 gap-1.5 text-sm tracking-widest"
            onClick={() => game.openWorkshop()}
          >
            <Icon name="lotus" size={16} className="text-[var(--rose)]" />
            灯坊
          </button>
          <button
            className="drift-btn h-10 flex-1 gap-1.5 text-sm tracking-widest"
            onClick={() => game.toTitle()}
          >
            <Icon name="back" size={16} />
            岸上
          </button>
        </div>
      </div>
    </div>
  )
}
