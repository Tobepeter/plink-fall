import type { TwisterGame } from './twister-game'
import { steerRival } from './sim/ai'

// 开发调试：自动驾驶与快进，仅 DEV 加载
export function attachTwisterDebug(game: TwisterGame) {
  const g = game as unknown as { step: (dt: number) => void; time: number; syncHud: () => void }
  // 自动驾驶：借用对手的觅食逻辑
  const pilot = () => {
    const run = game.run
    const p = run.player
    steerRival(run, p, 1 / 60, 1)
    const sp = Math.hypot(p.vx, p.vz) || 1
    run.input.x = p.vx / sp
    run.input.z = p.vz / sp
  }
  const advance = (sec: number, auto = true) => {
    for (let i = 0; i < sec * 60; i++) {
      if (auto && game.store.phase === 'play') pilot()
      if (game.store.phase === 'perk') game.pickPerk(game.store.offer[0])
      if (game.store.phase !== 'play' && game.store.phase !== 'title') break
      g.step(1 / 60)
    }
    g.syncHud()
    game.scene?.render(g.time, 1 / 60)
    const r = game.run
    return {
      phase: game.store.phase,
      district: r.index,
      t: Math.round(r.time),
      r: +r.player.r.toFixed(2),
      goal: r.district.goal,
      rank: r.rank(),
      eaten: r.player.eaten,
      rivals: r.tornados.slice(1).map((t) => +t.r.toFixed(1)),
    }
  }
  const api = { game, advance, pilot }
  ;(window as unknown as { __tw: typeof api }).__tw = api
  return () => delete (window as unknown as { __tw?: unknown }).__tw
}
