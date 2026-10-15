import { block, pitch, roadW, type DistrictStyle } from '../data/districts'
import type { PropKind } from '../data/props'
import { makeObj, type Obj } from './world'
import type { Rng } from './rng'

// 程序化城区：道路网、街区内容、行道设施、行人与车流
export type City = {
  half: number
  objs: Obj[]
  nodes: { x: number; z: number }[]
  adj: number[][]
  water: number | null // 该 z 以南为水
  roads: number[] // 道路中线坐标（x 与 z 共用）
}

const people: PropKind[] = ['personA', 'personB', 'personC', 'personD']
const cars: PropKind[] = ['carRed', 'carYellow', 'carBlue', 'carGreen', 'carWhite']
const houses: PropKind[] = ['houseA', 'houseB', 'houseC']

export function buildCity(style: DistrictStyle, grid: number, rng: Rng): City {
  const half = (grid * pitch) / 2
  const roads = Array.from({ length: grid + 1 }, (_, k) => -half + k * pitch)
  const water = style === 'harbor' ? roads[grid - 1] + roadW / 2 : null
  const objs: Obj[] = []
  const add = (
    kind: PropKind,
    x: number,
    z: number,
    rot = rng.range(0, Math.PI * 2),
    scale = 1,
  ) => {
    const o = makeObj(kind, x, z, rot, scale)
    objs.push(o)
    return o
  }
  // 路网节点
  const nodes: { x: number; z: number }[] = []
  const adj: number[][] = []
  const rows = water === null ? grid + 1 : grid
  for (let j = 0; j < rows; j++)
    for (let i = 0; i <= grid; i++) nodes.push({ x: roads[i], z: roads[j] })
  const id = (i: number, j: number) => j * (grid + 1) + i
  for (let j = 0; j < rows; j++)
    for (let i = 0; i <= grid; i++) {
      const list: number[] = []
      if (i > 0) list.push(id(i - 1, j))
      if (i < grid) list.push(id(i + 1, j))
      if (j > 0) list.push(id(i, j - 1))
      if (j < rows - 1) list.push(id(i, j + 1))
      adj.push(list)
    }
  // 街区
  for (let j = 0; j < grid; j++)
    for (let i = 0; i < grid; i++) {
      const x0 = roads[i] + roadW / 2,
        z0 = roads[j] + roadW / 2
      if (water !== null && z0 >= water) {
        if (rng.chance(0.5))
          add(
            'ship',
            x0 + rng.range(12, 28),
            z0 + rng.range(10, 30),
            rng.chance(0.5) ? 0 : Math.PI / 2,
          )
        continue
      }
      fillBlock(style, x0, z0, rng, add, water !== null && j === grid - 2)
      sidewalk(style, x0, z0, rng, add)
      // 绕街区步行
      const n = style === 'downtown' || style === 'oldtown' ? rng.int(3, 6) : rng.int(2, 4)
      const loop = [x0 - 1.2, z0 - 1.2, x0 + block + 1.2, z0 + block + 1.2]
      for (let k = 0; k < n; k++) {
        const p = add(rng.pick(people), 0, 0)
        p.move = {
          kind: 'walk',
          loop,
          t: rng.next(),
          dir: rng.chance(0.5) ? 1 : -1,
          speed: rng.range(1.1, 1.7),
          flee: 0,
        }
      }
    }
  // 车流
  const traffic = Math.round(grid * grid * (style === 'suburb' ? 0.7 : 1.1))
  for (let k = 0; k < traffic; k++) {
    const from = rng.int(0, nodes.length - 1)
    const to = rng.pick(adj[from])
    const kind = style !== 'suburb' && rng.chance(0.18) ? 'bus' : rng.pick(cars)
    const o = add(kind, nodes[from].x, nodes[from].z, 0)
    o.move = {
      kind: 'drive',
      from,
      to,
      t: rng.next(),
      speed: rng.range(7, 10) * (kind === 'bus' ? 0.75 : 1),
      head: 0,
    }
  }
  return { half, objs, nodes, adj, water, roads }
}

type Add = (kind: PropKind, x: number, z: number, rot?: number, scale?: number) => Obj

// 朝向：模型正面为 +z
const face = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

