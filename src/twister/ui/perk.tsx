import { useTwister, type GameProps } from './app'
import { Icon } from './icons'
import { perks } from '../data/perks'
import { districts } from '../data/districts'

// 过关：三选一风暴天赋
export function PerkPick(props: GameProps) {
  const { game } = props
  const store = useTwister(game)
  const next = districts[store.hud.district + 1]
  return (
    <div className="pe absolute inset-0 flex flex-col items-center justify-center bg-[#1e2a3a]/40 px-4">
      <div className="tw-display tw-outline tw-popin text-5xl">过关！</div>
      <div className="tw-pill mt-3 flex items-center gap-1.5 px-4 py-1 text-sm font-bold">
        下一站 · {next?.name}
        <span className="num text-[var(--hot)]">目标 {next?.goal} 米</span>
      </div>
      <div className="mt-6 text-base font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
        选一个风暴天赋
      </div>
      <div className="mt-3 grid w-full max-w-md grid-cols-3 gap-2.5">
        {store.offer.map((id, i) => {
          const p = perks[id]
          const lv = store.levels[id] ?? 0
          return (
            <button
              key={id}
              className="tw-card tw-popin flex flex-col items-center gap-1.5 px-2 pt-4 pb-3 active:translate-y-1"
              style={{ animationDelay: `${i * 0.08}s` }}
              onClick={() => game.pickPerk(id)}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-[var(--sky)]">
                <Icon name={p.icon} size={32} />
              </div>
              <div className="tw-display text-2xl">{p.name}</div>
              <div className="min-h-8 text-center text-xs leading-4 font-semibold text-slate-500">
                {p.desc}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: p.max }, (_, k) => (
                  <span
                    key={k}
                    className={`h-1.5 w-3.5 rounded-full ${k < lv ? 'bg-[var(--sky)]' : k === lv ? 'bg-[var(--sun)]' : 'bg-slate-200'}`}
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
