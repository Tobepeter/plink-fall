// 龙卷风：质量决定半径，半径决定能卷多大的东西
export type Tornado = {
  id: number
  name: string
  player: boolean
  x: number
  z: number
  vx: number
  vz: number
  mass: number
  base: number // 起始半径
  r: number
  tint: string
  alive: boolean
  respawn: number
  guard: number // 无敌剩余
  // AI
  goal: { x: number; z: number } | null
  think: number
  eaten: number // 本局卷起件数
  growth: number // 质量增益倍率
  feed: number // 吞到的质量交给谁，-1 为自己（双涡伙伴用）
  calm: number // 对手暂不追猎玩家的剩余秒数
}

export function radiusOf(mass: number, base: number) {
  return base + 0.42 * Math.sqrt(mass)
}

export function massFor(r: number, base: number) {
  return Math.max(0, (r - base) / 0.42) ** 2
}

export function makeTornado(
  id: number,
  name: string,
  x: number,
  z: number,
  base: number,
  tint: string,
  player = false,
): Tornado {
  return {
    id,
    name,
    player,
    x,
    z,
    vx: 0,
    vz: 0,
    mass: 0,
    base,
    r: base,
    tint,
    alive: true,
    respawn: 0,
    guard: 2,
    goal: null,
    think: 0,
    eaten: 0,
    growth: 1,
    feed: -1,
    calm: 12,
  }
}

export function grow(t: Tornado, mass: number) {
  t.mass += mass * t.growth
  t.r = radiusOf(t.mass, t.base)
}

// 移动速度随体型增加，镜头也会拉远
export const topSpeed = (t: Tornado) => 9 + t.r * 0.55
