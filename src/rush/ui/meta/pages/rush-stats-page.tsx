import { Trophy } from 'lucide-react'
import type { RushState } from '../../../types'
import { time } from '../../weapon-glyph'
import { RushCoin } from '../rush-coin'

// 累计记录从首页收进独立战绩页
export function RushStatsPage(props: { state: RushState }) {
  const { record } = props.state
  const metrics = [
    { name: '出击次数', value: record.runs },
    { name: '存活记录', value: time(record.bestTime) },
    { name: '击败记录', value: record.bestKills },
    { name: '击败首领', value: record.bossKills },
  ]
  return (
    <div className="rush-stats-page rush-secondary">
      <div className="rush-stats-hero">
        <Trophy aria-hidden="true" />
        <b>{record.wins}</b>
        <span>成功突围</span>
      </div>
      <dl className="rush-stats-grid">
        {metrics.map((metric) => (
          <div key={metric.name}>
            <dt>{metric.name}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="rush-stats-total">
        <RushCoin />
        <b>{record.totalCoins}</b>
        <span>累计带回</span>
      </div>
      {record.lastRun && (
        <div className="rush-stats-last" aria-label="上次出击">
          <span>上次出击</span>
          <b>第 {record.lastRun.wave} 波</b>
          <span>{time(record.lastRun.seconds)}</span>
          <strong>
            +{record.lastRun.coins}
            <RushCoin />
          </strong>
        </div>
      )}
    </div>
  )
}
