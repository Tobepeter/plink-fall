import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { RushPort, RushState } from '../../types'
import { ControlGlyph } from '../weapon-glyph'
import { RushAim } from './rush-aim'
import './rush-pause-menu.css'

// 主动暂停与少量设置
export function RushPause(props: { state: RushState; store: RushPort; resume: () => void }) {
  const resumeButton = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => resumeButton.current?.focus({ preventScroll: true }), [])
  const keyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
    ).filter((button) => !button.disabled && button.getClientRects().length > 0)
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
  return (
    <section
      className="rush-pause-menu"
      role="dialog"
      aria-modal="true"
      aria-label="暂停设置"
      onKeyDown={keyboard}
    >
      <h2>暂停</h2>
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
