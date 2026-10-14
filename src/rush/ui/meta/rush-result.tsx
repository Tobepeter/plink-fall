import type { RushPort, RushState } from '../../types'
import { ControlGlyph, time } from '../weapon-glyph'
import { RushCoin } from './rush-coin'
import './rush-reward.css'

// 本局收益与下一次出击
export function RushResult(props: { state: RushState; store: RushPort; restart: () => void }) {
  const { state } = props
  const reward = state.settlement
  return (
    <section className="rush-result" aria-label={state.phase === 'won' ? '突围成功' : '本局战绩'}>
      <div className="rush-result-title">
        <span>
          {state.phase === 'won' ? '封锁解除' : `第 ${state.wave.index} 波 · ${state.wave.name}`}
        </span>
        <h1>{state.phase === 'won' ? '突破封锁' : '机体回收'}</h1>
      </div>
      <div className="rush-result-reward" aria-label={`本局获得 ${reward?.coins ?? 0} 金币`}>
        <span className="rush-reward-emblem">
          <RushCoin />
          <i />
          <i />
        </span>
        <div>
          <small>本局带回</small>
          <b>+{reward?.coins ?? 0}</b>
          <span>金币</span>
        </div>
      </div>
      {reward && (
        <div className="rush-reward-parts" aria-label="金币来源">
          <span>
            回收 <b>+{reward.base}</b>
          </span>
          <span>
            击败 <b>+{reward.kills}</b>
          </span>
          <span>
            波次 <b>+{reward.waves}</b>
          </span>
          {reward.bosses > 0 && (
            <span>
              首领 <b>+{reward.bosses}</b>
            </span>
          )}
          {reward.victory > 0 && (
            <span>
              通关 <b>+{reward.victory}</b>
            </span>
          )}
        </div>
      )}
      <div className="rush-results">
        <span>
          <b>{time(state.clock)}</b>
          <small>存活</small>
        </span>
        <span>
          <b>{state.kills}</b>
          <small>击败</small>
        </span>
        <span>
          <b>{state.level}</b>
          <small>等级</small>
        </span>
      </div>
      <p className="rush-result-encourage">带回的金币，变成下一次的火力</p>
      <p className="rush-best">
        最好 {time(state.record.bestTime)} <i /> {state.record.bestKills} 击败
      </p>
      <div className="rush-result-actions">
        <button className="rush-restart" onClick={() => props.store.openMenu()}>
          <ControlGlyph id="armor" />
          <span>返回整备</span>
        </button>
        <button className="rush-again" onClick={props.restart}>
          <ControlGlyph id="retry" />
          <span>直接再战</span>
        </button>
      </div>
      <span className="rush-result-balance">
        <RushCoin />
        余额 {state.record.coins}
      </span>
    </section>
  )
}
