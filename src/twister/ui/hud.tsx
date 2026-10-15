import { useTwister, type GameProps } from './app'
import { Icon } from './icons'

// 局内 HUD：倒计时、体型进度、名次、暂停
export function Hud(props: GameProps) {
  const { game } = props
  const store = useTwister(game)
  const h = store.hud
  const pct = Math.min(1, (h.r - h.start) / (h.goal - h.start))
  const hurry = h.left <= 10
  const sec = Math.ceil(h.left)
  return (
    <>
      {/* 顶栏 */}
      <div className="flex items-start justify-between px-3 pt-3">
        <div className="tw-pill flex items-center gap-1.5 px-3 py-1.5 font-black">
          <Icon
            name="trophy"
            size={18}
            className={h.rank === 1 ? 'text-[var(--sun)]' : 'text-slate-400'}
          />
          <span className="num text-lg">
            {h.rank}
            <span className="text-sm text-slate-400">/{h.total}</span>
          </span>
        </div>
        <div
          className={`tw-pill num flex items-center gap-1.5 px-4 py-1.5 text-xl font-black ${hurry ? 'tw-hurry text-[var(--hot)]' : ''}`}
        >
          <Icon name="clock" size={20} />
          {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
        </div>
        <button
          className="tw-btn ghost h-10 w-10 !rounded-full"
          aria-label="暂停"
          onClick={() => game.pause(true)}
        >
          <Icon name="pause" size={18} />
        </button>
      </div>
      {/* 体型进度 */}
      <div className="mx-auto mt-3 w-[78%] max-w-sm">
        <div className="mb-1 flex items-end justify-between px-1 text-sm font-extrabold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          <span className="num">风眼 {h.r.toFixed(1)} 米</span>
          <span className="num">{h.hit ? '已达标，继续卷！' : `目标 ${h.goal} 米`}</span>
        </div>
        <div className="tw-pill h-4 overflow-hidden p-[3px]">
          <div
            className="h-full rounded-full transition-[width] duration-150"
            style={{
              width: `${Math.max(6, pct * 100)}%`,
              background: h.hit
                ? 'linear-gradient(90deg,#ffd24a,#ff8a3a)'
                : 'linear-gradient(90deg,#7fd6ff,#3fa7f0)',
            }}
          />
        </div>
      </div>
      {/* 连卷 */}
      {h.combo >= 5 && (
        <div className="absolute right-4 bottom-[22%] flex flex-col items-end">
          <div key={Math.floor(h.combo / 5)} className="tw-popin tw-display tw-outline text-4xl">
            连卷 ×{h.combo}
          </div>
        </div>
      )}
      {/* 新手提示 */}
      {store.hint && (
        <div className="absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-3">
          <div className="tw-drag text-white drop-shadow">
            <Icon name="hand" size={52} />
          </div>
          <div className="tw-pill px-4 py-1.5 text-base font-extrabold">按住任意处拖动龙卷风</div>
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
    <div className="pe absolute inset-0 flex items-center justify-center bg-[#1e2a3a]/45">
      <div className="tw-card tw-popin flex w-64 flex-col items-center gap-3 px-6 py-7">
        <div className="tw-display mb-1 text-4xl">暂停</div>
        <button className="tw-btn hot h-14 w-full text-xl" onClick={() => game.pause(false)}>
          <Icon name="play" size={20} />
          继续
        </button>
        <button className="tw-btn ghost h-12 w-full" onClick={() => game.setMuted(!save.muted)}>
          <Icon name={save.muted ? 'soundOff' : 'soundOn'} size={20} />
          {save.muted ? '已静音' : '声音开'}
        </button>
        <button className="tw-btn ghost h-12 w-full" onClick={() => game.toTitle()}>
          <Icon name="home" size={20} />
          回到标题
        </button>
      </div>
    </div>
  )
}
