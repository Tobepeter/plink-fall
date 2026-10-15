import { frameDefinitions } from '../../model/data'
import { frameStartingWeapon, weaponDefinitions } from '../../model/armory/data'
import { difficultyDefinitions } from '../../model/campaign/difficulty'
import { metaPrice, metaUpgrades } from '../../model/meta/progression'
import type { RushState } from '../../types'
import { GameGlyph } from '../game-glyph'
import { ArmoryGlyph } from '../armory-glyph'
import { RushHangar } from './rush-hangar'

export type RushMenuPage = 'home' | 'frames' | 'upgrades' | 'difficulty' | 'stats' | 'settings'

const entries = [
  { page: 'frames', name: '机体' },
  { page: 'upgrades', name: '强化' },
  { page: 'stats', name: '战绩' },
] as const

// 首屏只展示本次出击，细节由玩家主动打开
export function RushHome(props: {
  state: RushState
  start: () => void
  open: (page: RushMenuPage) => void
}) {
  const { record } = props.state
  const frame = frameDefinitions.find((item) => item.id === record.selected)!
  const weapon = weaponDefinitions.find((item) => item.id === frameStartingWeapon[frame.id])!
  const difficulty = difficultyDefinitions[record.difficulty]
  const canUpgrade = metaUpgrades.some((item) => {
    const price = metaPrice(record, item.id)
    return record.meta[item.id] < item.maxLevel && price > 0 && record.coins >= price
  })
  return (
    <div className="rush-home">
      <div className="rush-home-hero">
        <RushHangar frame={frame.id} />
        <h1>{frame.name}</h1>
        <span className="rush-home-skill">
          <ArmoryGlyph id={weapon.id} size={30} />
          {weapon.name}
        </span>
      </div>
      <div className="rush-home-controls">
        <button
          className="rush-difficulty-chip"
          data-menu-entry="difficulty"
          onClick={() => props.open('difficulty')}
          aria-label={`调整难度，当前 ${record.difficulty} 星 ${difficulty.name}`}
        >
          <GameGlyph id="star" size={22} />
          <span>{difficulty.name}</span>
          <b>{record.difficulty}</b>
          <i className="rush-menu-chevron" aria-hidden="true" />
        </button>
        <button className="rush-start" onClick={props.start}>
          <b>开始突围</b>
          <i className="rush-menu-arrow" aria-hidden="true" />
        </button>
        <nav className="rush-home-nav" aria-label="整备功能">
          {entries.map((entry) => (
            <button
              key={entry.page}
              className={entry.page === 'upgrades' && canUpgrade ? 'can-upgrade' : undefined}
              data-menu-entry={entry.page}
              onClick={() => props.open(entry.page)}
              aria-label={`打开${entry.name}${entry.page === 'upgrades' && canUpgrade ? '，可购买永久强化' : ''}`}
            >
              <GameGlyph id={entry.page} size={30} />
              <span>{entry.name}</span>
              {entry.page === 'upgrades' && canUpgrade && (
                <i className="rush-home-upgrade-mark" aria-hidden="true">
                  <GameGlyph id="level" size={17} />
                </i>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
