import type { FrameId } from '../../types'

// 与角色原画对应的关节比例和装甲轮廓
export const runnerProfiles = {
  runner: {
    torsoHeight: 40,
    hipY: -5,
    hipSpread: 1.3,
    segment: 10.8,
    thigh: 4.8,
    shin: 4.2,
    knee: 2.4,
    heel: 3.2,
    toe: 7,
    bootHeight: 3,
    armor: 0xf8ead5,
    rearArmor: 0xddcfb8,
    dark: 0x24423f,
  },
  warden: {
    torsoHeight: 42,
    hipY: -5.5,
    hipSpread: 2,
    segment: 11.2,
    thigh: 6.2,
    shin: 5.4,
    knee: 3.2,
    heel: 4.2,
    toe: 8.5,
    bootHeight: 3.8,
    armor: 0xf2e4c8,
    rearArmor: 0xc7b594,
    dark: 0x514638,
  },
  spark: {
    torsoHeight: 39,
    hipY: -5,
    hipSpread: 1,
    segment: 10.6,
    thigh: 3.7,
    shin: 3.2,
    knee: 1.9,
    heel: 2.6,
    toe: 6,
    bootHeight: 2.6,
    armor: 0xd9d9f2,
    rearArmor: 0xaba8c9,
    dark: 0x343657,
  },
} satisfies Record<FrameId, {
  torsoHeight: number
  hipY: number
  hipSpread: number
  segment: number
  thigh: number
  shin: number
  knee: number
  heel: number
  toe: number
  bootHeight: number
  armor: number
  rearArmor: number
  dark: number
}>
