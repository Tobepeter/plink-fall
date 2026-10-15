import type { CSSProperties } from 'react'
import { weaponReactions } from '../model/armory/data'
import type { RushPort, RushState } from '../types'
import { WeaponGlyph } from './weapon-glyph'
import { ArmoryGlyph, ArmoryRank } from './armory-glyph'
import { GameGlyph } from './game-glyph'

const actions = {
  equip: '新武器',
  upgrade: '升级',
  branch: '分支',
  replace: '换装',
  utility: '补给',
}

// 不停战的三选军械，替换必须由玩家主动确认
export function RushChoice(props: { state: RushState; store: RushPort }) {
  const { state, store } = props
  if (state.phase !== 'playing' || state.paused || state.weaponOffers.length === 0) return null
  const recommendation = state.weaponOffers.find(
    (offer) => offer.id === state.choiceRecommended && offer.action !== 'replace',
  )
  const remaining = Math.max(0, state.choiceRemaining)
  const choose = (id: string) => {
    if (!store.choose(id)) return
    document.querySelector<HTMLCanvasElement>('.rush-stage canvas')?.focus({ preventScroll: true })
  }
  return (
    <div className="rush-choice" aria-label="选择本次装配">
      <div className="rush-choice-level">
        <span
          className="rush-choice-announcement"
          role="status"
          key={`${state.runId}-${state.level}`}
        >
          {recommendation
            ? `倒计时结束自动装配${recommendation.name}，可提前选择其他军械`
            : '选择本次军械，换装只会在主动选择后生效'}
        </span>
        <GameGlyph id="time" size={24} />
        <b aria-hidden="true">{Math.ceil(remaining)}</b>
        <small>自动装配</small>
        <i className="rush-choice-time" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.min(1, remaining / 8)})` }} />
        </i>
      </div>
      <div className="rush-weapons">
        {state.weaponOffers.map((offer, index) => {
          const current = state.weapons[offer.slot]
          const level = offer.utility
            ? (state.upgrades[offer.utility] ?? 0)
            : offer.action === 'equip' || offer.action === 'replace'
              ? 0
              : (current?.level ?? 0)
          const linked =
            offer.weapon &&
            weaponReactions.some(
              (item) =>
                item.parts.includes(offer.weapon!) &&
                item.parts.some(
                  (part) =>
                    part !== offer.weapon &&
                    state.weapons.some(
                      (slot, slotIndex) =>
                        slot.id === part &&
                        (offer.action !== 'replace' || slotIndex !== offer.slot),
                    ),
                ),
            )
          const recommended = offer.id === recommendation?.id
          const hint = offer.action === 'replace' ? `继承 Lv${offer.level}` : offer.hint
          return (
            <button
              className={`rush-weapon is-${offer.action}${linked ? ' is-linked' : ''}${recommended ? ' is-recommended' : ''}`}
              data-choice={offer.id}
              data-upgrade={offer.id}
              data-offer-action={offer.action}
              key={`${state.runId}-${state.level}-${offer.id}`}
              onPointerDown={(event) => {
                event.preventDefault()
                if (event.pointerType !== 'mouse') choose(offer.id)
              }}
              onClick={() => choose(offer.id)}
              style={{ '--weapon-order': index, '--weapon-color': offer.color } as CSSProperties}
              aria-label={`${actions[offer.action]}，${offer.name}，等级 ${offer.level}，${offer.hint}${offer.replaces ? '，替换当前槽武器并继承等级' : ''}${recommended ? '，推荐，倒计时结束时自动装配' : ''}`}
            >
              <kbd className="rush-choice-key">{index + 1}</kbd>
              <small className="rush-weapon-action">
                {offer.level >= 5 && offer.action === 'upgrade' ? '觉醒' : actions[offer.action]}
              </small>
              <span className="rush-weapon-device">
                <i className="rush-weapon-aura" />
                <i />
                {offer.replaces && (
                  <span className="rush-weapon-replace" aria-hidden="true">
                    <ArmoryGlyph id={offer.replaces} size={27} />
                    <i />
                  </span>
                )}
                {offer.weapon ? (
                  <ArmoryGlyph id={offer.weapon} size={72} />
                ) : (
                  offer.utility && <WeaponGlyph id={offer.utility} size={64} />
                )}
                <span className="rush-mount-pins">
                  <i />
                  <i />
                  <i />
                </span>
                {linked && (
                  <span className="rush-weapon-link" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                )}
              </span>
              <b>{offer.name}</b>
              <ArmoryRank level={level} next={offer.level} />
              <small className="rush-weapon-hint" title={hint}>
                {hint}
              </small>
              {recommended && (
                <GameGlyph id="equip" size={24} className="rush-choice-recommended" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
