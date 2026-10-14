import type { CSSProperties } from 'react'
import type { FrameId, UpgradeId } from '../types'

const modules: UpgradeId[] = [
  'ricochet',
  'orbit',
  'chain',
  'split',
  'pierce',
  'rocket',
  'drone',
  'frost',
  'pulse',
  'haste',
  'vital',
  'magnet',
]

// 同阵营的实体军械切片
export function WeaponGlyph(props: { id: UpgradeId; size?: number }) {
  const cell = modules.indexOf(props.id)
  return (
    <span
      className="rush-module"
      aria-hidden="true"
      style={
        {
          '--module-size': `${props.size ?? 68}px`,
          backgroundPosition: `${(cell % 3) * 50}% ${Math.floor(cell / 3) * (100 / 3)}%`,
        } as CSSProperties
      }
    />
  )
}

export function FrameGlyph(props: { id: FrameId }) {
  return (
    <span className={`rush-frame-glyph is-${props.id}`} aria-hidden="true">
      <span />
      <i />
    </span>
  )
}

// 与军械线宽一致的机械控制铭刻
export function ControlGlyph(props: {
  id: 'pause' | 'play' | 'sound' | 'muted' | 'retry' | 'dash' | 'armor' | 'target'
}) {
  return (
    <svg className={`rush-control-glyph is-${props.id}`} viewBox="0 0 32 32" aria-hidden="true">
      {props.id === 'pause' && <path d="M9 7h5v18H9zM19 7h5v18h-5z" />}
      {props.id === 'play' && <path d="m10 6 16 10-16 10z" />}
      {(props.id === 'sound' || props.id === 'muted') && (
        <>
          <path d="M4 12h6l7-6v20l-7-6H4z" />
          {props.id === 'sound' ? (
            <path className="is-line" d="M22 10q8 6 0 12M21 14q3 2 0 4" />
          ) : (
            <path className="is-line" d="m22 12 7 8m0-8-7 8" />
          )}
        </>
      )}
      {props.id === 'retry' && (
        <>
          <path className="is-line" d="M25 11a10 10 0 1 0 1 9" />
          <path d="M25 4v9h-9z" />
        </>
      )}
      {props.id === 'dash' && (
        <>
          <path d="m7 20 9-13 9 13h-6l-3-4-3 4z" />
          <path d="m10 26 6-8 6 8h-5l-1-2-1 2z" />
        </>
      )}
      {props.id === 'armor' && (
        <>
          <path className="is-line" d="m16 4 10 5v12l-10 7-10-7V9z" />
          <path d="M13 10h6v4h4v6h-4v4h-6v-4H9v-6h4z" />
        </>
      )}
      {props.id === 'target' && (
        <path className="is-line" d="M12 5H5v7m15-7h7v7M5 20v7h7m8 0h7v-7M11 11l10 10m0-10L11 21" />
      )}
    </svg>
  )
}

export function time(value: number) {
  const seconds = Math.max(0, Math.floor(value))
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
