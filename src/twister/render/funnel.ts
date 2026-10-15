import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Points,
  RingGeometry,
  ShaderMaterial,
  Vector2,
} from 'three'
import type { Tornado } from '../sim/tornado'

// 龙卷风柱：两层扭转条纹的漏斗 + 底部尘环 + 地面风眼圈
const profile = Array.from({ length: 24 }, (_, i) => {
  const y = i / 23
  return new Vector2(0.3 + 1.55 * Math.pow(y, 1.45) + 0.07 * Math.sin(y * 9), y)
})

const vert = /* glsl */ `
uniform float uTime;
uniform float uLean;
varying vec2 vUv;
varying float vFacing;
void main() {
  vUv = uv;
  vec3 p = position;
  // 风柱摆动：越高摆幅越大
  float k = pow(uv.y, 1.4);
  p.x += sin(uTime * 1.7 + uv.y * 3.0) * uLean * k;
  p.z += cos(uTime * 1.3 + uv.y * 2.4) * uLean * k * 0.7;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vFacing = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`

const frag = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uOpacity;
uniform float uLayer;
varying vec2 vUv;
varying float vFacing;
float band(float x) { return 0.5 + 0.5 * sin(x * 6.2831); }
void main() {
  float a = vUv.x * (5.0 + uLayer * 3.0) + vUv.y * 2.4 - uTime * uSpeed;
  float n = band(a) * 0.55 + band(a * 2.3 + vUv.y * 4.0 + uTime * 0.7) * 0.3 + band(a * 5.1 - uTime) * 0.15;
  n = smoothstep(0.25, 0.85, n);
  float fadeY = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  float rim = 1.0 - vFacing * 0.55;
  float alpha = (0.45 + n * 0.5) * fadeY * rim * uOpacity;
  vec3 col = mix(uColor * 0.55, uColor, n) * (0.7 + 0.4 * vUv.y);
  gl_FragColor = vec4(col, alpha);
}`

export class Funnel {
  readonly group = new Group()
  private outer: ShaderMaterial
  private inner: ShaderMaterial
  private core: ShaderMaterial
  private dust: Points
  private dustPos: Float32Array
  private seeds: Float32Array
  private ring: Mesh
  private shade: Mesh

  constructor(tint: string, player: boolean) {
    const color = new Color(tint)
    const make = (layer: number, opacity: number, speed: number) =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: color.clone().multiplyScalar(layer ? 0.7 : 1) },
          uSpeed: { value: speed },
          uOpacity: { value: opacity },
          uLayer: { value: layer },
          uLean: { value: 0.4 },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: NormalBlending,
      })
    this.outer = make(0, 0.85, 1.4)
    this.inner = make(1, 0.95, 2.2)
    this.core = make(2, 1, 3.1)
    this.core.uniforms.uColor.value = color.clone().multiplyScalar(0.55)
    const lathe = new LatheGeometry(profile, 28)
    const outerMesh = new Mesh(lathe, this.outer)
    const innerMesh = new Mesh(lathe, this.inner)
    const coreMesh = new Mesh(lathe, this.core)
    outerMesh.renderOrder = 3
    innerMesh.renderOrder = 2
    coreMesh.renderOrder = 1
    // 尘环
    const count = 160
    this.dustPos = new Float32Array(count * 3)
    this.seeds = new Float32Array(count * 3)
    for (let i = 0; i < count; i++)
      this.seeds.set([Math.random() * 6.28, 0.5 + Math.random() * 1.3, Math.random()], i * 3)
    const dg = new BufferGeometry()
    dg.setAttribute('position', new BufferAttribute(this.dustPos, 3))
    dg.setAttribute('seed', new BufferAttribute(this.seeds, 3))
    this.dust = new Points(
      dg,
      new ShaderMaterial({
        uniforms: {
          uColor: { value: color.clone().lerp(new Color('#c8b8a0'), 0.5) },
          uSize: { value: 30 },
        },
        vertexShader: /* glsl */ `
          attribute vec3 seed;
          uniform float uSize;
          varying float vA;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vA = 1.0 - seed.z;
            gl_PointSize = uSize * (0.6 + seed.y * 0.6) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * 0.35 * vA;
            gl_FragColor = vec4(uColor, a);
          }`,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.dust.frustumCulled = false
    // 地面风眼圈与阴影
    this.ring = new Mesh(
      new RingGeometry(0.93, 1, 48),
      new MeshBasicMaterial({
        color: player ? '#9fe8ff' : tint,
        transparent: true,
        opacity: player ? 0.55 : 0.4,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.15
    this.shade = new Mesh(
      new CircleGeometry(1, 32),
      new MeshBasicMaterial({
        color: '#1d2430',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    )
    this.shade.rotation.x = -Math.PI / 2
    this.shade.position.y = 0.12
    this.group.add(this.shade, this.ring, innerMesh, outerMesh, this.dust, coreMesh)
  }

  update(t: Tornado, time: number) {
    const g = this.group
    g.visible = t.alive
    if (!t.alive) return
    const r = t.r
    const H = r * 4.2 + 6
    g.position.set(t.x, 0, t.z)
    for (const mat of [this.outer, this.inner, this.core]) {
      mat.uniforms.uTime.value = time
      mat.uniforms.uLean.value = 0.12 + r * 0.035
    }
    const funnelW = r * 0.95
    g.children[2].scale.set(funnelW * 0.62, H * 0.98, funnelW * 0.62)
    g.children[3].scale.set(funnelW, H, funnelW)
    g.children[5].scale.set(funnelW * 0.32, H * 0.9, funnelW * 0.32)
    // 受保护时闪烁
    const blink = t.guard > 0 && Math.sin(time * 20) > 0 ? 0.35 : 1
    this.outer.uniforms.uOpacity.value = 0.85 * blink
    this.ring.scale.setScalar(r)
    this.shade.scale.setScalar(r * 1.25)
    const p = this.dustPos,
      s = this.seeds
    for (let i = 0; i < p.length / 3; i++) {
      const life = (time * 0.35 + s[i * 3 + 2]) % 1
      // 三分之一是向风眼汇聚的吸流，标出吸力范围
      if (i % 3 === 0) {
        const a = s[i * 3] + life * 4.5
        const rad = r * (2.3 - life * 1.7)
        p[i * 3] = Math.cos(a) * rad
        p[i * 3 + 1] = 0.3 + life * life * r * 0.6
        p[i * 3 + 2] = Math.sin(a) * rad
        continue
      }
      const a = s[i * 3] + time * (2.2 + 1 / (0.4 + s[i * 3 + 1]))
      const rad = r * (0.6 + s[i * 3 + 1] * 0.7 + life * 0.4)
      p[i * 3] = Math.cos(a) * rad
      p[i * 3 + 1] = life * r * 0.9
      p[i * 3 + 2] = Math.sin(a) * rad
    }
    this.dust.geometry.attributes.position.needsUpdate = true
    ;(this.dust.material as ShaderMaterial).uniforms.uSize.value = 34 * Math.max(1, r) * 6
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh || o instanceof Points) {
        o.geometry.dispose()
        ;(o.material as ShaderMaterial).dispose()
      }
    })
  }
}
