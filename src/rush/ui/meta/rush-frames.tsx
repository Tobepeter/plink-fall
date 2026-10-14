import { frameDefinitions } from '../../model/data'
import { frameStats } from '../../model/frames'
import type { RushPort, RushState } from '../../types'
import { FrameGlyph } from '../weapon-glyph'
import { RushCoin } from './rush-coin'

// 机体快速切换
export function RushFrames(props: { state: RushState; store: RushPort }) {
  return (
    <div className="rush-frames" aria-label="选择机体">
      {frameDefinitions.map((frame) => {
        const unlocked = props.state.record.unlocked.includes(frame.id)
        const cost = frameStats[frame.id].unlockCost
        const affordable = props.state.record.coins >= cost
        const select = () => {
          if (!unlocked && !props.store.unlockFrame(frame.id)) return
          props.store.selectFrame(frame.id)
        }
        return (
          <button
            className={`rush-frame${props.state.record.selected === frame.id ? ' is-selected' : ''}${!unlocked ? ' is-locked' : ''}`}
            key={frame.id}
            onClick={select}
            disabled={!unlocked && !affordable}
            aria-label={`${frame.name}，${unlocked ? frameStats[frame.id].skillName : `解锁需要 ${cost} 金币，也可${frame.unlock}`}`}
            aria-pressed={props.state.record.selected === frame.id}
          >
            <FrameGlyph id={frame.id} />
            <b>{frame.name}</b>
            <small>{frameStats[frame.id].skillName}</small>
            {!unlocked && (
              <span className="rush-frame-unlock">
                <RushCoin />
                <b>{cost}</b>
                <span>解锁</span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
