import type { MinePort, MineState, Vec } from './types'
import type { MineGame } from './mine-game'

// 开发实玩与连续帧验收
export function attachMineDebug(store: MinePort, game: MineGame) {
  if (!import.meta.env.DEV) return
  Object.assign(window, {
    __MINE_DEBUG__: {
      snapshot: () => structuredClone(store.state),
      frames: () => game.frames,
      screen: (point: Vec) => game.scene.worldToScreen(point),
      world: (point: Vec) => game.scene.screenToWorld(point.x, point.y),
      advance(seconds: number) {
        const duration = Math.min(600, Math.max(0, seconds))
        for (let time = 0; time < duration; time += 1 / 60)
          store.update(Math.min(1 / 60, duration - time))
      },
      fixture(data: Partial<MineState>) {
        Object.assign(store.state, structuredClone(data))
        store.update(0.001)
      },
      actions: {
        release: store.release.bind(store),
        recall: store.recall.bind(store),
        choose: store.choose.bind(store),
        meta: store.buyMeta.bind(store),
        travel: store.travel.bind(store),
        pause: store.setPaused.bind(store),
        save: store.save.bind(store),
      },
    },
  })
}
