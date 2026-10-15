import type { DriftGame } from './drift-game'

// 开发调试：脚本代打与快进，仅 DEV 加载
export function attachDriftDebug(game: DriftGame) {
  const cd = { v: 0 }
  // 代打一帧：躲礁、驱影、拾灯、点首领
  const botStep = (opts: { keepUI?: boolean }) => {
    const r = game.run,
      store = game.store
    if (store.offer && !opts.keepUI) game.pick(store.offer[0])
    if (store.shop && !opts.keepUI) {
      game.buy(0)
      game.closeShop()
    }
    cd.v -= 1 / 60
    if (cd.v <= 0 && !r.over && !r.won) {
      const h = r.head
      let tapped = false
      if (r.boss?.mode === 'tell') tapped = r.tap(r.boss.x, r.boss.y)
      if (!tapped)
        for (const rock of r.river.rocksNear(h.y - 140, h.y - 10)) {
          if (Math.abs(rock.x - h.x) >= rock.r + 20) continue
          tapped = r.tap(h.x + (rock.x > h.x ? 35 : -35), h.y - 5)
          break
        }
      if (!tapped)
        for (const s of r.shadows) {
          if (s.leave > 0 || !r.train.some((f) => Math.hypot(s.x - f.x, s.y - f.y) < 70)) continue
          tapped = r.tap(s.x, s.y)
          break
        }
      if (!tapped) {
        const l = r.loose.find((f) => f.state === 'loose' && f.y < h.y && f.y > h.y - 200)
        if (l) tapped = r.tap(h.x + (l.x > h.x ? -35 : 35), h.y + 10)
      }
      cd.v = tapped ? 0.5 : 0.2
    }
    ;(game as unknown as { step: (dt: number) => void }).step(1 / 60)
  }
  const flush = () => {
    const g = game as unknown as { syncHud: () => void; app: { render: () => void }; time: number }
    for (let k = 0; k < 3; k++) game.scene?.render(g.time, 1 / 60)
    g.syncHud()
    g.app.render()
  }
  const until = (pred: (g: DriftGame) => boolean, max = 600, opts: { keepUI?: boolean } = {}) => {
    game.store.patch({ paused: false, hint: false })
    for (let i = 0; i < max * 60; i++) {
      botStep(opts)
      if (i % 20 === 0) game.scene?.render((game as unknown as { time: number }).time, 1 / 3)
      if (pred(game) || game.store.phase !== 'play') break
    }
    game.store.patch({ paused: false })
    flush()
    const r = game.run
    return {
      t: r.time | 0,
      seg: r.seg.kind + r.seg.index,
      region: r.seg.region,
      train: r.train.length,
      flame: r.flame,
      phase: game.store.phase,
      boss: r.boss?.mode,
    }
  }
  const api = { game, until, flush, bot: (sec: number) => until(() => false, sec) }
  ;(window as unknown as { __dd: typeof api }).__dd = api
  return () => delete (window as unknown as { __dd?: unknown }).__dd
}
