import type { RecipeId } from '../model/types'

export const palette = {
  cream: 0xede9dc,
  navy: 0x233d4c,
  teal: 0x88c7bc,
  coral: 0xeaa27f,
  gold: 0xe9c676,
  white: 0xf8f4e8,
  dust: 0xd4d2be,
}

export const recipeColors: Record<RecipeId, number> = {
  mint: 0x7ccbb3,
  amber: 0xe9b55c,
  rose: 0xd98c96,
}

export const regionColors = [
  { sky: 0xeeeade, ground: 0xd6d7c4, accent: 0x88c7bc },
  { sky: 0xf3e5d1, ground: 0xe2c9a6, accent: 0xe9b55c },
  { sky: 0xece2e4, ground: 0xd9c6ce, accent: 0xd98c96 },
]

export const designWidth = 390
export const designHeight = 525
