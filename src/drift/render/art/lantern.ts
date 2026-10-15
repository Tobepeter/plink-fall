import { lanternKinds, type LanternKind } from '../../data/kinds'
import { makeRng } from '../../model/world/math'
import { canvas, mixHex, roundRect, shade } from './kit'

// 河灯、纸船、礁石、辉光
// 俯视莲花灯：两层花瓣 + 烛芯
export function lotus(kind: LanternKind, lit: boolean) {
  const s = 112
  const [c, g] = canvas(s)
  const def = lanternKinds[kind]
  const base = lit ? def.petal : mixHex(def.petal, '#efe6d2', 0.6)
  g.translate(s / 2, s / 2)
  // 水面阴影
  const shadow = g.createRadialGradient(3, 5, s * 0.2, 3, 5, s * 0.5)
  shadow.addColorStop(0, 'rgba(0,0,0,0.35)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadow
  g.fillRect(-s / 2, -s / 2, s, s)
  const layer = (count: number, len: number, wid: number, rot: number, tone: number) => {
    for (let i = 0; i < count; i++) {
      g.save()
      g.rotate(rot + (i / count) * Math.PI * 2)
      const grad = g.createLinearGradient(0, 0, 0, -len)
      grad.addColorStop(0, shade(base, -0.35 + tone))
      grad.addColorStop(0.55, shade(base, tone))
      grad.addColorStop(1, mixHex(base, '#ffffff', lit ? 0.45 : 0.25))
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(0, -len * 0.12)
      g.bezierCurveTo(wid, -len * 0.35, wid * 0.8, -len * 0.82, 0, -len)
      g.bezierCurveTo(-wid * 0.8, -len * 0.82, -wid, -len * 0.35, 0, -len * 0.12)
      g.fill()
      g.strokeStyle = shade(base, -0.45)
      g.globalAlpha = 0.45
      g.lineWidth = 1.2
      g.stroke()
      g.globalAlpha = 0.35
      g.strokeStyle = '#ffffff'
      g.beginPath()
      g.moveTo(0, -len * 0.2)
      g.lineTo(0, -len * 0.85)
      g.stroke()
      g.restore()
    }
  }
  layer(8, s * 0.46, s * 0.15, 0, -0.1)
  layer(8, s * 0.34, s * 0.12, Math.PI / 8, 0.05)
  layer(5, s * 0.22, s * 0.09, 0.3, 0.15)
  // 烛芯
  if (lit) {
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.2)
    halo.addColorStop(0, 'rgba(255,250,225,1)')
    halo.addColorStop(0.35, def.core)
    halo.addColorStop(1, 'rgba(255,200,120,0)')
    g.fillStyle = halo
    g.beginPath()
    g.arc(0, 0, s * 0.2, 0, Math.PI * 2)
    g.fill()
  } else {
    g.fillStyle = '#e9e1cf'
    g.beginPath()
    g.arc(0, 0, s * 0.075, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#3a3128'
    g.beginPath()
    g.arc(0, 0, s * 0.022, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

// 俯视纸船载灯，船头朝上
export function paperBoat() {
  const w = 96,
    h = 144
  const [c, g] = canvas(w, h)
  g.translate(w / 2, h / 2)
  const shadow = g.createRadialGradient(4, 8, 10, 4, 8, 64)
  shadow.addColorStop(0, 'rgba(0,0,0,0.4)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadow
  g.fillRect(-w / 2, -h / 2, w, h)
  const L = 62,
    W = 30
  // 船体
  g.beginPath()
  g.moveTo(0, -L)
  g.lineTo(W, -L * 0.42)
  g.lineTo(W * 0.92, L * 0.5)
  g.lineTo(0, L)
  g.lineTo(-W * 0.92, L * 0.5)
  g.lineTo(-W, -L * 0.42)
  g.closePath()
  const hull = g.createLinearGradient(-W, 0, W, 0)
  hull.addColorStop(0, '#d9cfbd')
  hull.addColorStop(0.48, '#fbf4e4')
  hull.addColorStop(0.52, '#e8dcc6')
  hull.addColorStop(1, '#c9bca5')
  g.fillStyle = hull
  g.fill()
  g.strokeStyle = 'rgba(90,70,50,0.55)'
  g.lineWidth = 1.5
  g.stroke()
  // 折痕
  g.strokeStyle = 'rgba(120,100,80,0.45)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(0, -L)
  g.lineTo(0, L)
  g.moveTo(-W, -L * 0.42)
  g.lineTo(-W * 0.4, -L * 0.1)
  g.lineTo(-W * 0.4, L * 0.35)
  g.lineTo(-W * 0.92, L * 0.5)
  g.moveTo(W, -L * 0.42)
  g.lineTo(W * 0.4, -L * 0.1)
  g.lineTo(W * 0.4, L * 0.35)
  g.lineTo(W * 0.92, L * 0.5)
  g.stroke()
  // 纸灯笼
  const lw = 17
  g.fillStyle = '#7a2f1c'
  roundRect(g, -lw - 2, -lw - 2, (lw + 2) * 2, (lw + 2) * 2, 6)
  g.fill()
  const lamp = g.createRadialGradient(0, 0, 2, 0, 0, lw * 1.3)
  lamp.addColorStop(0, '#fff7d6')
  lamp.addColorStop(0.45, '#ffc46b')
  lamp.addColorStop(1, '#e0612e')
  g.fillStyle = lamp
  roundRect(g, -lw, -lw, lw * 2, lw * 2, 5)
  g.fill()
  g.strokeStyle = 'rgba(122,47,28,0.6)'
  g.lineWidth = 1.2
  for (const k of [-0.5, 0, 0.5]) {
    g.beginPath()
    g.moveTo(-lw, k * lw)
    g.lineTo(lw, k * lw)
    g.stroke()
  }
  return c
}

export function glow() {
  const s = 128
  const [c, g] = canvas(s)
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    grad.addColorStop(t, `rgba(255,255,255,${Math.exp(-t * t * 5) * (1 - t)})`)
  }
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return c
}

// 湿润礁石：不规则轮廓、苔藓、高光
export function rock(seed: number) {
  const s = 128
  const [c, g] = canvas(s)
  const rng = makeRng(seed)
  g.translate(s / 2, s / 2)
  const R = s * 0.4
  const n = 14
  const pts: number[][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = R * rng.range(0.82, 1.05)
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const path = () => {
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % n]
      const mx = (x0 + x1) / 2,
        my = (y0 + y1) / 2
      if (i === 0) g.moveTo(mx, my)
      else g.quadraticCurveTo(x0, y0, mx, my)
    }
    const [x0, y0] = pts[0]
    const [x1, y1] = pts[1]
    g.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    g.closePath()
  }
  const shadow = g.createRadialGradient(6, 8, R * 0.6, 6, 8, R * 1.25)
  shadow.addColorStop(0, 'rgba(0,0,0,0.5)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadow
  g.fillRect(-s / 2, -s / 2, s, s)
  path()
  const body = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1)
  body.addColorStop(0, '#b9bdb8')
  body.addColorStop(0.5, '#7b817f')
  body.addColorStop(1, '#3a3f40')
  g.fillStyle = body
  g.fill()
  g.save()
  path()
  g.clip()
  // 苔藓斑
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2),
      r = rng.range(0, R)
    g.fillStyle = `rgba(${rng.int(60, 90)},${rng.int(95, 125)},${rng.int(55, 70)},${rng.range(0.25, 0.55)})`
    g.beginPath()
    g.arc(Math.cos(a) * r, Math.sin(a) * r + R * 0.2, rng.range(3, 9), 0, Math.PI * 2)
    g.fill()
  }
  // 裂纹
  g.strokeStyle = 'rgba(20,22,24,0.5)'
  g.lineWidth = 1.4
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    let x = rng.range(-R * 0.5, R * 0.5),
      y = rng.range(-R * 0.5, R * 0.5)
    g.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      x += rng.range(-10, 10)
      y += rng.range(-10, 10)
      g.lineTo(x, y)
    }
    g.stroke()
  }
  g.restore()
  // 湿亮边
  g.save()
  path()
  g.clip()
  g.strokeStyle = 'rgba(220,235,255,0.55)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(R * 0.08, R * 0.1, R * 0.95, Math.PI * 1.05, Math.PI * 1.55)
  g.stroke()
  g.restore()
  return c
}

