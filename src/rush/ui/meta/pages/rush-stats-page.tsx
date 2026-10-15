import type { RushState } from '../../../types'
import { GameGlyph } from '../../game-glyph'
import { time } from '../../weapon-glyph'
import { RushCoin } from '../rush-coin'

// 战绩只读；奖励明细由玩家主动展开
export function RushStatsPage(props: { state: RushState }) {
  const { record } = props.state
  const metrics = [
    { name: '出击', icon: 'retry', value: record.runs },
    { name: '存活', icon: 'time', value: time(record.bestTime) },
    { name: '击败', icon: 'kills', value: record.bestKills },
    { name: '首领', icon: 'star', value: record.bossKills },
  ] as const
  const last = record.lastRun
  const parts = last
    ? [
        { name: '回收', value: last.base },
        { name: '击败', value: last.kills },
        { name: '波次', value: last.waves },
        { name: '首领', value: last.bosses },
        { name: '通关', value: last.victory },
        { name: '升星', value: last.difficultyBonus },
      ].filter((item) => item.value > 0)
    : []
  return (
    <div className="rush-stats-page rush-secondary">
      <div className="rush-stats-hero" aria-label={`成功突围 ${record.wins} 次`}>
        <GameGlyph id="stats" size={52} />
        <b>{record.wins}</b>
        <span>突围</span>
      </div>
      <dl className="rush-stats-grid">
        {metrics.map((metric) => (
          <div key={metric.name}>
            <dt>
              <GameGlyph id={metric.icon} size={26} />
              {metric.name}
            </dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="rush-stats-total" aria-label={`累计带回 ${record.totalCoins} 金币`}>
        <RushCoin />
        <b>{record.totalCoins}</b>
        <span>累计</span>
      </div>
      {last && (
        <details className="rush-stats-detail">
          <summary>
            <span>上次出击</span>
            <strong>
              <RushCoin size={22} />+{last.coins}
            </strong>
            <i className="rush-menu-chevron" aria-hidden="true" />
          </summary>
          <div className="rush-stats-last">
            <span aria-label={`第 ${last.wave} 波`}>
              <GameGlyph id="star" size={24} />
              <b>{last.wave}/9</b>
            </span>
            <span aria-label={`存活 ${time(last.seconds)}`}>
              <GameGlyph id="time" size={24} />
              <b>{time(last.seconds)}</b>
            </span>
            <span aria-label={`击败 ${last.killCount}`}>
              <GameGlyph id="kills" size={24} />
              <b>{last.killCount}</b>
            </span>
          </div>
          <dl className="rush-stats-parts" aria-label="上局金币来源">
            {parts.map((part) => (
              <div key={part.name}>
                <dt>{part.name}</dt>
                <dd>+{part.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  )
}
