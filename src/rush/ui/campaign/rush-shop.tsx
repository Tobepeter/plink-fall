import { useState } from 'react'
import { upgrades } from '../../model/data'
import { upgradeHint } from '../../model/combat/upgrade-hints'
import { shopPrice, shopRerollPrice } from '../../model/campaign/shop'
import { waveDefinitions } from '../../model/campaign/waves'
import type { RushPort, RushState, ShopItemId } from '../../types'
import { ControlGlyph, WeaponGlyph } from '../weapon-glyph'
import { RushScrap } from './rush-scrap'
import './rush-shop.css'
import './rush-shop-layout.css'

// 波间补给与本局军械深化
export function RushShop(props: { state: RushState; store: RushPort }) {
  const { state, store } = props
  const [feedback, setFeedback] = useState('零件留在本局，金币带回整备舱')
  const shop = state.shop
  if (state.phase !== 'shop' || !shop) return null
  const rerollCost = shopRerollPrice(state)
  const alternatives =
    upgrades.some(
      (item) =>
        (state.upgrades[item.id] ?? 0) < item.maxLevel &&
        !shop.offers.includes(item.id) &&
        !shop.purchased.includes(item.id),
    ) ||
    (state.player.hp < state.player.maxHp &&
      !shop.offers.includes('repair') &&
      !shop.purchased.includes('repair'))
  const buy = (id: ShopItemId) => {
    if (!store.buyUpgrade(id)) return
    setFeedback(
      id === 'repair'
        ? '装甲修复，准备接敌'
        : `${upgrades.find((item) => item.id === id)!.name}已装载`,
    )
  }
  const reroll = () => {
    setFeedback(store.rerollShop() ? '新一批军械已到位' : '没有可替换的军械，零件已保留')
  }
  return (
    <section className="rush-intermission" aria-label="波间整备">
      <header className="rush-shop-header">
        <span>
          前线补给 <i /> 第 {shop.wave} / 9 波完成
        </span>
        <div className="rush-shop-wallet" aria-label={`本局零件 ${state.scrap}`}>
          <RushScrap />
          <b>{state.scrap}</b>
          <small>零件</small>
        </div>
        <button
          className="rush-icon"
          onClick={() => store.toggleSound()}
          aria-label={state.record.muted ? '开启声音' : '关闭声音'}
          aria-pressed={!state.record.muted}
        >
          <ControlGlyph id={state.record.muted ? 'muted' : 'sound'} />
        </button>
      </header>
      <div className="rush-shop-title">
        <small>把现有火力，再推一档</small>
        <h1>战线整备</h1>
        <span>下一波 · {waveDefinitions[shop.wave]?.name ?? '封锁解除'}</span>
      </div>
      <div className="rush-shop-rack" aria-label="选择军械补给">
        {shop.offers.map((id) => {
          const repair = id === 'repair'
          const item = upgrades.find((entry) => entry.id === id)
          const rank = repair ? 0 : (state.upgrades[id] ?? 0)
          const bought = shop.purchased.includes(id)
          const price = shopPrice(state, id)
          const valid = repair ? state.player.hp < state.player.maxHp : rank < (item?.maxLevel ?? 5)
          const affordable = !bought && valid && state.scrap >= price
          const name = repair ? '装甲补给' : item!.name
          return (
            <button
              className={`rush-shop-offer${affordable ? ' is-affordable' : ''}${bought ? ' is-installed' : ''}`}
              key={id}
              disabled={!affordable}
              onClick={() => buy(id)}
              aria-label={`${name}，${bought ? '本波已购买' : `${price} 零件`}`}
            >
              <span className="rush-shop-mount">
                <i />
                <WeaponGlyph id={repair ? 'vital' : id} size={112} />
                <span className="rush-shop-pins">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span className="rush-shop-info">
                <b>{name}</b>
                <span className="rush-shop-rank">
                  {bought
                    ? '已装载'
                    : repair
                      ? '修复 2 格'
                      : rank > 0
                        ? `LV ${rank} → ${rank + 1}`
                        : '新模块'}
                </span>
                <small>
                  {bought
                    ? '强化已生效'
                    : repair
                      ? `${state.player.hp} / ${state.player.maxHp} 格装甲`
                      : upgradeHint(state, id)}
                </small>
              </span>
              <span className="rush-shop-price">
                {bought ? (
                  <span>✓ 完成</span>
                ) : (
                  <>
                    <RushScrap />
                    <b>{price}</b>
                    <span>{valid ? '装载' : '装甲完好'}</span>
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p className="rush-shop-feedback" role="status">
        {feedback}
      </p>
      <footer className="rush-shop-actions">
        <button
          className="rush-shop-reroll"
          onClick={reroll}
          disabled={state.scrap < rerollCost || !alternatives}
          aria-label={`重抽军械，需要 ${rerollCost} 零件`}
        >
          <ControlGlyph id="retry" />
          <span>换批军械</span>
          <RushScrap />
          <b>{rerollCost}</b>
        </button>
        <button className="rush-next-wave rush-start" onClick={() => store.continueWave()}>
          <ControlGlyph id="play" />
          <b>下一波</b>
          <span>→</span>
        </button>
      </footer>
      <span className="rush-shop-footnote">可直接出发 · 未花的零件保留到下一波</span>
    </section>
  )
}
