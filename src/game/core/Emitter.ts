type Fn = () => void

/** Tiny change notifier used to bridge game state to React (useSyncExternalStore). */
export class Emitter {
  private subs = new Set<Fn>()
  version = 0
  subscribe = (fn: Fn) => {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
  emit() {
    this.version++
    this.subs.forEach((f) => f())
  }
}
