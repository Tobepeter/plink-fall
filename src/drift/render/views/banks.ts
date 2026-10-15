import { Container, Graphics, Sprite } from 'pixi.js'
import type { Run } from '../../model/run'
import type { Segment } from '../../model/route'
import { makeRng } from '../../model/world/math'
import { regions } from '../../data/regions'
import type { Art } from '../art/art'
import type { LightSpot } from '../water'
import { Keyed } from './keyed'

type Deco = { sprites: (Sprite | Graphics)[]; tinted: Sprite[]; lights: LightSpot[]; y: number }

const chunk = 70

// 两岸布景按块生成：竹林 / 灯市屋檐 / 晶洞；分叉口标记
export class Banks {
  private chunks = new Map<number, Deco>()
  private markers: Keyed<Segment, Sprite[]>

  constructor(
    readonly art: Art,
    readonly land: Container,
    readonly top: Container,
    readonly glow: Container,
  ) {
    this.markers = new Keyed(
      (seg) =>
        seg.options!.map((kind) => {
          const s = new Sprite(art.markers[kind])
          s.anchor.set(0.5)
          s.scale.set(0.42)
          top.addChild(s)
          return s
        }),
      (list) => list.forEach((s) => s.destroy()),
    )
  }

  sync(
    run: Run,
    viewTop: number,
    viewBottom: number,
    time: number,
    lights: LightSpot[],
    lightAt: (x: number, y: number) => number,
  ) {
    const first = Math.floor(viewTop / chunk) - 2,
      last = Math.floor(viewBottom / chunk) + 2
    for (let i = first; i <= last; i++)
      if (!this.chunks.has(i)) this.chunks.set(i, this.build(run, i))
    for (const [i, d] of this.chunks) {
      if (i < first - 4 || i > last + 4) {
        d.sprites.forEach((s) => s.destroy())
        this.chunks.delete(i)
        continue
      }
      for (const l of d.lights) if (l.y > viewTop - 60 && l.y < viewBottom + 60) lights.push(l)
      if (d.y > viewTop - 200 && d.y < viewBottom + 200)
        for (const s of d.tinted) s.tint = lightAt(s.x, s.y)
    }
    for (const seg of run.route.segments) {
      if (seg.kind !== 'fork' || !seg.options) continue
      const y = seg.bottom - 120
      if (y < viewTop - 100 || y > viewBottom + 100) continue
      const list = this.markers.get(seg)
      const c = run.river.center(y)
      list.forEach((s, side) => {
        const chosen = seg.chosen ? seg.options![side] === seg.chosen : false
        s.position.set(c + (side ? 72 : -72), y - 30 + Math.sin(time * 2 + side) * 4)
        const target = seg.chosen ? (chosen ? 0.62 : 0.3) : 0.42 + 0.03 * Math.sin(time * 3 + side)
        s.scale.set(s.scale.x + (target - s.scale.x) * 0.1)
        s.alpha += ((seg.chosen ? (chosen ? 0 : 0.25) : 1) - s.alpha) * (chosen ? 0.04 : 0.1)
      })
    }
    this.markers.sweep()
  }

  // 河道变形后重建该段布景
  invalidate(y0: number, y1: number) {
    for (const [i, d] of this.chunks)
      if (d.y >= y0 - chunk && d.y <= y1) {
        d.sprites.forEach((s) => s.destroy())
        this.chunks.delete(i)
      }
  }

