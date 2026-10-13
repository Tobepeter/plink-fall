import { Graphics } from 'pixi.js'
import { palette } from './palette'

type Node = { p: number; x: number; y: number }

const main: Node[] = [
  { p: 0, x: 147, y: 35 },
  { p: 0.12, x: 147, y: 111 },
  { p: 0.24, x: 261, y: 162 },
  { p: 0.38, x: 261, y: 248 },
  { p: 0.55, x: 143, y: 291 },
  { p: 0.69, x: 143, y: 371 },
  { p: 0.78, x: 307, y: 401 },
  { p: 1, x: 307, y: 469 },
]

const branch: Node[] = [
  { p: 0, x: 147, y: 35 },
  { p: 0.12, x: 147, y: 111 },
  { p: 0.24, x: 331, y: 161 },
  { p: 0.38, x: 331, y: 248 },
  { p: 0.55, x: 143, y: 291 },
  ...main.slice(5),
]

const third: Node[] = branch.map((node) =>
  node.p === 0.24 || node.p === 0.38 ? { ...node, x: 296 } : node,
)

// 模型进度与实际管线坐标
export function flowPoint(progress: number, lane = 0) {
  const nodes = lane % 3 === 1 ? branch : lane % 3 === 2 ? third : main
  const p = Math.max(0, Math.min(1, progress))
  const i = nodes.findIndex((node) => node.p >= p)
  if (i <= 0) return { x: nodes[0].x, y: nodes[0].y, angle: Math.PI / 2 }
  const from = nodes[i - 1]
  const to = nodes[i]
  const t = (p - from.p) / (to.p - from.p)
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    angle: Math.atan2(to.y - from.y, to.x - from.x),
  }
}

// 固定路线与分流支线
export function drawRoute(g: Graphics, split: number, accent: number) {
  g.clear()
  const lanes = split >= 2 ? 3 : split ? 2 : 1
  const routes = lanes === 3 ? [branch, third, main] : lanes === 2 ? [branch, main] : [main]
  for (const nodes of routes) {
    const trace = () => {
      g.moveTo(nodes[0].x, nodes[0].y)
      for (const node of nodes.slice(1)) g.lineTo(node.x, node.y)
    }
    trace()
    g.stroke({ color: palette.navy, width: 19, cap: 'round', join: 'round' })
    trace()
    g.stroke({ color: palette.white, width: 13, cap: 'round', join: 'round' })
    trace()
    g.stroke({ color: accent, width: 8, cap: 'round', join: 'round', alpha: 0.65 })
  }
  for (let p = 0.02; p < 0.96; p += 0.045) {
    for (let lane = 0; lane < lanes; lane++) {
      const point = flowPoint(p, lane)
      const dx = Math.sin(point.angle) * 5.5
      const dy = Math.cos(point.angle) * 5.5
      g.moveTo(point.x - dx, point.y + dy).lineTo(point.x + dx, point.y - dy)
      g.stroke({ color: palette.navy, width: 1.3, alpha: 0.3 })
    }
  }
}
