import { useDrift, type GameProps } from './drift-app'
import { Icon } from './icons'
import type { ForkReward } from '../data/regions'

const nodes = ['reach', 'fork', 'reach', 'fork', 'reach', 'lake'] as const

// 局内 HUD：心火、萤火阶、路线、花瓣、首领血条
export function Hud(props: GameProps) {
  const { game } = props
  const store = useDrift(game)
  const h = store.hud
  const playing = store.phase === 'play'
  let forkIndex = 0
  return (
    <>
      {/* 顶栏 */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="flex flex-col gap-1.5">
          <div className="drift-panel flex items-center gap-0.5 rounded-full px-2.5 py-1">
            {Array.from({ length: h.maxFlame }, (_, i) => (
              <Icon
                key={i}
                name="flame"
                size={18}
                filled={i < h.flame}
                className={i < h.flame ? 'text-[var(--amber)]' : 'text-white/25'}
              />
            ))}
            {h.shield > 0 && <Icon name="shade" size={16} className="ml-1 text-sky-200" />}
          </div>
          <div
            className="drift-panel flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2"
            aria-label="萤火"
          >
            <Icon name="firefly" size={16} className="text-lime-200" />
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-lime-200 transition-[width] duration-200"
                style={{ width: `${(h.glow / h.need) * 100}%` }}
              />
            </div>
            <span className="num text-xs text-lime-100/80">{h.level}</span>
          </div>
        </div>
        {/* 路线 */}
        <div className="drift-panel mt-0.5 flex items-center gap-1 rounded-full px-2.5 py-1.5">
          {nodes.map((kind, i) => {
            const done = i < h.step,
              now = i === h.step
            const tone = now ? 'text-[var(--amber)]' : done ? 'text-white/70' : 'text-white/25'
            if (kind === 'reach')
              return (
                <span
                  key={i}
                  className={`h-[3px] w-4 rounded-full ${now ? 'bg-[var(--amber)]' : done ? 'bg-white/60' : 'bg-white/20'}`}
                />
              )
            if (kind === 'lake') return <Icon key={i} name="boss" size={15} className={tone} />
            const chosen: ForkReward | null = h.forks[forkIndex++]
            return (
              <Icon
                key={i}
                name={chosen ?? 'storm'}
                size={14}
                className={chosen ? tone : 'text-white/25'}
                strokeDasharray={chosen ? undefined : '2 2'}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="drift-panel num flex items-center gap-1 rounded-full px-2.5 py-1 text-sm">
            <Icon name="petal" size={15} filled className="text-pink-300" />
            {h.petals}
          </div>
          {playing && (
            <button
              className="drift-btn h-8 w-8"
              aria-label="暂停"
              onClick={() => game.pause(true)}
            >
              <Icon name="pause" size={16} />
            </button>
          )}
        </div>
      </div>
      {/* 首领 */}
      {h.boss && (
        <div className="drift-rise mt-3 flex flex-col items-center gap-1">
          <div className="brush text-2xl tracking-[0.3em] text-white/90">{h.boss.name}</div>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-300 to-amber-200 transition-[width] duration-200"
              style={{ width: `${h.boss.hp * 100}%` }}
            />
          </div>
        </div>
      )}
      {/* 新手提示 */}
      {store.hint && playing && (
        <div className="absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-3">
          <div className="relative h-12 w-12">
            <span className="drift-hint-ring absolute inset-0 rounded-full border-2 border-white/70" />
            <span className="absolute inset-[18px] rounded-full bg-white/80" />
          </div>
          <div className="drift-breathe text-sm tracking-[0.3em]">轻点灯旁水面</div>
        </div>
      )}
      {store.paused && <Pause {...props} />}
    </>
  )
}

function Pause(props: GameProps) {
  const { game } = props
  const save = game.store.save
  return (
    <div className="pe absolute inset-0 flex items-center justify-center bg-black/45">
      <div className="drift-rise drift-panel flex w-64 flex-col items-center gap-3 rounded-3xl px-6 py-7">
        <div className="brush mb-2 text-4xl tracking-[0.3em]">暂歇</div>
        <button
          className="drift-btn primary h-12 w-full text-lg tracking-[0.3em]"
          onClick={() => game.pause(false)}
        >
          <Icon name="play" size={18} />
          继续
        </button>
        <button
          className="drift-btn h-11 w-full tracking-widest"
          onClick={() => game.setMuted(!save.muted)}
        >
          <Icon name={save.muted ? 'soundOff' : 'soundOn'} size={18} />
          {save.muted ? '已静音' : '有声'}
        </button>
        <button
          className="drift-btn h-11 w-full tracking-widest text-[var(--muted)]"
          onClick={() => game.retire()}
        >
          <Icon name="wish" size={18} />
          收灯上岸
        </button>
      </div>
    </div>
  )
}
