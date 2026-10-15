import { useTwister, type GameProps } from './app'
import { Icon } from './icons'
import { districts } from '../data/districts'

// 标题页：后台龙卷自动漫游，前景大字与开始
export function Title(props: GameProps) {
  const { game } = props
  const store = useTwister(game)
  const save = store.save
  return (
    <div className="absolute inset-0 flex flex-col items-center">
      {/* 顶栏 */}
      <div className="flex w-full items-center justify-between px-4 pt-4">
        <div className="tw-pill num flex items-center gap-1.5 px-3 py-1.5 font-extrabold">
          <Icon name="coin" size={20} className="text-[var(--sun)]" />
          {save.coins}
        </div>
        <button
          className="tw-btn ghost h-10 w-10 !rounded-full"
          aria-label="声音"
          onClick={() => game.setMuted(!save.muted)}
        >
          <Icon name={save.muted ? 'soundOff' : 'soundOn'} size={20} />
        </button>
      </div>
      {/* 题字 */}
      <div className="tw-popin mt-[12vh] flex flex-col items-center">
        <div className="tw-display tw-outline tw-bob text-[96px] leading-none">卷城</div>
        <div className="tw-pill mt-4 px-4 py-1 text-xs font-black tracking-[0.4em]">
          TWISTER TOWN
        </div>
      </div>
      <div className="flex-1" />
      {/* 操作区 */}
      <div className="tw-popin mb-[8vh] flex flex-col items-center gap-4">
        {save.best > 0 && (
          <div className="tw-pill flex items-center gap-1.5 px-3 py-1 text-sm font-bold">
            <Icon name="trophy" size={16} className="text-[var(--sun)]" />
            最远 {districts[Math.min(save.best, districts.length) - 1]?.name ?? '—'}
            {save.wins > 0 && ` · 横扫 ${save.wins} 次`}
          </div>
        )}
        <button
          className="tw-btn hot tw-display h-[72px] w-60 text-4xl"
          onClick={() => game.start()}
        >
          起风！
        </button>
        <button className="tw-btn ghost h-12 w-40 text-base" onClick={() => game.openShop()}>
          <Icon name="shop" size={20} className="text-[var(--hot)]" />
          风铺
        </button>
      </div>
    </div>
  )
}
