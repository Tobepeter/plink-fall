import {
  Color,
  DynamicDrawUsage,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { Run } from '../sim/run'
import type { Obj } from '../sim/world'
import { propKinds, type PropKind } from '../data/props'
import { buildChunk, buildProp } from './prop-geoms'

const m4 = new Matrix4(),
  pos = new Vector3(),
  quat = new Quaternion(),
  scl = new Vector3(),
  eul = new Euler(),
  col = new Color()

// 道具实例化：每种道具一个 InstancedMesh，碎块共用一个按实例上色
export class PropMeshes {
  readonly group = new Group()
  private meshes = new Map<PropKind, InstancedMesh>()
  private slots = new Map<Obj, number>()
  private chunks: InstancedMesh
  private mat = new MeshLambertMaterial({ vertexColors: true })

  constructor(run: Run) {
    const counts = new Map<PropKind, number>()
    for (const o of run.objs)
      if (o.kind !== 'chunk') counts.set(o.kind, (counts.get(o.kind) ?? 0) + 1)
    for (const kind of propKinds) {
      const n = counts.get(kind)
      if (!n) continue
      const mesh = new InstancedMesh(buildProp(kind), this.mat, n)
      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      this.meshes.set(kind, mesh)
      this.group.add(mesh)
    }
    const fill = new Map<PropKind, number>()
    for (const o of run.objs) {
      if (o.kind === 'chunk') continue
      const i = fill.get(o.kind) ?? 0
      fill.set(o.kind, i + 1)
      this.slots.set(o, i)
    }
    this.chunks = new InstancedMesh(buildChunk(), this.mat, 900)
    this.chunks.instanceMatrix.setUsage(DynamicDrawUsage)
    this.chunks.castShadow = true
    this.chunks.frustumCulled = false
    this.chunks.count = 0
    this.group.add(this.chunks)
  }

  update(run: Run, time: number) {
    const touched = new Set<InstancedMesh>()
    for (const o of run.objs) {
      if (!o.dirty || o.kind === 'chunk') continue
      o.dirty = false
      const mesh = this.meshes.get(o.kind)!
      this.matrix(o, time)
      mesh.setMatrixAt(this.slots.get(o)!, m4)
      touched.add(mesh)
    }
    for (const mesh of touched) mesh.instanceMatrix.needsUpdate = true
    // 碎块每帧重排
    let n = 0
    const put = (o: Obj) => {
      if (n >= 900) return
      this.matrix(o, time)
      this.chunks.setMatrixAt(n, m4)
      this.chunks.setColorAt(n, col.set(o.color))
      n++
    }
    for (const o of run.chunks) put(o)
    for (const o of run.swirl.lifted) if (o.kind === 'chunk') put(o)
    this.chunks.count = n
    this.chunks.instanceMatrix.needsUpdate = true
    if (this.chunks.instanceColor) this.chunks.instanceColor.needsUpdate = true
  }

  private matrix(o: Obj, time: number) {
    if (o.state === 'gone') {
      m4.makeScale(0, 0, 0)
      return
    }
    let x = o.x,
      z = o.z
    if (o.shake > 0) {
      const k = o.shake * 0.12 * Math.sqrt(o.s)
      x += Math.sin(time * 47 + o.id) * k
      z += Math.cos(time * 53 + o.id * 1.3) * k
    }
    const lifting = o.state === 'lift'
    eul.set(
      lifting ? o.tumble * 0.8 : 0,
      o.rot + (lifting ? o.tumble : 0),
      lifting ? o.tumble * 0.45 : o.shake * 0.04,
    )
    quat.setFromEuler(eul)
    const s = o.kind === 'chunk' ? o.scale : o.scale
    // 侵蚀中的建筑略微下沉
    const sink = o.hp < 1 && !lifting ? (1 - o.hp) * 0.25 : 0
    pos.set(x, lifting ? o.y + o.h * 0.1 : o.y - sink * o.h * 0.3, z)
    scl.set(s, s * (1 - sink * 0.4), s)
    m4.compose(pos, quat, scl)
  }

  dispose() {
    for (const m of this.meshes.values()) m.geometry.dispose()
    this.chunks.geometry.dispose()
    this.mat.dispose()
  }
}
