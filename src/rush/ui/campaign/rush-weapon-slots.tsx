import type { CSSProperties } from 'react'
import { weaponCapacity, weaponDefinitions, weaponName } from '../../model/armory/data'
import type { RushState } from '../../types'
import { ArmoryGlyph } from '../armory-glyph'
import { GameGlyph } from '../game-glyph'
import './rush-weapon-slots.css'

// 常驻三槽，第三槽随玩家等级开放
export function RushWeaponSlots(props: { state: RushState }) {
  const capacity = weaponCapacity(props.state)
  return (
    <ol className="rush-weapon-slots" aria-label="当前武器槽">
      {Array.from({ length: 3 }, (_, index) => {
        const slot = props.state.weapons[index]
        const locked = index >= capacity
        const color = weaponDefinitions.find((item) => item.id === slot?.id)?.color
        return (
          <li
            key={`${index}-${slot?.id}-${slot?.level}-${slot?.branch}`}
            className={locked ? 'is-locked' : slot ? 'is-filled' : 'is-empty'}
            data-slot-index={index}
            data-weapon={slot?.id}
            style={{ '--weapon-color': color } as CSSProperties}
            aria-label={`武器槽 ${index + 1}，${locked ? '玩家等级 4 开放' : slot ? `${weaponName(slot)}，等级 ${slot.level}` : '空槽'}`}
          >
            {slot ? <ArmoryGlyph id={slot.id} size={38} /> : <GameGlyph id="equip" size={25} />}
            {slot ? <b aria-hidden="true">{slot.level}</b> : <small>{locked ? 'Lv4' : '—'}</small>}
            {slot?.branch && (
              <i className={`rush-slot-branch is-${slot.branch}`} aria-hidden="true" />
            )}
            {slot?.level === 5 && <GameGlyph id="star" size={13} className="rush-slot-awakened" />}
          </li>
        )
      })}
    </ol>
  )
}
