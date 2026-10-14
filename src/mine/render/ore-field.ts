import { Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { MineEvent, MineState, Mineral, OreNode, Vec } from '../types'
import type { SceneCamera } from './scene-camera'
import { clamp, palette } from './palette'

export type OreTextures = Record<Mineral, Texture>
export type OreFragments = Record<Mineral, Texture[]>
type RockView = {
  view: Container
  body: Sprite
  cracks: Graphics
  shadow: Graphics
  stage: number
  node: OreNode
  impact: number
}
type DropView = { view: Container; body: Sprite; shadow: Graphics }

// 矿体损伤与真实掉落
export class OreField {
  view = new Container()
  private rocks = new Map<number, RockView>()
  private drops = new Map<number, DropView>()
  private dropPool: DropView[] = []
  private seen = new Set<number>()

  constructor(
    private textures: OreTextures,
    private fragments: OreFragments,
    private camera: SceneCamera,
  ) {
    this.view.sortableChildren = true
  }

  render(state: MineState, dt: number) {
    this.seen.clear()
    for (const node of state.nodes) {
      this.seen.add(node.id)
      let rock = this.rocks.get(node.id)
      if (rock && rock.node !== node) {
        rock.view.destroy({ children: true })
        this.rocks.delete(node.id)
        rock = undefined
      }
      if (!rock) {
        rock = this.createRock(node)
        this.rocks.set(node.id, rock)
      }
      rock.node = node
      rock.view.visible = node.revealed
      rock.view.position.set(node.x, node.y)
      rock.view.zIndex = node.y
      rock.view.alpha += (this.selectionAlpha(state, node) - rock.view.alpha) * Math.min(1, dt * 9)
      rock.impact = Math.max(0, rock.impact - dt * 7)
      const squish = Math.sin(rock.impact * Math.PI) * 0.085
      const size = (node.radius * 2.45) / rock.body.texture.width
      rock.body.scale.set(size * (1 + squish), size * (1 - squish))
      rock.body.rotation =
        Math.sin(node.variant * 2.1) * 0.045 + Math.sin(rock.impact * 25) * rock.impact * 0.025
      const stage = clamp(Math.floor((1 - node.hp / node.maxHp) * 4), 0, 3)
      if (stage !== rock.stage) {
        rock.stage = stage
        this.crack(rock.cracks, stage, node.radius)
      }
    }
    for (const [id, rock] of this.rocks) {
      if (this.seen.has(id)) continue
      rock.view.destroy({ children: true })
      this.rocks.delete(id)
    }
    this.seen.clear()
    for (const drop of state.drops) {
      this.seen.add(drop.id)
      let item = this.drops.get(drop.id)
      if (!item) {
        item = this.dropPool.pop() ?? this.createDrop()
        this.drops.set(drop.id, item)
      }
      item.view.visible = true
      item.view.position.set(drop.x, drop.y)
      item.view.alpha += (this.selectionAlpha(state, drop) - item.view.alpha) * Math.min(1, dt * 9)
      item.view.zIndex = 1300 + drop.y
      item.body.texture =
        drop.kind === 'relic' ? this.textures.relic : this.fragments[drop.kind][drop.id % 3]
      item.body.width = drop.kind === 'relic' ? 30 : 17 + Math.min(6, Math.sqrt(drop.value))
      item.body.scale.y = item.body.scale.x
      item.body.y = -drop.z * 0.6
      item.body.rotation =
        drop.carrier === 'loose'
          ? drop.id + drop.age * 0.9
          : Math.sin(state.clock * 5 + drop.id) * 0.12
      item.shadow.alpha = 0.2 / (1 + Math.max(0, drop.z) / 30)
      item.shadow.scale.set(1 + Math.max(0, drop.z) / 70)
    }
    for (const [id, item] of this.drops) {
      if (this.seen.has(id)) continue
      item.view.visible = false
      this.drops.delete(id)
      this.dropPool.push(item)
    }
  }

  private selectionAlpha(state: MineState, point: Vec) {
    if (!state.choices.length) return 1
    const screen = this.camera.worldToScreen(point)
    return Math.abs(screen.x - this.camera.width * 0.5) < Math.min(330, this.camera.width * 0.55) &&
      screen.y > this.camera.height * 0.5 &&
      screen.y < this.camera.height * 0.88
      ? 0.22
      : 1
  }

  private createRock(node: OreNode): RockView {
    const view = new Container()
    const shadow = new Graphics()
      .ellipse(0, node.radius * 0.38, node.radius * 0.92, node.radius * 0.4)
      .fill({ color: palette.ink, alpha: 0.19 })
    const body = new Sprite(this.textures[node.kind])
    body.anchor.set(0.5, 0.58)
    const cracks = new Graphics()
    view.addChild(shadow, body, cracks)
    this.view.addChild(view)
    return { view, body, cracks, shadow, stage: -1, node, impact: 0 }
  }

  private crack(g: Graphics, stage: number, radius: number) {
    g.clear()
    const r = radius * 0.75
    for (let i = 0; i < stage; i++) {
      const a = i * 2.1 + 0.4
      const trace = () =>
        g
          .moveTo(-r * 0.15, -r * 0.22)
          .lineTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35)
          .lineTo(Math.cos(a + 0.2) * r * 0.8, Math.sin(a + 0.2) * r * 0.8)
      trace().stroke({ color: palette.ink, width: 3.5, alpha: 0.85 })
      trace().stroke({ color: palette.cream, width: 0.8, alpha: 0.65 })
    }
  }

  private createDrop(): DropView {
    const view = new Container()
    const shadow = new Graphics().ellipse(0, 2, 8, 3).fill(palette.ink)
    const body = new Sprite(this.fragments.copper[0])
    body.anchor.set(0.5)
    view.addChild(shadow, body)
    this.view.addChild(view)
    return { view, shadow, body }
  }

  hit(event: MineEvent) {
    let closest: RockView | undefined
    let distance = Infinity
    for (const rock of this.rocks.values()) {
      const d = Math.hypot(rock.node.x - event.x, rock.node.y - event.y)
      if (d >= distance) continue
      closest = rock
      distance = d
    }
    if (closest && distance < closest.node.radius + 20) closest.impact = 1
  }

  destroy() {
    this.rocks.clear()
    this.drops.clear()
    this.dropPool = []
    this.view.destroy({ children: true })
  }
}
