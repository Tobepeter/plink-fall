import { frameDefinitions } from '../../model/data'
import type { RushPort, RushState } from '../../types'
import { FrameGlyph } from '../weapon-glyph'

// 机体快速切换
export function RushFrames(props: { state: RushState; store: RushPort }) {
  return (
    <div className="rush-frames" aria-label="选择机体">
      {frameDefinitions.map((frame) => {
        const unlocked = props.state.record.unlocked.includes(frame.id)
        return (
          <button
            className={`rush-frame${props.state.record.selected === frame.id ? ' is-selected' : ''}`}
            key={frame.id}
            onClick={() => props.store.selectFrame(frame.id)}
            disabled={!unlocked}
            aria-label={`${frame.name}，${unlocked ? frame.hint : frame.unlock}`}
            aria-pressed={props.state.record.selected === frame.id}
          >
            <FrameGlyph id={frame.id} />
            <b>{frame.name}</b>
            <small>{unlocked ? frame.hint : frame.unlock}</small>
          </button>
        )
      })}
    </div>
  )
}