// 莲舟：荷叶托着莲灯
export function lotusBoat() {
  const w = 96,
    h = 144
  const [c, g] = canvas(w, h)
  g.translate(w / 2, h / 2)
  const shadow = g.createRadialGradient(4, 6, 20, 4, 6, 50)
  shadow.addColorStop(0, 'rgba(0,0,0,0.4)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadow
  g.fillRect(-w / 2, -h / 2, w, h)
  const R = 40
  g.beginPath()
  g.moveTo(0, 0)
  g.arc(0, 0, R, -Math.PI / 2 + 0.22, Math.PI * 1.5 - 0.22)
  g.closePath()
  const leaf = g.createRadialGradient(-8, -8, 4, 0, 0, R)
  leaf.addColorStop(0, '#7fb35a')
  leaf.addColorStop(0.7, '#3f7a3a')
  leaf.addColorStop(1, '#2b5a2c')
  g.fillStyle = leaf
  g.fill()
  g.strokeStyle = 'rgba(190,230,150,0.35)'
  g.lineWidth = 1.2
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + 0.4 + (i / 10) * (Math.PI * 2 - 0.8)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92)
    g.stroke()
  }
  g.strokeStyle = 'rgba(20,50,20,0.6)'
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(0, 0, R, -Math.PI / 2 + 0.22, Math.PI * 1.5 - 0.22)
  g.stroke()
  // 莲灯
  g.save()
  g.scale(0.36, 0.36)
  g.translate(-56, -56)
  g.drawImage(lotus('rose', true), 0, 0)
  g.restore()
  return c
}

