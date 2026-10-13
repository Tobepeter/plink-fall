import { Coins, Crown, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Game } from '@/game/core/Game'
import { fmt } from '@/game/core/format'
import { useGame } from './useGame'

export function Hud({ game, onPrestige }: { game: Game; onPrestige: () => void }) {
  const eco = useGame(game)
  return (
    <div className="absolute inset-x-0 top-0 flex h-[27.8cqw] flex-col items-center px-[4cqw] pt-[3cqw]">
      <div className="flex w-full items-center justify-between">
        <div className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-[5cqw] font-black tracking-tight text-transparent drop-shadow-[0_0_12px_rgba(232,121,249,.5)]">
          plink-fall
        </div>
        <div className="pe flex gap-[2cqw]">
          {eco.shards > 0 && (
            <div className="flex items-center gap-1 rounded-xl border border-amber-300/30 bg-amber-400/10 px-[2.5cqw] text-[3.2cqw] font-bold text-amber-200">
              <Crown className="size-[3.6cqw]" />×{eco.prestigeMul.toFixed(2)}
            </div>
          )}
          {(eco.canPrestige() || eco.prestiges > 0) && (
            <Button variant={eco.canPrestige() ? 'gold' : 'ghost'} className="h-[9cqw] px-[3cqw] text-[3.4cqw]" onClick={onPrestige}>
              <Crown className="size-[4cqw]" />
              转生
            </Button>
          )}
          <Button variant="ghost" className="size-[9cqw] p-0" onClick={() => game.toggleMute()} aria-label="静音">
            {eco.muted ? <VolumeX className="size-[4.6cqw]" /> : <Volume2 className="size-[4.6cqw]" />}
          </Button>
        </div>
      </div>
      <div className="mt-[1.5cqw] flex items-center gap-[2cqw]">
        <Coins className="size-[8cqw] text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,.7)]" />
        <span className="num text-[11cqw] leading-none font-black text-white drop-shadow-[0_0_18px_rgba(103,232,249,.45)]">
          {fmt(eco.coins)}
        </span>
      </div>
      <div className="num mt-[1cqw] text-[3.6cqw] font-semibold text-cyan-200/80">+{fmt(eco.rate)} / 秒</div>
    </div>
  )
}
