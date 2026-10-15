import type { FrameId } from './types'

export const playerAtlas = '/rush/players-v1.webp'

// 原生生成图中的独立全身、腰线与髋点；菜单和战斗共用身份
export const frameArt = {
  runner: {
    portrait: '/rush/frames/runner-v1.webp',
    accent: '#8ce6c2',
    full: { x: 61, y: 202, width: 417, height: 739 },
    torso: { x: 61, y: 202, width: 417, height: 425, hipX: 207 },
  },
  warden: {
    portrait: '/rush/frames/warden-v1.webp',
    accent: '#edc274',
    full: { x: 515, y: 200, width: 578, height: 736 },
    torso: { x: 515, y: 200, width: 578, height: 446, hipX: 337 },
  },
  spark: {
    portrait: '/rush/frames/spark-v1.webp',
    accent: '#b6a5ff',
    full: { x: 1152, y: 89, width: 338, height: 856 },
    torso: { x: 1152, y: 89, width: 338, height: 532, hipX: 200 },
  },
} satisfies Record<
  FrameId,
  {
    portrait: string
    accent: string
    full: { x: number; y: number; width: number; height: number }
    torso: { x: number; y: number; width: number; height: number; hipX: number }
  }
>
