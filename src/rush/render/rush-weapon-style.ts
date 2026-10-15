import type { WeaponId } from '../types'

export const armoryAtlas = '/rush/armory-v1.png'
export const weaponOrder: WeaponId[] = ['laser', 'scatter', 'flame', 'toxin', 'arc', 'blade']
export const weaponColors: Record<WeaponId, number> = {
  laser: 0x75dce9,
  scatter: 0xf4ca78,
  flame: 0xffae63,
  toxin: 0xb0dc78,
  arc: 0xc1adff,
  blade: 0xe6e8d3,
}

export const reactionColors = {
  combustion: [weaponColors.flame, weaponColors.toxin],
  conduction: [weaponColors.arc, weaponColors.toxin],
  prism: [weaponColors.laser, weaponColors.blade],
} as const
