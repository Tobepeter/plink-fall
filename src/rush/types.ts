export type FrameId = 'runner' | 'warden' | 'spark'
export type EnemyKind = 'chaser' | 'charger' | 'shooter' | 'splitter' | 'brute' | 'boss'
export type UpgradeId =
  | 'ricochet'
  | 'orbit'
  | 'chain'
  | 'split'
  | 'pierce'
  | 'rocket'
  | 'drone'
  | 'frost'
  | 'pulse'
  | 'haste'
  | 'vital'
  | 'magnet'
export type RushPhase = 'menu' | 'playing' | 'choice' | 'dead' | 'won'
export type MetaUpgradeId = 'firepower' | 'armor' | 'capacitor' | 'magnet'
export type MetaLevels = Record<MetaUpgradeId, number>
export interface RewardParts {
  base: number
  kills: number
  waves: number
  bosses: number
  victory: number
  coins: number
}
export interface RunSettlement extends RewardParts {
  outcome: 'dead' | 'won'
  killCount: number
  wave: number
  seconds: number
}
export type ProtocolId = 'circuit' | 'frostburst' | 'returnfire'
export interface WaveState {
  index: number
  act: number
  name: string
  phase: 'combat' | 'breather'
  elapsed: number
  duration: number
  spawned: number
  budget: number
}
export interface Vec {
  x: number
  y: number
}
export interface Runner extends Vec {
  vx: number
  vy: number
  angle: number
  radius: number
  hp: number
  maxHp: number
  invulnerable: number
  dashTime: number
  dashCooldown: number
  intercepted: number
  lastMove: Vec
  walk: number
  frame: FrameId
}
export interface Foe extends Vec {
  id: number
  kind: EnemyKind
  vx: number
  vy: number
  angle: number
  radius: number
  hp: number
  maxHp: number
  age: number
  cooldown: number
  telegraph: number
  target: Vec
  hurt: number
  slow: number
  tier: number
}
export interface Shot extends Vec {
  id: number
  side: 'player' | 'enemy'
  kind: 'shot' | 'rocket' | 'spark' | 'counter' | 'return'
  scatter?: boolean
  vx: number
  vy: number
  radius: number
  damage: number
  life: number
  age: number
  pierce: number
  bounce: number
  hits: number[]
  grazed: boolean
}
export interface Loot extends Vec {
  id: number
  kind: 'xp' | 'heal' | 'magnet'
  vx: number
  vy: number
  value: number
  age: number
}
export interface Zone extends Vec {
  id: number
  kind: 'frost' | 'pulse' | 'blast'
  radius: number
  life: number
  duration: number
  tick: number
}
export interface Satellite extends Vec {
  id: number
  kind: 'drone' | 'blade'
  angle: number
  cooldown: number
}
export interface RushRecord {
  bestTime: number
  bestKills: number
  wins: number
  bossKills: number
  unlocked: FrameId[]
  selected: FrameId
  muted: boolean
  visited: boolean
  coins: number
  totalCoins: number
  runs: number
  meta: MetaLevels
  lastRun: RunSettlement | null
}
export interface RushState {
  phase: RushPhase
  paused: boolean
  runId: number
  seed: number
  clock: number
  wave: WaveState
  player: Runner
  enemies: Foe[]
  shots: Shot[]
  loot: Loot[]
  zones: Zone[]
  satellites: Satellite[]
  level: number
  xp: number
  nextXp: number
  kills: number
  charge: number
  overdrive: number
  combo: number
  comboTimer: number
  bossesDefeated: number
  bossIndex: number
  nextBoss: number
  upgrades: Partial<Record<UpgradeId, number>>
  choices: UpgradeId[]
  move: Vec
  viewport: Vec
  record: RushRecord
  runMeta: MetaLevels
  settlement: RunSettlement | null
  notice: string
}
export interface UpgradeDef {
  id: UpgradeId
  name: string
  hint: string
  color: string
  icon: string
  maxLevel: number
}
export interface RushEvent extends Vec {
  type:
    | 'shot'
    | 'hit'
    | 'kill'
    | 'hurt'
    | 'dash'
    | 'pickup'
    | 'chain'
    | 'explode'
    | 'level'
    | 'boss'
    | 'boss-down'
    | 'overdrive'
    | 'upgrade'
    | 'run-end'
    | 'wave'
    | 'wave-clear'
    | 'intercept'
    | 'counter'
    | 'protocol'
  kind?: EnemyKind
  amount?: number
  power?: number
  targets?: Vec[]
  upgrade?: UpgradeId
  side?: 'player' | 'enemy'
  protocol?: ProtocolId
}
export interface RushPort {
  state: RushState
  subscribe: (fn: () => void) => () => void
  getSnapshot: () => RushState
  onEvent: (fn: (event: RushEvent) => void) => () => void
  update(dt: number): void
  setMove(point: Vec): void
  setViewport(width: number, height: number): void
  dash(): boolean
  choose(id: UpgradeId): boolean
  setPaused(paused: boolean): void
  toggleSound(): void
  selectFrame(frame: FrameId): boolean
  purchaseMeta(id: MetaUpgradeId): boolean
  openMenu(): void
  restart(frame?: FrameId): void
  save(): void
  destroy(): void
}
