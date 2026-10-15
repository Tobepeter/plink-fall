import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 低多边形拼装：基础体 + 顶点色 + 平面法线，合并成单个几何
export type Part = BufferGeometry

const m = new Matrix4(),
  q = new Quaternion(),
  e = new Euler(),
  v = new Vector3(),
  s = new Vector3()

// 摆放并着色一个部件，y 为底面高度
export function part(
  geom: BufferGeometry,
  color: string | number,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
): Part {
  const g = geom.index ? geom.toNonIndexed() : geom
  // 只保留位置与颜色，合并后统一算平面法线
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name)
  e.set(rot[0], rot[1], rot[2])
  q.setFromEuler(e)
  m.compose(v.set(pos[0], pos[1], pos[2]), q, s.set(scale[0], scale[1], scale[2]))
  g.applyMatrix4(m)
  const c = new Color(color)
  const n = g.getAttribute('position').count
  const colors = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

export function merge(parts: Part[]) {
  const g = mergeGeometries(parts, false)!
  g.computeVertexNormals()
  g.computeBoundingBox()
  g.computeBoundingSphere()
  for (const p of parts) p.dispose()
  return g
}

// 底面在 y=0 的长方体
export const box = (w: number, h: number, d: number) => {
  const g = new BoxGeometry(w, h, d)
  g.translate(0, h / 2, 0)
  return g
}

export const cyl = (rt: number, rb: number, h: number, seg = 8) => {
  const g = new CylinderGeometry(rt, rb, h, seg, 1)
  g.translate(0, h / 2, 0)
  return g
}

export const cone = (r: number, h: number, seg = 7) => {
  const g = new ConeGeometry(r, h, seg, 1)
  g.translate(0, h / 2, 0)
  return g
}

export const ball = (r: number, detail = 0) => new IcosahedronGeometry(r, detail)

// 双坡屋顶：沿 x 的三角棱柱
export const gable = (w: number, h: number, d: number) => {
  const g = new BufferGeometry()
  const x = w / 2,
    z = d / 2
  // prettier-ignore
  const p = [
    -x, 0, z, x, 0, z, 0, h, z,
    x, 0, -z, -x, 0, -z, 0, h, -z,
    -x, 0, -z, -x, 0, z, 0, h, z, -x, 0, -z, 0, h, z, 0, h, -z,
    x, 0, z, x, 0, -z, 0, h, -z, x, 0, z, 0, h, -z, 0, h, z,
    -x, 0, -z, x, 0, -z, x, 0, z, -x, 0, -z, x, 0, z, -x, 0, z,
  ]
  g.setAttribute('position', new Float32BufferAttribute(p, 3))
  return g
}
