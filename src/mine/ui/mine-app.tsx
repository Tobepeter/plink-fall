import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Check, Coins, LoaderCircle, Play, RotateCcw } from 'lucide-react'
import type { MinePort } from '../types'
import { MineHud } from './mine-hud'
import { MineTools, MineWorkshop } from './mine-tools'
import { amount } from './tool-glyph'
import '../mine.css'

export interface MineAppProps {
  store: MinePort
  stageRef: (node: HTMLDivElement | null) => void
  ready: boolean
  error: string | null
}

// 全视口矿场与场景操作
export function MineApp(props: MineAppProps) {
  const store = props.store
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const stageRef = props.stageRef
  const mountStage = useCallback((node: HTMLDivElement | null) => stageRef(node), [stageRef])
  const [workshop, setWorkshop] = useState(false)
  const [hiddenGuide, setHiddenGuide] = useState('')
  const [pulseDone, setPulseDone] = useState(state.deposits > 0)
  const [recallDone, setRecallDone] = useState(state.deposits > 0)
  const [notice, setNotice] = useState('')
  const previousNotice = useRef('')
  const resumeAuto = useRef(false)
  let guide = ''
  if (!state.started) guide = '点矿脉出钻'
  else if (state.probe.mode !== 'returning' && state.probe.mode !== 'docked') {
    if (state.probe.cargo.length > 0 && !recallDone) guide = '再点空地收缆'
    else if (state.probe.mode === 'mining' && !state.probe.cargo.length && !pulseDone) guide = '按住再松开，共鸣碎岩'
  }
  const restoreAuto = useCallback(() => {
    const resume = resumeAuto.current
    resumeAuto.current = false
    if (resume && !store.state.auto) store.toggleAuto()
  }, [store])
  const closeWorkshop = useCallback((focus = true) => {
    restoreAuto()
    setWorkshop(false)
    if (focus) window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLButtonElement>('.mine-base-control') ?? document.querySelector<HTMLButtonElement>('.mine-settings button:not(:disabled)')
      target?.focus({ preventScroll: true })
    })
  }, [restoreAuto])
  const toggleWorkshop = () => {
    if (workshop) { closeWorkshop(); return }
    if (store.state.probe.mode !== 'docked') return
    resumeAuto.current = store.state.auto
    if (store.state.auto) store.toggleAuto()
    setWorkshop(true)
  }
  const toggleAuto = () => {
    resumeAuto.current = false
    setWorkshop(false)
    store.toggleAuto()
  }
  const togglePause = () => {
    closeWorkshop(false)
    store.setPaused(!store.state.paused)
  }

  useEffect(() => {
    window.addEventListener('pagehide', restoreAuto)
    return () => { window.removeEventListener('pagehide', restoreAuto); restoreAuto() }
  }, [restoreAuto])

  useEffect(() => {
    return store.onEvent((event) => {
      if (event.type === 'pulse' && !event.tool) setPulseDone(true)
      if (event.type === 'return' && (event.amount ?? 0) > 0) setRecallDone(true)
    })
  }, [store])

  useEffect(() => {
    if (!guide || guide === '点矿脉出钻') return
    const timer = window.setTimeout(() => setHiddenGuide(guide), 4800)
    return () => window.clearTimeout(timer)
  }, [guide])

  useEffect(() => {
    if (!workshop) return
    const focus = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLButtonElement>('.mine-workshop-device:not(:disabled)') ?? document.querySelector<HTMLButtonElement>('.mine-workshop-close')
      target?.focus({ preventScroll: true })
    })
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      event.preventDefault()
      closeWorkshop()
    }
    const sceneInput = (event: PointerEvent) => { if (event.target instanceof HTMLCanvasElement) closeWorkshop(false) }
    window.addEventListener('keydown', close, true)
    window.addEventListener('pointerdown', sceneInput, true)
    return () => { window.cancelAnimationFrame(focus); window.removeEventListener('keydown', close, true); window.removeEventListener('pointerdown', sceneInput, true) }
  }, [workshop, closeWorkshop])

  useEffect(() => {
    if (!state.notice || state.notice === previousNotice.current) return
    previousNotice.current = state.notice
    if (!/存档|保存|无法|不足|不能|异常|重新/.test(state.notice)) return
    const show = window.setTimeout(() => setNotice(state.notice), 0)
    const hide = window.setTimeout(() => setNotice(''), 5000)
    return () => { window.clearTimeout(show); window.clearTimeout(hide) }
  }, [state.notice])

  return (
    <main className={`mine-shell${state.paused ? ' is-paused' : ''}`} aria-label='矿谷探针游戏'>
      <div className='mine-stage' ref={mountStage} aria-label='采矿场景' />
      <MineHud state={state} store={store} ready={props.ready && !props.error} workshop={workshop} onWorkshop={toggleWorkshop} onAuto={toggleAuto} onPause={togglePause} />
      {!props.ready && !props.error && <div className='mine-loading' role='status'><LoaderCircle size={21} /><span>勘探矿脉中</span></div>}
      {props.error && <div className='mine-error' role='alert'><span>矿场还没就绪</span><button className='mine-icon-control' onClick={() => window.location.reload()} aria-label='重新加载矿场'><RotateCcw size={20} /></button></div>}
      {props.ready && !props.error && !state.paused && !state.choices.length && guide && guide !== hiddenGuide && <span className='mine-guide' key={guide}>{guide}</span>}
      {state.paused && <button className='mine-resume' onClick={() => store.setPaused(false)} aria-label='继续采矿'><Play size={31} fill='currentColor' /><span>继续</span></button>}
      {props.ready && !props.error && <MineTools state={state} store={store} />}
      {props.ready && !props.error && workshop && state.probe.mode === 'docked' && !state.paused && !state.choices.length && <MineWorkshop state={state} store={store} onClose={() => closeWorkshop()} />}
      {state.offline > 0 && <button className='mine-offline' onClick={() => store.dismissOffline()} aria-label={`收下离线获得的${amount(state.offline)}晶币`}><Coins size={15} /><b>+{amount(state.offline)}</b><Check size={14} /></button>}
      <span className={`mine-notice${notice ? ' is-visible' : ''}`} role='status' aria-live='polite'>{notice}</span>
      <span className='mine-sr-only' aria-live='polite'>{state.notice}</span>
    </main>
  )
}