  private build(run: Run, i: number): Deco {
    const y0 = i * chunk
    const rng = makeRng(i * 7919 + run.config.seed)
    const seg = run.route.at(y0 + chunk / 2)
    const region = regions[seg?.region ?? 0].id
    const deco: Deco = { sprites: [], tinted: [], lights: [], y: y0 }
    const [left, right] = run.river.edges(y0 + chunk / 2)
    const add = (s: Sprite, layer = this.land) => (layer.addChild(s), deco.sprites.push(s), s)
    const place = (tex: Sprite['texture'], x: number, y: number, scale: number) => {
      const s = new Sprite(tex)
      s.anchor.set(0.5)
      s.position.set(x, y)
      s.rotation = rng.range(0, Math.PI * 2)
      s.scale.set(scale)
      deco.tinted.push(s)
      return add(s)
    }
    for (const side of [-1, 1]) {
      const edge = side < 0 ? left : right
      const y = y0 + rng.range(0, chunk)
      if (region === 'creek') {
        if (rng.chance(0.55))
          place(rng.pick(this.art.bamboo), edge + side * rng.range(30, 80), y, rng.range(0.6, 0.85))
        if (rng.chance(0.25))
          place(
            rng.pick(this.art.bamboo),
            edge + side * rng.range(120, 220),
            y,
            rng.range(0.7, 0.95),
          )
        if (rng.chance(0.08))
          place(
            rng.pick(this.art.blossom),
            edge + side * rng.range(70, 140),
            y,
            rng.range(0.6, 0.8),
          )
      } else if (region === 'canal') {
        if (rng.chance(0.6)) {
          const s = place(rng.pick(this.art.roofs), edge + side * rng.range(95, 120), y, 0.8)
          s.rotation = rng.range(-0.08, 0.08)
        }
        if (rng.chance(0.06))
          place(rng.pick(this.art.blossom), edge + side * rng.range(40, 70), y, 0.55)
      } else {
        if (rng.chance(0.45)) {
          const x = edge + side * rng.range(14, 60)
          place(rng.pick(this.art.crystals), x, y, rng.range(0.5, 0.9))
          const glow = new Sprite(this.art.glow)
          glow.anchor.set(0.5)
          glow.position.set(x, y)
          glow.scale.set(rng.range(0.35, 0.6))
          glow.tint = rng.chance(0.7) ? 0x5ad8ff : 0xa57bff
          glow.alpha = 0.55
          add(glow, this.glow)
          if (rng.chance(0.4))
            deco.lights.push({ x, y, radius: 90, power: 0.55, color: [0.4, 0.85, 1], height: 26 })
        }
      }
      for (let k = 0; k < 2; k++) {
        if (!rng.chance(0.7)) continue
        const x = edge + side * rng.range(4, 50),
          yy = y0 + rng.range(0, chunk)
        if (region === 'cave')
          place(rng.pick(this.art.rocks), x + side * 10, yy, rng.range(0.12, 0.3))
        else place(rng.pick(this.art.grass), x, yy, rng.range(0.45, 0.8))
      }
    }
    // 远景：宽屏两侧的稀疏林木与屋舍
    for (const side of [-1, 1]) {
      if (!rng.chance(0.45)) continue
      const x = (side < 0 ? left : right) + side * rng.range(240, 680),
        y = y0 + rng.range(0, chunk)
      const tex =
        region === 'canal'
          ? rng.pick(this.art.roofs)
          : region === 'cave'
            ? rng.pick(this.art.crystals)
            : rng.chance(0.2)
              ? rng.pick(this.art.blossom)
              : rng.pick(this.art.bamboo)
      place(tex, x, y, rng.range(0.7, 1.1))
    }
    // 分叉小岛：岛心一丛植物，岛尖一盏石灯
    const ym = y0 + chunk / 2
    for (const it of run.river.islands) {
      if (ym < it.top + 50 || ym > it.bottom - 50) continue
      const c = run.river.center(ym)
      const tex =
        region === 'cave'
          ? this.art.crystals
          : region === 'canal'
            ? this.art.blossom
            : this.art.bamboo
      if (rng.chance(0.75))
        place(rng.pick(tex), c + rng.range(-14, 14), ym + rng.range(-20, 20), rng.range(0.5, 0.7))
      place(rng.pick(this.art.grass), c + rng.range(-30, 30), ym + rng.range(-30, 30), 0.6)
    }
    // 石灯笼：竹溪稀疏，灯市密集
    const lanternRate = region === 'canal' ? 0.3 : region === 'creek' ? 0.07 : 0
    if (rng.chance(lanternRate)) {
      const side = rng.chance(0.5) ? -1 : 1
      const x = (side < 0 ? left : right) + side * rng.range(16, 26),
        y = y0 + rng.range(0, chunk)
      const s = place(this.art.stoneLantern, x, y, 0.55)
      s.rotation = 0
      const glow = new Sprite(this.art.glow)
      glow.anchor.set(0.5)
      glow.position.set(x, y)
      glow.scale.set(0.5)
      glow.tint = 0xffb060
      glow.alpha = 0.7
      add(glow, this.glow)
      deco.lights.push({ x, y, radius: 120, power: 0.75, color: [1, 0.68, 0.35], height: 40 })
    }
    // 灯市：横跨河面的灯串
    if (region === 'canal' && i % 6 === 0)
      this.lanternString(deco, left - 20, right + 20, y0 + 20, rng.range(-30, 30))
    return deco
  }

  private lanternString(deco: Deco, x0: number, x1: number, y: number, tilt: number) {
    const g = new Graphics()
    const sag = 26
    const at = (t: number) => ({
      x: x0 + (x1 - x0) * t,
      y: y + tilt * (t - 0.5) * 2 + Math.sin(Math.PI * t) * sag,
    })
    g.moveTo(x0, at(0).y)
    for (let k = 1; k <= 20; k++) {
      const p = at(k / 20)
      g.lineTo(p.x, p.y)
    }
    g.stroke({ width: 1.5, color: 0x1a1410, alpha: 0.9 })
    this.top.addChild(g)
    deco.sprites.push(g)
    for (let k = 1; k < 8; k++) {
      const p = at(k / 8)
      const lamp = new Graphics()
      lamp.roundRect(-5, -6, 10, 12, 4).fill({ color: k % 3 ? 0xd8402c : 0xf0a030 })
      lamp.position.set(p.x, p.y + 5)
      this.top.addChild(lamp)
      const glow = new Sprite(this.art.glow)
      glow.anchor.set(0.5)
      glow.position.set(p.x, p.y + 5)
      glow.scale.set(0.32)
      glow.tint = k % 3 ? 0xff6a40 : 0xffb050
      glow.alpha = 0.8
      this.glow.addChild(glow)
      deco.sprites.push(lamp, glow)
      if (k % 2)
        deco.lights.push({
          x: p.x,
          y: p.y,
          radius: 90,
          power: 0.5,
          color: [1, 0.45, 0.28],
          height: 60,
        })
    }
  }

  destroy() {
    for (const d of this.chunks.values()) d.sprites.forEach((s) => s.destroy())
    this.chunks.clear()
    this.markers.clear()
  }
}
