import type { ReactNode, SVGProps } from 'react'

// 粗线卡通图标：24 视框
type Props = SVGProps<SVGSVGElement> & { name: string; size?: number }

const glyphs: Record<string, ReactNode> = {
  // 体型档位
  personA: (
    <>
      <circle cx="12" cy="5.5" r="2.6" />
      <path d="M8 21v-6l-1-4.5a1.5 1.5 0 0 1 1.5-1.8h7a1.5 1.5 0 0 1 1.5 1.8L16 15v6M12 15v6" />
    </>
  ),
  bench: <path d="M3 10h18M4 14h16M6 14v5M18 14v5M5 6h14v4H5z" />,
  carRed: (
    <>
      <path d="M3 15v-3l2.2-4.4A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.1L21 12v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3.5 12h17" />
      <circle cx="7.5" cy="16.5" r="1.8" />
      <circle cx="16.5" cy="16.5" r="1.8" />
    </>
  ),
  houseA: <path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5" />,
  apartment: <path d="M6 21V4h12v17M4 21h16M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />,
  warehouse: <path d="M3 20V10l9-5 9 5v10M3 20h18M8 20v-6h8v6" />,
  skyscraper: <path d="M8 21V7l4-4 4 4v14M5 21V12h3M16 12h3v9M4 21h16M11 9h2M11 13h2M11 17h2" />,
  // 天赋
  speed: <path d="M3 8h11M5 12h13M3 16h9M15 5c3 1.5 5 4 5 7s-2 5.5-5 7" />,
  pull: <path d="M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6M12 12h.01" />,
  crush: <path d="M4 20h16M6 20V9h5v11M13 20v-7h5v7M8 5l2 2M16 6l-1 3M19 9l-2 1" />,
  growth: <path d="M12 20V5M6 11l6-6 6 6M5 20h14" />,
  time: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </>
  ),
  start: (
    <path d="M12 12c0-1.5 2-1.8 2.7-.5 1.2 2.2-1 4.6-3.6 4.1-4.1-.8-4.3-6.2-1.1-8.3 4.1-2.8 9.9.2 9.9 5.5 0 6.2-7.4 8.8-12.2 5.5" />
  ),
  bolt: <path d="M13 2 5 14h6l-1 8 8-12h-6z" />,
  twin: (
    <>
      <path d="M7 18c-2-1-3-3-2.5-5s3-2.5 4.5-1.5M7 18h.01" />
      <path d="M15 14c0-2 2-3.5 4-3s3 3 2 5-3.5 3-5.5 2" />
      <path d="M10 6c1-2 4-2.5 5-1" />
    </>
  ),
  wall: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  // 通用
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M9.5 9.5c0-1.2 1.1-1.8 2.5-1.8s2.5.6 2.5 1.8c0 2.6-5 1.4-5 4 0 1.2 1.1 1.8 2.5 1.8s2.5-.6 2.5-1.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5v14l11-7z" />,
  soundOn: (
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  ),
  soundOff: <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5" />,
  back: <path d="M15 5l-7 7 7 7" />,
  home: <path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5" />,
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5" />
  ),
  shop: (
    <path d="M4 9l1.5-5h13L20 9M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11zM5 13v7h14v-7M10 20v-4h4v4" />
  ),
  swirl: (
    <path d="M12 12c0-1.5 2-1.8 2.7-.5 1.2 2.2-1 4.6-3.6 4.1-4.1-.8-4.3-6.2-1.1-8.3 4.1-2.8 9.9.2 9.9 5.5 0 6.2-7.4 8.8-12.2 5.5" />
  ),
  check: <path d="M5 12.5 10 17l9-10" />,
  hand: (
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.6 6.5-6 6.5-2.6 0-4-1.2-5.4-3.4L4.4 14a1.5 1.5 0 0 1 2.4-1.8L9 14.5" />
  ),
}

export function Icon(props: Props) {
  const { name, size = 22, ...rest } = props
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {glyphs[name] ?? glyphs.swirl}
    </svg>
  )
}

// 道具种类到档位图标
export const tierIcon = (kind?: string) => {
  if (!kind) return 'swirl'
  if (kind.startsWith('person')) return 'personA'
  if (kind.startsWith('car')) return 'carRed'
  if (kind.startsWith('house')) return 'houseA'
  return kind
}
