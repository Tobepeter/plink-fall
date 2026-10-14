import { Bot, Cable, Disc3, Drill, Magnet, Split, Wind, Zap } from 'lucide-react'
import type { ToolId } from '../types'

const glyphs = { pierce: Drill, chain: Zap, magnet: Magnet, drone: Bot, split: Split, saw: Disc3, vent: Wind, winch: Cable }
const cells: Record<ToolId, [number, number]> = {
  pierce: [0, 1], chain: [0, 1], magnet: [1, 0], drone: [1, 1],
  split: [0, 1], saw: [0, 1], vent: [1, 0], winch: [0, 0],
}

export function ToolGlyph(props: { id: ToolId; size?: number }) {
  const Icon = glyphs[props.id]
  return <Icon size={props.size ?? 20} strokeWidth={2} aria-hidden='true' />
}

// 现有演员图集的装备切片
export function ToolSprite(props: { id: ToolId }) {
  const [column, row] = cells[props.id]
  return <span className='mine-tool-sprite'><img src='/mine/actors.png' alt='' aria-hidden='true' draggable={false} style={{ transform: `translate(${-column * 50}%, ${-row * 50}%)` }} /></span>
}

export function amount(value: number) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m`
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`
  return Math.floor(value).toLocaleString('zh-CN')
}
