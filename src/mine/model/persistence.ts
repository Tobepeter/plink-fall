import { base, tools } from './data'
import { makeTerrain } from './terrain'
import type { Drop, MetaId, Mineral, MineState, OreNode, Probe, ToolId } from '../types'

export const saveKey = 'codex-mine-save-v1'
export type MineStorage = Pick<Storage, 'getItem' | 'setItem'>
const kinds: Mineral[] = ['stone', 'copper', 'jade', 'amber', 'volatile', 'relic']
export function number(value: unknown, fallback = 0, min = 0, max = 1e10) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
export function blankProbe(): Probe {
  return {
    ...base,
    mode: 'docked',
    vx: 0,
    vy: 0,
    angle: Math.PI / 2,
    target: { x: 0, y: 300 },
    cargo: [],
    heat: 0,
    power: 1,
    life: 0,
    drillClock: 0,
  }
}
export function initialState(now: number): MineState {
  const seed = Math.floor(now) % 2147483647
  return {
    started: false,
    paused: false,
    muted: false,
    auto: false,
    clock: 0,
    idleFor: 0,
    region: 0,
    seed,
    probe: blankProbe(),
    drone: blankProbe(),
    nodes: makeTerrain(seed, 0),
    drops: [],
    coins: 0,
    cores: 0,
    banked: 0,
    totalBanked: 0,
    deposits: 0,
    launches: 0,
    quota: 5,
    milestone: 0,
    capacity: 5,
    relic: false,
    visited: [0],
    tools: {},
    meta: { spool: 0, cooling: 0, bag: 0 },
    choices: [],
    holding: 0,
    aim: null,
    offline: 0,
    notice: '',
    savedAt: now,
  }
}
function readProbe(value: unknown): Probe {
  const data = object(value)
  const target = object(data.target)
  return {
    x: number(data.x, 0, -800, 800),
    y: number(data.y, 70, 0, 1150),
    vx: number(data.vx, 0, -1000, 1000),
    vy: number(data.vy, 0, -1000, 1000),
    mode: ['docked', 'flying', 'mining', 'returning'].includes(String(data.mode))
      ? (data.mode as Probe['mode'])
      : 'docked',
    angle: number(data.angle, Math.PI / 2, -Math.PI * 2, Math.PI * 2),
    target: { x: number(target.x, 0, -800, 800), y: number(target.y, 300, 70, 1150) },
    cargo: Array.isArray(data.cargo)
      ? [
          ...new Set(
            data.cargo.filter(
              (id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0,
            ),
          ),
        ].slice(0, 24)
      : [],
    heat: number(data.heat, 0, 0, 100),
    power: number(data.power, 1, 1, 2.7),
    life: number(data.life, 0, 0, 30),
    drillClock: number(data.drillClock, 0, 0, 100),
  }
}
export function sanitize(value: unknown, now: number) {
  const data = object(value)
  const state = initialState(now)
  for (const key of ['started', 'paused', 'muted', 'auto', 'relic'] as const)
    state[key] = data[key] === true
  for (const key of [
    'clock',
    'coins',
    'cores',
    'banked',
    'totalBanked',
    'deposits',
    'launches',
  ] as const)
    state[key] = number(data[key])
  state.region = Math.floor(number(data.region, 0, 0, 999))
  state.seed = Math.floor(number(data.seed, state.seed, 1, 2147483647))
  state.milestone = Math.floor(number(data.milestone, 0, 0, 3))
  state.quota = [5, 20, 45][state.milestone] ?? Math.max(75, number(data.quota, 75, 75, 1e6))
  state.savedAt = number(data.savedAt, now, 0, now)
  state.visited = Array.isArray(data.visited)
    ? [
        ...new Set(
          data.visited.filter(
            (region): region is number =>
              typeof region === 'number' &&
              Number.isInteger(region) &&
              region >= 0 &&
              region <= 999,
          ),
        ),
      ].slice(0, 1000)
    : [state.region]
  const savedTools = object(data.tools)
  for (const tool of tools) {
    const level = Math.floor(number(savedTools[tool.id], 0, 0, 3))
    if (level) state.tools[tool.id] = level
  }
  const meta = object(data.meta)
  for (const id of ['spool', 'cooling', 'bag'] as MetaId[])
    state.meta[id] = Math.floor(number(meta[id], 0, 0, 5))
  state.capacity = 5 + state.meta.bag * 2 + (state.tools.magnet ?? 0) * 3
  if (Array.isArray(data.choices))
    state.choices = [
      ...new Set(
        data.choices.filter((id): id is ToolId =>
          tools.some((tool) => tool.id === id && (state.tools[tool.id] ?? 0) < 3),
        ),
      ),
    ].slice(0, 3)
  const aim = object(data.aim)
  if (typeof aim.x === 'number' && typeof aim.y === 'number')
    state.aim = { x: number(aim.x, 0, -620, 620), y: number(aim.y, 300, 190, 920) }
  state.nodes = []
  if (Array.isArray(data.nodes)) {
    const ids = new Set<number>()
    for (const value of data.nodes.slice(0, 65)) {
      const node = object(value)
      const id = Math.floor(number(node.id, 0, 1, 1000))
      if (!kinds.includes(node.kind as Mineral) || ids.has(id) || number(node.hp) <= 0) continue
      ids.add(id)
      const maxHp = number(node.maxHp, 4, 0.5, 30)
      state.nodes.push({
        id,
        kind: node.kind as Mineral,
        x: number(node.x, 0, -620, 620),
        y: number(node.y, 300, 190, 920),
        radius: number(node.radius, 35, 15, 65),
        hp: number(node.hp, maxHp, 0.01, maxHp),
        maxHp,
        angle: number(node.angle, 0, -100, 100),
        spin: number(node.spin, 0, -1, 1),
        variant: Math.floor(number(node.variant, 0, 0, 30)),
        revealed: node.revealed === true,
      } satisfies OreNode)
    }
  } else state.nodes = makeTerrain(state.seed, state.region)
  state.drops = []
  if (Array.isArray(data.drops)) {
    const ids = new Set<number>()
    for (const value of data.drops.slice(0, 180)) {
      const drop = object(value)
      const id = Math.floor(number(drop.id, 0, 1, 1e9))
      if (ids.has(id) || !kinds.includes(drop.kind as Mineral)) continue
      ids.add(id)
      state.drops.push({
        id,
        kind: drop.kind as Mineral,
        x: number(drop.x, 0, -850, 850),
        y: number(drop.y, 300, 0, 1150),
        vx: number(drop.vx, 0, -600, 600),
        vy: number(drop.vy, 0, -600, 600),
        z: number(drop.z, 0, 0, 80),
        vz: number(drop.vz, 0, -100, 100),
        value: number(drop.value, 1, 0, 20),
        age: number(drop.age, 0, 0, 180),
        carrier: ['loose', 'probe', 'drone'].includes(String(drop.carrier))
          ? (drop.carrier as Drop['carrier'])
          : 'loose',
      })
    }
  }
  state.probe = readProbe(data.probe)
  state.drone = readProbe(data.drone)
  for (const [carrier, probe] of [
    ['probe', state.probe],
    ['drone', state.drone],
  ] as const) {
    probe.cargo = probe.cargo
      .filter((id) => state.drops.some((drop) => drop.id === id && drop.carrier === carrier))
      .slice(0, carrier === 'probe' ? state.capacity : 2 + (state.tools.drone ?? 0))
    for (const drop of state.drops)
      if (drop.carrier === carrier && !probe.cargo.includes(drop.id)) drop.carrier = 'loose'
    if (probe.mode === 'docked') {
      probe.x = base.x
      probe.y = base.y
      if (probe.cargo.length) probe.mode = 'returning'
    }
  }
  if (
    !state.relic &&
    !state.nodes.some((node) => node.kind === 'relic') &&
    !state.drops.some((drop) => drop.kind === 'relic')
  ) {
    const relic = makeTerrain(state.seed, state.region).find((node) => node.kind === 'relic')!
    relic.revealed = state.milestone >= 3
    state.nodes.push(relic)
  }
  if (!state.tools.drone) {
    for (const drop of state.drops) if (drop.carrier === 'drone') drop.carrier = 'loose'
    state.drone = blankProbe()
  }
  return state
}
export function storage(): MineStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
export function loadSave(target: MineStorage | null, now: number) {
  if (!target) return { state: initialState(now), notice: '浏览器暂不允许保存，仍可正常采矿' }
  try {
    const text = target.getItem(saveKey)
    if (!text) return { state: initialState(now), notice: '' }
    if (text.length > 160000)
      return { state: initialState(now), notice: '存档过大，已安全开启新矿区' }
    const data = object(JSON.parse(text))
    if (data.version !== 1)
      return { state: initialState(now), notice: '存档版本无法读取，已安全开启新矿区' }
    return { state: sanitize(data.state, now), notice: '' }
  } catch {
    return { state: initialState(now), notice: '存档无法读取，仍可正常采矿' }
  }
}
export function saveState(target: MineStorage | null, state: MineState) {
  try {
    if (!target) return false
    target.setItem(saveKey, JSON.stringify({ version: 1, state }))
    return true
  } catch {
    return false
  }
}
