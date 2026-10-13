import { Coins, Gem, Layers, Lock, Rows3, Sparkles, Timer, TrendingUp, type LucideIcon } from 'lucide-react'
import type { Game } from '@/game/core/Game'
import { fmt } from '@/game/core/format'
import { UPGRADES } from '@/game/systems/Economy'
import { cn } from '@/lib/utils'
import { useGame } from './useGame'

const ICONS: Record<string, LucideIcon> = {
  timer: Timer, gem: Gem, sparkles: Sparkles, trending: TrendingUp, rows: Rows3, coins: Coins, layers: Layers,
}
const ACCENT: Record<string, string> = {
  rate: 'text-cyan-300', value: 'text-sky-300', peg: 'text-violet-300', mult: 'text-fuchsia-300',
  rows: 'text-pink-300', gold: 'text-amber-300', multi: 'text-emerald-300',
}

export function UpgradePanel({ game }: { game: Game }) {
  const eco = useGame(game)
  const list = UPGRADES.filter((u) => eco.unlocked(u))
  const next = eco.nextUnlock()
  return (
    <div className="absolute inset-x-0 bottom-0 h-[59.7cqw] border-t border-cyan-300/15 bg-gradient-to-b from-slate-950/70 to-slate-950/95 px-[3cqw] pt-[2cqw] backdrop-blur-md">
      <div className="pe grid max-h-full grid-cols-2 gap-[2cqw] overflow-y-auto pb-[3cqw]" style={{ touchAction: 'pan-y' }}>
        {list.map((u) => {
          const Icon = ICONS[u.icon]
          const lvl = eco.levels[u.id]
          const maxed = eco.isMaxed(u.id)
          const cost = eco.cost(u.id)
          const afford = !maxed && eco.coins >= cost
          return (
            <button
              key={u.id}
              onClick={() => game.buy(u.id)}
              disabled={maxed}
              className={cn(
                'relative flex h-[16.6cqw] flex-col justify-between overflow-hidden rounded-2xl border px-[2.6cqw] py-[1.8cqw] text-left transition-all active:scale-95',
                afford
                  ? 'border-cyan-300/60 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,.25)]'
                  : 'border-white/10 bg-white/[.04]',
                maxed && 'opacity-60',
              )}
            >
              <div className="flex items-center gap-[1.6cqw]">
                <Icon className={cn('size-[4.4cqw] shrink-0', ACCENT[u.id])} />
                <span className="text-[3.6cqw] font-bold text-white">{u.name}</span>
                <span className="ml-auto text-[2.8cqw] font-semibold text-white/50">Lv.{lvl}</span>
              </div>
              <div className="num text-[3cqw] text-white/60">
                {u.effect(lvl)}
                {!maxed && <span className="text-white/35"> → {u.effect(lvl + 1)}</span>}
              </div>
              <div className={cn('num flex items-center gap-1 text-[3.8cqw] font-black', afford ? 'text-amber-300' : 'text-white/40')}>
                {maxed ? (
                  '已满级'
                ) : (
                  <>
                    <Coins className="size-[3.6cqw]" />
                    {fmt(cost)}
                  </>
                )}
              </div>
              {afford && <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl bg-cyan-300/5" />}
            </button>
          )
        })}
        {next && (
          <div className="flex h-[16.6cqw] flex-col items-center justify-center gap-[1cqw] rounded-2xl border border-dashed border-white/15 text-white/40">
            <Lock className="size-[4.4cqw]" />
            <span className="num text-center text-[3cqw]">累计 {fmt(next.unlockAt)} 金币解锁</span>
          </div>
        )}
      </div>
    </div>
  )
}
