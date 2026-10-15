import type { CSSProperties } from 'react'
import type { WeaponId } from '../types'
import './armory-glyph.css'

const weapons: WeaponId[] = ['laser', 'scatter', 'flame', 'toxin', 'arc', 'blade']

// 统一军械图集，列序与生成素材一致
export function ArmoryGlyph(props: { id: WeaponId; size?: number }) {
  const cell = weapons.indexOf(props.id)
  return (
    <span
      className="rush-armory-glyph"
      data-weapon={props.id}
      aria-hidden="true"
      style={
        {
          '--armory-size': `${props.size ?? 68}px`,
          backgroundPosition: `${(cell % 3) * 50}% ${Math.floor(cell / 3) * 100}%`,
        } as CSSProperties
      }
    />
  )
}

export function ArmoryRank(props: { level: number; next?: number }) {
  return (
    <span className="rush-armory-rank" aria-hidden="true">
      {Array.from({ length: 5 }, (_, rank) => (
        <i
          key={rank}
          className={rank < props.level ? 'is-owned' : rank < (props.next ?? 0) ? 'is-next' : ''}
        />
      ))}
    </span>
  )
}
