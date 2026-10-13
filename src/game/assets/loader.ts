import { Texture } from 'pixi.js'

export interface GameTextures {
  dot: Texture
  glow: Texture
  ring: Texture
}

function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  draw(cv.getContext('2d')!, size)
  return Texture.from(cv)
}

/**
 * Asset loading entry point. Currently all art is procedural (generated once and shared,
 * so sprites batch into a few draw calls); external assets would go through Assets.load here.
 */
export async function loadAssets(): Promise<GameTextures> {
  const dot = canvasTex(64, (c, s) => {
    const g = c.createRadialGradient(s * 0.4, s * 0.38, 2, s / 2, s / 2, s / 2)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.7, '#e8e8f0')
    g.addColorStop(1, '#b8b8c8')
    c.fillStyle = g
    c.beginPath()
    c.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2)
    c.fill()
  })
  const glow = canvasTex(128, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, s, s)
  })
  const ring = canvasTex(128, (c, s) => {
    c.strokeStyle = '#fff'
    c.lineWidth = 6
    c.beginPath()
    c.arc(s / 2, s / 2, s / 2 - 5, 0, Math.PI * 2)
    c.stroke()
  })
  return { dot, glow, ring }
}
