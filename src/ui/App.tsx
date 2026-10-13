import { useEffect, useState } from 'react'
import { Coins, Crown, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Game } from '@/game/core/Game'
import { fmt, fmtTime } from '@/game/core/format'
import { shardsFor } from '@/game/systems/Economy'
import { Hud } from './Hud'
import { UpgradePanel } from './UpgradePanel'
import { useGame } from './useGame'

export function App({ game }: { game: Game }) {
  const eco = useGame(game)
  const [prestigeOpen, setPrestigeOpen] = useState(false)
  useEffect(() => {
    const id = setInterval(() => eco.emit(), 100) // coins tick for UI
    return () => clearInterval(id)
  }, [eco])
  const off = eco.offlineGain
  const gain = shardsFor(eco.runEarned)
  return (
    <>
      <Hud game={game} onPrestige={() => setPrestigeOpen(true)} />
      <UpgradePanel game={game} />

      <Dialog open={!!off} onOpenChange={(o) => !o && eco.dismissOffline()}>
        <DialogContent className="pe">
          <Moon className="mx-auto mb-[2cqw] size-[10cqw] text-cyan-300" />
          <DialogTitle className="text-[5.5cqw] font-black">欢迎回来！</DialogTitle>
          <DialogDescription className="mt-[1.5cqw] text-[3.6cqw] text-white/60">
            离开 {off ? fmtTime(off.seconds) : ''}，钉板仍在为你工作
          </DialogDescription>
          <div className="num my-[4cqw] flex items-center justify-center gap-2 text-[9cqw] font-black text-amber-300">
            <Coins className="size-[8cqw]" />+{off ? fmt(off.amount) : 0}
          </div>
          <Button className="h-[11cqw] w-full text-[4.4cqw]" onClick={() => eco.dismissOffline()}>
            收下
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={prestigeOpen} onOpenChange={setPrestigeOpen}>
        <DialogContent className="pe">
          <Crown className="mx-auto mb-[2cqw] size-[10cqw] text-amber-300" />
          <DialogTitle className="text-[5.5cqw] font-black">转生</DialogTitle>
          <DialogDescription className="mt-[1.5cqw] text-[3.6cqw] leading-relaxed text-white/60">
            重置金币与升级，获得永久收益加成。
            <br />
            每颗星晶 +25% 全部收益。
          </DialogDescription>
          <div className="my-[4cqw] text-[4cqw] text-white/80">
            将获得 <span className="text-[7cqw] font-black text-amber-300">{gain}</span> 星晶
            <div className="num text-[3.4cqw] text-white/50">
              加成 ×{eco.prestigeMul.toFixed(2)} → ×{(1 + (eco.shards + gain) * 0.25).toFixed(2)}
            </div>
            {gain === 0 && <div className="mt-2 text-[3.2cqw] text-rose-300">本轮累计需达到 100K 金币</div>}
          </div>
          <div className="flex gap-[3cqw]">
            <Button variant="ghost" className="h-[11cqw] flex-1 text-[4cqw]" onClick={() => setPrestigeOpen(false)}>
              取消
            </Button>
            <Button
              variant="gold"
              className="h-[11cqw] flex-1 text-[4cqw]"
              disabled={gain === 0}
              onClick={() => {
                eco.prestige()
                setPrestigeOpen(false)
              }}
            >
              确认转生
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
