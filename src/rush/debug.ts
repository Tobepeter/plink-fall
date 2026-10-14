import type { RushPort, RushState, Vec } from './types'
import type { RushGame } from './rush-game'

// DEBUG 开发期真实战斗与确定性场景
export function attachRushDebug(store: RushPort, game: RushGame) {
  if (!import.meta.env.DEV) return
  const events: { clock: number; type: string; amount?: number; side?: string }[] = []
  store.onEvent((event) => {
    if (events.length > 300) events.shift()
    events.push({
      clock: store.state.clock,
      type: event.type,
      amount: event.amount,
      side: event.side,
    })
  })
  Object.assign(window, {
    __RUSH_DEBUG__: {
      snapshot: () => structuredClone(store.state),
      frames: () => game.frames,
      events: () => structuredClone(events),
      screen: (point: Vec) => game.scene.worldToScreen(point),
      world: (point: Vec) => game.scene.screenToWorld(point.x, point.y),
      advance(seconds: number) {
        const duration = Math.min(300, Math.max(0, seconds))
        for (let time = 0; time < duration; time += 1 / 60)
          store.update(Math.min(1 / 60, duration - time))
      },
      fixture(data: Partial<RushState>) {
        Object.assign(store.state, structuredClone(data))
        store.update(0.001)
      },
      actions: {
        move: store.setMove.bind(store),
        dash: store.dash.bind(store),
        choose: store.choose.bind(store),
        restart: store.restart.bind(store),
        pause: store.setPaused.bind(store),
        save: store.save.bind(store),
      },
    },
  })
}
