import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { RushPort } from '../types'
import { RushHud } from './rush-hud'
import { RushChoice } from './rush-choice'
import { RushLoading } from './rush-loading'
import { ControlGlyph } from './weapon-glyph'
import { RushMenu } from './meta/rush-menu'
import { RushResult } from './meta/rush-result'
import { RushShop } from './campaign/rush-shop'
import { RushAim } from './campaign/rush-aim'
import '../rush.css'
import './campaign/rush-pause.css'

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
  const ended = state.phase === 'dead' || state.phase === 'won'
  const menu = state.phase === 'menu'
  const shop = state.phase === 'shop'
  useLayoutEffect(() => {
    const fromMenu =
      (previousPhase.current === 'menu' || previousPhase.current === 'shop') &&
      state.phase === 'playing'
    previousPhase.current = state.phase
    if (fromMenu && props.ready && document.activeElement === document.body)
      document
        .querySelector<HTMLCanvasElement>('.rush-stage canvas')
        ?.focus({ preventScroll: true })
  }, [state.phase, props.ready])
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
      className={`rush-shell${state.paused ? ' is-paused' : ''}${ended ? ' has-ended' : ''}${menu ? ' is-menu' : ''}${state.phase === 'choice' ? ' is-choosing' : ''}`}
      aria-label="零点突围游戏"
    >
      <div className="rush-stage" ref={mountStage} aria-label="弹幕战斗场景" />
      {props.ready && !props.error && !menu && !shop && (
        <RushHud state={state} store={store} ready />
      )}
      {!props.ready && !props.error && <RushLoading />}
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
      {props.ready && !props.error && shop && <RushShop state={state} store={store} />}
      {state.paused && !ended && !menu && !shop && (
        <>
          <button className="rush-resume" onClick={resume} aria-label="继续战斗">
            <ControlGlyph id="play" />
            <span>继续突围</span>
          </button>
          <div className="rush-pause-aim">
            <RushAim store={store} enabled={state.record.mouseAim} />
            <span>{state.record.mouseAim ? '鼠标方向瞄准' : '自动瞄准最近敌人'}</span>
          </div>
        </>
      )}
      {ended && <RushResult state={state} store={store} restart={restart} />}
    </main>
  )
}
