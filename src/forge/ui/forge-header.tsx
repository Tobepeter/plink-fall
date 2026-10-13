import { ArrowUpRight, Coins, FileText, Moon, Settings2 } from 'lucide-react'
import { regions } from '../model/data'
import type { ForgeState } from '../model/types'
import { amount } from './module-icon'

// 标题与订单进度
export function ForgeHeader(props: { state: ForgeState; onSettings: () => void }) {
  const state = props.state
  const region = regions[state.region % regions.length]
  const progress = Math.min(100, (state.stock / state.goal) * 100)
  const ready = state.stock >= state.goal
  return (
    <header className="forge-header">
      <div className="forge-masthead">
        <div className="forge-brand">
          <span className="forge-brand-symbol">
            <Moon size={22} strokeWidth={1.6} />
          </span>
          <div>
            <span className="forge-eyebrow">MOON FORGE</span>
            <h1>月背工坊</h1>
          </div>
        </div>
        <div
          className="forge-wallet"
          aria-label={`${amount(state.coins)} 晶币，${state.blueprints} 蓝图`}
        >
          <span>
            <Coins size={14} />
            <b>{amount(state.coins)}</b>
          </span>
          <span className="forge-blueprints">
            <FileText size={13} />
            <b>{amount(state.blueprints)}</b>
          </span>
        </div>
        <button
          className="forge-icon-button forge-settings-button"
          onClick={props.onSettings}
          aria-label="工坊设置"
        >
          <Settings2 size={18} />
        </button>
      </div>
      <div className="forge-order">
        <div className="forge-order-line">
          <span className="forge-region-label">
            <i style={{ background: region.color }} />
            {region.name}
            <small> / {String(state.region + 1).padStart(2, '0')}</small>
          </span>
          <span className={ready ? 'forge-order-count is-ready' : 'forge-order-count'}>
            {ready ? (
              <>
                <ArrowUpRight size={13} /> 订单已装满
              </>
            ) : (
              <>
                订单 {String(state.orderIndex + 1).padStart(2, '0')}
                <b>
                  {amount(Math.min(state.stock, state.goal))}
                  <em> / {state.goal}</em>
                </b>
              </>
            )}
          </span>
        </div>
        <div
          className={`forge-order-track${ready ? ' is-ready' : ''}`}
          role="progressbar"
          aria-label="订单装载进度"
          aria-valuenow={Math.min(state.stock, state.goal)}
          aria-valuemax={state.goal}
          aria-valuemin={0}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="forge-wide-note">
        <span className="forge-eyebrow">A LITTLE MORE, EVERY TIME</span>
        <p>
          {state.started ? (
            <>
              已送达 <b>{state.totalDeliveries}</b> 箱月光
            </>
          ) : (
            '一条产线，许多可能'
          )}
        </p>
        <small>慢慢来，每一次选择都会让工坊变得不同</small>
      </div>
    </header>
  )
}
