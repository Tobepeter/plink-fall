import type { EnemyKind, Foe, FrameId, RushRecord, RushState, Vec } from '../types'
import { enemyStats } from './data'
import type { Hooks } from './math'
import { createWave } from './campaign/waves'
import { metaStats } from './meta/progression'
import { frameStats } from './frames'
import { difficultyStats } from './campaign/difficulty'
import { clampToArena } from './arena'

export function foe(
  kind: EnemyKind,
  point: Vec,
  tier: number,
  hooks: Hooks,
  difficulty: RushState['difficulty'] = 0,
): Foe {
  const stats = enemyStats[kind]
  const hp =
    stats.hp *
    (kind === 'boss' ? 1 + (tier - 1) * 0.9 : 1 + Math.max(0, tier - 1) * 0.22) *
    difficultyStats(difficulty).hpMultiplier
  const spawn = clampToArena(point, stats.radius)
  return {
    ...spawn,
    id: hooks.id(),
    kind,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: stats.radius,
    hp,
    maxHp: hp,
    age: 0,
    cooldown: kind === 'shooter' ? 0.05 : kind === 'boss' ? 1.2 : 1.4,
    telegraph: 0,
    target: { ...spawn },
    hurt: 0,
    slow: 0,
    tier,
  }
}

export function createState(
  record: RushRecord,
  runId: number,
  seed: number,
  frame: FrameId,
  viewport: Vec,
): RushState {
  const hp = frameStats[frame].hp + metaStats(record.meta).armor
  return {
    phase: 'playing',
    paused: false,
    runId,
    seed,
    clock: 0,
    wave: createWave(1, record.difficulty),
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: -0.5,
      radius: 13,
      hp,
      maxHp: hp,
      invulnerable: 3.6,
      dashTime: 0,
      dashCooldown: 0,
      intercepted: 0,
      lastMove: { x: 0, y: -1 },
      walk: 0,
      frame,
    },
    enemies: [],
    shots: [],
    loot: [],
    zones: [],
    satellites: [],
    level: 1,
    xp: 0,
    nextXp: 4,
    kills: 0,
    charge: 0,
    overdrive: 0,
    combo: 0,
    comboTimer: 0,
    bossesDefeated: 0,
    bossIndex: 0,
    nextBoss: 25,
    upgrades: { [frameStats[frame].startingSkill]: 1 },
    choices: [],
    move: { x: 0, y: 0 },
    viewport: { ...viewport },
    record,
    runMeta: { ...record.meta },
    settlement: null,
    notice: '移动躲避 · 自动开火',
    difficulty: record.difficulty,
    scrap: 0,
    shop: null,
    abilityCooldown: 0,
    abilityActive: 0,
    aim: { mode: 'auto', point: null },
  }
}

export function initialEnemies(s: RushState, hooks: Hooks) {
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7 + 0.4
    const maxX = Math.max(145, s.viewport.x * 0.39)
    const maxY = Math.max(145, s.viewport.y * 0.38)
    const radius = 155 + (i % 3) * 34
    s.enemies.push(
      foe(
        'chaser',
        { x: Math.cos(a) * Math.min(radius, maxX), y: Math.sin(a) * Math.min(radius, maxY) },
        1,
        hooks,
        s.difficulty,
      ),
    )
  }
}
