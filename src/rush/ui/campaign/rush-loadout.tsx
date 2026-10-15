import type { CSSProperties } from 'react'
import {
  activeWeaponReactions,
  weaponCapacity,
  weaponDefinitions,
  weaponName,
  weaponReactions,
} from '../../model/armory/data'
import type { RushState, UpgradeId } from '../../types'
import { WeaponGlyph } from '../weapon-glyph'
import { ArmoryGlyph, ArmoryRank } from '../armory-glyph'
import { GameGlyph } from '../game-glyph'
import './rush-loadout.css'

const utilities: UpgradeId[] = ['haste', 'vital', 'magnet']

// 当前三槽、分支觉醒与真实双武器反应
export function RushLoadout(props: { state: RushState }) {
  const { state } = props
  const capacity = weaponCapacity(state)
  const active = activeWeaponReactions(state)
  const ownedUtilities = utilities.filter((id) => (state.upgrades[id] ?? 0) > 0)
  return (
    <div className="rush-loadout">
      <h3>
        武器{' '}
        <small>
          {state.weapons.length} / {capacity}
        </small>
      </h3>
      <ul className="rush-loadout-weapons" aria-label="本局武器槽">
        {Array.from({ length: 3 }, (_, index) => {
          const slot = state.weapons[index]
          const locked = index >= capacity
          const weapon = weaponDefinitions.find((item) => item.id === slot?.id)
          return (
            <li
              key={index}
              data-slot-index={index}
              data-weapon={slot?.id}
              className={locked ? 'is-locked' : slot ? 'is-owned' : 'is-empty'}
              style={{ '--weapon-color': weapon?.color } as CSSProperties}
              aria-label={`武器槽 ${index + 1}，${locked ? '玩家等级 4 开放' : slot ? `${weaponName(slot)}，等级 ${slot.level}${slot.branch ? `，${slot.branch === 'focus' ? '聚焦分支' : '扩散分支'}${slot.level >= 5 ? '，已觉醒' : ''}` : ''}` : '空槽'}`}
            >
              <span className="rush-loadout-weapon-icon">
                {slot ? <ArmoryGlyph id={slot.id} size={72} /> : <GameGlyph id="equip" size={38} />}
                {slot?.level === 5 && <GameGlyph id="star" size={21} />}
              </span>
              <b>{slot ? weaponName(slot) : locked ? 'Lv4 开放' : '空槽'}</b>
              <ArmoryRank level={slot?.level ?? 0} />
              <small>
                {slot
                  ? slot.branch
                    ? `${slot.branch === 'focus' ? '聚焦' : '扩散'}${slot.level >= 5 ? ' · 觉醒' : ''}`
                    : 'Lv3 分支'
                  : '—'}
              </small>
            </li>
          )
        })}
      </ul>
      {ownedUtilities.length > 0 && (
        <div className="rush-loadout-utilities" aria-label="机体补给">
          {ownedUtilities.map((id) => (
            <span
              key={id}
              aria-label={`${id === 'haste' ? '极速扳机' : id === 'vital' ? '修复甲' : '引力核'}，等级 ${state.upgrades[id]}`}
            >
              <WeaponGlyph id={id} size={27} />
              <b>{state.upgrades[id]}</b>
            </span>
          ))}
        </div>
      )}
      <h3>
        联动{' '}
        <small>
          {active.length} / {weaponReactions.length}
        </small>
      </h3>
      <ul className="rush-loadout-protocols" aria-label="双武器联动">
        {weaponReactions.map((item) => {
          const count = item.parts.filter((id) =>
            state.weapons.some((slot) => slot.id === id),
          ).length
          const status = count === 2 ? '已接通' : count === 1 ? '差 1 件' : '未接通'
          const names = item.parts.map(
            (id) => weaponDefinitions.find((weapon) => weapon.id === id)!.name,
          )
          return (
            <li
              key={item.id}
              data-protocol={item.id}
              className={count === 2 ? 'is-active' : count === 1 ? 'is-partial' : ''}
              style={{ '--protocol-color': item.color } as CSSProperties}
              aria-label={`${item.name}，${status}，${item.hint}，${item.parts.map((id, index) => `${names[index]}${state.weapons.some((slot) => slot.id === id) ? '已装备' : '未装备'}`).join('，')}`}
            >
              <span className="rush-loadout-pair" aria-hidden="true">
                {item.parts.map((id, index) => (
                  <span
                    className={state.weapons.some((slot) => slot.id === id) ? 'is-owned' : ''}
                    key={id}
                  >
                    <ArmoryGlyph id={id} size={42} />
                    <small>{names[index]}</small>
                  </span>
                ))}
                <i />
              </span>
              <b aria-hidden="true">{item.name}</b>
              <small className="rush-loadout-status" aria-hidden="true">
                <i />
                {status}
              </small>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
