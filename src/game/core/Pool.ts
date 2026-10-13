/** Generic object pool to avoid GC churn on mobile. */
export class Pool<T> {
  private free: T[] = []
  readonly active: T[] = []
  constructor(
    private create: () => T,
    private onAcquire: (o: T) => void,
    private onRelease: (o: T) => void,
    private cap: number,
  ) {}
  acquire(): T | null {
    if (this.active.length >= this.cap) return null
    const o = this.free.pop() ?? this.create()
    this.onAcquire(o)
    this.active.push(o)
    return o
  }
  /** Release by index (swap-remove, O(1)). Iterate active backwards when releasing. */
  releaseAt(i: number) {
    const o = this.active[i]
    const last = this.active.pop()!
    if (i < this.active.length) this.active[i] = last
    this.onRelease(o)
    this.free.push(o)
  }
  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i--) this.releaseAt(i)
  }
}
