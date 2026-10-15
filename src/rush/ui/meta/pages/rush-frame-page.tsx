import { useState } from 'react'
import { Check, LockKeyhole, Shield, Zap } from 'lucide-react'
import { frameDefinitions } from '../../../model/data'
import { frameStats } from '../../../model/frames'
import type { FrameId, RushPort, RushState } from '../../../types'
import { FrameGlyph, WeaponGlyph } from '../../weapon-glyph'
import { RushCoin } from '../rush-coin'
import { RushHangar } from '../rush-hangar'

// 预览与解锁分开，浏览机体不会花费金币
export function RushFramePage(props: { state: RushState; store: RushPort; done: () => void }) {
  const { record } = props.state
  const [preview, setPreview] = useState<FrameId>(record.selected)
  const [message, setMessage] = useState('')
  const frame = frameDefinitions.find((item) => item.id === preview)!
  const stats = frameStats[preview]
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
              className={preview === item.id ? 'is-preview' : ''}
              aria-label={`预览${item.name}`}
              aria-pressed={preview === item.id}
              onClick={() => {
                setPreview(item.id)
                setMessage('')
              }}
            >
              <FrameGlyph id={item.id} />
              <b>{item.name}</b>
              {!record.unlocked.includes(item.id) && <LockKeyhole aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
      <div className="rush-frame-spec">
        <h2>{frame.name}</h2>
        <div className="rush-frame-metrics">
          <span>
            <Shield aria-hidden="true" />
            {stats.hp}
          </span>
          <span>
            <Zap aria-hidden="true" />
            {stats.speed}
            <small>移速</small>
          </span>
        </div>
        <div className="rush-frame-ability">
          <WeaponGlyph id={stats.startingSkill} size={54} />
          <div>
            <h3>{stats.skillName}</h3>
            <p>{stats.skillHint}</p>
            <small>冷却 {stats.abilityCooldown} 秒</small>
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
            {selected && <Check aria-hidden="true" />}
            <b>{selected ? '当前机体' : '选用机体'}</b>
          </button>
        ) : (
          <>
            <button
              className="rush-menu-action"
              onClick={buy}
              disabled={record.coins < stats.unlockCost}
              aria-label={`解锁${frame.name}，需要 ${stats.unlockCost} 金币`}
            >
              <b>解锁机体</b>
              <span>
                <RushCoin />
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
