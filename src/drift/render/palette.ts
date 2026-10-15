// 区域调色：线性色值，交给水面着色器
export type Palette = {
  ambient: number[]
  deep: number[]
  shallow: number[]
  land: number[]
  sky: number[]
  moon: number[]
  exposure: number
  bed: number // 河床可见度
  stone: number // 石砌驳岸
  glow: number // 荧光浮游
}

export const palettes = {
  // 竹溪：月光青绿
  creek: {
    ambient: [0.4, 0.46, 0.6],
    deep: [0.05, 0.13, 0.18],
    shallow: [0.5, 0.6, 0.58],
    land: [0.8, 0.95, 0.85],
    sky: [0.04, 0.07, 0.12],
    moon: [0.75, 0.85, 1],
    exposure: 1.15,
    bed: 1,
    stone: 0,
    glow: 0,
  },
  // 灯市：暖金运河
  canal: {
    ambient: [0.36, 0.34, 0.52],
    deep: [0.07, 0.08, 0.15],
    shallow: [0.7, 0.66, 0.7],
    land: [0.85, 0.8, 0.82],
    sky: [0.09, 0.07, 0.14],
    moon: [1, 0.86, 0.7],
    exposure: 1.1,
    bed: 0.35,
    stone: 1,
    glow: 0,
  },
  // 萤洞：幽蓝荧光
  cave: {
    ambient: [0.2, 0.26, 0.42],
    deep: [0.02, 0.07, 0.13],
    shallow: [0.32, 0.5, 0.62],
    land: [0.42, 0.42, 0.62],
    sky: [0.02, 0.06, 0.12],
    moon: [0.55, 0.85, 1],
    exposure: 1.25,
    bed: 0.6,
    stone: 0,
    glow: 1,
  },
} satisfies Record<string, Palette>

export type PaletteId = keyof typeof palettes

// 两套调色插值
export function mixPalette(a: Palette, b: Palette, t: number, out: Palette) {
  const keys = ['ambient', 'deep', 'shallow', 'land', 'sky', 'moon'] as const
  for (const k of keys) for (let i = 0; i < 3; i++) out[k][i] = a[k][i] + (b[k][i] - a[k][i]) * t
  for (const k of ['exposure', 'bed', 'stone', 'glow'] as const) out[k] = a[k] + (b[k] - a[k]) * t
  return out
}

export const clonePalette = (p: Palette): Palette => ({
  ambient: [...p.ambient],
  deep: [...p.deep],
  shallow: [...p.shallow],
  land: [...p.land],
  sky: [...p.sky],
  moon: [...p.moon],
  exposure: p.exposure,
  bed: p.bed,
  stone: p.stone,
  glow: p.glow,
})
