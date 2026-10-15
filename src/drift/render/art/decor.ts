import { canvas, roundRect } from './kit'
import { makeRng } from '../../model/world/math'

// 岸边布景、分叉标记、粒子贴图

export function petal() {
  const [c, g] = canvas(32)
  g.translate(16, 16)
  const grad = g.createLinearGradient(0, -12, 0, 12)
  grad.addColorStop(0, '#ffd9e6')
  grad.addColorStop(1, '#ff8fb4')
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(0, 12)
  g.bezierCurveTo(10, 6, 11, -8, 4, -12)
  g.lineTo(0, -8)
  g.lineTo(-4, -12)
  g.bezierCurveTo(-11, -8, -10, 6, 0, 12)
  g.fill()
  return c
}

export function ring() {
  const s = 128
  const [c, g] = canvas(s)
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.36, s / 2, s / 2, s * 0.5)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.9)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return c
}

export function spark() {
  const [c, g] = canvas(32)
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.8)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 32, 32)
  return c
}

export function smoke() {
  const [c, g] = canvas(64)
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(40,46,56,0.55)')
  grad.addColorStop(1, 'rgba(40,46,56,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return c
}

// 分叉标记：发光圆盘 + 线描图形
export function marker(kind: 'shrine' | 'market' | 'storm' | 'bloom') {
  const s = 128
  const [c, g] = canvas(s)
  g.translate(s / 2, s / 2)
  const tone = { shrine: '#ffcf7a', market: '#ffd25a', storm: '#9ab8ff', bloom: '#ff9ec4' }[kind]
  const disc = g.createRadialGradient(0, 0, 10, 0, 0, 52)
  disc.addColorStop(0, 'rgba(20,24,40,0.85)')
  disc.addColorStop(0.85, 'rgba(14,18,30,0.85)')
  disc.addColorStop(1, 'rgba(14,18,30,0)')
  g.fillStyle = disc
  g.beginPath()
  g.arc(0, 0, 52, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = tone
  g.lineWidth = 3
  g.beginPath()
  g.arc(0, 0, 44, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 4.5
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  if (kind === 'shrine') {
    g.moveTo(-26, -16)
    g.quadraticCurveTo(0, -24, 26, -16)
    g.moveTo(-20, -6)
    g.lineTo(20, -6)
    g.moveTo(-14, -18)
    g.lineTo(-14, 24)
    g.moveTo(14, -18)
    g.lineTo(14, 24)
  } else if (kind === 'market') {
    g.arc(0, 0, 20, 0, Math.PI * 2)
    g.moveTo(-7, -7)
    g.lineTo(7, -7)
    g.lineTo(7, 7)
    g.lineTo(-7, 7)
    g.closePath()
  } else if (kind === 'storm') {
    for (let a = 0; a < 4.6 * Math.PI; a += 0.1) {
      const r = 3 + a * 1.7
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r
      if (a === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
  } else {
    for (let i = 0; i < 5; i++) {
      g.save()
      g.rotate(-Math.PI / 2 + (i - 2) * 0.55)
      g.moveTo(0, 14)
      g.quadraticCurveTo(8, -2, 0, -24)
      g.quadraticCurveTo(-8, -2, 0, 14)
      g.restore()
    }
  }
  g.strokeStyle = tone
  g.stroke()
  return c
}

// 竹丛：竹竿截面 + 放射竹叶
export function bamboo(seed: number) {
  const s = 192
  const [c, g] = canvas(s)
  const rng = makeRng(seed)
  g.translate(s / 2, s / 2)
  const stalks: number[][] = []
  for (let i = 0; i < rng.int(5, 9); i++)
    stalks.push([rng.range(-26, 26), rng.range(-26, 26), rng.range(5, 8)])
  // 叶子在下层与上层各一遍
  const leaves = (alpha: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const [sx, sy] = rng.pick(stalks)
      const a = rng.range(0, Math.PI * 2)
      const len = rng.range(30, 62)
      g.save()
      g.translate(sx, sy)
      g.rotate(a)
      const shadeK = rng.range(0, 1)
      g.fillStyle = `rgba(${40 + shadeK * 40},${80 + shadeK * 60},${40 + shadeK * 25},${alpha})`
      g.beginPath()
      g.moveTo(0, 0)
      g.quadraticCurveTo(len * 0.5, -7, len, 0)
      g.quadraticCurveTo(len * 0.5, 7, 0, 0)
      g.fill()
      g.strokeStyle = `rgba(150,200,120,${alpha * 0.4})`
      g.lineWidth = 0.8
      g.beginPath()
      g.moveTo(2, 0)
      g.lineTo(len * 0.9, 0)
      g.stroke()
      g.restore()
    }
  }
  leaves(0.7, 40)
  for (const [x, y, r] of stalks) {
    const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r)
    grad.addColorStop(0, '#c7e08a')
    grad.addColorStop(1, '#4f7a2c')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(40,60,20,0.8)'
    g.lineWidth = 1.2
    g.stroke()
  }
  leaves(0.9, 26)
  return c
}

// 草丛
export function grass(seed: number) {
  const s = 80
  const [c, g] = canvas(s)
  const rng = makeRng(seed)
  g.translate(s / 2, s / 2)
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2),
      len = rng.range(12, 34)
    const k = rng.next()
    g.strokeStyle = `rgba(${60 + k * 50},${100 + k * 60},${50 + k * 20},0.9)`
    g.lineWidth = rng.range(1.5, 3)
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(
      Math.cos(a + 0.3) * len * 0.6,
      Math.sin(a + 0.3) * len * 0.6,
      Math.cos(a) * len,
      Math.sin(a) * len,
    )
    g.stroke()
  }
  return c
}

// 石灯笼（俯视）
export function stoneLantern() {
  const s = 72
  const [c, g] = canvas(s)
  g.translate(s / 2, s / 2)
  g.fillStyle = 'rgba(0,0,0,0.4)'
  roundRect(g, -24, -20, 52, 52, 6)
  g.fill()
  const roof = g.createLinearGradient(-26, -26, 26, 26)
  roof.addColorStop(0, '#9a9a92')
  roof.addColorStop(1, '#4a4c4a')
  g.fillStyle = roof
  g.beginPath()
  g.moveTo(0, -28)
  g.lineTo(28, 0)
  g.lineTo(0, 28)
  g.lineTo(-28, 0)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(40,40,40,0.6)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(0, -28)
  g.lineTo(0, 28)
  g.moveTo(-28, 0)
  g.lineTo(28, 0)
  g.stroke()
  g.fillStyle = '#6d6e68'
  g.beginPath()
  g.arc(0, 0, 6, 0, Math.PI * 2)
  g.fill()
  return c
}

// 樱树冠
export function blossom(seed: number) {
  const s = 220
  const [c, g] = canvas(s)
  const rng = makeRng(seed)
  g.translate(s / 2, s / 2)
  g.strokeStyle = '#2a1d1a'
  g.lineWidth = 5
  g.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, Math.PI * 2)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(
      Math.cos(a + 0.4) * 40,
      Math.sin(a + 0.4) * 40,
      Math.cos(a) * 80,
      Math.sin(a) * 80,
    )
    g.stroke()
  }
  for (let i = 0; i < 90; i++) {
    const a = rng.range(0, Math.PI * 2),
      r = Math.sqrt(rng.next()) * 92
    const k = rng.next()
    g.fillStyle = `rgba(${235 + k * 20},${150 + k * 60},${180 + k * 40},${rng.range(0.55, 0.9)})`
    g.beginPath()
    g.arc(Math.cos(a) * r, Math.sin(a) * r, rng.range(6, 15), 0, Math.PI * 2)
    g.fill()
  }
  return c
}