// 鹤舟：展翅纸鹤背负灯笼
export function craneBoat() {
  const w = 120,
    h = 144
  const [c, g] = canvas(w, h)
  g.translate(w / 2, h / 2)
  const shadow = g.createRadialGradient(4, 8, 14, 4, 8, 60)
  shadow.addColorStop(0, 'rgba(0,0,0,0.38)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadow
  g.fillRect(-w / 2, -h / 2, w, h)
  const face = (pts: number[][], fill: string) => {
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1])
    g.closePath()
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = 'rgba(110,95,80,0.5)'
    g.lineWidth = 1.2
    g.stroke()
  }
  face(
    [
      [0, -8],
      [-56, 6],
      [-10, 18],
    ],
    '#efe7d8',
  )
  face(
    [
      [0, -8],
      [56, 6],
      [10, 18],
    ],
    '#ded4c2',
  )
  face(
    [
      [0, -60],
      [9, -10],
      [0, 40],
      [-9, -10],
    ],
    '#faf6ee',
  )
  face(
    [
      [0, 40],
      [7, 62],
      [-7, 62],
    ],
    '#d9cfbd',
  )
  face(
    [
      [0, -60],
      [-9, -68],
      [3, -63],
    ],
    '#f4eee2',
  )
  const lamp = g.createRadialGradient(0, 4, 1, 0, 4, 14)
  lamp.addColorStop(0, '#fff7d6')
  lamp.addColorStop(0.5, '#ffc46b')
  lamp.addColorStop(1, '#e0612e')
  g.fillStyle = '#7a2f1c'
  roundRect(g, -12, -8, 24, 24, 6)
  g.fill()
  g.fillStyle = lamp
  roundRect(g, -10, -6, 20, 20, 5)
  g.fill()
  return c
}
