import type { ForgeStore } from './model/forge-store'
import type { ForgeGame } from './forge-game'
import type { ForgeState } from './model/types'

// 开发验收入口；正式构建剔除
export function attachDebug(store: ForgeStore, game: ForgeGame) {
  if (!import.meta.env.DEV) return
  const debug = {
    snapshot: () => structuredClone(store.state),
    frames: () => game.frames,
    advance(seconds: number) {
      const duration = Math.min(3600, Math.max(0, seconds))
      for (let time = 0; time < duration; time += 0.1) store.update(Math.min(0.1, duration - time))
    },
    fixture(data: Partial<ForgeState>) {
      Object.assign(store.state, structuredClone(data))
      store.update(0.001)
    },
    actions: {
      start: () => store.start(),
      resonate: () => store.resonate(),
      deliver: () => store.deliver(),
      choose: store.choose.bind(store),
      research: store.researchUpgrade.bind(store),
      jump: () => store.jump(),
      offline: (seconds: number) => store.grantOffline(seconds),
      save: () => store.save(),
    },
  }
  Object.assign(window, { __CODEX_FORGE_DEBUG__: debug })
}
