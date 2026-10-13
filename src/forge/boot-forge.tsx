import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import { ForgeStore } from './model/forge-store'
import { ForgeGame } from './forge-game'
import { ForgeApp } from './ui/forge-app'
import './forge.css'

// 独立模式入口
export function bootForge(root: HTMLElement) {
  document.body.classList.add('forge-mode')
  document.title = '月背工坊 · MOON FORGE'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ede9dc')
  root.replaceChildren()
  createRoot(root).render(<ForgeRuntime />)
}

function ForgeRuntime() {
  const [store] = useState(() => new ForgeStore())
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stageRef = useCallback((node: HTMLDivElement | null) => setStage(node), [])

  useEffect(() => {
    if (!stage) return
    const game = new ForgeGame(store)
    let active = true
    void game
      .init(stage)
      .then(async () => {
        if (!active) return
        setReady(true)
        if (import.meta.env.DEV) {
          const { attachDebug } = await import('./debug')
          if (active) attachDebug(store, game)
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        game.destroy()
        console.error('工坊启动失败', err)
        setError('产线暂时没能启动，请刷新再试一次')
      })
    return () => {
      active = false
      game.destroy()
      if (import.meta.env.DEV)
        delete (window as unknown as Record<string, unknown>).__CODEX_FORGE_DEBUG__
    }
  }, [stage, store])

  useEffect(() => () => store.destroy(false), [store])
  return <ForgeApp store={store} stageRef={stageRef} ready={ready} error={error} />
}
