import { BufferImageSource, Geometry, Mesh, Shader } from 'pixi.js'
import type { Waves } from '../model/world/waves'
import { makeSurfaceTextures } from './art/textures'
import { maxLights, waterFrag, waterVert } from './water-glsl'
import type { Palette } from './palette'

// 全屏水面：高度场打包上传 + 着色
export class WaterLayer {
  readonly mesh: Mesh<Geometry, Shader>
  private data: Uint8Array
  private source: BufferImageSource
  private u: Record<string, unknown>
  private lights = new Float32Array(maxLights * 4)
  private lightCol = new Float32Array(maxLights * 4)

  constructor(readonly waves: Waves) {
    const { cols, rows } = waves
    this.data = new Uint8Array(cols * rows * 4)
    this.source = new BufferImageSource({
      resource: this.data,
      width: cols,
      height: rows,
      format: 'rgba8unorm',
      alphaMode: 'no-premultiply-alpha',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'repeat',
      scaleMode: 'linear',
    })
    const tex = makeSurfaceTextures()
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    })
    const shader = Shader.from({
      gl: { vertex: waterVert, fragment: waterFrag },
      resources: {
        uData: this.source,
        uDetail: tex.detail,
        uBed: tex.bed,
        uLand: tex.land,
        water: {
          uScreen: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uCam: { value: new Float32Array([0, 0, 1]), type: 'vec3<f32>' },
          uGrid: {
            value: new Float32Array([waves.x0, cols * waves.cell, rows * waves.cell, waves.cell]),
            type: 'vec4<f32>',
          },
          uTime: { value: 0, type: 'f32' },
          uFlow: { value: 70, type: 'f32' },
          uLightCount: { value: 0, type: 'f32' },
          uLights: { value: this.lights, type: 'vec4<f32>', size: maxLights },
          uLightCol: { value: this.lightCol, type: 'vec4<f32>', size: maxLights },
          uAmbient: { value: new Float32Array(3), type: 'vec3<f32>' },
          uDeep: { value: new Float32Array(3), type: 'vec3<f32>' },
          uShallow: { value: new Float32Array(3), type: 'vec3<f32>' },
          uLandTint: { value: new Float32Array(3), type: 'vec3<f32>' },
          uSky: { value: new Float32Array(3), type: 'vec3<f32>' },
          uMoon: { value: new Float32Array(3), type: 'vec3<f32>' },
          uExposure: { value: 1, type: 'f32' },
          uBedVis: { value: 1, type: 'f32' },
          uStone: { value: 0, type: 'f32' },
          uGlow: { value: 0, type: 'f32' },
        },
      },
    })
    this.u = shader.resources.water.uniforms
    this.mesh = new Mesh({ geometry, shader })
  }

  resize(w: number, h: number) {
    this.mesh.scale.set(w, h)
    const s = this.u.uScreen as Float32Array
    s[0] = w
    s[1] = h
  }

  // 每帧：镜头、时间、灯光、调色
  update(
    cam: { x: number; y: number; zoom: number },
    time: number,
    flow: number,
    palette: Palette,
  ) {
    const c = this.u.uCam as Float32Array
    c[0] = cam.x
    c[1] = cam.y
    c[2] = cam.zoom
    this.u.uTime = time
    this.u.uFlow = flow
    copy(this.u.uAmbient, palette.ambient)
    copy(this.u.uDeep, palette.deep)
    copy(this.u.uShallow, palette.shallow)
    copy(this.u.uLandTint, palette.land)
    copy(this.u.uSky, palette.sky)
    copy(this.u.uMoon, palette.moon)
    this.u.uExposure = palette.exposure
    this.u.uBedVis = palette.bed
    this.u.uStone = palette.stone
    this.u.uGlow = palette.glow
    this.pack()
  }

  // 灯光列表：x y 半径 强度 / rgb 高度
  setLights(list: readonly LightSpot[]) {
    const n = Math.min(maxLights, list.length)
    for (let i = 0; i < n; i++) {
      const l = list[i]
      this.lights.set([l.x, l.y, l.radius, l.power], i * 4)
      this.lightCol.set([l.color[0], l.color[1], l.color[2], l.height], i * 4)
    }
    this.u.uLightCount = n
  }

  private pack() {
    const { cols, rows, h, depth } = this.waves
    const out = this.data
    const ks = 300
    for (let j = 0; j < rows; j++) {
      const row = j * cols,
        up = ((j + rows - 1) % rows) * cols,
        dn = ((j + 1) % rows) * cols
      for (let i = 0; i < cols; i++) {
        const p = row + i
        const l = i > 0 ? h[p - 1] : h[p],
          r = i < cols - 1 ? h[p + 1] : h[p]
        const sx = (l - r) * ks,
          sy = (h[up + i] - h[dn + i]) * ks
        const o = p * 4
        out[o] = clampByte(128 + h[p] * 40)
        out[o + 1] = clampByte(128 + sx)
        out[o + 2] = clampByte(128 + sy)
        out[o + 3] = clampByte(((depth[p] + 16) / 192) * 255)
      }
    }
    this.source.update()
  }
}

export type LightSpot = {
  x: number
  y: number
  radius: number
  power: number
  color: readonly number[]
  height: number
}

const copy = (dst: unknown, src: readonly number[]) => (dst as Float32Array).set(src)
const clampByte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
