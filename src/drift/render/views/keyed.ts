// 按实体 key 复用显示对象，帧末清理未出现的
export class Keyed<K, V> {
  private map = new Map<K, V>()
  private seen = new Set<K>()

  constructor(
    private make: (key: K) => V,
    private drop: (view: V) => void,
  ) {}

  get(key: K) {
    this.seen.add(key)
    let v = this.map.get(key)
    if (!v) this.map.set(key, (v = this.make(key)))
    return v
  }

  sweep() {
    for (const [k, v] of this.map)
      if (!this.seen.has(k)) {
        this.drop(v)
        this.map.delete(k)
      }
    this.seen.clear()
  }

  clear() {
    for (const v of this.map.values()) this.drop(v)
    this.map.clear()
    this.seen.clear()
  }
}
