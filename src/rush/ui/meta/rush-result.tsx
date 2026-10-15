import type { RushPort, RushState } from '../../types'
import { GameGlyph } from '../game-glyph'
import { time } from '../weapon-glyph'
import { RushCoin } from './rush-coin'
import './rush-reward.css'

// 结算只呈现本局所得和下一步，明细收进战绩页
export function RushResult(props: { state: RushState; store: RushPort; restart: () => void }) {
  const { state } = props
  const reward = state.settlement
  return (
    <section className="rush-result" aria-label={state.phase === 'won' ? '突围成功' : '本局战绩'}>
      <div className="rush-settlement">
        <header className="rush-settlement-title">
          <h1>{state.phase === 'won' ? '突围成功' : '机体回收'}</h1>
          <span aria-label={`第 ${state.wave.index} 波，共 9 波`}>
            <GameGlyph id="star" size={24} />
            <b>{state.wave.index}/9</b>
          </span>
        </header>
        <div className="rush-result-reward" aria-label={`本局获得 ${reward?.coins ?? 0} 金币`}>
          <RushCoin size={84} />
          <b>+{reward?.coins ?? 0}</b>
        </div>
        <div className="rush-results">
          <span aria-label={`存活 ${time(state.clock)}`}>
            <GameGlyph id="time" size={28} />
            <b>{time(state.clock)}</b>
          </span>
          <span aria-label={`击败 ${state.kills}`}>
            <GameGlyph id="kills" size={28} />
            <b>{state.kills}</b>
          </span>
          <span aria-label={`等级 ${state.level}`}>
            <GameGlyph id="level" size={28} />
            <b>{state.level}</b>
          </span>
        </div>
        <div className="rush-result-actions">
          <button className="rush-restart" onClick={() => props.store.openMenu()}>
            <GameGlyph id="home" size={30} />
            <span>返回整备</span>
          </button>
          <button className="rush-again" onClick={props.restart} aria-label="直接再战">
            <GameGlyph id="retry" size={24} />
            <span>再战</span>
          </button>
        </div>
      </div>
    </section>
  )
}
