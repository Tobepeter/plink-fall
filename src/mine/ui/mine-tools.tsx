import { Cable, Check, Coins, Gem, ShoppingBag, Snowflake, X, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import { metaCost, metaDefinitions, tools } from '../model/data'
import type { MinePort, MineState, ToolId } from '../types'
import { amount, ToolGlyph, ToolSprite } from './tool-glyph'

const hints: Record<ToolId, string> = {
  pierce: '贯穿前方矿脉', chain: '连锁击碎邻矿', magnet: '扫矿多装3件', drone: '独立采矿回库',
  split: '钻击散向两侧', saw: '环切近处矿体', vent: '长按喷雾灭气泡', winch: '卷回沿缆矿石',
}

// 回库装备，世界保持可见
export function MineTools(props: { state: MineState; store: MinePort }) {
  const choices = props.state.choices
  if (!choices.length || props.state.paused) return null
  return (
    <section className='mine-loot' aria-label='选择一件探针装备'>
      <span className='mine-loot-title'>选一件，装上出发</span>
      <div className='mine-loot-row'>
        {choices.map((id) => {
          const tool = tools.find((item) => item.id === id)
          if (!tool) return null
          const level = (props.state.tools[id] ?? 0) + 1
          return <button className='mine-tool-choice' data-tool={id} key={id} style={{ '--tool-color': tool.color } as CSSProperties} onClick={() => props.store.choose(id)} aria-label={`安装${tool.name}，${hints[id]}，${level}级`}><span className='mine-tool-display'><span className='mine-tool-halo' /><ToolSprite id={id} />{id === 'chain' && <span className='mine-chain-arcs' aria-hidden='true'><Zap /><Zap /><Zap /></span>}<span className='mine-tool-mark'><ToolGlyph id={id} size={16} /></span></span><strong>{tool.name}</strong><span className='mine-tool-hint'>{hints[id]}</span><span className='mine-tool-level'>Lv.{level}</span></button>
        })}
      </div>
    </section>
  )
}

// 基地旁的三种改装设备
export function MineWorkshop(props: { state: MineState; store: MinePort; onClose: () => void }) {
  const icons = { spool: Cable, cooling: Snowflake, bag: ShoppingBag }
  const hints = { spool: '缆长 +70', cooling: '散热 +20%', bag: '载荷 +2' }
  return (
    <section className='mine-workshop' role='dialog' aria-label='基地改装' aria-modal={false}>
      <button className='mine-workshop-close mine-icon-control' onClick={props.onClose} aria-label='退出改装'><X size={18} /></button>
      <div className='mine-workshop-devices'>
        {metaDefinitions.map((item) => {
          const level = props.state.meta[item.id]
          const cost = metaCost(item.id, level)
          const maxed = level >= item.maxLevel
          const canBuy = !maxed && props.state.coins >= cost.coins && props.state.cores >= cost.cores
          const Icon = icons[item.id]
          return <button className='mine-workshop-device' key={item.id} disabled={!canBuy} onClick={() => props.store.buyMeta(item.id)} aria-label={maxed ? `${item.name}已满级` : `改装${item.name}，${hints[item.id]}，花费${cost.coins}晶币和${cost.cores}矿芯，${canBuy ? '可购买' : '资源不足'}`}><span className='mine-meta-glyph'><Icon size={29} strokeWidth={1.6} /></span><strong>{item.name}</strong><span className='mine-meta-level'>Lv.{level} · {hints[item.id]}</span>{maxed ? <span className='mine-meta-max'><Check size={11} />满级</span> : <span className='mine-meta-cost'><span><Coins size={10} />{amount(cost.coins)}</span><span><Gem size={10} />{cost.cores}</span></span>}</button>
        })}
      </div>
    </section>
  )
}
