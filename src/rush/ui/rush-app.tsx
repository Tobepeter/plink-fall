import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { RushPort } from '../types'
import { RushHud } from './rush-hud'
import { RushChoice } from './rush-choice'
import { RushLoading } from './rush-loading'
import { ControlGlyph } from './weapon-glyph'
import { RushMenu } from './meta/rush-menu'
import { RushResult } from './meta/rush-result'
import { RushPause } from './campaign/rush-pause'
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
  const previousPhase = useRef(state.phase)
  const previousPaused = useRef(state.paused)
  const ended = state.phase === 'dead' || state.phase === 'won'
  const menu = state.phase === 'menu'
  useLayoutEffect(() => {
    const fromMenu = previousPhase.current === 'menu' && state.phase === 'playing'
    const resumed = previousPaused.current && !state.paused && state.phase === 'playing'
    previousPhase.current = state.phase
    previousPaused.current = state.paused
    if ((fromMenu || resumed) && props.ready)
      document
        .querySelector<HTMLCanvasElement>('.rush-stage canvas')
        ?.focus({ preventScroll: true })
  }, [state.phase, state.paused, props.ready])
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
      className={`rush-shell${state.paused ? ' is-paused' : ''}${ended ? ' has-ended' : ''}${menu ? ' is-menu' : ''}`}
      aria-label="零点突围游戏"
    >
      <div
        className="rush-stage"
        ref={mountStage}
        inert={menu || state.paused || ended}
        aria-label="弹幕战斗场景"
      />
      {props.ready && !props.error && !menu && <RushHud state={state} store={store} ready />}
      {!props.ready && !props.error && <RushLoading frame={state.record.selected} />}
      {props.error && (
        <div className="rush-error" role="alert">
          <span>战场加载失败</span>
          <button
            className="rush-icon"
            onClick={() => window.location.reload()}
            aria-label="重新加载"
          >
            <ControlGlyph id="retry" />
          </button>
        </div>
      )}
      {intro && (
        <span className="rush-intro">
          <span className="rush-intro-keyboard">WASD 移动</span>
          <span className="rush-intro-touch">轻推空地移动</span>
          <i /> 自动开火 · 冲刺截弹
        </span>
      )}
      {props.ready && !props.error && !menu && <RushChoice state={state} store={store} />}
      {props.ready && !props.error && menu && (
        <RushMenu state={state} store={store} start={restart} />
      )}
      {state.paused && !ended && !menu && <RushPause state={state} store={store} resume={resume} />}
      {ended && <RushResult state={state} store={store} restart={restart} />}
    </main>
  )
}
