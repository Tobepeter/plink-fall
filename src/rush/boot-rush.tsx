import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import { RushStore } from './model/store'
import { RushGame } from './rush-game'
import { RushApp } from './ui/rush-app'
import { frameArt, playerAtlas } from './frame-art'
import './rush.css'

// 零点突围游戏入口
export function bootRush(root: HTMLElement) {
  document.body.classList.remove('mine-mode', 'forge-mode')
  document.body.classList.add('rush-mode')
  document.title = '零点突围'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b1223')
  for (const [key, href] of [
    ['modules', '/rush/modules-v2.webp'],
    ['armory', '/rush/armory-v1.png'],
    ['actors', '/rush/actors-v3.webp'],
    ['ui', '/rush/ui-icons-v1.webp'],
    ['players', playerAtlas],
    ...Object.entries(frameArt).map(([id, art]) => [id, art.portrait]),
  ]) {
    if (document.querySelector(`link[data-rush-${key}]`)) continue
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'image'
    preload.href = href
    preload.setAttribute(`data-rush-${key}`, '')
    document.head.appendChild(preload)
  }
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
    let detachDebug: (() => void) | undefined
    void game
      .init(stage)
      .then(async () => {
        if (!active) return
        setReady(true)
        if (import.meta.env.DEV) {
          const { attachRushDebug } = await import('./debug')
          if (active) detachDebug = attachRushDebug(store, game)
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
      detachDebug?.()
      game.destroy()
    }
  }, [stage, store])
  useEffect(() => () => store.destroy(), [store])
  return <RushApp store={store} stageRef={stageRef} ready={ready} error={error} />
}