function fillBlock(
  style: DistrictStyle,
  x0: number,
  z0: number,
  rng: Rng,
  add: Add,
  quay: boolean,
) {
  const cx = x0 + block / 2,
    cz = z0 + block / 2
  if (style === 'suburb') {
    if (rng.chance(0.16)) return park(cx, cz, rng, add)
    for (const [lx, lz] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const ox = x0 + lx * 20 + 10,
        oz = z0 + lz * 20 + 10
      // 房子朝向外侧街道
      const rot = lz === 1 ? face[0] : face[2]
      const fz = lz === 1 ? 1 : -1
      add(rng.pick(houses), ox, oz - fz * 1.5, rot)
      if (rng.chance(0.55))
        add(
          rng.pick(['carRed', 'carBlue', 'carWhite', 'carGreen'] as PropKind[]),
          ox + 6.5,
          oz + fz * 4,
          rot,
        )
      add('mailbox', ox - 4, oz + fz * 8.5, rot)
      for (let t = 0; t < rng.int(1, 3); t++)
        add(
          rng.chance(0.6) ? 'treeRound' : 'treePine',
          ox + rng.range(-8, 8),
          oz - fz * rng.range(6, 8.5),
        )
      if (rng.chance(0.5)) add('bush', ox - 6.5, oz + fz * 5)
      if (rng.chance(0.4)) add('flower', ox + rng.range(-3, 3), oz + fz * 6)
      if (rng.chance(0.25)) add('shed', ox + rng.range(-6, 6), oz - fz * 7.5, rot)
    }
    return
  }
  if (style === 'oldtown') {
    if (rng.chance(0.18)) return park(cx, cz, rng, add, true)
    // 四周一圈铺面，中间公寓或教堂
    for (let k = 0; k < 3; k++) {
      add('shop', x0 + 7 + k * 13, z0 + block - 5.5, face[0])
      add('shop', x0 + 7 + k * 13, z0 + 5.5, face[2])
    }
    if (rng.chance(0.3)) add('church', cx, cz, face[rng.int(0, 3)])
    else add('apartment', cx, cz, face[rng.int(0, 3)])
    if (rng.chance(0.5)) add('kiosk', cx + rng.range(-14, 14), cz + rng.range(-3, 3))
    return
  }
  if (style === 'harbor') {
    if (quay) {
      for (let k = 0; k < 2; k++) add('crane', x0 + 10 + k * 20, z0 + block - 6, face[3])
      for (let k = 0; k < 4; k++) add('container', x0 + 5 + k * 10, z0 + 8, 0)
      cargo(x0 + 20, z0 + 20, rng, add)
      return
    }
    if (rng.chance(0.35)) {
      add('warehouse', cx, cz - 6, face[0])
      add('container', cx - 12, cz + 13, Math.PI / 2)
      add('container', cx + 2, cz + 13, Math.PI / 2)
      cargo(cx + 14, cz + 13, rng, add)
      return
    }
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const x = x0 + 6 + c * 9.5,
          z = z0 + 6 + r * 9.5
        if (rng.chance(0.65)) add('container', x, z, rng.chance(0.5) ? 0 : Math.PI / 2)
        else cargo(x, z, rng, add)
      }
    return
  }
  // 摩天中心
  if (rng.chance(0.2)) return park(cx, cz, rng, add, true)
  for (let i = 0; i < 6; i++) {
    const side = rng.int(0, 3)
    const t = rng.range(3, block - 3)
    const x = side === 0 ? x0 + t : side === 1 ? x0 + block - 2 : side === 2 ? x0 + t : x0 + 2
    const z = side === 0 ? z0 + 2 : side === 1 ? z0 + t : side === 2 ? z0 + block - 2 : z0 + t
    add(rng.pick(['bin', 'bench', 'flower', 'bush', 'personA', 'personC'] as PropKind[]), x, z)
  }
  if (rng.chance(0.45)) add('skyscraper', cx, cz, face[rng.int(0, 3)])
  else {
    add('office', x0 + 10, cz, face[1])
    add(rng.chance(0.5) ? 'apartment' : 'office', x0 + 30, cz, face[3])
  }
}

// 码头散货：木箱、油桶、工人
function cargo(x: number, z: number, rng: Rng, add: Add) {
  for (let i = 0; i < rng.int(4, 8); i++)
    add(rng.chance(0.5) ? 'crate' : 'barrel', x + rng.range(-4, 4), z + rng.range(-4, 4))
  for (let i = 0; i < rng.int(1, 3); i++)
    add(rng.pick(people), x + rng.range(-4, 4), z + rng.range(-4, 4))
  if (rng.chance(0.4)) add('cone', x + rng.range(-4, 4), z + rng.range(-4, 4))
}

function park(cx: number, cz: number, rng: Rng, add: Add, plaza = false) {
  for (let t = 0; t < rng.int(6, 10); t++)
    add(
      rng.chance(0.6) ? 'treeRound' : 'treePine',
      cx + rng.range(-17, 17),
      cz + rng.range(-17, 17),
    )
  for (let b = 0; b < 4; b++) add('bench', cx + rng.range(-12, 12), cz + rng.range(-12, 12))
  for (let f = 0; f < 4; f++) add('flower', cx + rng.range(-15, 15), cz + rng.range(-15, 15))
  if (plaza) add('kiosk', cx, cz)
  if (rng.chance(0.5)) add('booth', cx + rng.range(-10, 10), cz + rng.range(-10, 10))
  for (let p = 0; p < rng.int(3, 6); p++)
    add(rng.pick(people), cx + rng.range(-14, 14), cz + rng.range(-14, 14))
}

// 行道设施：路灯、垃圾桶、消防栓、长椅
function sidewalk(style: DistrictStyle, x0: number, z0: number, rng: Rng, add: Add) {
  const edge = (x: number, z: number, along: 'x' | 'z') => {
    for (let k = 4; k < block; k += 9) {
      const px = along === 'x' ? x + k : x,
        pz = along === 'z' ? z + k : z
      const roll = rng.next()
      if (roll < 0.28) add('lamp', px, pz, along === 'x' ? 0 : Math.PI / 2)
      else if (roll < 0.4) add('bin', px, pz)
      else if (roll < 0.48) add('hydrant', px, pz)
      else if (roll < 0.56) add('bench', px, pz, along === 'x' ? 0 : Math.PI / 2)
      else if (roll < 0.62 && style !== 'suburb') add('booth', px, pz)
      else if (roll < 0.68) add('sign', px, pz)
      else if (roll < 0.72) add('cone', px, pz)
    }
  }
  edge(x0, z0 - 1.6, 'x')
  edge(x0, z0 + block + 1.6, 'x')
  edge(x0 - 1.6, z0, 'z')
  edge(x0 + block + 1.6, z0, 'z')
}
