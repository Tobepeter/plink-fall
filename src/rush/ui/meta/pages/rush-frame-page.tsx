import { useState } from 'react'
import { frameDefinitions } from '../../../model/data'
import { frameStats } from '../../../model/frames'
import { frameStartingWeapon, weaponDefinitions } from '../../../model/armory/data'
import type { FrameId, RushPort, RushState } from '../../../types'
import { FrameGlyph, WeaponGlyph } from '../../weapon-glyph'
import { GameGlyph } from '../../game-glyph'
import { ArmoryGlyph } from '../../armory-glyph'
import { RushCoin } from '../rush-coin'
import { RushHangar } from '../rush-hangar'

// 预览与解锁分开，浏览机体不会花费金币
export function RushFramePage(props: { state: RushState; store: RushPort; done: () => void }) {
  const { record } = props.state
  const [preview, setPreview] = useState<FrameId>(record.selected)
  const [message, setMessage] = useState('')
  const frame = frameDefinitions.find((item) => item.id === preview)!
  const stats = frameStats[preview]
  const weapon = weaponDefinitions.find((item) => item.id === frameStartingWeapon[preview])!
  const unlocked = record.unlocked.includes(preview)
  const selected = record.selected === preview
  const buy = () => {
    if (props.store.unlockFrame(preview)) setMessage(`${frame.name}已解锁`)
  }
  const select = () => {
    if (props.store.selectFrame(preview)) props.done()
  }
  return (
    <div className="rush-frame-page rush-secondary">
      <div className="rush-frame-preview">
        <RushHangar frame={preview} />
        <div className="rush-frame-roster" aria-label="预览机体">
          {frameDefinitions.map((item) => (
            <button
              key={item.id}
              className={`${preview === item.id ? 'is-preview' : ''}${!record.unlocked.includes(item.id) ? ' is-locked' : ''}`}
              aria-label={`预览${item.name}`}
              aria-description={
                record.unlocked.includes(item.id) ? undefined : '未解锁，预览不花费金币'
              }
              aria-pressed={preview === item.id}
              onClick={() => {
                setPreview(item.id)
                setMessage('')
              }}
            >
              <FrameGlyph id={item.id} />
              <b>{item.name}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="rush-frame-spec">
        <h2>{frame.name}</h2>
        <div className="rush-frame-metrics">
          <span aria-label={`初始装甲 ${stats.hp} 格`}>
            <WeaponGlyph id="vital" size={26} />
            {stats.hp}
          </span>
          <span aria-label={`移动速度 ${stats.speed}`}>
            <WeaponGlyph id="haste" size={26} />
            {stats.speed}
          </span>
        </div>
        <div className="rush-frame-ability">
          <ArmoryGlyph id={weapon.id} size={54} />
          <div>
            <h3>{stats.skillName}</h3>
            <p>{stats.skillHint}</p>
            <small aria-label={`冷却 ${stats.abilityCooldown} 秒`}>
              <GameGlyph id="time" size={20} />
              {stats.abilityCooldown}s
            </small>
            <span className="rush-frame-starting">起手 · {weapon.name}</span>
          </div>
        </div>
        <p className="rush-frame-tradeoff">{stats.tradeoff}</p>
        {unlocked ? (
          <button
            className="rush-menu-action"
            onClick={select}
            disabled={selected}
            aria-label={`选用${frame.name}`}
          >
            <GameGlyph id="equip" size={26} />
            <b>{selected ? '已选用' : '选用'}</b>
          </button>
        ) : (
          <>
            <button
              className="rush-menu-action"
              onClick={buy}
              disabled={record.coins < stats.unlockCost}
              aria-label={`解锁${frame.name}，需要 ${stats.unlockCost} 金币`}
            >
              <b>解锁</b>
              <span>
                <RushCoin size={24} />
                {stats.unlockCost}
              </span>
            </button>
            <p className="rush-page-note">
              {record.coins < stats.unlockCost ? '金币不足 · ' : ''}
              {frame.unlock}也可解锁
            </p>
          </>
        )}
        <p className="rush-page-status" role="status">
          {message}
        </p>
      </div>
    </div>
  )
}
