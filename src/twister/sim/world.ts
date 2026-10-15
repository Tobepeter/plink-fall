import { props, type PropKind } from '../data/props'

// 城市物件与空间网格
export type ObjKind = PropKind | 'chunk'
export type ObjState = 'idle' | 'lift' | 'gone'

export type Walker = {
  kind: 'walk'
  loop: number[]
  t: number
  dir: number
  speed: number
  flee: number
}
export type Driver = {
  kind: 'drive'
  from: number
  to: number
  t: number
  speed: number
  head: number
}

export type Obj = {
  id: number
  kind: ObjKind
  x: number
  z: number
  y: number
  rot: number
  s: number
  h: number
  mass: number
  scale: number
  state: ObjState
  hp: number // 侵蚀剩余 0..1
  shake: number
  color: string // 碎块颜色
  cell: number
  slot: number
  // 卷起状态
  owner: number
  ang: number
  rad: number
  t: number
  tumble: number
  spin: number
  vx: number
  vz: number
  move: Walker | Driver | null
  dirty: boolean
}

let nextId = 1

export function makeObj(
  kind: ObjKind,
  x: number,
  z: number,
  rot: number,
  scale = 1,
  color = '#ffffff',
): Obj {
  const d = kind === 'chunk' ? null : props[kind]
  const s = d ? d.s * scale : scale
  return {
    id: nextId++,
    kind,
    x,
    z,
    y: 0,
    rot,
    s,
    h: d ? d.h * scale : scale,
    mass: d ? d.mass * scale * scale : scale * scale * 0.8,
    scale,
    state: 'idle',
    hp: 1,
    shake: 0,
    color: d ? d.debris : color,
    cell: -1,
    slot: -1,
    owner: -1,
    ang: 0,
    rad: 0,
    t: 0,
    tumble: 0,
    spin: 0,
    vx: 0,
    vz: 0,
    move: null,
    dirty: true,
  }
}

// 均匀网格，格内数组 + 槽位号，O(1) 增删
export class Grid {
  readonly cells: Obj[][]
  readonly n: number

  constructor(
    readonly half: number,
    readonly size = 16,
  ) {
    this.n = Math.ceil((half * 2) / size) + 2
    this.cells = Array.from({ length: this.n * this.n }, () => [])
  }

  index(x: number, z: number) {
    const i = Math.max(0, Math.min(this.n - 1, Math.floor((x + this.half) / this.size) + 1))
    const j = Math.max(0, Math.min(this.n - 1, Math.floor((z + this.half) / this.size) + 1))
    return j * this.n + i
  }

  add(o: Obj) {
    const c = this.index(o.x, o.z)
    o.cell = c
    o.slot = this.cells[c].length
    this.cells[c].push(o)
  }

  remove(o: Obj) {
    if (o.cell < 0) return
    const list = this.cells[o.cell]
    const last = list.pop()!
    if (last !== o) {
      list[o.slot] = last
      last.slot = o.slot
    }
    o.cell = -1
    o.slot = -1
  }

  update(o: Obj) {
    const c = this.index(o.x, o.z)
    if (c === o.cell) return
    this.remove(o)
    this.add(o)
  }

  // 圆形范围查询（按格粗筛）
  query(x: number, z: number, r: number, out: Obj[]) {
    out.length = 0
    const s = this.size
    const i0 = Math.max(0, Math.floor((x - r + this.half) / s) + 1),
      i1 = Math.min(this.n - 1, Math.floor((x + r + this.half) / s) + 1)
    const j0 = Math.max(0, Math.floor((z - r + this.half) / s) + 1),
      j1 = Math.min(this.n - 1, Math.floor((z + r + this.half) / s) + 1)
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) for (const o of this.cells[j * this.n + i]) out.push(o)
    return out
  }
}
