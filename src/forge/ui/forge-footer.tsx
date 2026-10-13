import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FlaskConical,
  PackagePlus,
  Thermometer,
  Zap,
} from 'lucide-react'
import { modules, orderReward, research, researchCoinCost, researchCost } from '../model/data'
import type { ForgeState } from '../model/types'
import type { ForgeStore } from '../model/forge-store'
import { amount, ModuleIcon } from './module-icon'
import type { ForgeSheet } from './forge-sheets'

export interface ForgeFooterProps {
  state: ForgeState
  store: ForgeStore
  ready: boolean
  onSheet: (sheet: ForgeSheet) => void
  onDeliver: () => void
}

// 轻操作与渐进解锁
export function ForgeFooter(props: ForgeFooterProps) {
  const state = props.state
  const complete = state.stock >= state.goal
  const choicePending = state.choices.length > 0
  const boostReady = state.charge >= 1 && state.burstRemaining <= 0
  const installed = modules.filter((item) => (state.modules[item.id] ?? 0) > 0)
  const reward = orderReward(state)
  const canResearch = research.some(
    (item) =>
      state.research[item.id] < item.maxLevel &&
      state.blueprints >= researchCost(item.id, state.research[item.id]) &&
      state.coins >= researchCoinCost(item.id, state.research[item.id]),
  )
  let hint = '让矿石自动流动，把第一份月光装进箱子'
  if (state.started)
    hint =
      state.totalDeliveries === 0
        ? '矿石会自动加工，装满订单就能交付'
        : '点一下共振，让整条产线一起加速'
  if (complete) hint = '这一箱满了，交付后会收到新模块和蓝图'
  if (choicePending) hint = '新模块已送达，选一个让产线发生变化'
  if (state.paused) hint = '工坊已暂停，继续后矿石会重新流动'

  return (
    <footer className="forge-footer">
      <div className="forge-machine-stats">
        <span className={state.heat >= 75 ? 'forge-heat is-hot' : 'forge-heat'}>
          <Thermometer size={12} />
          {Math.round(state.heat)}°
          <i>
            <b style={{ width: `${Math.min(100, state.heat)}%` }} />
          </i>
        </span>
        <span className="forge-production">
          <b>{state.rate.toFixed(1)}</b>
          <span>晶 / 秒</span>
        </span>
        <span className="forge-installed" aria-label={`已安装 ${installed.length} 种模块`}>
          {installed.slice(0, 4).map((item) => (
            <ModuleIcon key={item.id} id={item.id} size={13} />
          ))}
          {installed.length === 0 && <span>原装工坊</span>}
          {installed.length > 4 && <b>+{installed.length - 4}</b>}
        </span>
      </div>
      <div className="forge-main-action">
        {!state.started ? (
          <button
            className="forge-button forge-button-primary"
            disabled={!props.ready}
            onClick={() => props.store.start()}
          >
            <span>开动工坊</span>
            <ArrowRight size={19} />
          </button>
        ) : state.paused ? (
          <button
            className="forge-button forge-button-primary"
            onClick={() => props.store.setPaused(false)}
          >
            <span>继续加工</span>
            <ArrowRight size={19} />
          </button>
        ) : choicePending ? (
          <button
            className="forge-button forge-button-gold"
            onClick={() => props.onSheet('modules')}
          >
            <PackagePlus size={19} />
            <span>选择新模块</span>
            <span className="forge-action-detail">三选一</span>
          </button>
        ) : complete ? (
          <button
            className="forge-button forge-button-gold forge-deliver"
            onClick={props.onDeliver}
          >
            <Check size={19} />
            <span>交付订单</span>
            <span className="forge-action-detail">+{amount(reward.coins)} 晶币</span>
          </button>
        ) : (
          <button
            className={`forge-button forge-boost${boostReady ? ' is-charged' : ''}`}
            disabled={!boostReady}
            onClick={() => props.store.resonate()}
            aria-label={
              boostReady ? '共振加速，短时加快加工' : `共振充能 ${Math.round(state.charge * 100)}%`
            }
          >
            <span
              className="forge-charge-fill"
              style={{ width: `${Math.min(100, state.charge * 100)}%` }}
            />
            <Zap size={18} />
            <span>{state.burstRemaining > 0 ? '共振加速中' : '共振加速'}</span>
            <span className="forge-action-detail">
              {state.burstRemaining > 0
                ? `${Math.ceil(state.burstRemaining)}s`
                : boostReady
                  ? '已就绪'
                  : `充能 ${Math.floor(state.charge * 100)}%`}
            </span>
          </button>
        )}
      </div>
      <p className="forge-hint" aria-live="polite">
        {hint}
      </p>
      {state.totalDeliveries >= 1 && (
        <nav className="forge-nav" aria-label="工坊系统">
          <button onClick={() => props.onSheet('modules')}>
            <PackagePlus size={15} />
            模块{choicePending && <i className="forge-nav-dot" />}
          </button>
          {state.totalDeliveries >= 2 && (
            <button onClick={() => props.onSheet('research')}>
              <FlaskConical size={15} />
              研究{canResearch && <i className="forge-nav-dot" />}
            </button>
          )}
          {state.totalDeliveries >= 2 && (
            <button onClick={() => props.onSheet('recipes')}>
              <BookOpen size={15} />
              收藏
            </button>
          )}
          {state.totalDeliveries >= 4 && state.deliveries >= 4 && (
            <button className="forge-jump-link" onClick={() => props.onSheet('jump')}>
              <ArrowUpRight size={15} />
              跃迁
            </button>
          )}
        </nav>
      )}
    </footer>
  )
}
