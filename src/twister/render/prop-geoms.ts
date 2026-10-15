import type { BufferGeometry } from 'three'
import type { PropKind } from '../data/props'
import { ball, box, cone, cyl, gable, merge, part } from './mesh-kit'

// 每种道具的低多边形模型，底面中心在原点
const skin = '#f0c8a0',
  pants = '#3b4a6b',
  glass = '#9fc4dd',
  dark = '#3a3f4a',
  trunk = '#8a5a3b'

function person(shirt: string) {
  return merge([
    part(box(0.18, 0.8, 0.2), pants, [-0.11, 0, 0]),
    part(box(0.18, 0.8, 0.2), pants, [0.11, 0, 0]),
    part(box(0.5, 0.65, 0.3), shirt, [0, 0.8, 0]),
    part(box(0.13, 0.55, 0.15), shirt, [-0.32, 0.88, 0]),
    part(box(0.13, 0.55, 0.15), shirt, [0.32, 0.88, 0]),
    part(ball(0.2), skin, [0, 1.62, 0]),
  ])
}

function car(paint: string) {
  return merge([
    part(box(1.8, 0.7, 4.2), paint, [0, 0.35, 0]),
    part(box(1.6, 0.6, 2.2), paint, [0, 1.05, -0.2]),
    part(box(1.62, 0.42, 2.0), glass, [0, 1.1, -0.2]),
    part(cyl(0.36, 0.36, 0.3, 8), dark, [-0.9, 0.36, 1.3], [0, 0, Math.PI / 2]),
    part(cyl(0.36, 0.36, 0.3, 8), dark, [0.9, 0.36, 1.3], [0, 0, Math.PI / 2]),
    part(cyl(0.36, 0.36, 0.3, 8), dark, [-0.9, 0.36, -1.3], [0, 0, Math.PI / 2]),
    part(cyl(0.36, 0.36, 0.3, 8), dark, [0.9, 0.36, -1.3], [0, 0, Math.PI / 2]),
    part(box(1.5, 0.2, 0.1), '#fff3c4', [0, 0.6, 2.11]),
    part(box(1.5, 0.2, 0.1), '#d9443a', [0, 0.6, -2.11]),
  ])
}

function house(wall: string, roof: string, h = 4) {
  return merge([
    part(box(8, h, 6.5), wall),
    part(gable(8.8, 3, 7.3), roof, [0, h, 0]),
    part(box(1.4, 2.2, 0.2), '#7a5238', [0, 0, 3.3]),
    part(box(1.4, 1.2, 0.15), glass, [-2.4, 1.6, 3.3]),
    part(box(1.4, 1.2, 0.15), glass, [2.4, 1.6, 3.3]),
    part(box(1.4, 1.2, 0.15), glass, [-2.4, 1.6, -3.3]),
    part(box(1.4, 1.2, 0.15), glass, [2.4, 1.6, -3.3]),
    part(box(0.9, 2.4, 0.9), '#b0a090', [2.4, h + 0.8, -1.2]),
  ])
}

// 带窗格的楼体
function block(
  w: number,
  h: number,
  d: number,
  wall: string,
  rows: number,
  cols: number,
  trim = '#e8e2d6',
) {
  const parts = [part(box(w, h, d), wall), part(box(w + 0.6, 0.6, d + 0.6), trim, [0, h, 0])]
  const fh = h / rows
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (w / cols) * (c + 0.5)
      const y = fh * r + fh * 0.3
      parts.push(part(box((w / cols) * 0.55, fh * 0.45, 0.15), glass, [x, y, d / 2 + 0.02]))
      parts.push(part(box((w / cols) * 0.55, fh * 0.45, 0.15), glass, [x, y, -d / 2 - 0.02]))
    }
  return parts
}

