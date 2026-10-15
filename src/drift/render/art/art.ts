import { Texture } from 'pixi.js'
import { lanternKinds, type LanternKind } from '../../data/kinds'
import { craneBoat, glow, lotus, lotusBoat, paperBoat, rock } from './lantern'
import * as creature from './creatures'
import * as decor from './decor'
import type { BoatId } from '../../data/workshop'

// 全部程序化贴图的登记处
export class Art {
  lit = {} as Record<LanternKind, Texture>
  dim = {} as Record<LanternKind, Texture>
  boats = {} as Record<BoatId, Texture>
  glow!: Texture
  ring!: Texture
  spark!: Texture
  smoke!: Texture
  petal!: Texture
  rocks: Texture[] = []
  fish!: Texture
  moth!: Texture
  eel!: Texture
  koi!: Texture
  crane!: Texture
  catfish!: Texture
  ferry!: Texture
  dragonHead!: Texture
  dragonBody!: Texture
  markers = {} as Record<'shrine' | 'market' | 'storm' | 'bloom', Texture>
  bamboo: Texture[] = []
  grass: Texture[] = []
  blossom: Texture[] = []
  roofs: Texture[] = []
  crystals: Texture[] = []
  stoneLantern!: Texture
  private all: Texture[] = []

  init() {
    for (const kind of Object.keys(lanternKinds) as LanternKind[]) {
      this.lit[kind] = this.tex(lotus(kind, true))
      this.dim[kind] = this.tex(lotus(kind, false))
    }
    this.boats = {
      paper: this.tex(paperBoat()),
      lotus: this.tex(lotusBoat()),
      crane: this.tex(craneBoat()),
    }
    this.glow = this.tex(glow())
    this.ring = this.tex(decor.ring())
    this.spark = this.tex(decor.spark())
    this.smoke = this.tex(decor.smoke())
    this.petal = this.tex(decor.petal())
    for (let i = 0; i < 5; i++) this.rocks.push(this.tex(rock(i * 31 + 7)))
    this.fish = this.tex(creature.shadowFish())
    this.moth = this.tex(creature.moth())
    this.eel = this.tex(creature.eelBody())
    this.koi = this.tex(creature.koi())
    this.crane = this.tex(creature.crane())
    this.catfish = this.tex(creature.catfish())
    this.ferry = this.tex(creature.ferry())
    this.dragonHead = this.tex(creature.dragonHead())
    this.dragonBody = this.tex(creature.dragonBody())
    for (const k of ['shrine', 'market', 'storm', 'bloom'] as const)
      this.markers[k] = this.tex(decor.marker(k))
    for (let i = 0; i < 4; i++) {
      this.bamboo.push(this.tex(decor.bamboo(i * 17 + 3)))
      this.grass.push(this.tex(decor.grass(i * 13 + 5)))
      this.blossom.push(this.tex(decor.blossom(i * 19 + 11)))
      this.roofs.push(this.tex(decor.roof(i * 23 + 2)))
      this.crystals.push(this.tex(decor.crystal(i * 29 + 4)))
    }
    this.stoneLantern = this.tex(decor.stoneLantern())
  }

  private tex(canvas: HTMLCanvasElement) {
    const t = Texture.from({ resource: canvas, antialias: true, autoGenerateMipmaps: true })
    this.all.push(t)
    return t
  }

  destroy() {
    for (const t of this.all) t.destroy(true)
    this.all = []
  }
}
