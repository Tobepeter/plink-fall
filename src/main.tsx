import './style.css'
import { createRoot } from 'react-dom/client'

async function boot() {
  const root = document.getElementById('root')!
  const mode = new URLSearchParams(location.search).get('type')
  if (mode === 'codex-rush' || mode === 'codex-forge') {
    const { bootRush } = await import('./rush/boot-rush')
    bootRush(root)
    return
  }
  if (mode === 'codex-mine') {
    const { bootMine } = await import('./mine/boot-mine')
    bootMine(root)
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
