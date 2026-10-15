// Canvas 绘图小工具
export function canvas(w: number, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

export function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(c: number[]) {
  return (
    '#' +
    c
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

export function mixHex(a: string, b: string, t: number) {
  const x = rgb(a),
    y = rgb(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

export function shade(hex: string, k: number) {
  return k >= 0 ? mixHex(hex, '#ffffff', k) : mixHex(hex, '#000000', -k)
}

// 线性 rgb 数组转 tint
export function tintOf(c: readonly number[], k = 1) {
  const b = (v: number) => Math.max(0, Math.min(255, Math.round(v * k * 255)))
  return (b(c[0]) << 16) | (b(c[1]) << 8) | b(c[2])
}
