import { useSyncExternalStore } from 'react'
import type { TwisterGame } from '../twister-game'
import { Title } from './title'
import { Hud } from './hud'
import { PerkPick } from './perk'
import { Result } from './result'
import { Shop } from './shop'
import { Icon, tierIcon } from './icons'
import './twister-ui.css'

export type GameProps = { game: TwisterGame }

export function useTwister(game: TwisterGame) {
  useSyncExternalStore(game.store.subscribe, game.store.getVersion)
  return game.store
}

// 界面根：按阶段切换
export function TwisterApp(props: GameProps) {
  const store = useTwister(props.game)
  const { phase } = store
  return (
    <div className="tw-ui">
      {phase === 'title' && <Title game={props.game} />}
      {phase === 'play' && <Hud game={props.game} />}
      {phase === 'perk' && <PerkPick game={props.game} />}
      {phase === 'result' && <Result game={props.game} />}
      {phase === 'shop' && <Shop game={props.game} />}
      {/* 城区横幅 */}
      {store.banner && phase === 'play' && (
        <div
          key={store.banner.id}
          className="tw-banner absolute inset-x-0 top-[24%] flex flex-col items-center"
        >
          <div className="tw-display tw-outline text-6xl">{store.banner.title}</div>
          {store.banner.sub && (
            <div className="tw-pill mt-3 px-4 py-1.5 text-sm font-bold">{store.banner.sub}</div>
          )}
        </div>
      )}
      {/* 提示 */}
      {store.toast && phase === 'play' && (
        <div
          key={store.toast.id}
          className="tw-toast absolute inset-x-0 top-[34%] flex justify-center"
        >
          <div className="tw-pill flex items-center gap-2 px-5 py-2 text-lg font-extrabold">
            {store.toast.kind && (
              <Icon name={tierIcon(store.toast.kind)} size={26} className="text-[var(--hot)]" />
            )}
            {store.toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
