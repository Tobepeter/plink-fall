import {
  ArrowRight,
  Check,
  Coins,
  FileText,
  Gem,
  LockKeyhole,
  Snowflake,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { modules, recipes, regions, research, researchCoinCost, researchCost } from '../model/data'
import type { ForgeStore } from '../model/forge-store'
import type { ForgeState } from '../model/types'
import { amount, ModuleIcon } from './module-icon'

export interface ForgePanelProps {
  state: ForgeState
  store: ForgeStore
  onClose: () => void
}

// 模块构筑与永久成长
export function ModulesPanel(props: ForgePanelProps) {
  const choices = props.state.choices
  const choosing = choices.length > 0
  const entries = modules.filter((item) =>
    choosing ? choices.includes(item.id) : (props.state.modules[item.id] ?? 0) > 0,
  )
  return (
    <div className="forge-panel-body">
      {choosing && props.state.lastReward && (
        <div className="forge-delivery-reward">
          <Check size={14} />
          <span>订单送达</span>
          <b>
            <Coins size={13} />+{amount(props.state.lastReward.coins)}
          </b>
          <b>
            <FileText size={13} />+{props.state.lastReward.blueprints}
          </b>
        </div>
      )}
      <p className="forge-panel-intro">
        {choosing
          ? '一次只选一个，安装后马上生效。工坊仍在继续加工'
          : '这次旅程的产线搭档。交付订单，迎接下一个新模块'}
      </p>
      <div className="forge-module-list">
        {entries.map((item) => {
          const level = props.state.modules[item.id] ?? 0
          const contents = (
            <>
              <span className="forge-module-icon" style={{ background: item.color }}>
                <ModuleIcon id={item.id} size={25} />
              </span>
              <div className="forge-module-copy">
                <div className="forge-module-title">
                  <h3>{item.name}</h3>
                  <span>{choosing ? `Lv.${level + 1}` : `Lv.${level}`}</span>
                </div>
                <p className="forge-module-effect">{item.effect}</p>
                <p className="forge-module-tradeoff">{item.tradeoff}</p>
              </div>
              {choosing && <ArrowRight size={17} className="forge-module-arrow" />}
            </>
          )
          return choosing ? (
            <button
              className="forge-module-card"
              key={item.id}
              onClick={() => {
                if (props.store.choose(item.id)) props.onClose()
              }}
            >
              {contents}
            </button>
          ) : (
            <div className="forge-module-card is-installed" key={item.id}>
              {contents}
            </div>
          )
        })}
      </div>
      {choosing && (
        <div className="forge-panel-tip">
          <Sparkles size={16} />
          <span>想更快装满订单？看“采矿速度”和“每颗产量”。热量高了，就给它找个冷却搭档</span>
        </div>
      )}
      {!choosing && entries.length === 0 && (
        <div className="forge-empty">
          <Wrench size={28} />
          <p>新旅程，轻装启程</p>
          <span>交付第一箱晶石，就能选一个新模块</span>
        </div>
      )}
      {!choosing && (
        <div className="forge-panel-tip">
          <Check size={16} />
          <span>同一模块可以升级，效果会叠加。跃迁时重新构筑，研究会一直保留</span>
        </div>
      )}
    </div>
  )
}

export function ResearchPanel(props: ForgePanelProps) {
  const icons = { drill: Wrench, cooling: Snowflake, value: Gem }
  return (
    <div className="forge-panel-body">
      <div className="forge-research-balance">
        <span>
          <FileText size={15} />
          蓝图<b>{amount(props.state.blueprints)}</b>
        </span>
        <span>
          <Coins size={16} />
          晶币<b>{amount(props.state.coins)}</b>
        </span>
      </div>
      <p className="forge-panel-intro">用交付得到的蓝图和晶币升级，带着它去每一片月海</p>
      <div className="forge-research-list">
        {research.map((item) => {
          const level = props.state.research[item.id]
          const cost = researchCost(item.id, level)
          const coinCost = researchCoinCost(item.id, level)
          const maxed = level >= item.maxLevel
          const hasBlueprints = props.state.blueprints >= cost
          const hasCoins = props.state.coins >= coinCost
          const affordable = hasBlueprints && hasCoins
          const label = affordable
            ? '升级'
            : !hasBlueprints && !hasCoins
              ? '资源不足'
              : hasBlueprints
                ? '晶币不足'
                : '蓝图不足'
          const Icon = icons[item.id]
          return (
            <div className="forge-research-row" key={item.id}>
              <span className="forge-research-icon">
                <Icon size={22} strokeWidth={1.6} />
              </span>
              <div className="forge-research-copy">
                <h3>
                  {item.name}
                  <small>Lv.{level}</small>
                </h3>
                <p>{item.description}</p>
                <div
                  className="forge-level-track"
                  aria-label={`${level} 级，共 ${item.maxLevel} 级`}
                >
                  {Array.from({ length: item.maxLevel }, (_, index) => (
                    <i key={index} className={index < level ? 'is-filled' : ''} />
                  ))}
                </div>
              </div>
              <button
                className="forge-research-buy"
                disabled={maxed || !affordable}
                onClick={() => props.store.researchUpgrade(item.id)}
                aria-label={
                  maxed
                    ? `${item.name}已满级`
                    : `花费 ${cost} 蓝图和 ${coinCost} 晶币升级${item.name}`
                }
              >
                {maxed ? (
                  <>
                    <Check size={15} />
                    已满级
                  </>
                ) : (
                  <>
                    <b>
                      <FileText size={12} />
                      {cost}
                    </b>
                    <b>
                      <Coins size={12} />
                      {amount(coinCost)}
                    </b>
                    <span>{label}</span>
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RecipesPanel(props: ForgePanelProps) {
  return (
    <div className="forge-panel-body">
      <div className="forge-collection-heading">
        <span>月海结晶图鉴</span>
        <b>
          {props.state.recipes.length}
          <small> / {recipes.length}</small>
        </b>
      </div>
      <p className="forge-panel-intro">让每一段旅程，留下一个小小的纪念</p>
      <div className="forge-recipe-list">
        {recipes.map((item, index) => {
          const unlocked = props.state.recipes.includes(item.id)
          return (
            <div className={`forge-recipe-card${unlocked ? '' : ' is-locked'}`} key={item.id}>
              <span
                className="forge-recipe-specimen"
                style={{ background: unlocked ? item.color : undefined }}
              >
                {unlocked ? (
                  <Gem size={38} strokeWidth={1.35} />
                ) : (
                  <LockKeyhole size={28} strokeWidth={1.5} />
                )}
              </span>
              <div>
                <span className="forge-eyebrow">SPECIMEN / 0{index + 1}</span>
                <h3>
                  {item.name}
                  {unlocked && <Check size={13} />}
                </h3>
                <p>{unlocked ? item.description : `前往${regions[index].name}，发现新的结晶`}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="forge-panel-tip">
        <Gem size={16} />
        <span>交付 4 次订单后，带工坊启程，去发现下一种结晶</span>
      </div>
    </div>
  )
}
