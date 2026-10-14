import type { RushEvent, RushPort, RushState, Vec } from './types'
import type { RushGame } from './rush-game'
import { Sprite } from 'pixi.js'
import type { Application, Container } from 'pixi.js'

// DEBUG 开发期真实战斗与确定性场景
export function attachRushDebug(store: RushPort, game: RushGame) {
  if (!import.meta.env.DEV) return
  const runtime = game as unknown as {
    app: Application
    accumulator: number
    impactTime: number
    last: number
  }
  const scene = game.scene as unknown as { getState: () => RushState }
  let recording: { id: number; stop: () => void } | null = null
  const events: (Pick<RushEvent, 'type' | 'amount' | 'side' | 'protocol' | 'power'> & {
    clock: number
    wave: number
  })[] = []
  const unsubscribe = store.onEvent((event) => {
    if (events.length >= 300) events.shift()
    events.push({
      clock: store.state.clock,
      wave: store.state.wave.index,
      type: event.type,
      amount: event.amount,
      side: event.side,
      protocol: event.protocol,
      power: event.power,
    })
  })
  const debug = {
    runtime: { store, game, scene: game.scene },
    snapshot: () => structuredClone(store.state),
    frames: () => game.frames,
    events: () => structuredClone(events),
    motion: () => game.scene.motionSnapshot(),
    gait: () => game.scene.gaitSnapshot(),
    screen: (point: Vec) => game.scene.worldToScreen(point),
    world: (point: Vec) => game.scene.screenToWorld(point.x, point.y),
    inspect() {
      const renderer = runtime.app.renderer
      const canvas = runtime.app.canvas
      let remaining = 100
      const tree = (node: Container): object => {
        const sprite = node instanceof Sprite ? node : null
        return {
          kind: node.constructor.name,
          label: node.label,
          x: node.x,
          y: node.y,
          scale: { x: node.scale.x, y: node.scale.y },
          rotation: node.rotation,
          alpha: node.alpha,
          visible: node.visible,
          texture: sprite && {
            frame: { ...sprite.texture.frame },
            filter: sprite.texture.source.style.scaleMode,
          },
          children: node.children.flatMap((child) => (--remaining > 0 ? [tree(child)] : [])),
        }
      }
      return {
        dpr: devicePixelRatio,
        resolution: renderer.resolution,
        canvas: { width: canvas.width, height: canvas.height },
        css: canvas.getBoundingClientRect().toJSON(),
        tree: tree(game.scene.view),
      }
    },
    // 有界采样；不写逐帧 console，不夹杂截图开销
    trace(milliseconds = 1000) {
      recording?.stop()
      const rows: object[] = []
      const duration = Math.min(5000, Math.max(0, Number(milliseconds) || 0))
      const start = performance.now()
      return new Promise<object[]>((resolve) => {
        let deadline = 0
        const stop = () => {
          if (recording) cancelAnimationFrame(recording.id)
          window.clearTimeout(deadline)
          recording = null
          resolve(rows)
        }
        const sample = (now: number) => {
          try {
            const state = store.state
            const presented = scene.getState()
            rows.push({
              elapsed: now - start,
              frame: game.frames,
              clock: state.clock,
              phase: state.phase,
              paused: state.paused,
              player: { ...state.player },
              presentedPlayer: { ...presented.player },
              screen: game.scene.worldToScreen(presented.player),
              gait: game.scene.gaitSnapshot(),
            })
          } catch (error) {
            rows.push({ error: String(error), elapsed: now - start })
            stop()
            return
          }
          if (now - start >= duration || rows.length >= 600) stop()
          else if (recording) recording.id = requestAnimationFrame(sample)
        }
        recording = { id: requestAnimationFrame(sample), stop }
        deadline = window.setTimeout(() => {
          rows.push({ error: 'RAF sampling deadline exceeded', hidden: document.hidden })
          stop()
        }, duration + 1500)
      })
    },
    // 仅推进模型；实际渲染另用 trace 观察
    advance(seconds: number) {
      const duration = Math.min(300, Math.max(0, seconds))
      for (let time = 0; time < duration; time += 1 / 60)
        store.update(Math.min(1 / 60, duration - time))
    },
    fixture(data: Partial<RushState>) {
      Object.assign(store.state, structuredClone(data))
      store.update(0.1)
      game.presentation.reset(store.state)
      runtime.accumulator = 0
      runtime.impactTime = 0
      runtime.last = performance.now()
      game.scene.render(0)
      runtime.app.renderer.render(runtime.app.stage)
    },
    actions: {
      move: store.setMove.bind(store),
      dash: store.dash.bind(store),
      choose: store.choose.bind(store),
      restart: store.restart.bind(store),
      pause: store.setPaused.bind(store),
      save: store.save.bind(store),
    },
    detach(): void {
      unsubscribe()
      recording?.stop()
      const host = window as unknown as Record<string, unknown>
      if (host.__RUSH_DEBUG__ === debug) delete host.__RUSH_DEBUG__
    },
  }
  Object.assign(window, { __RUSH_DEBUG__: debug })
  return debug.detach
}
