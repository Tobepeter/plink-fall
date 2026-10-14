import type { ReactNode } from 'react'
import type { FrameId, UpgradeId } from '../types'

const details: Record<UpgradeId, ReactNode> = {
  ricochet: (
    <>
      <path d="M11 53 29 24 45 41 58 15" />
      <path d="m49 15 9-1-1 10" />
      <circle cx="11" cy="53" r="4" />
      <circle cx="29" cy="24" r="4" />
      <circle cx="45" cy="41" r="4" />
    </>
  ),
  orbit: (
    <>
      <ellipse cx="34" cy="34" rx="26" ry="18" transform="rotate(-32 34 34)" />
      <path d="m48 9 10 5-8 12-5-5zM11 43l10-5 3 7-11 12-5-5z" fill="currentColor" />
      <circle cx="34" cy="34" r="5" fill="currentColor" />
    </>
  ),
  chain: (
    <>
      <path d="m39 7-22 29h17l-5 24 23-33H35z" fill="currentColor" strokeWidth="1.5" />
      <path d="m8 20 8 7M57 44l7 6M14 56l8-6" />
    </>
  ),
  split: (
    <>
      <path d="M34 58V31M34 31 12 14M34 31 56 14M34 31V7" />
      <path d="m8 22 3-10 11 1m24 0 11-1 3 10M28 14l6-9 6 9" />
      <circle cx="34" cy="52" r="6" fill="currentColor" />
    </>
  ),
  pierce: (
    <>
      <path d="M12 56 56 12M8 32h17m17 0h17M32 8v17m0 17v17" />
      <path d="m41 11 16-1-1 16" />
      <path d="M17 51 9 59" />
    </>
  ),
  rocket: (
    <>
      <path d="M20 43C26 16 42 8 59 8c0 17-8 33-35 39z" fill="currentColor" fillOpacity=".2" />
      <circle cx="43" cy="23" r="6" />
      <path d="m22 25-13 6 1 12 11-2m23 2-7 14-12-1 2-11M19 49l-9 10m15-8-3 10m-4-18L8 45" />
    </>
  ),
  drone: (
    <>
      <path d="m18 24 16-9 16 9v21l-16 9-16-9z" />
      <path d="M7 18v31m54-31v31M18 34H7m43 0h11M27 9h14M26 35h16" />
      <circle cx="28" cy="28" r="2" fill="currentColor" />
      <circle cx="40" cy="28" r="2" fill="currentColor" />
    </>
  ),
  frost: (
    <>
      <path d="M34 6v56M10 20l48 28M10 48l48-28M24 10l10 9 10-9M24 58l10-9 10 9M9 31l13-4-3-13M49 54l-3-13 13-4M9 37l13 4-3 13M49 14l-3 13 13 4" />
    </>
  ),
  pulse: (
    <>
      <circle cx="34" cy="34" r="7" fill="currentColor" />
      <circle cx="34" cy="34" r="19" />
      <path d="M13 13a30 30 0 0 1 42 0M13 55a30 30 0 0 0 42 0M8 23a30 30 0 0 0 0 22M60 23a30 30 0 0 1 0 22" />
    </>
  ),
  haste: (
    <>
      <path d="m12 16 21 18-21 18m23-36 21 18-21 18" />
      <path d="M7 8h28M7 60h28" />
    </>
  ),
  vital: (
    <>
      <path d="m34 7 23 9v20c0 13-23 25-23 25S11 49 11 36V16z" />
      <path d="M34 23v22M23 34h22" strokeWidth="6" />
    </>
  ),
  magnet: (
    <>
      <path
        d="M15 12v24a19 19 0 0 0 38 0V12H41v24a7 7 0 0 1-14 0V12z"
        fill="currentColor"
        fillOpacity=".2"
      />
      <path d="M15 23h12m14 0h12M6 34H2m64 0h-4M7 49l-3 4m57-4 3 4" />
    </>
  ),
}

// 武器装配与机体标识
export function WeaponGlyph(props: { id: UpgradeId; size?: number }) {
  return (
    <svg
      viewBox="0 0 68 68"
      width={props.size ?? 68}
      height={props.size ?? 68}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {details[props.id]}
    </svg>
  )
}

export function FrameGlyph(props: { id: FrameId }) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          props.id === 'warden'
            ? 'm28 7 15 9v22L28 49 13 38V16z'
            : props.id === 'spark'
              ? 'm28 6 15 19-8 21H21l-8-21z'
              : 'm28 6 12 16-3 21-9 7-9-7-3-21z'
        }
        fill="currentColor"
        fillOpacity=".13"
      />
      <path
        d={
          props.id === 'warden'
            ? 'M20 21h16M20 29h16M22 37h12'
            : props.id === 'spark'
              ? 'm31 16-11 14h9l-3 12 11-16h-9z'
              : 'M21 23h14M22 34l6 5 6-5'
        }
      />
      <path d="M8 20 3 33l7 3m38-16 5 13-7 3" />
    </svg>
  )
}

export function time(value: number) {
  const seconds = Math.max(0, Math.floor(value))
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
