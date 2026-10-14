import { useCallback, useSyncExternalStore } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { frameDefinitions } from '../model/data'
import type { RushPort } from '../types'
import { RushHud } from './rush-hud'
import { RushChoice } from './rush-choice'
import { FrameGlyph, time } from './weapon-glyph'
import '../rush.css'

export interface RushAppProps {
  store: RushPort
  stageRef: (node: HTMLDivElement | null) => void
  ready: boolean
  error: string | null
}

// 全视口突围与战斗结束
export function RushApp(props: RushAppProps) {
  const { store } = props
  const stageRef = props.stageRef
  const mountStage = useCallback((node: HTMLDivElement | null) => stageRef(node), [stageRef])
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const ended = state.phase === 'dead' || state.phase === 'won'
  const intro =
    props.ready &&
    state.phase === 'playing' &&
    !state.paused &&
    state.clock < 9 &&
    state.player.walk < 20
  const restart = () => {
    store.restart()
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  const resume = () => {
    store.setPaused(false)
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  return (
    <main
      className={`rush-shell${state.paused ? ' is-paused' : ''}${ended ? ' has-ended' : ''}`}
      aria-label="零点突围游戏"
    >
      <div className="rush-stage" ref={mountStage} aria-label="弹幕战斗场景" />
      <RushHud state={state} store={store} ready={props.ready && !props.error} />
      {!props.ready && !props.error && (
        <span className="rush-loading" role="status">
          进入战场
        </span>
      )}
      {props.error && (
        <div className="rush-error" role="alert">
          <span>战场加载失败</span>
          <button
            className="rush-icon"
            onClick={() => window.location.reload()}
            aria-label="重新加载"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      )}
      {intro && (
        <span className="rush-intro">
          <span className="rush-intro-keyboard">WASD 移动</span>
          <span className="rush-intro-touch">轻推空地移动</span>
          <i /> 自动开火
        </span>
      )}
      {props.ready && !props.error && <RushChoice state={state} store={store} />}
      {state.paused && !ended && (
        <button className="rush-resume" onClick={resume} aria-label="继续战斗">
          <Play size={32} fill="currentColor" />
          <span>继续突围</span>
        </button>
      )}
      {ended && (
        <div className="rush-result" aria-label={state.phase === 'won' ? '突围成功' : '本局战绩'}>
          <div className="rush-result-title">
            <span>{state.phase === 'won' ? 'ESCAPED' : 'RUN OVER'}</span>
            <h1>{state.phase === 'won' ? '突破封锁' : '突围失败'}</h1>
          </div>
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
          <p className="rush-best">
            最好 {time(state.record.bestTime)} <i /> {state.record.bestKills} 击败
          </p>
          <div className="rush-frames" aria-label="选择机体">
            {frameDefinitions.map((frame) => {
              const unlocked = state.record.unlocked.includes(frame.id)
              return (
                <button
                  className={`rush-frame${state.record.selected === frame.id ? ' is-selected' : ''}`}
                  key={frame.id}
                  onClick={() => store.selectFrame(frame.id)}
                  disabled={!unlocked}
                  aria-label={`${frame.name}，${unlocked ? frame.hint : '尚未解锁'}`}
                  aria-pressed={state.record.selected === frame.id}
                  style={{ color: frame.color }}
                >
                  <FrameGlyph id={frame.id} />
                  <b>{frame.name}</b>
                  <small>
                    {unlocked ? (state.record.selected === frame.id ? '出战' : '可出战') : '未解锁'}
                  </small>
                </button>
              )
            })}
          </div>
          <button className="rush-restart" onClick={restart}>
            <RotateCcw size={19} />
            <span>再来一局</span>
          </button>
        </div>
      )}
    </main>
  )
}
