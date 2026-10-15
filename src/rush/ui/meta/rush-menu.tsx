import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RushPort, RushState } from '../../types'
import { GameGlyph } from '../game-glyph'
import { RushCoin } from './rush-coin'
import { RushHome } from './rush-home'
import type { RushMenuPage } from './rush-home'
import { RushFramePage } from './pages/rush-frame-page'
import { RushUpgradePage } from './pages/rush-upgrade-page'
import { RushDifficultyPage } from './pages/rush-difficulty-page'
import { RushStatsPage } from './pages/rush-stats-page'
import { RushSettingsPage } from './pages/rush-settings-page'
import './rush-menu.css'
import './rush-home.css'
import './rush-hangar.css'
import './rush-aim.css'
import './pages/rush-pages.css'
import './pages/rush-equipment.css'
import './pages/rush-upgrades.css'
import './pages/rush-options.css'

const pageNames = {
  home: '零点突围',
  frames: '机体',
  upgrades: '永久强化',
  difficulty: '封锁难度',
  stats: '战绩',
  settings: '设置',
}

// 整备首页和主动进入的独立分屏
export function RushMenu(props: { state: RushState; store: RushPort; start: () => void }) {
  const [page, setPage] = useState<RushMenuPage>('home')
  const menu = useRef<HTMLElement>(null)
  const origin = useRef<RushMenuPage>('home')
  const previous = useRef<RushMenuPage>('home')
  const home = () => setPage('home')
  const open = (next: RushMenuPage) => {
    origin.current = next
    setPage(next)
  }

  useEffect(() => {
    if (page === 'home') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setPage('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page])

  useLayoutEffect(() => {
    if (previous.current === page) return
    previous.current = page
    const selector = page === 'home' ? `[data-menu-entry="${origin.current}"]` : '.rush-menu-back'
    menu.current?.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true })
  }, [page])

  const { state, store } = props
  return (
    <section ref={menu} className="rush-menu" data-menu-page={page} aria-label="突围整备舱">
      <div className="rush-hangar-grid" aria-hidden="true" />
      <header className="rush-menu-top">
        {page === 'home' ? (
          <div className="rush-menu-brand">
            <i />
            <span>
              零点突围<small>ZERO HOUR</small>
            </span>
          </div>
        ) : (
          <>
            <button className="rush-menu-back" onClick={home} aria-label="返回首页">
              <i className="rush-menu-arrow is-back" aria-hidden="true" />
            </button>
            <h1 className="rush-menu-title">{pageNames[page]}</h1>
          </>
        )}
        <div className="rush-menu-wallet" aria-label={`金币余额 ${state.record.coins}`}>
          <RushCoin size={25} />
          <b>{state.record.coins}</b>
        </div>
        {page === 'home' && (
          <button
            className="rush-menu-gear"
            data-menu-entry="settings"
            onClick={() => open('settings')}
            aria-label="打开设置"
          >
            <GameGlyph id="settings" size={26} />
          </button>
        )}
      </header>
      <div className="rush-menu-content" key={page}>
        {page === 'home' && <RushHome state={state} start={props.start} open={open} />}
        {page === 'frames' && <RushFramePage state={state} store={store} done={home} />}
        {page === 'upgrades' && <RushUpgradePage state={state} store={store} />}
        {page === 'difficulty' && <RushDifficultyPage state={state} store={store} done={home} />}
        {page === 'stats' && <RushStatsPage state={state} />}
        {page === 'settings' && <RushSettingsPage state={state} store={store} />}
      </div>
    </section>
  )
}
