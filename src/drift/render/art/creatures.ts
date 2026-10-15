import { canvas } from './kit'

// 生灵：暗影鱼、夜蛾、影鳗、锦鲤、纸鹤、首领。头部均朝上（-y）

// 水下暗影鱼
export function shadowFish() {
  const [c, g] = canvas(56, 112)
  g.translate(28, 56)
  for (const [blur, a] of [
    [1.25, 0.18],
    [1.1, 0.3],
    [1, 0.75],
  ]) {
    g.save()
    g.scale(blur, blur)
    g.fillStyle = `rgba(4,8,14,${a})`
    g.beginPath()
    g.ellipse(0, -10, 11, 30, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(0, 14)
    g.quadraticCurveTo(14, 34, 12, 46)
    g.quadraticCurveTo(0, 36, -12, 46)
    g.quadraticCurveTo(-14, 34, 0, 14)
    g.fill()
    g.beginPath()
    g.ellipse(13, -6, 9, 4, 0.7, 0, Math.PI * 2)
    g.ellipse(-13, -6, 9, 4, -0.7, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  return c
}

// 夜蛾
export function moth() {
  const [c, g] = canvas(80)
  g.translate(40, 40)
  const wing = (sx: number, big: boolean) => {
    g.save()
    g.scale(sx, 1)
    const grad = g.createLinearGradient(0, 0, 34, 0)
    grad.addColorStop(0, '#2a2236')
    grad.addColorStop(1, '#4b3f5c')
    g.fillStyle = grad
    g.beginPath()
    if (big) {
      g.moveTo(2, -4)
      g.bezierCurveTo(16, -30, 36, -26, 34, -8)
      g.bezierCurveTo(32, 4, 14, 6, 2, 2)
    } else {
      g.moveTo(2, 2)
      g.bezierCurveTo(20, 6, 26, 22, 14, 26)
      g.bezierCurveTo(6, 26, 2, 14, 2, 6)
    }
    g.fill()
    g.strokeStyle = 'rgba(190,170,220,0.35)'
    g.lineWidth = 1
    g.stroke()
    if (big) {
      g.fillStyle = 'rgba(210,190,255,0.55)'
      g.beginPath()
      g.arc(22, -12, 4, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
  }
  for (const sx of [1, -1]) {
    wing(sx, true)
    wing(sx, false)
  }
  g.fillStyle = '#17121f'
  g.beginPath()
  g.ellipse(0, 2, 3.5, 13, 0, 0, Math.PI * 2)
  g.fill()
  return c
}

// 影鳗身段，横向贴图供绳网使用
export function eelBody() {
  const [c, g] = canvas(128, 32)
  const grad = g.createLinearGradient(0, 0, 0, 32)
  grad.addColorStop(0, 'rgba(6,10,18,0)')
  grad.addColorStop(0.25, 'rgba(8,12,22,0.85)')
  grad.addColorStop(0.5, 'rgba(14,20,34,0.95)')
  grad.addColorStop(0.75, 'rgba(8,12,22,0.85)')
  grad.addColorStop(1, 'rgba(6,10,18,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 32)
  for (let i = 0; i < 6; i++) {
    g.fillStyle = 'rgba(120,200,255,0.55)'
    g.beginPath()
    g.arc(10 + i * 21, 16, 1.8, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

// 锦鲤
export function koi() {
  const [c, g] = canvas(48, 96)
  g.translate(24, 44)
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.beginPath()
  g.ellipse(13, -2, 8, 4, 0.7, 0, Math.PI * 2)
  g.ellipse(-13, -2, 8, 4, -0.7, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fbf3ea'
  g.beginPath()
  g.ellipse(0, -6, 10, 26, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(0, 16)
  g.quadraticCurveTo(14, 36, 10, 46)
  g.quadraticCurveTo(0, 38, -10, 46)
  g.quadraticCurveTo(-14, 36, 0, 16)
  g.fillStyle = 'rgba(255,240,230,0.8)'
  g.fill()
  g.fillStyle = '#ff6a2b'
  for (const [x, y, rx, ry] of [
    [-3, -20, 7, 8],
    [4, -2, 6, 9],
    [-4, 10, 5, 6],
  ]) {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

// 纸鹤
export function crane() {
  const [c, g] = canvas(96, 72)
  g.translate(48, 36)
  const face = (pts: number[][], fill: string) => {
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1])
    g.closePath()
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = 'rgba(120,110,100,0.4)'
    g.lineWidth = 1
    g.stroke()
  }
  face(
    [
      [0, -6],
      [-44, 4],
      [-6, 10],
    ],
    '#efe9dd',
  )
  face(
    [
      [0, -6],
      [44, 4],
      [6, 10],
    ],
    '#e2dacb',
  )
  face(
    [
      [0, -30],
      [5, -6],
      [0, 14],
      [-5, -6],
    ],
    '#fbf8f1',
  )
  face(
    [
      [0, 14],
      [4, 30],
      [-4, 30],
    ],
    '#ddd4c4',
  )
  face(
    [
      [0, -30],
      [-6, -36],
      [2, -32],
    ],
    '#f4efe5',
  )
  return c
}

// 老鲶：巨大水下暗影，长须
export function catfish() {
  const [c, g] = canvas(200, 300)
  g.translate(100, 140)
  for (const [k, a] of [
    [1.15, 0.2],
    [1.05, 0.35],
    [1, 0.8],
  ]) {
    g.save()
    g.scale(k, k)
    g.fillStyle = `rgba(3,6,10,${a})`
    g.beginPath()
    g.ellipse(0, -40, 46, 62, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(0, 30, 30, 70, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(0, 90)
    g.quadraticCurveTo(36, 130, 30, 150)
    g.quadraticCurveTo(0, 128, -30, 150)
    g.quadraticCurveTo(-36, 130, 0, 90)
    g.fill()
    g.beginPath()
    g.ellipse(48, -10, 26, 10, 0.6, 0, Math.PI * 2)
    g.ellipse(-48, -10, 26, 10, -0.6, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  g.strokeStyle = 'rgba(6,10,16,0.85)'
  g.lineWidth = 4
  g.lineCap = 'round'
  for (const s of [1, -1]) {
    g.beginPath()
    g.moveTo(s * 26, -88)
    g.bezierCurveTo(s * 60, -110, s * 80, -90, s * 92, -120)
    g.stroke()
    g.beginPath()
    g.moveTo(s * 18, -94)
    g.bezierCurveTo(s * 34, -124, s * 50, -128, s * 52, -136)
    g.stroke()
  }
  return c
}

// 夜渡舟：乌篷船与船夫斗笠
export function ferry() {
  const [c, g] = canvas(120, 240)
  g.translate(60, 120)
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.beginPath()
  g.ellipse(6, 10, 46, 104, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(0, -108)
  g.bezierCurveTo(40, -70, 42, 60, 0, 104)
  g.bezierCurveTo(-42, 60, -40, -70, 0, -108)
  const hull = g.createLinearGradient(-40, 0, 40, 0)
  hull.addColorStop(0, '#120f14')
  hull.addColorStop(0.5, '#2a2430')
  hull.addColorStop(1, '#100d12')
  g.fillStyle = hull
  g.fill()
  // 乌篷
  g.fillStyle = '#1a1620'
  g.beginPath()
  g.ellipse(0, 20, 30, 46, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(160,150,190,0.25)'
  g.lineWidth = 1.5
  for (let i = -3; i <= 3; i++) {
    g.beginPath()
    g.moveTo(-28, 20 + i * 12)
    g.quadraticCurveTo(0, 14 + i * 12, 28, 20 + i * 12)
    g.stroke()
  }
  // 斗笠
  const hat = g.createRadialGradient(-4, -48, 2, 0, -44, 22)
  hat.addColorStop(0, '#5a5048')
  hat.addColorStop(1, '#221c18')
  g.fillStyle = hat
  g.beginPath()
  g.arc(0, -44, 20, 0, Math.PI * 2)
  g.fill()
  return c
}

// 影龙头
export function dragonHead() {
  const [c, g] = canvas(140, 160)
  g.translate(70, 86)
  g.fillStyle = 'rgba(4,8,16,0.9)'
  g.beginPath()
  g.moveTo(0, -70)
  g.bezierCurveTo(30, -60, 40, -10, 34, 30)
  g.bezierCurveTo(26, 60, -26, 60, -34, 30)
  g.bezierCurveTo(-40, -10, -30, -60, 0, -70)
  g.fill()
  g.strokeStyle = 'rgba(8,14,26,0.9)'
  g.lineWidth = 5
  g.lineCap = 'round'
  for (const s of [1, -1]) {
    g.beginPath()
    g.moveTo(s * 18, 10)
    g.bezierCurveTo(s * 50, 20, s * 60, 50, s * 66, 70)
    g.stroke()
    g.beginPath()
    g.moveTo(s * 14, -56)
    g.bezierCurveTo(s * 44, -70, s * 56, -60, s * 64, -78)
    g.stroke()
  }
  return c
}

export function dragonBody() {
  const [c, g] = canvas(128, 48)
  const grad = g.createLinearGradient(0, 0, 0, 48)
  grad.addColorStop(0, 'rgba(4,8,16,0)')
  grad.addColorStop(0.2, 'rgba(6,10,20,0.9)')
  grad.addColorStop(0.5, 'rgba(12,18,32,0.95)')
  grad.addColorStop(0.8, 'rgba(6,10,20,0.9)')
  grad.addColorStop(1, 'rgba(4,8,16,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 48)
  g.strokeStyle = 'rgba(110,170,255,0.3)'
  g.lineWidth = 1.2
  for (let i = 0; i < 8; i++) {
    g.beginPath()
    g.arc(i * 16 + 8, 24, 9, -0.9, 0.9)
    g.stroke()
  }
  return c
}
