import './style.css'
import { createRoot } from 'react-dom/client'

async function boot() {
  const root = document.getElementById('root')!
  if (new URLSearchParams(location.search).get('type') === 'codex-forge') {
    const { bootForge } = await import('./forge/boot-forge')
    bootForge(root)
    return
  }
  const [{ Game }, { App }] = await Promise.all([import('@/game/core/Game'), import('@/ui/App')])
  const frame = document.getElementById('frame')!
  const game = new Game()
  await game.init(root, frame, document.getElementById('stage')!)
  createRoot(document.getElementById('ui')!).render(<App game={game} />)
  ;(window as unknown as { __game: import('./game/core/Game').Game }).__game = game
}
void boot()