// 灯市屋顶
export function roof(seed: number) {
  const w = 170,
    h = 130
  const [c, g] = canvas(w, h)
  const rng = makeRng(seed)
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.fillRect(14, 14, w - 18, h - 18)
  const base = rng.pick(['#3a3240', '#2f3440', '#40302c'])
  g.fillStyle = base
  g.fillRect(6, 6, w - 18, h - 18)
  g.strokeStyle = 'rgba(0,0,0,0.45)'
  g.lineWidth = 2
  for (let x = 12; x < w - 14; x += 8) {
    g.beginPath()
    g.moveTo(x, 6)
    g.lineTo(x, h - 12)
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.12)'
  g.fillRect(6, (h - 12) / 2 - 3, w - 18, 6)
  return c
}

// 洞穴晶簇
export function crystal(seed: number) {
  const s = 96
  const [c, g] = canvas(s)
  const rng = makeRng(seed)
  g.translate(s / 2, s / 2)
  for (let i = 0; i < 7; i++) {
    const a = rng.range(0, Math.PI * 2),
      len = rng.range(16, 40),
      w = rng.range(5, 9)
    g.save()
    g.rotate(a)
    const grad = g.createLinearGradient(0, 0, len, 0)
    grad.addColorStop(0, '#1d3c6a')
    grad.addColorStop(1, '#8fe8ff')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(0, -w)
    g.lineTo(len, 0)
    g.lineTo(0, w)
    g.closePath()
    g.fill()
    g.restore()
  }
  return c
}
