// 城区：布局风格、限时、目标半径、对手数量
export const districts = [
  {
    id: 'suburb',
    name: '郊外小镇',
    style: 'suburb',
    grid: 6,
    time: 80,
    goal: 9.5,
    rivals: 2,
    start: 1.6,
    sky: '#9fd3f0',
  },
  {
    id: 'oldtown',
    name: '老街',
    style: 'oldtown',
    grid: 6,
    time: 85,
    goal: 14,
    rivals: 3,
    start: 2.2,
    sky: '#f2c9a0',
  },
  {
    id: 'harbor',
    name: '海港',
    style: 'harbor',
    grid: 7,
    time: 90,
    goal: 18,
    rivals: 3,
    start: 2.8,
    sky: '#b9d8e8',
  },
  {
    id: 'downtown',
    name: '摩天中心',
    style: 'downtown',
    grid: 7,
    time: 95,
    goal: 24,
    rivals: 4,
    start: 3.4,
    sky: '#c7b8e0',
  },
] as const

export type District = (typeof districts)[number]
export type DistrictStyle = District['style']

export const block = 40
export const roadW = 12
export const pitch = block + roadW
