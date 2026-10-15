import type { CSSProperties } from 'react'
import { protocolDefinitions } from '../../model/combat/protocols'
import { upgrades } from '../../model/data'
import type { RushState } from '../../types'
import { WeaponGlyph } from '../weapon-glyph'
import './rush-loadout.css'

// 当前局的军械与双模块联动
export function RushLoadout(props: { state: RushState }) {
  const owned = upgrades.filter((item) => (props.state.upgrades[item.id] ?? 0) > 0)
  const active = protocolDefinitions.filter((item) =>
    item.parts.every((id) => (props.state.upgrades[id] ?? 0) > 0),
  ).length
  return (
    <div className="rush-loadout">
      <h3>
        军械{' '}
        <small>
          {owned.length} / {upgrades.length}
        </small>
      </h3>
      <ul className="rush-loadout-modules" aria-label="已装配军械">
        {owned.map((item) => {
          const level = props.state.upgrades[item.id] ?? 0
          return (
            <li key={item.id} data-upgrade={item.id} aria-label={`${item.name}，等级 ${level}`}>
              <WeaponGlyph id={item.id} size={52} />
              <b aria-hidden="true">{item.name}</b>
              <span className="rush-loadout-rank" aria-hidden="true">
                {Array.from({ length: item.maxLevel }, (_, index) => (
                  <i key={index} className={index < level ? 'is-owned' : ''} />
                ))}
              </span>
            </li>
          )
        })}
      </ul>
      {owned.length === 0 && <p className="rush-loadout-empty">尚未装配</p>}
      <h3>
        联动{' '}
        <small>
          {active} / {protocolDefinitions.length}
        </small>
      </h3>
      <ul className="rush-loadout-protocols" aria-label="双模块联动">
        {protocolDefinitions.map((item) => {
          const count = item.parts.filter((id) => (props.state.upgrades[id] ?? 0) > 0).length
          const status = count === 2 ? '已接通' : count === 1 ? '差 1 件' : '未接通'
          const names = item.parts.map((id) => upgrades.find((upgrade) => upgrade.id === id)!.name)
          return (
            <li
              key={item.id}
              data-protocol={item.id}
              className={count === 2 ? 'is-active' : count === 1 ? 'is-partial' : ''}
              style={{ '--protocol-color': item.color } as CSSProperties}
              aria-label={`${item.name}，${status}，${item.parts
                .map(
                  (id, index) =>
                    `${names[index]}${(props.state.upgrades[id] ?? 0) > 0 ? '已装配' : '未装配'}`,
                )
                .join('，')}`}
            >
              <span className="rush-loadout-pair" aria-hidden="true">
                {item.parts.map((id, index) => (
                  <span className={(props.state.upgrades[id] ?? 0) > 0 ? 'is-owned' : ''} key={id}>
                    <WeaponGlyph id={id} size={42} />
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
