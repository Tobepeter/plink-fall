import {
  AdditiveBlending,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Quaternion,
  Vector3,
  type Object3D,
  type Scene,
} from 'three'

const up = new Vector3(0, 1, 0)

// 雷击：折线光柱 + 瞬间点光源
export class Bolts {
  private root = new Group()
  private light = new PointLight('#cfe4ff', 0, 160, 1.4)
  private strikes: { mesh: Group; life: number }[] = []
  private geom = new CylinderGeometry(1, 1, 1, 5, 1)
  private mat = new MeshBasicMaterial({
    color: '#e8f2ff',
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })

  constructor(readonly scene: Scene) {
    scene.add(this.root, this.light)
  }

  owns(o: Object3D) {
    return o === this.root || o === this.light
  }

  strike(x: number, z: number, h: number) {
    const g = new Group()
    let px = x + (Math.random() - 0.5) * 20,
      py = 120,
      pz = z + (Math.random() - 0.5) * 20
    const a = new Vector3(),
      b = new Vector3()
    const steps = 9
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const nx = x + (Math.random() - 0.5) * 14 * (1 - t),
        ny = 120 - (120 - h * 0.6) * t,
        nz = z + (Math.random() - 0.5) * 14 * (1 - t)
      a.set(px, py, pz)
      b.set(nx, ny, nz)
      const seg = new Mesh(this.geom, this.mat)
      const len = a.distanceTo(b)
      seg.position.copy(a).add(b).multiplyScalar(0.5)
      seg.scale.set(0.35, len, 0.35)
      seg.quaternion.copy(new Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()))
      g.add(seg)
      px = nx
      py = ny
      pz = nz
    }
    this.root.add(g)
    this.strikes.push({ mesh: g, life: 0.35 })
    this.light.position.set(x, h + 10, z)
    this.light.intensity = 900
  }

  update(dt: number) {
    for (const s of this.strikes) {
      s.life -= dt
      s.mesh.visible = s.life > 0 && Math.random() > 0.25
      if (s.life <= 0) this.root.remove(s.mesh)
    }
    this.strikes = this.strikes.filter((s) => s.life > 0)
    this.light.intensity *= Math.exp(-dt * 12)
  }

  dispose() {
    this.geom.dispose()
    this.mat.dispose()
    this.scene.remove(this.root, this.light)
  }
}
