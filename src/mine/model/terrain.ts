import { bounds } from './data'
import type { Mineral, OreNode } from '../types'

const mixes: [Mineral, number][][] = [
  [
    ['stone', 0.15],
    ['copper', 0.85],
    ['amber', 0.97],
    ['jade', 1],
  ],
  [
    ['stone', 0.08],
    ['copper', 0.33],
    ['amber', 0.75],
    ['jade', 0.85],
    ['volatile', 1],
  ],
  [
    ['stone', 0.22],
    ['copper', 0.4],
    ['amber', 0.5],
    ['jade', 0.94],
    ['volatile', 1],
  ],
]

// 保留首轮可读性，后续矿区改变分布与阻挡
export function makeTerrain(seed: number, region: number) {
  let value = seed >>> 0
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
  const nodes: OreNode[] = []
  const create = (
    x: number,
    y: number,
    kind: Mineral,
    radius: number,
    hp: number,
    revealed = true,
  ) => {
    nodes.push({
      id: nodes.length + 1,
      x,
      y,
      kind,
      radius,
      hp,
      maxHp: hp,
      angle: random() * Math.PI * 2,
      spin: (random() - 0.5) * 0.3,
      variant: Math.floor(random() * 5),
      revealed,
    })
  }
  create(0, 300, 'copper', 43, 4.1)
  create(-146, 410, 'copper', 37, 3.6)
  create(-246, 458, 'copper', 25, 1.8)
  create(-92, 495, 'copper', 25, 2.4)
  create(90, 330, 'copper', 27, 2.5)
  create(160, 445, region % 3 === 2 ? 'jade' : 'amber', 39, 6.8)
  const count = 37 + (region % 3) * 6
  for (let attempts = 0; nodes.length < count && attempts < 1500; attempts++) {
    const x = bounds.minX + 45 + random() * (bounds.maxX - bounds.minX - 90)
    const y = 395 + random() * 455
    const radius = 25 + random() * 28
    if (nodes.some((node) => Math.hypot(node.x - x, node.y - y) < node.radius + radius + 12))
      continue
    const choice = random()
    const kind = mixes[region % 3].find(([, threshold]) => choice < threshold)![0]
    const hp =
      kind === 'stone'
        ? 6.5
        : kind === 'jade'
          ? 8.5
          : kind === 'volatile'
            ? 3.8
            : 3.8 + random() * 2.5
    create(x, y, kind, radius, hp)
  }
  create((random() - 0.5) * 180, 885, 'relic', 29, 2.7, false)
  return nodes
}
