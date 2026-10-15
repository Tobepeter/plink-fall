// 内容定义：灯种
export const lanternKinds = {
  head: { name: '心灯', light: [1, 0.64, 0.32], petal: '#f7e7c8', core: '#fff2c4' },
  warm: { name: '暖灯', light: [1, 0.6, 0.28], petal: '#ff9548', core: '#ffe2a8' },
  jade: { name: '萤灯', light: [0.36, 1, 0.78], petal: '#3fd8b4', core: '#d6fff2' },
  violet: { name: '雷灯', light: [0.72, 0.52, 1], petal: '#9a74ff', core: '#efe4ff' },
  rose: { name: '莲灯', light: [1, 0.5, 0.68], petal: '#ff76a4', core: '#ffe2ec' },
  gold: { name: '金灯', light: [1, 0.84, 0.38], petal: '#ffc93f', core: '#fff4c8' },
} as const

export type LanternKind = keyof typeof lanternKinds
export type FollowerKind = Exclude<LanternKind, 'head'>
export const followerKinds: FollowerKind[] = ['warm', 'jade', 'violet', 'rose', 'gold']
