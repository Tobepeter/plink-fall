import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Run } from '../sim/run'
import type { TwEvent } from '../sim/types'
import { buildGround, tickWater } from './ground'
import { PropMeshes } from './props'
import { Funnel } from './funnel'
import { Bolts } from './bolts'

const v = new Vector3()

// 3D 场景：低多边形城区、龙卷风柱、跟随镜头、天色随体型转暗
export class TwisterScene {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(45, 1, 1, 3000)
  private sun = new DirectionalLight('#fff2dc', 2.4)
  private hemi = new HemisphereLight('#cfe8ff', '#7a8a5a', 1.25)
  private props: PropMeshes | null = null
  private funnels: Funnel[] = []
  private bolts: Bolts
  private run: Run | null = null
  private sky = new Color()
  private storm = new Color('#5d6878')
  private span = 40 // 镜头平滑后的水平视野
  private look = new Vector3()
  size = { w: 1, h: 1 }
  shake = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    const mobile = Math.min(screen.width, screen.height) < 600
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048)
    this.sun.shadow.bias = -0.0006
    this.sun.shadow.normalBias = 0.4
    this.scene.add(this.sun, this.sun.target, this.hemi)
    this.scene.fog = new Fog('#9fd3f0', 200, 900)
    this.bolts = new Bolts(this.scene)
  }

  // 换一座城：重建地面、道具、风柱
  load(run: Run) {
    this.unload()
    this.run = run
    this.scene.add(buildGround(run.city, run.district.style))
    this.props = new PropMeshes(run)
    this.scene.add(this.props.group)
    for (const t of run.tornados) {
      const f = new Funnel(t.tint, t.player)
      this.funnels.push(f)
      this.scene.add(f.group)
    }
    this.sky.set(run.district.sky)
    const p = run.player
    this.span = 22 + p.r * 7
    this.look.set(p.x, 0, p.z)
  }

  private unload() {
    this.props?.dispose()
    for (const f of this.funnels) f.dispose()
    this.funnels = []
    for (const child of [...this.scene.children]) {
      if (
        child === this.sun ||
        child === this.sun.target ||
        child === this.hemi ||
        this.bolts.owns(child)
      )
        continue
      this.scene.remove(child)
    }
  }

  resize(w: number, h: number) {
    this.size = { w, h }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.fov = w < h ? 52 : 42
    this.camera.updateProjectionMatrix()
  }

  handle(events: TwEvent[]) {
    for (const e of events) {
      if (e.type === 'bolt') {
        this.bolts.strike(e.x, e.z, e.h)
        this.shake = Math.max(this.shake, 0.6)
      }
      if (e.type === 'devour') this.shake = Math.max(this.shake, 1)
    }
  }

  render(time: number, dt: number) {
    const run = this.run
    if (!run) return
    const p = run.player
    // 镜头：按水平视野反推距离，竖屏视角更广
    const want = 24 + p.r * 7.2
    this.span += (want - this.span) * Math.min(1, dt * 1.6)
    const hfov =
      2 * Math.atan(Math.tan(((this.camera.fov / 2) * Math.PI) / 180) * this.camera.aspect)
    const dist = this.span / (2 * Math.tan(hfov / 2))
    const pitch = 0.98
    this.look.x += (p.x + p.vx * 0.35 - this.look.x) * Math.min(1, dt * 4)
    this.look.z += (p.z + p.vz * 0.35 - this.look.z) * Math.min(1, dt * 4)
    this.shake = Math.max(0, this.shake - dt * 2)
    const j = this.shake * p.r * 0.15
    this.camera.position.set(
      this.look.x + (Math.random() - 0.5) * j,
      Math.sin(pitch) * dist + p.r * 0.8,
      this.look.z + Math.cos(pitch) * dist + (Math.random() - 0.5) * j,
    )
    this.camera.lookAt(this.look.x, p.r * 0.8, this.look.z)
    // 阳光与阴影框跟随
    const sd = Math.max(40, dist * 0.9)
    this.sun.position.set(this.look.x - sd * 0.5, sd * 1.2, this.look.z - sd * 0.25)
    this.sun.target.position.set(this.look.x, 0, this.look.z)
    const cam = this.sun.shadow.camera
    cam.left = cam.bottom = -sd
    cam.right = cam.top = sd
    cam.far = sd * 4
    cam.updateProjectionMatrix()
    // 天色：越接近目标越像风暴
    const k = Math.min(1, p.r / (run.district.goal * 1.4)) * 0.55
    const sky = this.sky.clone().lerp(this.storm, k)
    this.scene.background = sky
    const fog = this.scene.fog as Fog
    fog.color.copy(sky)
    fog.near = dist * 1.1
    fog.far = dist * 3.6
    this.sun.intensity = 2.4 * (1 - k * 0.45)
    this.props?.update(run, time)
    run.tornados.forEach((t, i) => this.funnels[i]?.update(t, time))
    this.bolts.update(dt)
    tickWater(time)
    this.renderer.render(this.scene, this.camera)
  }

  // 世界坐标转屏幕坐标（像素）
  project(x: number, y: number, z: number) {
    v.set(x, y, z).project(this.camera)
    return {
      x: (v.x * 0.5 + 0.5) * this.size.w,
      y: (-v.y * 0.5 + 0.5) * this.size.h,
      front: v.z < 1,
    }
  }

  dispose() {
    this.unload()
    this.bolts.dispose()
    this.renderer.dispose()
  }
}
