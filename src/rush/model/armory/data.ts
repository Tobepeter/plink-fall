import type { FrameId, RushState, WeaponBranch, WeaponId, WeaponSlot } from '../../types'

export const weaponDefinitions: {
  id: WeaponId
  name: string
  color: string
  hint: string
  branches: Record<WeaponBranch, { name: string; hint: string }>
  awakened: Record<WeaponBranch, string>
}[] = [
  {
    id: 'laser',
    name: '激光',
    color: '#75dce9',
    hint: '蓄光贯穿长线敌群',
    branches: {
      focus: { name: '聚焦光矛', hint: '更粗光束贯穿整条火线' },
      spread: { name: '分光棱镜', hint: '双束向两侧切开敌群' },
    },
    awakened: { focus: '零点光矛', spread: '三重棱镜' },
  },
  {
    id: 'scatter',
    name: '散弹',
    color: '#f4ca78',
    hint: '近距扇射击退追兵',
    branches: {
      focus: { name: '重击弹芯', hint: '压缩三枚重弹穿透前排' },
      spread: { name: '扇面弹幕', hint: '宽扇弹幕封住近身' },
    },
    awakened: { focus: '破城重炮', spread: '环形风暴' },
  },
  {
    id: 'flame',
    name: '焚烧',
    color: '#ffae63',
    hint: '短锥喷焰留下灼烧',
    branches: {
      focus: { name: '熔穿喷流', hint: '更长焰束持续压制' },
      spread: { name: '烈焰扇面', hint: '宽锥焰浪同时灼烧敌群' },
    },
    awakened: { focus: '熔核喷流', spread: '赤焰领域' },
  },
  {
    id: 'toxin',
    name: '毒囊',
    color: '#b0dc78',
    hint: '抛投毒囊留下腐蚀池',
    branches: {
      focus: { name: '浓缩毒核', hint: '浓毒更久侵蚀重装' },
      spread: { name: '分裂毒囊', hint: '双囊覆盖不同落点' },
    },
    awakened: { focus: '蚀骨毒核', spread: '腐蚀花园' },
  },
  {
    id: 'arc',
    name: '电弧',
    color: '#c1adff',
    hint: '电链跳向附近目标',
    branches: {
      focus: { name: '雷击锁定', hint: '重雷优先击穿首个目标' },
      spread: { name: '分叉电网', hint: '更多节点连接两侧敌群' },
    },
    awakened: { focus: '天罚雷击', spread: '雷暴电网' },
  },
  {
    id: 'blade',
    name: '环刃',
    color: '#e6e8d3',
    hint: '实体刀环守住近身',
    branches: {
      focus: { name: '重型锯环', hint: '双刃更重更远击退' },
      spread: { name: '卫星刃阵', hint: '更多刀刃环绕防线' },
    },
    awakened: { focus: '破阵锯轮', spread: '六芒刃阵' },
  },
]

export const weaponReactions: {
  id: 'combustion' | 'conduction' | 'prism'
  name: string
  parts: [WeaponId, WeaponId]
  hint: string
  color: string
}[] = [
  {
    id: 'combustion',
    name: '毒焰爆燃',
    parts: ['flame', 'toxin'],
    hint: '火焰消耗毒池，引爆池内敌群',
    color: '#ffae63',
  },
  {
    id: 'conduction',
    name: '腐蚀电网',
    parts: ['arc', 'toxin'],
    hint: '电弧命中毒池，向池内传导',
    color: '#c1adff',
  },
  {
    id: 'prism',
    name: '光刃折射',
    parts: ['laser', 'blade'],
    hint: '激光经实体环刃折向目标',
    color: '#75dce9',
  },
]

export const frameStartingWeapon: Record<FrameId, WeaponId> = {
  runner: 'scatter',
  warden: 'blade',
  spark: 'arc',
}
export const weaponCapacity = (state: RushState) => (state.level >= 4 ? 3 : 2)

export function weaponName(slot: Pick<WeaponSlot, 'id' | 'level' | 'branch'>) {
  const def = weaponDefinitions.find((item) => item.id === slot.id)!
  return slot.level >= 5 && slot.branch
    ? def.awakened[slot.branch]
    : slot.level >= 3 && slot.branch
      ? def.branches[slot.branch].name
      : def.name
}

export const activeWeaponReactions = (s: RushState) =>
  weaponReactions.filter((reaction) =>
    reaction.parts.every((id) => s.weapons.some((weapon) => weapon.id === id)),
  )
