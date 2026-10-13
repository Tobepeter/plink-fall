import './style.css'
import { createRoot } from 'react-dom/client'
import { Game } from '@/game/core/Game'
import { App } from '@/ui/App'

async function boot() {
  const root = document.getElementById('root')!
  const frame = document.getElementById('frame')!
  const game = new Game()
  await game.init(root, frame, document.getElementById('stage')!)
  createRoot(document.getElementById('ui')!).render(<App game={game} />)
  ;(window as unknown as { __game: Game }).__game = game
}
void boot()
