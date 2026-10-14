import { useState } from 'react'
import type { CSSProperties } from 'react'
import { frameDefinitions } from '../../model/data'
import { metaPrice, metaUpgrades } from '../../model/meta/progression'
import type { MetaUpgradeId, RushPort, RushState } from '../../types'
import { ControlGlyph, FrameGlyph, WeaponGlyph, time } from '../weapon-glyph'
import { RushCoin } from './rush-coin'
import { RushFrames } from './rush-frames'
import './rush-menu.css'
import './rush-hangar.css'
import './rush-meta-upgrades.css'
import './rush-menu-layout.css'

// 机体整备与永久成长
export function RushMenu(props: { state: RushState; store: RushPort; start: () => void }) {
  const { state, store } = props
  const { record } = state
  const frame = frameDefinitions.find((item) => item.id === record.selected)!
  const [purchase, setPurchase] = useState<{ id: MetaUpgradeId; level: number } | null>(null)
  const purchaseUpgrade = (id: MetaUpgradeId) => {
    if (store.purchaseMeta(id)) setPurchase({ id, level: store.state.record.meta[id] })
  }
  const sound = () => store.toggleSound()
  const glyphs = {
    firepower: 'haste',
    armor: 'vital',
    capacitor: 'pulse',
    magnet: 'magnet',
  } as const
  return (
    <section className="rush-menu" aria-label="突围整备舱">
      <div className="rush-hangar-grid" aria-hidden="true" />
      <header className="rush-menu-top">
        <div className="rush-menu-brand">
          <i />
          <span>
            零点突围<small>ZERO HOUR</small>
          </span>
        </div>
        <div className="rush-menu-wallet" aria-label={`金币余额 ${record.coins}`}>
          <RushCoin />
          <b>{record.coins}</b>
          <small>金币</small>
        </div>
        <button
          className="rush-icon"
          onClick={sound}
          aria-label={record.muted ? '开启声音' : '关闭声音'}
          aria-pressed={!record.muted}
        >
          <ControlGlyph id={record.muted ? 'muted' : 'sound'} />
        </button>
      </header>
      <div className="rush-menu-body">
        <div className="rush-hangar">
          <div className="rush-hangar-caption">
            <span>机体已就绪</span>
            <h1>再一次，冲破封锁</h1>
          </div>
          <div
            className={`rush-hangar-stage is-${frame.id}`}
            style={{ '--hangar-color': frame.color } as CSSProperties}
            aria-hidden="true"
          >
            <div className="rush-hangar-radar">
              <i />
              <i />
              <i />
            </div>
            <span className="rush-hangar-axis is-left" />
            <span className="rush-hangar-axis is-right" />
            <div className="rush-hangar-hero">
              <FrameGlyph id={frame.id} />
            </div>
            <div className="rush-hangar-platform">
              <i />
              <i />
              <i />
            </div>
            <span className="rush-hangar-serial">0{frameDefinitions.indexOf(frame) + 1}</span>
          </div>
          <div className="rush-hangar-name">
            <b>{frame.name}</b>
            <span>{frame.hint}</span>
          </div>
          <RushFrames state={state} store={store} />
        </div>
        <div className="rush-workbench">
          <div className="rush-workbench-title">
            <span>永久强化</span>
            <small>装进机体，下局更强</small>
            <i />
          </div>
          <div className="rush-meta-upgrades" aria-label="永久强化">
            {metaUpgrades.map((upgrade) => {
              const level = record.meta[upgrade.id]
              const maxed = level >= upgrade.maxLevel
              const cost = metaPrice(record, upgrade.id)
              const available = !maxed && record.coins >= cost
              const bought = purchase?.id === upgrade.id && purchase.level === level
              return (
                <button
                  key={upgrade.id}
                  className={`rush-meta-upgrade${available ? ' is-affordable' : ''}${maxed ? ' is-maxed' : ''}`}
                  style={{ '--meta-color': upgrade.color } as CSSProperties}
                  disabled={!available}
                  onClick={() => purchaseUpgrade(upgrade.id)}
                  aria-label={`${upgrade.name}，等级 ${level}，${maxed ? '已满级' : `升级需要 ${cost} 金币`}`}
                >
                  <span className="rush-meta-device">
                    <WeaponGlyph id={glyphs[upgrade.id]} size={59} />
                  </span>
                  <span className="rush-meta-details">
                    <span className="rush-meta-name">
                      <b>{upgrade.name}</b>
                      <small>LV {level}</small>
                    </span>
                    <span className="rush-meta-effect">
                      {maxed ? '当前' : '下阶'} · {upgrade.effect(maxed ? level : level + 1)}
                    </span>
                    <span className="rush-meta-ranks" aria-hidden="true">
                      {Array.from({ length: upgrade.maxLevel }, (_, index) => (
                        <i key={index} className={index < level ? 'is-filled' : ''} />
                      ))}
                    </span>
                  </span>
                  <span className="rush-meta-price">
                    {maxed ? (
                      <span>MAX</span>
                    ) : (
                      <>
                        <RushCoin />
                        <b>{cost}</b>
                        <i>＋</i>
                      </>
                    )}
                  </span>
                  {bought && (
                    <span className="rush-meta-installed" key={level}>
                      强化已装载
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="rush-menu-feedback" role="status">
            {purchase
              ? `${metaUpgrades.find((item) => item.id === purchase.id)!.name}提升至 ${purchase.level} 级`
              : record.lastRun
                ? `上次带回 ${record.lastRun.coins} 金币，倒下也会变强`
                : '击败敌人 · 带回金币 · 强化再战'}
          </p>
          <div className="rush-menu-records" aria-label="累计战绩">
            <span>
              <b>{record.runs}</b>
              <small>出击</small>
            </span>
            <span>
              <b>{time(record.bestTime)}</b>
              <small>最长存活</small>
            </span>
            <span>
              <b>{record.bestKills}</b>
              <small>最多击败</small>
            </span>
          </div>
        </div>
      </div>
      <footer className="rush-menu-bottom">
        <span>
          <i /> 九波封锁 · 三次首领战
        </span>
        <button className="rush-start" onClick={props.start}>
          <ControlGlyph id="play" />
          <b>开始突围</b>
          <span>→</span>
        </button>
        <small>自动射击 · 移动与冲刺</small>
      </footer>
    </section>
  )
}
