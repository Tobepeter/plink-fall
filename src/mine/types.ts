export type Mineral = 'stone' | 'copper' | 'jade' | 'amber' | 'volatile' | 'relic'
export type ToolId = 'pierce' | 'chain' | 'magnet' | 'drone' | 'split' | 'saw' | 'vent' | 'winch'
export type MetaId = 'spool' | 'cooling' | 'bag'
export interface Vec {
  x: number
  y: number
}

export interface OreNode extends Vec {
  id: number
  kind: Mineral
  radius: number
  hp: number
  maxHp: number
  angle: number
  spin: number
  variant: number
  revealed: boolean
}

export interface Drop extends Vec {
  id: number
  kind: Mineral
  value: number
  vx: number
  vy: number
  z: number
  vz: number
  age: number
  carrier: 'loose' | 'probe' | 'drone'
}

export interface Probe extends Vec {
  mode: 'docked' | 'flying' | 'mining' | 'returning'
  vx: number
  vy: number
  angle: number
  target: Vec
  cargo: number[]
  heat: number
  power: number
  life: number
  drillClock: number
}

export interface MineState {
  started: boolean
  paused: boolean
  muted: boolean
  auto: boolean
  clock: number
  idleFor: number
  region: number
  seed: number
  probe: Probe
  drone: Probe
  nodes: OreNode[]
  drops: Drop[]
  coins: number
  cores: number
  banked: number
  totalBanked: number
  deposits: number
  launches: number
  quota: number
  milestone: number
  capacity: number
  relic: boolean
  visited: number[]
  tools: Partial<Record<ToolId, number>>
  meta: Record<MetaId, number>
  choices: ToolId[]
  holding: number
  aim: Vec | null
  offline: number
  notice: string
  savedAt: number
}

export interface MineEvent extends Vec {
  type:
    | 'launch'
    | 'hit'
    | 'break'
    | 'pickup'
    | 'bank'
    | 'pulse'
    | 'gas'
    | 'return'
    | 'install'
    | 'travel'
    | 'relic'
  kind?: Mineral
  amount?: number
  power?: number
  targets?: Vec[]
  tool?: ToolId
}

export interface ToolDefinition {
  id: ToolId
  name: string
  effect: string
  color: string
  icon: string
}

export interface MinePort {
  state: MineState
  subscribe: (fn: () => void) => () => void
  getSnapshot: () => MineState
  onEvent: (fn: (event: MineEvent) => void) => () => void
  update: (dt: number) => void
  hold: (point: Vec, seconds: number) => void
  release: (point: Vec, seconds: number) => boolean
  recall: () => boolean
  choose: (tool: ToolId) => boolean
  buyMeta: (id: MetaId) => boolean
  travel: () => boolean
  setPaused: (paused: boolean) => void
  toggleSound: () => void
  toggleAuto: () => void
  dismissOffline: () => void
  grantOffline: (seconds: number) => void
  save: () => void
  destroy: (save?: boolean) => void
}
