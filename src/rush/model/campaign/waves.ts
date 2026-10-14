import type { EnemyKind, RushState, WaveState } from '../../types'

interface WaveDef {
  name: string
  duration: number
  groups: EnemyKind[][]
}

// 每波三个错峰编队，Boss 波的编队为限量支援
export const waveDefinitions: WaveDef[] = [
  {
    name: '追猎信号',
    duration: 12,
    groups: [
      ['chaser', 'chaser', 'chaser'],
      ['chaser', 'chaser', 'charger'],
      ['chaser', 'chaser', 'chaser', 'charger'],
    ],
  },
  {
    name: '交叉火线',
    duration: 18,
    groups: [
      ['shooter', 'chaser', 'chaser', 'charger'],
      ['shooter', 'shooter', 'chaser', 'charger'],
      ['shooter', 'chaser', 'chaser', 'charger', 'charger'],
    ],
  },
  {
    name: '封锁者',
    duration: 0,
    groups: [
      ['chaser', 'chaser'],
      ['shooter', 'chaser'],
      ['charger', 'chaser'],
    ],
  },
  {
    name: '裂变追猎',
    duration: 20,
    groups: [
      ['splitter', 'splitter', 'charger', 'chaser', 'chaser'],
      ['splitter', 'charger', 'charger', 'chaser', 'chaser'],
      ['splitter', 'splitter', 'shooter', 'charger', 'chaser', 'chaser'],
    ],
  },
  {
    name: '重装夹击',
    duration: 22,
    groups: [
      ['brute', 'shooter', 'shooter', 'chaser', 'charger'],
      ['brute', 'shooter', 'charger', 'charger', 'splitter'],
      ['brute', 'brute', 'shooter', 'shooter', 'charger', 'splitter'],
    ],
  },
  {
    name: '灼热核心',
    duration: 0,
    groups: [
      ['charger', 'chaser'],
      ['shooter', 'chaser'],
      ['splitter', 'charger'],
    ],
  },
  {
    name: '失控集群',
    duration: 22,
    groups: [
      ['splitter', 'splitter', 'shooter', 'charger', 'charger', 'chaser'],
      ['splitter', 'splitter', 'brute', 'shooter', 'charger', 'chaser'],
      ['splitter', 'brute', 'shooter', 'shooter', 'charger', 'charger', 'chaser'],
    ],
  },
  {
    name: '最后防线',
    duration: 24,
    groups: [
      ['brute', 'brute', 'shooter', 'shooter', 'charger', 'chaser'],
      ['brute', 'splitter', 'splitter', 'shooter', 'charger', 'charger'],
      ['brute', 'brute', 'splitter', 'shooter', 'shooter', 'charger', 'charger', 'chaser'],
    ],
  },
  {
    name: '零点突围',
    duration: 0,
    groups: [
      ['shooter', 'chaser'],
      ['charger', 'chaser'],
      ['brute', 'splitter'],
    ],
  },
]

export function createWave(index: number): WaveState {
  const def = waveDefinitions[index - 1]
  return {
    index,
    act: Math.ceil(index / 3),
    name: def.name,
    phase: 'combat',
    elapsed: 0,
    duration: def.duration,
    spawned: 0,
    budget:
      def.groups.flat().length * (def.duration ? 2 : 1) +
      (index === 1 ? 7 : index % 3 === 0 ? 1 : 0),
  }
}

export const isBossWave = (s: RushState) => s.wave.index % 3 === 0