const builders: Record<PropKind, () => BufferGeometry> = {
  personA: () => person('#e86a5c'),
  personB: () => person('#4a8fd4'),
  personC: () => person('#f2c14e'),
  personD: () => person('#7ac08a'),
  bin: () =>
    merge([
      part(cyl(0.32, 0.28, 0.9, 8), '#4f8a5b'),
      part(cyl(0.36, 0.36, 0.12, 8), '#3d6e48', [0, 0.9, 0]),
    ]),
  hydrant: () =>
    merge([
      part(cyl(0.2, 0.24, 0.7, 7), '#d84a3a'),
      part(ball(0.2), '#d84a3a', [0, 0.72, 0]),
      part(cyl(0.08, 0.08, 0.5, 6), '#c43a2c', [0, 0.45, 0], [0, 0, Math.PI / 2]),
    ]),
  cone: () =>
    merge([
      part(box(0.6, 0.06, 0.6), dark),
      part(cone(0.24, 0.75, 8), '#f28a2e'),
      part(cyl(0.15, 0.18, 0.12, 8), '#ffffff', [0, 0.3, 0]),
    ]),
  mailbox: () =>
    merge([part(box(0.1, 1, 0.1), dark), part(box(0.4, 0.35, 0.55), '#3f6fb5', [0, 1, 0])]),
  flower: () =>
    merge([
      part(cyl(0.4, 0.32, 0.35, 8), '#b8735a'),
      part(ball(0.28), '#5fa65a', [0, 0.45, 0]),
      part(ball(0.12), '#f28ab8', [0.18, 0.62, 0]),
      part(ball(0.12), '#ffd75e', [-0.15, 0.6, 0.1]),
    ]),
  barrel: () =>
    merge([
      part(cyl(0.42, 0.42, 1.2, 8), '#3f6fb5'),
      part(cyl(0.44, 0.44, 0.08, 8), '#2c4f86', [0, 0.3, 0]),
      part(cyl(0.44, 0.44, 0.08, 8), '#2c4f86', [0, 0.85, 0]),
    ]),
  crate: () =>
    merge([
      part(box(1.2, 1.1, 1.2), '#c9955a'),
      part(box(1.25, 0.12, 1.25), '#a87440', [0, 0.5, 0]),
      part(box(0.12, 1.12, 1.25), '#a87440', [0, 0, 0]),
    ]),
  bench: () =>
    merge([
      part(box(1.8, 0.1, 0.5), '#a0703f', [0, 0.45, 0]),
      part(box(1.8, 0.45, 0.08), '#a0703f', [0, 0.55, -0.24]),
      part(box(0.08, 0.45, 0.45), dark, [-0.8, 0, 0]),
      part(box(0.08, 0.45, 0.45), dark, [0.8, 0, 0]),
    ]),
  lamp: () =>
    merge([
      part(cyl(0.08, 0.12, 4.6, 6), '#4a4f5a'),
      part(box(0.9, 0.12, 0.2), '#4a4f5a', [0.35, 4.5, 0]),
      part(box(0.4, 0.2, 0.3), '#fff1c0', [0.75, 4.3, 0]),
    ]),
  bush: () =>
    merge([
      part(ball(0.7, 0), '#4f9b4a', [0, 0.55, 0]),
      part(ball(0.5, 0), '#5fae55', [0.45, 0.45, 0.2]),
    ]),
  sign: () =>
    merge([
      part(cyl(0.05, 0.05, 2.2, 5), '#8a8f9a'),
      part(box(0.9, 0.6, 0.06), '#e8d14a', [0, 2, 0]),
    ]),
  booth: () =>
    merge([
      part(box(1.1, 2.3, 1.1), '#d9534a'),
      part(box(0.9, 1.4, 0.06), glass, [0, 0.7, 0.56]),
      part(box(1.2, 0.15, 1.2), '#b8403a', [0, 2.3, 0]),
    ]),
  carRed: () => car('#e2534a'),
  carYellow: () => car('#f2b544'),
  carBlue: () => car('#4a90d9'),
  carGreen: () => car('#5bbd8a'),
  carWhite: () => car('#eeeeee'),
  treeRound: () =>
    merge([
      part(cyl(0.22, 0.32, 2.4, 6), trunk),
      part(ball(1.7, 0), '#4f9b4a', [0, 3.6, 0]),
      part(ball(1.2, 0), '#62ad55', [0.7, 4.4, 0.4]),
      part(ball(1.1, 0), '#478f44', [-0.8, 3.2, -0.3]),
    ]),
  treePine: () =>
    merge([
      part(cyl(0.18, 0.26, 1.6, 6), trunk),
      part(cone(1.4, 2.8, 7), '#3d8a4d', [0, 1.2, 0]),
      part(cone(1.1, 2.4, 7), '#45965a', [0, 2.9, 0]),
      part(cone(0.75, 2.0, 7), '#4fa264', [0, 4.5, 0]),
    ]),
  shed: () =>
    merge([
      part(box(3.2, 2.2, 2.6), '#c98a5a'),
      part(gable(3.6, 1.1, 3.0), '#8a5a3b', [0, 2.2, 0]),
    ]),
  kiosk: () =>
    merge([
      part(box(2.6, 2.4, 2.2), '#f4e9d8'),
      part(box(3.2, 0.25, 2.8), '#e8b04a', [0, 2.4, 0]),
      part(box(3.0, 0.5, 0.2), '#e8b04a', [0, 2.0, 1.3], [0.4, 0, 0]),
      part(box(1.8, 0.9, 0.1), glass, [0, 1.1, 1.12]),
    ]),
  houseA: () => house('#f4e9d8', '#d9644a'),
  houseB: () => house('#e9d6c0', '#4f7ca8', 4.4),
  houseC: () => house('#dfe8ef', '#6f9e5a', 4.8),
  bus: () =>
    merge([
      part(box(2.4, 2.6, 10), '#f2b544', [0, 0.4, 0]),
      part(box(2.45, 0.9, 9.2), glass, [0, 1.7, 0.2]),
      part(box(2.45, 0.25, 10), '#d98f2a', [0, 0.9, 0]),
      ...[-3.4, 3.4].flatMap((z) =>
        [-1.2, 1.2].map((x) => part(cyl(0.5, 0.5, 0.4, 8), dark, [x, 0.5, z], [0, 0, Math.PI / 2])),
      ),
    ]),
  tower: () =>
    merge([
      part(cyl(0.3, 0.3, 8, 6), '#8a8f9a', [-1.6, 0, -1.6]),
      part(cyl(0.3, 0.3, 8, 6), '#8a8f9a', [1.6, 0, -1.6]),
      part(cyl(0.3, 0.3, 8, 6), '#8a8f9a', [-1.6, 0, 1.6]),
      part(cyl(0.3, 0.3, 8, 6), '#8a8f9a', [1.6, 0, 1.6]),
      part(cyl(2.8, 2.8, 3.4, 10), '#9aa4b0', [0, 8, 0]),
      part(cone(3, 1.4, 10), '#7a8490', [0, 11.4, 0]),
    ]),
  container: () =>
    merge([
      part(box(2.5, 2.6, 6.2), '#d9644a'),
      ...[-2, -1, 0, 1, 2].map((z) => part(box(2.56, 2.4, 0.15), '#b84e38', [0, 0.1, z * 1.2])),
    ]),
  shop: () =>
    merge([
      ...block(11, 7, 9, '#e9c9a0', 2, 4),
      part(box(11.4, 0.4, 2), '#d9644a', [0, 3.2, 5], [0.3, 0, 0]),
      part(box(3, 1, 0.3), '#fff1c0', [0, 7.2, 4.6]),
    ]),
  apartment: () => merge(block(12, 22, 11, '#c9cfd8', 7, 4)),
  church: () =>
    merge([
      part(box(9, 8, 12), '#f0ece2'),
      part(gable(10, 4, 12.6), '#6a7aa8', [0, 8, 0], [0, Math.PI / 2, 0]),
      part(box(3.6, 12, 3.6), '#f0ece2', [0, 0, 6]),
      part(cone(2.6, 5, 4), '#6a7aa8', [0, 12, 6], [0, Math.PI / 4, 0]),
      part(box(1.4, 2.6, 0.2), '#7a5238', [0, 0, 7.85]),
    ]),
  warehouse: () =>
    merge([
      part(box(18, 8, 12), '#b7a58a'),
      part(cyl(6.3, 6.3, 18, 12), '#9a8a70', [0, 8 - 4.2, 0], [0, 0, Math.PI / 2], [1, 1, 0.6]),
      part(box(5, 5, 0.2), '#7a6a58', [0, 0, 6.05]),
    ]),
  crane: () =>
    merge([
      part(box(4, 1, 4), '#555b66'),
      part(box(1.6, 28, 1.6), '#f2b544', [0, 1, 0]),
      part(box(22, 1.4, 1.4), '#f2b544', [5, 27, 0]),
      part(box(4, 3, 3), '#e2534a', [-3, 25.5, 0]),
      part(box(0.2, 10, 0.2), dark, [14, 17, 0]),
      part(box(2.5, 1.2, 1.2), '#e2534a', [14, 16, 0]),
    ]),
  skyscraper: () =>
    merge([
      ...block(18, 52, 18, '#8fb0cc', 14, 5, '#d8e4ee'),
      part(box(13, 14, 13), '#9cbdd6', [0, 52.6, 0]),
      part(cyl(0.4, 0.4, 8, 6), '#c8d4de', [0, 66.6, 0]),
    ]),
  office: () => merge(block(18, 40, 14, '#b8c4cf', 11, 5, '#e2e8ee')),
  ship: () =>
    merge([
      part(box(7, 3, 22), '#3f5f8a'),
      part(box(7.2, 0.8, 22.2), '#e2534a', [0, 0, 0]),
      part(box(5.6, 4, 5), '#f0f0f0', [0, 3, -6.5]),
      part(box(4, 2, 3), '#f0f0f0', [0, 7, -6.5]),
      part(box(2.4, 2.4, 3), '#d9644a', [0, 3, 2]),
      part(box(2.4, 2.4, 3), '#4a90d9', [0, 3, 5.5]),
      part(box(2.4, 2.4, 3), '#5bbd8a', [0, 5.4, 2]),
    ]),
}

export function buildProp(kind: PropKind) {
  return builders[kind]()
}

// 碎块：白色小方块，用实例色上色
export function buildChunk() {
  return merge([part(box(1, 1, 1), '#ffffff', [0, -0.5, 0])])
}
