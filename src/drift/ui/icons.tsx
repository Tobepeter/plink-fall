import type { ReactNode, SVGProps } from 'react'

// 线描图标：24 视框，描边随文字色
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg(props: IconProps & { children: ReactNode }) {
  const { size = 20, children, ...rest } = props
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

const flamePath =
  'M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 3-5.2 3.6-8.9 2.6 1.6 3.4 3.9 3 5.6 1-0.6 1.6-1.6 1.8-2.9 2 1.6 3.6 3.6 3.6 6.2 0 3.2-2.4 5.6-6 5.6z'

export const glyphs: Record<string, ReactNode> = {
  flame: <path d={flamePath} />,
  firefly: (
    <>
      <ellipse cx="12" cy="13" rx="3" ry="4.5" />
      <path d="M9.5 10.5 6 7.5M14.5 10.5 18 7.5M12 8.5V6" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" />
    </>
  ),
  petal: (
    <path d="M12 20c4-2.6 5.6-7.6 3.4-12.4L13.6 9 12 6.4 10.4 9 8.6 7.6C6.4 12.4 8 17.4 12 20z" />
  ),
  wish: (
    <>
      <path d="M8 5h8l1.6 11.5a1.5 1.5 0 0 1-1.5 1.5H7.9a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M10 21h4M12 18v3M12 13.5c-1 0-1.6-.7-1.6-1.6 0-1.1 1.6-2.4 1.6-2.4s1.6 1.3 1.6 2.4c0 .9-.6 1.6-1.6 1.6z" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  soundOn: (
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  ),
  soundOff: <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5" />,
  back: <path d="M14.5 6 8.5 12l6 6" />,
  close: <path d="M7 7l10 10M17 7 7 17" />,
  shadow: (
    <>
      <path d="M5 12c3-4.5 9-4.5 13 0-4 4.5-10 4.5-13 0z" />
      <path d="M18 12l3-2.5v5z" />
      <circle cx="9" cy="11.5" r=".9" fill="currentColor" />
    </>
  ),
  river: (
    <path d="M4 6c3 0 3 3 6 3s3-3 6-3 3 3 4 3M4 12c3 0 3 3 6 3s3-3 6-3 3 3 4 3M4 18c3 0 3 3 6 3" />
  ),
  lotus: (
    <>
      <path d="M12 18c-2.5-2-3.4-5.5-0-10 3.4 4.5 2.5 8 0 10z" />
      <path d="M11 17.5C7.5 17 5 14.5 4.5 11c3 0 5.6 1.4 6.6 3.4M13 17.5c3.5-.5 6-3 6.5-6.5-3 0-5.6 1.4-6.6 3.4" />
    </>
  ),
  // 分叉
  shrine: <path d="M4 6.5c5-1.4 11-1.4 16 0M6 10h12M8 6v14M16 6v14" />,
  market: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M9.5 9.5h5v5h-5z" />
    </>
  ),
  storm: (
    <path d="M12 12c0-1.2 1.6-1.4 2.2-.4 1 1.8-.9 3.8-3 3.4-3.4-.6-3.6-5-1-6.8 3.4-2.3 8.2.2 8.2 4.6 0 5.2-6.2 7.4-10.2 4.6" />
  ),
  bloom: (
    <>
      <path d="M12 18c-2.5-2-3.4-5.5-0-10 3.4 4.5 2.5 8 0 10z" />
      <path d="M11 17.5C7.5 17 5 14.5 4.5 11c3 0 5.6 1.4 6.6 3.4M13 17.5c3.5-.5 6-3 6.5-6.5-3 0-5.6 1.4-6.6 3.4" />
    </>
  ),
  boss: (
    <>
      <path d="M4 12c2.5-5 13.5-5 16 0-2.5 5-13.5 5-16 0z" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </>
  ),
  // 祝福
  wide: (
    <path d="M12 12h.01M8.5 12a3.5 3.5 0 0 1 7 0M5.5 12a6.5 6.5 0 0 1 13 0M2.5 12a9.5 9.5 0 0 1 19 0" />
  ),
  echo: (
    <>
      <circle cx="9" cy="12" r="4.5" />
      <circle cx="15" cy="12" r="4.5" strokeDasharray="2 2" />
    </>
  ),
  sear: (
    <>
      <path d="M4.5 15a7.5 7.5 0 0 1 15 0" />
      <path d="M12 15c-1.4 0-2.2-.9-2.2-2.1 0-1.6 2.2-3.4 2.2-3.4s2.2 1.8 2.2 3.4c0 1.2-.8 2.1-2.2 2.1z" />
    </>
  ),
  still: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M7.7 9.5l8.6 5M7.7 14.5l8.6-5" />
    </>
  ),
  bright: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  blaze: <path d={flamePath} />,
  lure: (
    <>
      <circle cx="7" cy="8" r="1.6" fill="currentColor" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
      <path d="M8.5 9.5l2.5 2.5M15.6 8.4 13.4 11M13.6 14l-1-1" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  ember: (
    <>
      <circle cx="6" cy="17" r="1" fill="currentColor" />
      <circle cx="10" cy="14" r="1.3" fill="currentColor" />
      <circle cx="14" cy="10.5" r="1.6" fill="currentColor" />
      <path d="M18.5 4.5c1 1.6.3 3.4-1.2 3.8-1.6.4-2.6-1.4-1.6-3 .5.6 1.2.6 1.4 0z" />
    </>
  ),
  rope: (
    <path d="M9 15l-1.8 1.8a2.6 2.6 0 0 1-3.6-3.6L6.6 10.2a2.6 2.6 0 0 1 3.6 0M15 9l1.8-1.8a2.6 2.6 0 0 1 3.6 3.6l-3 3a2.6 2.6 0 0 1-3.6 0M9.5 14.5l5-5" />
  ),
  shade: (
    <>
      <path d="M5 17a7 7 0 0 1 14 0z" />
      <path d="M12 6v4M3.5 17h17" />
    </>
  ),
  rekindle: (
    <>
      <path d="M5 12a7 7 0 1 0 2-5M5 4v3.5h3.5" />
      <path d="M12 15c-1.2 0-2-.8-2-1.9 0-1.4 2-3.1 2-3.1s2 1.7 2 3.1c0 1.1-.8 1.9-2 1.9z" />
    </>
  ),
  crane: <path d="M3 13l7-2 2-6 2 6 7 2-7 1.5L12 20l-2-5.5z" />,
  koi: (
    <>
      <path d="M12 3c3 2.5 3 9 0 13-3-4-3-10.5 0-13z" />
      <path d="M12 16l-3 5M12 16l3 5" />
      <circle cx="12" cy="7" r=".8" fill="currentColor" />
    </>
  ),
  thunder: <path d="M13 3 6.5 13H12l-1 8 6.5-10H12z" />,
  wishGold: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 7.5v9M9.5 10c0-1.2 1.1-1.8 2.5-1.8s2.5.7 2.5 1.8c0 2.4-5 1.4-5 3.8 0 1.2 1.2 1.9 2.5 1.9s2.5-.6 2.5-1.8" />
    </>
  ),
  // 灯舟与修习
  paper: <path d="M3 13h18l-3 5H6zM12 4v9M12 4l5 9M12 4 7 13" />,
  leaf: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12V4M12 12l5.6 5.6" />
    </>
  ),
  start: (
    <>
      <path d="M12 17c-2-1.6-2.7-4.4 0-8 2.7 3.6 2 6.4 0 8z" />
      <path d="M18 5v4M16 7h4" />
    </>
  ),
  ripple: <path d="M12 12h.01M8.5 12a3.5 3.5 0 0 1 7 0M5.5 12a6.5 6.5 0 0 1 13 0" />,
  wick: (
    <>
      <path d="M12 21v-5" />
      <path d="M12 14c-2 0-3.2-1.3-3.2-3 0-2.4 3.2-5 3.2-5s3.2 2.6 3.2 5c0 1.7-1.2 3-3.2 3z" />
    </>
  ),
  flamePlus: (
    <>
      <path d="M10 20c-3 0-5-2-5-4.6 0-2.8 2.5-4.3 3-7.4 2.2 1.3 2.8 3.2 2.5 4.6.8-.5 1.3-1.3 1.5-2.4 1.7 1.3 3 3 3 5.2 0 2.6-2 4.6-5 4.6z" />
      <path d="M18 4v5M15.5 6.5h5" />
    </>
  ),
  lock: (
    <>
      <rect x="6" y="11" width="12" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  check: <path d="M5 12.5 10 17l9-10" />,
}

export function Icon(props: IconProps & { name: keyof typeof glyphs | string; filled?: boolean }) {
  const { name, filled, ...rest } = props
  return (
    <Svg {...rest} fill={filled ? 'currentColor' : 'none'}>
      {glyphs[name] ?? glyphs.lotus}
    </Svg>
  )
}

// 祝福 id 与图标对应
export const blessingGlyph: Record<string, string> = {
  wide: 'wide',
  echo: 'echo',
  sear: 'sear',
  still: 'still',
  bright: 'bright',
  blaze: 'blaze',
  lure: 'lure',
  ember: 'ember',
  rope: 'rope',
  shade: 'shade',
  rekindle: 'rekindle',
  crane: 'crane',
  koi: 'koi',
  thunder: 'thunder',
  lotus: 'lotus',
  wish: 'wishGold',
}
