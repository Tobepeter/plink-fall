import { createRoot } from 'react-dom/client'
import { TwisterGame } from './twister-game'
import { TwisterApp } from './ui/app'
import './twister.css'

// 卷城入口：3D 画布 + 界面层
export function bootTwister(root: HTMLElement) {
  document.body.classList.add('twister-mode')
  document.title = '卷城'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#9fd3f0')
  root.replaceChildren()
  const stage = document.createElement('div')
  stage.className = 'tw-stage'
  const ui = document.createElement('div')
  ui.className = 'tw-ui-root'
  root.append(stage, ui)
  const game = new TwisterGame()
  game.init(stage)
  createRoot(ui).render(<TwisterApp game={game} />)
  if (import.meta.env.DEV) {
    ;(window as unknown as { __twister: TwisterGame }).__twister = game
    void import('./debug').then((m) => m.attachTwisterDebug(game))
  }
}
