import { BufferImageSource } from 'pixi.js'
import { makeRng } from '../../model/world/math'

// 可平铺的程序化贴图：水面细节、河床卵石、岸边草甸
const size = 256

export function makeSurfaceTextures() {
  return { detail: source(detailPixels()), bed: source(bedPixels()), land: source(landPixels()) }
}

function source(data: Uint8Array) {
  return new BufferImageSource({
    resource: data,
    width: size,
    height: size,
    format: 'rgba8unorm',
    alphaMode: 'no-premultiply-alpha',
    addressMode: 'repeat',
    scaleMode: 'linear',
    autoGenerateMipmaps: true,
  })
}

// RG 坡度，B 高度，A 泡沫噪声
function detailPixels() {
  const rng = makeRng(7)
  const waves: number[][] = []
  for (let i = 0; i < 40; i++) {
    let kx = 0,
      ky = 0
    while (kx === 0 && ky === 0) {
      kx = rng.int(-12, 12)
      ky = rng.int(-12, 12)
    }
    const amp = 1 / Math.pow(Math.hypot(kx, ky), 1.4)
    waves.push([kx, ky, amp, rng.range(0, Math.PI * 2)])
  }
  const n = size * size
  const hs = new Float32Array(n),
    gx = new Float32Array(n),
    gy = new Float32Array(n)
  let maxH = 0,
    maxG = 0
  const tau = (Math.PI * 2) / size
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let h = 0,
        dx = 0,
        dy = 0
      for (const [kx, ky, a, p] of waves) {
        const t = tau * (kx * x + ky * y) + p
        h += a * Math.sin(t)
        const c = a * Math.cos(t) * tau
        dx += c * kx
        dy += c * ky
      }
      const i = y * size + x
      hs[i] = h
      gx[i] = dx
      gy[i] = dy
      maxH = Math.max(maxH, Math.abs(h))
      maxG = Math.max(maxG, Math.abs(dx), Math.abs(dy))
    }
  const out = new Uint8Array(n * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      out[i * 4] = byte(0.5 - (gx[i] / maxG) * 0.5)
      out[i * 4 + 1] = byte(0.5 - (gy[i] / maxG) * 0.5)
      out[i * 4 + 2] = byte(0.5 + (hs[i] / maxH) * 0.5)
      out[i * 4 + 3] = byte(fbm(x / 32, y / 32, 8, 3, 11))
    }
  return out
}

// 卵石河床：周期 Voronoi
function bedPixels() {
  const out = new Uint8Array(size * size * 4)
  const big = cells(8, 21),
    small = cells(22, 33)
  const rng = makeRng(5)
  const tones = Array.from({ length: 64 }, () => {
    const pick = rng.next()
    if (pick < 0.35) return [0.5, 0.52, 0.5]
    if (pick < 0.6) return [0.48, 0.44, 0.37]
    if (pick < 0.8) return [0.56, 0.5, 0.4]
    return [0.34, 0.37, 0.36]
  })
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const grain = fbm(x / 6, y / 6, 43, 2, 3)
      const algae = fbm(x / 48, y / 48, 5, 3, 7)
      let r = 0.4 + grain * 0.1 - algae * 0.12,
        g = 0.37 + grain * 0.09 - algae * 0.06,
        b = 0.29 + grain * 0.07 - algae * 0.1
      const s = nearest(small, x, y)
      const sr = small.cell * (0.12 + 0.2 * s.rand) * (s.rand > 0.45 ? 1 : 0)
      if (s.d < sr) {
        const k = 0.75 + 0.35 * (1 - s.d / sr) - s.dy * 0.012
        r = 0.5 * k
        g = 0.48 * k
        b = 0.44 * k
      }
      const p = nearest(big, x, y)
      const pr = big.cell * (0.18 + 0.2 * p.rand) * (0.9 + 0.2 * fbm(x / 9, y / 9, 28, 2, 5))
      if (p.d < pr) {
        const tone = tones[p.id % tones.length]
        const dome = 1 - p.d / pr
        const k = 0.6 + 0.5 * Math.sqrt(dome) - (p.dx + p.dy) * 0.006 + grain * 0.15
        const edge = Math.min(1, (pr - p.d) / 2.2)
        r = r * (1 - edge) + tone[0] * k * edge
        g = g * (1 - edge) + tone[1] * k * edge
        b = b * (1 - edge) + tone[2] * k * edge
      } else if (p.d < pr + 2.5) {
        r *= 0.7
        g *= 0.7
        b *= 0.7
      }
      const i = (y * size + x) * 4
      out[i] = byte(r)
      out[i + 1] = byte(g)
      out[i + 2] = byte(b)
      out[i + 3] = 255
    }
  return out
}

// 草甸苔藓，A 通道为岸线扰动
function landPixels() {
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 64, y / 64, 4, 4, 17)
      const blades = fbm(x / 3, y / 3, 85, 2, 19)
      const patch = fbm(x / 40, y / 40, 6, 3, 23)
      let r = 0.16 + n * 0.1,
        g = 0.24 + n * 0.12,
        b = 0.14 + n * 0.05
      if (patch > 0.58) {
        const k = Math.min(1, (patch - 0.58) * 6)
        r += (0.27 - r) * k
        g += (0.22 - g) * k
        b += (0.15 - b) * k
      }
      const lift = (blades - 0.5) * 0.12
      const i = (y * size + x) * 4
      out[i] = byte(r + lift)
      out[i + 1] = byte(g + lift * 1.3)
      out[i + 2] = byte(b + lift * 0.6)
      out[i + 3] = byte(fbm(x / 16, y / 16, 16, 3, 29))
    }
  return out
}

function cells(count: number, seed: number) {
  const rng = makeRng(seed)
  const cell = size / count
  const pts: number[] = []
  for (let i = 0; i < count * count; i++)
    pts.push(rng.range(0.15, 0.85), rng.range(0.15, 0.85), rng.next())
  return { count, cell, pts }
}

function nearest(grid: ReturnType<typeof cells>, x: number, y: number) {
  const { count, cell, pts } = grid
  const cx = Math.floor(x / cell),
    cy = Math.floor(y / cell)
  let best = 1e9,
    id = 0,
    bx = 0,
    by = 0,
    rand = 0
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i,
        gy = cy + j
      const k = (mod(gy, count) * count + mod(gx, count)) * 3
      const px = (gx + pts[k]) * cell,
        py = (gy + pts[k + 1]) * cell
      const d = Math.hypot(x - px, y - py)
      if (d < best) {
        best = d
        id = k / 3
        bx = x - px
        by = y - py
        rand = pts[k + 2]
      }
    }
  return { d: best, id, dx: bx, dy: by, rand }
}

// 周期值噪声 fbm，period 为格点周期
function fbm(x: number, y: number, period: number, octaves: number, seed: number) {
  let sum = 0,
    amp = 0.5,
    norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x, y, period, seed + o * 13)
    norm += amp
    x *= 2
    y *= 2
    period *= 2
    amp *= 0.5
  }
  return sum / norm
}

function vnoise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y)
  const fx = x - xi,
    fy = y - yi
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy)
  const h = (a: number, b: number) => hash2(mod(a, period), mod(b, period), seed)
  const top = h(xi, yi) * (1 - u) + h(xi + 1, yi) * u
  const bot = h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u
  return top * (1 - v) + bot * v
}

function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const mod = (a: number, n: number) => ((a % n) + n) % n
const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)))
