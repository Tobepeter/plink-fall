import { createRoot } from 'react-dom/client'
import { DriftGame } from './drift-game'
import { DriftApp } from './ui/drift-app'
import './drift.css'

// 流灯入口：画布 + 界面层
export function bootDrift(root: HTMLElement) {
  document.body.classList.add('drift-mode')
  document.title = '流灯'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#04070d')
  root.replaceChildren()
  const stage = document.createElement('div')
  stage.className = 'drift-stage'
  const ui = document.createElement('div')
  ui.className = 'drift-overlay'
  root.append(stage, ui)
  const game = new DriftGame()
  void game.init(stage).catch((err: unknown) => console.error('流灯启动失败', err))
  createRoot(ui).render(<DriftApp game={game} />)
  if (import.meta.env.DEV) {
    ;(window as unknown as { __drift: DriftGame }).__drift = game
    void import('./debug').then((m) => m.attachDriftDebug(game))
  }
}
