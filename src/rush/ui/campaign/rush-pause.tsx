import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { RushPort, RushState } from '../../types'
import { ControlGlyph } from '../weapon-glyph'
import { GameGlyph } from '../game-glyph'
import { RushAim } from './rush-aim'
import { RushLoadout } from './rush-loadout'
import './rush-pause-menu.css'

// 主动暂停与少量设置
export function RushPause(props: { state: RushState; store: RushPort; resume: () => void }) {
  const [page, setPage] = useState<'settings' | 'loadout'>('settings')
  const id = useId()
  const resumeButton = useRef<HTMLButtonElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  useLayoutEffect(() => resumeButton.current?.focus({ preventScroll: true }), [])
  const keyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button, [tabindex]'),
    ).filter(
      (button) =>
        !button.matches(':disabled') && button.tabIndex >= 0 && button.getClientRects().length > 0,
    )
    const first = buttons[0],
      last = buttons[buttons.length - 1]
    if (
      (event.shiftKey && document.activeElement === first) ||
      (!event.shiftKey && document.activeElement === last)
    ) {
      event.preventDefault()
      const destination = event.shiftKey ? last : first
      destination?.focus()
    }
  }
  const tabKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : page === 'settings' ? 1 : 0
    setPage(index === 0 ? 'settings' : 'loadout')
    tabs.current[index]?.focus()
  }
  return (
    <section
      className="rush-pause-menu"
      role="dialog"
      aria-modal="true"
      aria-label="暂停设置"
      onKeyDown={keyboard}
    >
      <h2>暂停</h2>
      <div className="rush-pause-tabs" role="tablist" aria-label="暂停页面" onKeyDown={tabKeyboard}>
        {(['settings', 'loadout'] as const).map((item, index) => (
          <button
            key={item}
            ref={(button) => {
              tabs.current[index] = button
            }}
            id={`${id}-${item}-tab`}
            role="tab"
            aria-selected={page === item}
            aria-controls={`${id}-panel`}
            tabIndex={page === item ? 0 : -1}
            onClick={() => setPage(item)}
          >
            <GameGlyph id={item === 'settings' ? 'settings' : 'equip'} size={24} />
            {item === 'settings' ? '设置' : '装配'}
          </button>
        ))}
      </div>
      <div
        className={`rush-pause-content is-${page}`}
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${page}-tab`}
        tabIndex={0}
        key={page}
      >
        {page === 'settings' ? (
          <div className="rush-pause-options">
            <button
              className="rush-pause-option"
              onClick={() => props.store.toggleSound()}
              aria-label={props.state.record.muted ? '开启声音' : '关闭声音'}
              aria-pressed={!props.state.record.muted}
            >
              <ControlGlyph id={props.state.record.muted ? 'muted' : 'sound'} />
              <span>声音</span>
              <i className={props.state.record.muted ? '' : 'is-on'} aria-hidden="true">
                <b />
              </i>
            </button>
            <div className="rush-pause-mouse">
              <span>鼠标瞄准</span>
              <RushAim store={props.store} enabled={props.state.record.mouseAim} />
            </div>
          </div>
        ) : (
          <RushLoadout state={props.state} />
        )}
      </div>
      <button
        className="rush-pause-resume"
        ref={resumeButton}
        onClick={props.resume}
        aria-label="继续突围"
      >
        <ControlGlyph id="play" />
        <b>继续突围</b>
      </button>
    </section>
  )
}
