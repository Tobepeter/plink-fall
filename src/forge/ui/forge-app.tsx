import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowRight, Check, LoaderCircle, Moon, Sparkles } from 'lucide-react'
import type { ForgeStore } from '../model/forge-store'
import { ForgeHeader } from './forge-header'
import { ForgeFooter } from './forge-footer'
import { ForgeSheets } from './forge-sheets'
import type { ForgeSheet } from './forge-sheets'
import '../forge.css'

export interface ForgeAppProps {
  store: ForgeStore
  stageRef: (node: HTMLDivElement | null) => void
  ready: boolean
  error: string | null
}

// 工坊界面装配
export function ForgeApp(props: ForgeAppProps) {
  const state = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  const [sheet, setSheet] = useState<ForgeSheet>(null)
  const [toast, setToast] = useState('')
  const lastNotice = useRef('')
  const stageRef = props.stageRef
  const mountStage = useCallback((node: HTMLDivElement | null) => stageRef(node), [stageRef])
  useEffect(() => {
    if (!state.notice || state.notice === lastNotice.current) return
    lastNotice.current = state.notice
    const show = window.setTimeout(() => setToast(state.notice), 0)
    const hide = window.setTimeout(() => setToast(''), 4200)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [state.notice])

  const deliver = () => {
    if (props.store.deliver()) setSheet('modules')
  }

  return (
    <div className="forge-page">
      <aside className="forge-desktop-note" aria-label="月背工坊简介">
        <span className="forge-eyebrow">A TINY FACTORY ON THE MOON</span>
        <h2>
          把月光
          <br />
          炼成一点收获
        </h2>
        <p>
          一条自己忙碌的产线
          <br />
          一份由你决定的成长
        </p>
        <span className="forge-note-line" />
        <span className="forge-note-detail">
          <Moon size={15} />
          轻点就好，不必拖拽
        </span>
        <span className="forge-note-detail">
          <Sparkles size={15} />
          每一箱都有新的可能
        </span>
        <small>Take your time. Make it yours.</small>
      </aside>
      <main
        className={`forge-shell${state.started ? ' is-started' : ''}`}
        aria-label="月背工坊游戏"
      >
        <ForgeHeader state={state} onSettings={() => setSheet('settings')} />
        <div className="forge-stage" ref={mountStage} aria-label="自动采集与加工产线">
          {!props.ready && !props.error && (
            <div className="forge-stage-cover forge-loading" role="status">
              <LoaderCircle className="forge-loading-icon" size={28} />
              <span>正在点亮工坊</span>
              <small>第一份月光，马上出炉</small>
            </div>
          )}
          {props.error && (
            <div className="forge-stage-cover forge-error" role="alert">
              <Moon size={30} />
              <h2>工坊还没点亮</h2>
              <p>{props.error}</p>
              <button
                className="forge-button forge-button-primary"
                onClick={() => window.location.reload()}
              >
                重新加载
                <ArrowRight size={17} />
              </button>
            </div>
          )}
          {props.ready && !props.error && !state.started && (
            <div className="forge-intro">
              <span className="forge-eyebrow">YOUR LITTLE MOON FACTORY</span>
              <h2>从一颗矿石开始</h2>
              <p>矿石自己加工，你来决定工坊怎么成长</p>
            </div>
          )}
          {props.ready && state.started && (
            <div className="forge-stage-status">
              <i className={state.paused ? 'is-paused' : ''} />
              <span>
                {state.paused
                  ? '工坊休息中'
                  : state.burstRemaining > 0
                    ? '共振中 · 整条产线正在加速'
                    : '自动采集 · 加工 · 结晶'}
              </span>
            </div>
          )}
          {state.paused && state.started && (
            <div className="forge-paused-tag">
              <Moon size={19} />
              <span>慢一点也没关系</span>
            </div>
          )}
          <div
            className={`forge-toast${toast ? ' is-visible' : ''}`}
            role="status"
            aria-live="polite"
          >
            <Check size={16} />
            <span>{toast}</span>
          </div>
        </div>
        <ForgeFooter
          state={state}
          store={props.store}
          ready={props.ready && !props.error}
          onSheet={setSheet}
          onDeliver={deliver}
        />
        <ForgeSheets
          state={state}
          store={props.store}
          sheet={sheet}
          onClose={() => setSheet(null)}
        />
      </main>
    </div>
  )
}
