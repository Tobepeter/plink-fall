import {
  BufferGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Color,
  Float32BufferAttribute,
} from 'three'
import type { City } from '../sim/city'
import { block, roadW, type DistrictStyle } from '../data/districts'
import { box, cone, cyl, merge, part } from './mesh-kit'

const palette: Record<DistrictStyle, { ground: string; lot: string; walk: string; road: string }> =
  {
    suburb: { ground: '#8cc66b', lot: '#9bd07a', walk: '#d9d2c3', road: '#5b6270' },
    oldtown: { ground: '#b9a98e', lot: '#cdbb9b', walk: '#e2d6c0', road: '#6a6560' },
    harbor: { ground: '#9aa3a8', lot: '#b3b9bc', walk: '#d0d3d4', road: '#555b62' },
    downtown: { ground: '#8fa0ad', lot: '#a8b6c0', walk: '#d7dde2', road: '#4f5560' },
  }

// 地面：草地/铺地、街区地块、道路与人行道、车道虚线、海面
export function buildGround(city: City, style: DistrictStyle) {
  const g = new Group()
  const c = palette[style]
  const span = city.half * 2 + 600
  const base = new PlaneGeometry(span, span, 60, 60)
  base.rotateX(-Math.PI / 2)
  tint(base, c.ground, 0.06)
  const mat = new MeshLambertMaterial({ vertexColors: true })
  const baseMesh = new Mesh(base, mat)
  baseMesh.receiveShadow = true
  g.add(baseMesh)
  const parts = []
  const n = city.roads.length - 1
  const rows = city.water === null ? n + 1 : n
  for (let k = 0; k <= n; k++) {
    const r = city.roads[k]
    const len = city.half * 2 + roadW
    const zLen = city.water === null ? len : city.water - city.roads[0] + roadW / 2
    const zMid = city.water === null ? 0 : (city.roads[0] - roadW / 2 + city.water) / 2
    // 南北向
    parts.push(part(box(roadW, 0.06, zLen), c.walk, [r, 0, zMid]))
    parts.push(part(box(7, 0.08, zLen), c.road, [r, 0, zMid]))
    if (k < rows) {
      parts.push(part(box(len, 0.06, roadW), c.walk, [0, 0, r]))
      parts.push(part(box(len, 0.08, 7), c.road, [0, 0, r]))
    }
    // 车道虚线
    for (let t = -city.half; t < city.half; t += 8) {
      if (city.water === null || t < city.water)
        parts.push(part(box(0.25, 0.1, 3), '#f2e6b3', [r, 0, t + 4]))
      if (k < rows) parts.push(part(box(3, 0.1, 0.25), '#f2e6b3', [t + 4, 0, r]))
    }
  }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = city.roads[i] + roadW / 2 + block / 2,
        z = city.roads[j] + roadW / 2 + block / 2
      if (city.water !== null && z > city.water) continue
      parts.push(part(box(block, 0.04, block), c.lot, [x, 0, z]))
    }
  const roadMesh = new Mesh(merge(parts), mat)
  roadMesh.receiveShadow = true
  g.add(roadMesh)
  if (city.water !== null) g.add(water(city))
  g.add(outskirts(city, style))
  return g
}

// 城外：林带与田垄，只作背景
function outskirts(city: City, style: DistrictStyle) {
  const parts = []
  const h = city.half + roadW
  const rand = (a: number, b: number) => a + Math.random() * (b - a)
  const fields =
    style === 'suburb' ? ['#b5d66a', '#d9c06a', '#8fc36a'] : ['#a8b48a', '#b9b08a', '#98aa8a']
  for (let i = 0; i < 70; i++) {
    const side = i % 4
    const t = rand(-h - 120, h + 120)
    const d = rand(14, 150)
    const x = side === 0 ? t : side === 1 ? h + d : side === 2 ? t : -h - d
    const z = side === 0 ? -h - d : side === 1 ? t : side === 2 ? h + d : t
    if (city.water !== null && z > city.water) continue
    if (Math.random() < 0.35)
      parts.push(part(box(rand(20, 40), 0.05, rand(20, 40)), fields[i % fields.length], [x, 0, z]))
    else
      for (let k = 0; k < 6; k++) {
        const tx = x + rand(-12, 12),
          tz = z + rand(-12, 12),
          s = rand(0.8, 1.5)
        parts.push(part(cyl(0.3 * s, 0.4 * s, 2 * s, 5), '#8a5a3b', [tx, 0, tz]))
        parts.push(part(cone(1.8 * s, 5 * s, 6), k % 2 ? '#3d8a4d' : '#4f9b4a', [tx, 1.6 * s, tz]))
      }
  }
  const mesh = new Mesh(merge(parts), new MeshLambertMaterial({ vertexColors: true }))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// 顶点色微噪，打破大面平涂
function tint(geom: BufferGeometry, hex: string, amount: number) {
  const base = new Color(hex)
  const n = geom.getAttribute('position').count
  const colors = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const k = 1 + (Math.random() - 0.5) * amount * 2
    colors.set([base.r * k, base.g * k, base.b * k], i * 3)
  }
  geom.setAttribute('color', new Float32BufferAttribute(colors, 3))
}

let waterMat: ShaderMaterial | null = null

function water(city: City) {
  const size = city.half * 2 + 600
  const geom = new PlaneGeometry(size, 400, 1, 1)
  geom.rotateX(-Math.PI / 2)
  waterMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vPos = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vPos;
      void main() {
        float a = sin(vPos.x * 0.12 + uTime * 1.3) + sin(vPos.z * 0.17 - uTime * 0.9) + sin((vPos.x + vPos.z) * 0.07 + uTime);
        float glint = smoothstep(2.2, 2.8, a);
        vec3 col = mix(vec3(0.17, 0.42, 0.62), vec3(0.24, 0.55, 0.74), a * 0.15 + 0.5);
        gl_FragColor = vec4(col + glint * 0.35, 1.0);
      }`,
  })
  const m = new Mesh(geom, waterMat)
  m.position.set(0, 0.12, city.water! + 200)
  return m
}

export function tickWater(time: number) {
  if (waterMat) waterMat.uniforms.uTime.value = time
}
