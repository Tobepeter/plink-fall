import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import { MineStore } from './model/store'
import { MineGame } from './mine-game'
import { MineApp } from './ui/mine-app'
import './mine.css'

// 重做后的全屏游戏入口
export function bootMine(root: HTMLElement) {
  document.body.classList.add('mine-mode')
  document.title = '矿脉回声'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#163844')
  root.replaceChildren()
  createRoot(root).render(<MineRuntime />)
}

function MineRuntime() {
  const [store] = useState(() => new MineStore())
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stageRef = useCallback((node: HTMLDivElement | null) => setStage(node), [])
  useEffect(() => {
    if (!stage) return
    const game = new MineGame(store)
    let active = true
    void game
      .init(stage)
      .then(async () => {
        if (!active) return
        setReady(true)
        if (import.meta.env.DEV) {
          const { attachMineDebug } = await import('./debug')
          if (active) attachMineDebug(store, game)
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        game.destroy()
        console.error('采矿场启动失败', err)
        setError('采矿场未加载完成，请重试')
      })
    return () => {
      active = false
      game.destroy()
      if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__MINE_DEBUG__
    }
  }, [stage, store])
  useEffect(() => () => store.destroy(false), [store])
  return <MineApp store={store} stageRef={stageRef} ready={ready} error={error} />
}
