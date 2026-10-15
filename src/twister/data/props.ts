// 道具图鉴：尺寸 s（可卷判定）、高度 h、质量、碎块颜色
// s 取占地与高度 0.35 倍中的较大者
export type PropDef = {
  s: number
  h: number
  mass: number
  debris: string
  moves?: 'walk' | 'drive'
}

const def = (
  s: number,
  h: number,
  debris: string,
  mass = 0.8 * s ** 1.7,
  moves?: PropDef['moves'],
): PropDef => ({
  s,
  h,
  mass,
  debris,
  moves,
})

export const props = {
  // 微物
  personA: def(0.6, 1.8, '#e86a5c', 0.5, 'walk'),
  personB: def(0.6, 1.8, '#4a8fd4', 0.5, 'walk'),
  personC: def(0.6, 1.8, '#f2c14e', 0.5, 'walk'),
  personD: def(0.6, 1.8, '#7ac08a', 0.5, 'walk'),
  bin: def(0.7, 1.1, '#4f8a5b', 0.4),
  hydrant: def(0.6, 0.9, '#d84a3a', 0.4),
  cone: def(0.6, 0.8, '#f28a2e', 0.3),
  mailbox: def(0.6, 1.3, '#3f6fb5', 0.4),
  flower: def(0.9, 0.6, '#e889b8', 0.4),
  barrel: def(0.9, 1.2, '#3f6fb5', 0.5),
  crate: def(1.4, 1.2, '#c9955a'),
  // 小物
  bench: def(1.9, 1, '#a0703f'),
  lamp: def(1.8, 5, '#4a4f5a'),
  bush: def(1.5, 1.2, '#4f9b4a'),
  sign: def(1.2, 2.6, '#e8d14a', 0.9),
  booth: def(1.4, 2.4, '#d9534a'),
  // 中物
  carRed: def(4.2, 1.5, '#e2534a', undefined, 'drive'),
  carYellow: def(4.2, 1.5, '#f2b544', undefined, 'drive'),
  carBlue: def(4.2, 1.5, '#4a90d9', undefined, 'drive'),
  carGreen: def(4.2, 1.5, '#5bbd8a', undefined, 'drive'),
  carWhite: def(4.2, 1.5, '#eeeeee', undefined, 'drive'),
  treeRound: def(3.4, 6, '#4f9b4a'),
  treePine: def(2.8, 7.5, '#3d8a4d'),
  shed: def(3.6, 3, '#c98a5a'),
  kiosk: def(3.2, 3.2, '#e8b04a'),
  // 大物
  houseA: def(9, 7, '#f4e9d8'),
  houseB: def(9, 7.5, '#e9d6c0'),
  houseC: def(9.5, 8, '#dfe8ef'),
  bus: def(10, 3.2, '#f2b544', undefined, 'drive'),
  tower: def(6, 12, '#9aa4b0'),
  container: def(6.5, 2.8, '#d9644a'),
  // 巨物
  shop: def(12, 9, '#e9c9a0'),
  apartment: def(14, 22, '#c9cfd8'),
  church: def(13, 16, '#f0ece2'),
  warehouse: def(20, 10, '#b7a58a'),
  crane: def(14, 30, '#f2b544'),
  skyscraper: def(24, 70, '#8fb0cc'),
  office: def(20, 42, '#b8c4cf'),
  ship: def(22, 9, '#3f5f8a'),
} satisfies Record<string, PropDef>

export type PropKind = keyof typeof props
export const propKinds = Object.keys(props) as PropKind[]

// 体型档位：用于界面提示「能卷起 xx 了」
export const tiers: { s: number; kind: PropKind; name: string }[] = [
  { s: 0.6, kind: 'personA', name: '行人' },
  { s: 1.9, kind: 'bench', name: '长椅' },
  { s: 4.2, kind: 'carRed', name: '汽车' },
  { s: 9, kind: 'houseA', name: '房屋' },
  { s: 14, kind: 'apartment', name: '公寓' },
  { s: 20, kind: 'warehouse', name: '仓库' },
  { s: 24, kind: 'skyscraper', name: '摩天楼' },
]
