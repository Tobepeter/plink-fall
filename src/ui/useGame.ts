import { useSyncExternalStore } from 'react'
import type { Game } from '@/game/core/Game'

export function useGame(game: Game) {
  useSyncExternalStore(game.eco.subscribe, () => game.eco.version)
  return game.eco
}
