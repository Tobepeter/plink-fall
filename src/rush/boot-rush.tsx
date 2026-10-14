import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import { RushStore } from './model/store'
import { RushGame } from './rush-game'
import { RushApp } from './ui/rush-app'
import './rush.css'

// 零点突围游戏入口
export function bootRush(root: HTMLElement) {
  document.body.classList.remove('mine-mode', 'forge-mode')
  document.body.classList.add('rush-mode')
  document.title = '零点突围'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b1223')
  root.replaceChildren()
  createRoot(root).render(<RushRuntime />)
}
function RushRuntime() {
  const [store] = useState(() => new RushStore())
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stageRef = useCallback((node: HTMLDivElement | null) => setStage(node), [])
  useEffect(() => {
    if (!stage) return
    const game = new RushGame(store)
    let active = true
    void game
      .init(stage)
      .then(async () => {
        if (!active) return
        setReady(true)
        if (import.meta.env.DEV) {
          const { attachRushDebug } = await import('./debug')
          if (active) attachRushDebug(store, game)
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        game.destroy()
        console.error('突围场景启动失败', err)
        setError('战场尚未就绪')
      })
    return () => {
      active = false
      game.destroy()
      if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__RUSH_DEBUG__
    }
  }, [stage, store])
  useEffect(() => () => store.destroy(), [store])
  return <RushApp store={store} stageRef={stageRef} ready={ready} error={error} />
}
