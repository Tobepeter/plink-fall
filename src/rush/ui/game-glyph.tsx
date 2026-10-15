import type { CSSProperties } from 'react'
import './game-glyph.css'

const glyphs = [
  'coin',
  'time',
  'kills',
  'level',
  'frames',
  'upgrades',
  'stats',
  'settings',
  'star',
  'retry',
  'home',
  'equip',
  'ricochet',
  'split',
  'pierce',
  'xp',
] as const

export type GameGlyphId = (typeof glyphs)[number]

// 同一张原生生成图集中的游戏符号
export function GameGlyph(props: { id: GameGlyphId; size?: number; className?: string }) {
  const cell = glyphs.indexOf(props.id)
  return (
    <span
      className={`rush-game-glyph${props.className ? ` ${props.className}` : ''}`}
      data-glyph={props.id}
      aria-hidden="true"
      style={
        {
          '--game-glyph-size': `${props.size ?? 28}px`,
          backgroundPosition: `${(cell % 4) * (100 / 3)}% ${Math.floor(cell / 4) * (100 / 3)}%`,
        } as CSSProperties
      }
    />
  )
}
