import { useEffect, useState } from 'react'
import { useDrift, type GameProps } from './drift-app'
import { Icon } from './icons'

// 标题页：活水河面上的题字与放灯
export function Title(props: GameProps) {
  const { game } = props
  const store = useDrift(game)
  const save = store.save
  const [gift, setGift] = useState(store.gift)
  useEffect(() => {
    if (!gift) return
    const t = setTimeout(() => setGift(0), 4200)
    return () => clearTimeout(t)
  }, [gift])
  return (
    <div className="absolute inset-0 flex flex-col items-center">
      {/* 顶栏 */}
      <div className="flex w-full items-center justify-end gap-2 px-4 pt-4">
        <div className="drift-panel num flex items-center gap-1.5 rounded-full px-3 py-1 text-sm">
          <Icon name="wish" size={16} className="text-[var(--amber)]" />
          {save.wishes}
        </div>
        <button
          className="drift-btn h-9 w-9"
          aria-label="声音"
          onClick={() => game.setMuted(!save.muted)}
        >
          <Icon name={save.muted ? 'soundOff' : 'soundOn'} size={18} />
        </button>
      </div>
      {/* 题字 */}
      <div className="drift-rise mt-[14vh] flex flex-col items-center">
        <div className="brush drift-title text-[88px] leading-none tracking-[0.12em]">流灯</div>
        <div className="mt-3 text-[11px] tracking-[0.6em] text-[var(--muted)]">DRIFTLIGHT</div>
        <div className="mt-6 text-sm tracking-[0.3em] text-[var(--muted)]">一盏心灯 · 顺流而下</div>
      </div>
      <div className="flex-1" />
      {gift > 0 && (
        <div className="drift-rise drift-panel mb-5 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
          <Icon name="wish" size={16} className="text-[var(--amber)]" />
          夜空为你攒下 <span className="num text-[var(--amber)]">{gift}</span> 愿
        </div>
      )}
      {/* 操作区 */}
      <div className="drift-rise mb-[9vh] flex flex-col items-center gap-4">
        <button
          className="drift-btn primary brush h-16 w-44 text-3xl tracking-[0.3em]"
          onClick={() => game.start()}
        >
          放灯
        </button>
        <button
          className="drift-btn h-10 gap-2 px-5 text-sm tracking-widest"
          onClick={() => game.openWorkshop()}
        >
          <Icon name="lotus" size={18} className="text-[var(--rose)]" />
          灯坊
        </button>
      </div>
    </div>
  )
}
