import { Container, Graphics, Text } from 'pixi.js'
import { palette } from './palette'

type Particle = {
  view: Graphics
  life: number
  maxLife: number
  vx: number
  vy: number
  spin: number
}

type Floater = { view: Text; life: number; y: number }

// 复用粒子与奖励数字
export class SceneEffects {
  view = new Container()
  private particles: Particle[] = []
  private floats: Floater[] = []

  burst(x: number, y: number, color: number, count = 10) {
    for (let i = 0; i < count; i++) {
      let particle = this.particles.find((item) => item.life <= 0)
      if (!particle && this.particles.length < 64) {
        const view = new Graphics().poly([0, -3, 2.5, 0, 0, 3, -2.5, 0]).fill(palette.white)
        particle = { view, life: 0, maxLife: 1, vx: 0, vy: 0, spin: 0 }
        this.particles.push(particle)
        this.view.addChild(view)
      }
      if (!particle) break
      const angle = Math.random() * Math.PI * 2
      const speed = 22 + Math.random() * 60
      particle.maxLife = particle.life = 0.4 + Math.random() * 0.4
      particle.vx = Math.cos(angle) * speed
      particle.vy = Math.sin(angle) * speed - 20
      particle.spin = (Math.random() - 0.5) * 8
      particle.view.position.set(x, y)
      particle.view.scale.set(1)
      particle.view.tint = color
      particle.view.alpha = 1
      particle.view.visible = true
    }
  }

  float(x: number, y: number, value: string, color = palette.navy) {
    let floater = this.floats.find((item) => item.life <= 0)
    if (!floater && this.floats.length < 8) {
      const view = new Text({
        text: '',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 18,
          fontWeight: '800',
          fill: color,
          stroke: { color: palette.white, width: 3 },
        },
      })
      view.anchor.set(0.5)
      floater = { view, life: 0, y: 0 }
      this.floats.push(floater)
      this.view.addChild(view)
    }
    if (!floater) return
    floater.life = 1.3
    floater.y = y
    floater.view.text = value
    floater.view.style.fill = color
    floater.view.position.set(x, y)
    floater.view.alpha = 1
    floater.view.visible = true
  }

  update(dt: number) {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue
      particle.life -= dt
      particle.view.visible = particle.life > 0
      particle.view.x += particle.vx * dt
      particle.view.y += particle.vy * dt
      particle.vy += dt * 50
      particle.view.rotation += particle.spin * dt
      particle.view.alpha = Math.max(0, particle.life / particle.maxLife)
    }
    for (const floater of this.floats) {
      if (floater.life <= 0) continue
      floater.life -= dt
      floater.view.visible = floater.life > 0
      floater.view.y = floater.y - (1.3 - floater.life) * 25
      floater.view.alpha = Math.min(1, Math.max(0, floater.life * 2.5))
      floater.view.scale.set(1 + Math.max(0, floater.life - 1) * 0.35)
    }
  }

  destroy() {
    this.particles = []
    this.floats = []
    this.view.destroy({ children: true })
  }
}
