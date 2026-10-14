import { ArrowDownToLine, Coins, Compass, Gem, Navigation, Package, Pause, Play, Thermometer, Volume2, VolumeX, Wrench } from 'lucide-react'
import { regions } from '../model/data'
import type { MinePort, MineState } from '../types'
import { amount } from './tool-glyph'

export interface MineHudProps {
  state: MineState
  store: MinePort
  ready: boolean
  workshop: boolean
  onWorkshop: () => void
  onAuto: () => void
  onPause: () => void
}

// 浮在矿场中的少量信息与控制
export function MineHud(props: MineHudProps) {
  const state = props.state
  const region = regions[state.region % regions.length]
  const docked = state.probe.mode === 'docked'
  const cargo = state.probe.cargo.length
  const progress = Math.min(100, state.banked / state.quota * 100)
  const canTravel = state.milestone >= 3 && state.relic && !state.choices.length && docked && !state.paused
  return (
    <>
      <div className='mine-hud'>
        <div className='mine-resources' aria-label={`${amount(state.coins)}晶币，${state.cores}矿芯`}><span className='mine-coins'><Coins size={17} /><b>{amount(state.coins)}</b></span><span className='mine-cores'><Gem size={13} /><b>{state.cores}</b></span></div>
        <div className='mine-goal'><span>{state.milestone >= 3 ? state.relic ? '遗物已回库' : '寻回深处遗物' : region.name}</span><b>{Math.min(state.banked, state.quota)}<small> / {state.quota}</small></b><i role='progressbar' aria-label='本矿场回库进度' aria-valuenow={Math.min(state.banked, state.quota)} aria-valuemin={0} aria-valuemax={state.quota}><span style={{ width: `${progress}%` }} /></i></div>
      </div>
      <div className='mine-settings' aria-label='游戏控制'>
        <button className='mine-icon-control' disabled={!props.ready} onClick={props.onPause} aria-label={state.paused ? '继续采矿' : '暂停采矿'}>{state.paused ? <Play size={18} /> : <Pause size={18} />}</button>
        <button className='mine-icon-control' onClick={() => props.store.toggleSound()} aria-label={state.muted ? '开启声音' : '关闭声音'} aria-pressed={!state.muted}>{state.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>
      {state.started && !docked && <div className={`mine-probe-status${state.probe.heat > 78 ? ' is-hot' : ''}`} aria-label={`载荷${cargo}/${state.capacity}，热量${Math.round(state.probe.heat)}`}><span><Package size={11} />{cargo}<small>/{state.capacity}</small></span><span><Thermometer size={11} />{Math.round(state.probe.heat)}°</span></div>}
      <div className='mine-flight-controls'>
        {!docked && <button className='mine-corner-control mine-recall' disabled={state.paused || state.probe.mode === 'returning'} onClick={() => props.store.recall()} aria-label={state.probe.mode === 'returning' ? '探针正在收缆回库' : '收缆回库'}><ArrowDownToLine size={21} /><span>{state.probe.mode === 'returning' ? '返航' : '收缆'}</span></button>}
        {state.deposits >= 2 && <button className={`mine-corner-control${state.auto ? ' is-active' : ''}`} onClick={props.onAuto} aria-label={state.auto ? '关闭自动巡采' : '开启自动巡采'} aria-pressed={state.auto}><Compass size={21} /><span>巡采</span></button>}
      </div>
      {state.deposits >= 2 && docked && !state.choices.length && !state.paused && <button className={`mine-base-control mine-corner-control${props.workshop ? ' is-active' : ''}`} onClick={props.onWorkshop} aria-label='基地改装' aria-expanded={props.workshop}><Wrench size={21} /><span>改装</span></button>}
      {canTravel && <button className='mine-travel-control mine-corner-control' onClick={() => props.store.travel()} aria-label={`带着永久改装前往${regions[(state.region + 1) % regions.length].name}`}><Navigation size={21} /><span>出发</span></button>}
      {state.visited.length > 1 && docked && <div className='mine-specimens' aria-label={`已探索${Math.min(regions.length, state.visited.length)}种矿场`}>{regions.map((item, index) => <Gem key={item.name} size={10} className={state.visited.some((visited) => visited % regions.length === index) ? 'is-found' : ''} />)}</div>}
    </>
  )
}
