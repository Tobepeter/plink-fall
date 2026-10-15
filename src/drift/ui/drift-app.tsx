import { useSyncExternalStore } from 'react'
import type { DriftGame } from '../drift-game'
import { Title } from './title'
import { Hud } from './hud'
import { Offer, Shop } from './choices'
import { Result } from './result'
import { Workshop } from './workshop'
import './drift-ui.css'

export type GameProps = { game: DriftGame }

// 订阅仓库版本号
export function useDrift(game: DriftGame) {
  useSyncExternalStore(game.store.subscribe, game.store.getVersion)
  return game.store
}

// 界面根：按阶段切换
export function DriftApp(props: GameProps) {
  const store = useDrift(props.game)
  const { phase } = store
  return (
    <div className="drift-ui">
      {phase === 'title' && <Title game={props.game} />}
      {(phase === 'play' || phase === 'ending') && <Hud game={props.game} />}
      {phase === 'play' && store.offer && <Offer game={props.game} />}
      {phase === 'play' && store.shop && <Shop game={props.game} />}
      {phase === 'result' && <Result game={props.game} />}
      {phase === 'workshop' && <Workshop game={props.game} />}
      {/* 横幅 */}
      {store.banner && (phase === 'play' || phase === 'ending') && (
        <div
          key={store.banner.id}
          className="drift-banner absolute inset-x-0 top-[26%] flex flex-col items-center"
        >
          <div className="brush drift-title text-6xl">{store.banner.title}</div>
          {store.banner.sub && (
            <div className="mt-2 text-sm tracking-[0.3em] text-[var(--muted)]">
              {store.banner.sub}
            </div>
          )}
        </div>
      )}
      {/* 提示 */}
      {store.toast && phase === 'play' && (
        <div
          key={store.toast.id}
          className="drift-toast absolute inset-x-0 top-[17%] flex justify-center"
        >
          <div className="drift-panel rounded-full px-4 py-1.5 text-sm tracking-widest">
            {store.toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
