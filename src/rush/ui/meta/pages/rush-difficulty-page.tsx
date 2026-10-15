import { difficultyDefinitions } from '../../../model/campaign/difficulty'
import type { RushPort, RushState } from '../../../types'
import { GameGlyph } from '../../game-glyph'
import { RushCoin } from '../rush-coin'

// 星级在自己的页面选择，确认后回到出击
export function RushDifficultyPage(props: { state: RushState; store: RushPort; done: () => void }) {
  const { record } = props.state
  return (
    <div className="rush-difficulty-page rush-secondary">
      <div className="rush-difficulty-list" aria-label="选择封锁星级">
        {difficultyDefinitions.map((item) => {
          const locked = item.id > record.highestDifficulty
          const selected = record.difficulty === item.id
          return (
            <button
              key={item.id}
              className={`rush-difficulty-option${selected ? ' is-selected' : ''}`}
              disabled={locked}
              aria-label={`选择${item.id}星难度，${item.hint}，金币收益 ${item.rewardMultiplier} 倍${locked ? '，尚未解锁' : ''}`}
              aria-pressed={selected}
              onClick={() => {
                if (props.store.selectDifficulty(item.id)) props.done()
              }}
            >
              <span className="rush-difficulty-emblem">
                <GameGlyph id="star" size={42} className="rush-star-art" />
                <b>{item.id}</b>
              </span>
              <span className="rush-difficulty-name">
                <b>{item.name}</b>
                {locked && <small>通关 {item.id - 1} 星解锁</small>}
              </span>
              <span className="rush-difficulty-reward">
                ×{item.rewardMultiplier}
                <RushCoin size={20} />
              </span>
              {locked ? (
                <span className="rush-difficulty-locked" aria-hidden="true">
                  —
                </span>
              ) : selected ? (
                <GameGlyph id="equip" size={22} />
              ) : (
                <i className="rush-menu-chevron" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
