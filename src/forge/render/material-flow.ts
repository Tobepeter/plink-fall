import { Container, Graphics } from 'pixi.js'
import type { ForgeState, OreItem } from '../model/types'
import { flowPoint } from './flow-route'
import { palette, recipeColors } from './palette'

type Material = {
  view: Container
  rock: Graphics
  liquid: Graphics
  crystal: Graphics
  shine: Graphics
  id: number
}

// 有上限的真实物料视图
export class MaterialFlow {
  view = new Container()
  private active = new Map<number, Material>()
  private pool: Material[] = []
  private seen = new Set<number>()

  render(state: ForgeState, time: number) {
    this.seen.clear()
    for (let i = 0; i < Math.min(128, state.items.length); i++) {
      const item = state.items[i]
      this.seen.add(item.id)
      let material = this.active.get(item.id)
      if (!material) {
        material = this.pool.pop() ?? this.create()
        material.id = item.id
        material.view.visible = true
        this.active.set(item.id, material)
      }
      this.update(material, item, time, state.burstRemaining > 0)
    }
    for (const [id, material] of this.active) {
      if (this.seen.has(id)) continue
      this.active.delete(id)
      material.view.visible = false
      this.pool.push(material)
    }
  }

  private create(): Material {
    const view = new Container()
    const rock = new Graphics()
      .poly([-7, -3, -3, -8, 5, -7, 8, 1, 3, 7, -6, 5])
      .fill(palette.navy)
      .poly([-3, -5, 3, -5, 5, -1, -1, 2])
      .fill(palette.dust)
    const liquid = new Graphics()
      .ellipse(0, 0, 9, 5)
      .fill(palette.white)
      .ellipse(0, 0, 6, 3)
      .fill(palette.white)
    const crystal = new Graphics()
      .poly([0, -11, 8, -3, 6, 7, 0, 10, -7, 5, -8, -4])
      .fill(palette.white)
      .stroke({ color: palette.navy, width: 1.6 })
    const shine = new Graphics()
      .moveTo(0, -7)
      .lineTo(0, 5)
      .moveTo(-4, -2)
      .lineTo(4, -3)
      .stroke({ color: palette.white, alpha: 0.85, width: 1.8 })
    view.addChild(rock, liquid, crystal, shine)
    this.view.addChild(view)
    return { view, rock, liquid, crystal, shine, id: -1 }
  }

  private update(material: Material, item: OreItem, time: number, boosted: boolean) {
    const point = flowPoint(item.progress, item.lane)
    const phase = item.progress < 0.24 ? 0 : item.progress < 0.69 ? 1 : 2
    const color = recipeColors[item.kind]
    material.view.position.set(point.x, point.y)
    material.rock.visible = phase === 0
    material.liquid.visible = phase === 1
    material.crystal.visible = phase === 2
    material.shine.visible = phase === 2
    material.liquid.tint = color
    material.crystal.tint = color
    material.rock.rotation = item.progress * 19 + item.id
    material.liquid.rotation = point.angle
    material.crystal.rotation = Math.sin(time * 3 + item.id) * 0.1
    material.shine.rotation = material.crystal.rotation
    const size = Math.min(1.35, 0.9 + Math.sqrt(item.amount) * 0.08)
    const squash = phase === 1 ? 1 + Math.sin(time * 8 + item.id) * 0.09 : 1
    material.view.scale.set(size * squash, size / squash)
    material.view.alpha = boosted ? 1 : 0.94
    // 物料经过机壳时短暂隐入机器内部
    for (const center of [0.07, 0.32, 0.625, 0.945]) {
      const distance = Math.abs(item.progress - center)
      if (distance < 0.028) material.view.alpha *= 0.2 + (distance / 0.028) * 0.8
    }
  }

  destroy() {
    this.active.clear()
    this.pool = []
    this.seen.clear()
    this.view.destroy({ children: true })
  }
}
