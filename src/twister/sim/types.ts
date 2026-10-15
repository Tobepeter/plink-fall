import type { Obj } from './world'
import type { PropKind } from '../data/props'

export type TwEvent =
  | { type: 'lift'; obj: Obj; owner: number }
  | { type: 'eat'; obj: Obj; owner: number }
  | { type: 'bit'; mass: number }
  | { type: 'crumble'; obj: Obj; owner: number }
  | { type: 'devour'; big: number; small: number; x: number; z: number }
  | { type: 'bolt'; x: number; z: number; h: number }
  | { type: 'tier'; name: string; kind: PropKind }
  | { type: 'goal' }
  | { type: 'end'; win: boolean }
