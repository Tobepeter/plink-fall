import { Check, ChevronRight, LockKeyhole, Star } from 'lucide-react'
import { difficultyDefinitions } from '../../../model/campaign/difficulty'
import type { RushPort, RushState } from '../../../types'

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
              aria-label={`选择${item.id}星难度，金币收益 ${item.rewardMultiplier} 倍${locked ? '，尚未解锁' : ''}`}
              aria-pressed={selected}
              onClick={() => {
                if (props.store.selectDifficulty(item.id)) props.done()
              }}
            >
              <span className="rush-difficulty-emblem">
                <Star aria-hidden="true" />
                <b>{item.id}</b>
              </span>
              <span className="rush-difficulty-name">
                <b>{item.name}</b>
                <small>{locked ? `通关 ${item.id - 1} 星解锁` : item.hint.split(' · ')[0]}</small>
              </span>
              <span className="rush-difficulty-reward">
                ×{item.rewardMultiplier}
                <small>金币</small>
              </span>
              {locked ? (
                <LockKeyhole aria-hidden="true" />
              ) : selected ? (
                <Check aria-hidden="true" />
              ) : (
                <ChevronRight aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
      <p className="rush-page-note">
        {record.highestDifficulty === 3 ? '全部星级已解锁' : '通关当前星级，解锁下一星'}
      </p>
    </div>
  )
}
