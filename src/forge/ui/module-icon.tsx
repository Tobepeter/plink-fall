import { BatteryCharging, CircleDot, Fan, Gem, Magnet, Radio, Snowflake, Split } from 'lucide-react'
import type { ModuleId } from '../model/types'

const icons = {
  turbo: Fan,
  condenser: Gem,
  splitter: Split,
  magnet: Magnet,
  battery: BatteryCharging,
  prism: CircleDot,
  echo: Radio,
  insulator: Snowflake,
}

export function ModuleIcon(props: { id: ModuleId; size?: number }) {
  const Icon = icons[props.id]
  return <Icon size={props.size ?? 21} strokeWidth={1.7} aria-hidden="true" />
}

export function amount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`
  return Math.floor(value).toLocaleString('zh-CN')
}
