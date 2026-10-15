import { Run } from './sim/run'
import type { TwEvent } from './sim/types'
import { TwisterScene } from './render/scene'
import { TwisterStore } from './meta/store'
import { writeSave, skins } from './meta/save'
import { Overlay } from './ui/overlay'
import { TwisterSound } from './audio/sound'
import { districts } from './data/districts'
import { computePerks, perkIds, perks, type PerkId } from './data/perks'

// 卷城运行时：渲染循环、输入、阶段流转、存档
export class TwisterGame {
  readonly store = new TwisterStore()
  readonly sound = new TwisterSound()
  run: Run
  scene: TwisterScene | null = null
  overlay: Overlay | null = null
  private canvas = document.createElement('canvas')
  private observer: ResizeObserver | null = null
  private raf = 0
  private last = 0
  private acc = 0
  private time = 0
  private hudTimer = 0
  private stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 }
  private keys = new Set<string>()
  private runCoins = 0
  private combo = 0
  private comboTimer = 0
  private disposed = false

  constructor() {
    this.run = new Run(0, Math.floor(Math.random() * 1e6), computePerks({}), true)
  }

  init(stage: HTMLElement) {
    stage.appendChild(this.canvas)
    this.canvas.setAttribute('role', 'application')
    this.canvas.setAttribute('aria-label', '卷城：拖动操控龙卷风，卷起城市里的一切')
    this.scene = new TwisterScene(this.canvas)
    this.overlay = new Overlay(stage)
    this.scene.load(this.run)
    const resize = () => {
      const w = Math.max(1, stage.clientWidth),
        h = Math.max(1, stage.clientHeight)
      this.scene?.resize(w, h)
    }
    this.observer = new ResizeObserver(resize)
    this.observer.observe(stage)
    resize()
    this.sound.muted = this.store.save.muted
    this.canvas.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('keyup', this.onKey)
    document.addEventListener('visibilitychange', this.onVisible)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  // 阶段动作
  start() {
    this.sound.unlock()
    this.store.levels = {}
    this.runCoins = 0
    this.combo = 0
    this.load(0)
    this.store.patch({ hint: !this.store.save.hinted })
  }

  private load(index: number) {
    const save = this.store.save
    const p = computePerks(this.store.levels)
    p.start += save.upgrades.size * 0.35
    p.time += save.upgrades.time * 5
    p.speed *= 1 + save.upgrades.speed * 0.07
    this.run = new Run(index, Math.floor(Math.random() * 1e6), p)
    this.run.player.tint = skins[save.skin].tint
    this.scene?.load(this.run)
    this.overlay?.setRivals(this.run.tornados.filter((t) => !t.player && t.feed < 0))
    this.store.patch({ phase: 'play', paused: false, result: null })
    const d = districts[index]
    this.store.showBanner(d.name, `${d.time + p.time} 秒内长到目标大小`)
    this.syncHud()
  }

  pickPerk(id: PerkId) {
    this.store.levels[id] = (this.store.levels[id] ?? 0) + 1
    this.sound.chime()
    this.load(this.run.index + 1)
  }

  toTitle() {
    this.run = new Run(0, Math.floor(Math.random() * 1e6), computePerks({}), true)
    this.scene?.load(this.run)
    this.overlay?.setRivals([])
    this.store.patch({ phase: 'title', paused: false })
  }

  openShop() {
    this.store.patch({ phase: 'shop' })
  }

  pause(on: boolean) {
    if (this.store.phase === 'play') this.store.patch({ paused: on })
  }

  setMuted(on: boolean) {
    this.store.save.muted = on
    writeSave(this.store.save)
    this.sound.setMuted(on)
    this.store.emit()
  }

  // 输入：浮动摇杆
  private onDown = (e: PointerEvent) => {
    this.sound.unlock()
    if (this.stick.id !== -1) return
    this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY }
    if (this.store.hint) {
      this.store.save.hinted = true
      writeSave(this.store.save)
      this.store.patch({ hint: false })
    }
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.stick.id) return
    this.stick.x = e.clientX
    this.stick.y = e.clientY
  }

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.stick.id) return
    this.stick.id = -1
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.type === 'keydown') this.keys.add(e.key.toLowerCase())
    else this.keys.delete(e.key.toLowerCase())
    if (e.type === 'keydown' && e.key === 'Escape') this.pause(!this.store.paused)
  }

  private onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      this.sound.suspend()
      this.pause(true)
      return
    }
    this.sound.resume()
    if (this.raf || this.disposed) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private readInput() {
    const k = this.keys
    let x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
    let z = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0)
    const s = this.stick
    if (s.id !== -1) {
      const dx = s.x - s.ox,
        dy = s.y - s.oy
      const len = Math.hypot(dx, dy)
      const mag = Math.min(1, len / 56)
      x = len > 4 ? (dx / len) * mag : 0
      z = len > 4 ? (dy / len) * mag : 0
    }
    const len = Math.hypot(x, z)
    if (len > 1) {
      x /= len
      z /= len
    }
    this.run.input.x = x
    this.run.input.z = z
    this.overlay?.stick(s.id !== -1, s.ox, s.oy, s.x, s.y)
  }

  private tick = (now: number) => {
    if (this.disposed || !this.scene) return
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const { store } = this
    const live = store.phase === 'play' || store.phase === 'title' || store.phase === 'shop'
    const scale = store.paused || !live ? 0 : 1
    if (store.phase === 'play') this.readInput()
    this.acc += dt * scale
    let steps = 0
    while (this.acc >= 1 / 60 && steps++ < 4) {
      this.acc -= 1 / 60
      this.step(1 / 60)
    }
    if (steps >= 4) this.acc = 0
    this.comboTimer -= dt * scale
    if (this.comboTimer <= 0) this.combo = 0
    this.hudTimer -= dt
    if (this.hudTimer <= 0 && store.phase === 'play') {
      this.hudTimer = 0.1
      this.syncHud()
    }
    this.scene.render(this.time, dt * scale)
    if (store.phase === 'play') this.overlay?.labels(this.run, this.scene)
    this.sound.update(this.run, dt, store.phase === 'play' && !store.paused)
  }

  private step(dt: number) {
    this.time += dt
    this.run.step(dt)
    const events = this.run.events
    if (!events.length) return
    this.scene?.handle(events)
    for (const e of events) this.react(e)
    events.length = 0
  }

  private react(e: TwEvent) {
    const { run, store } = this
    this.sound.event(e)
    if (run.demo) return
    if (e.type === 'eat' && e.owner === 0) {
      this.combo++
      this.comboTimer = 1.4
      if (e.obj.s > 6) navigator.vibrate?.(12)
    }
    if (e.type === 'tier') store.showToast(`能卷起${e.name}了`, e.kind)
    if (e.type === 'goal') store.showBanner('达成目标', '继续卷，越大奖励越多')
    if (e.type === 'devour' && e.small === 0)
      store.showToast(`被${run.tornados[e.big].name}吞掉，体型减半`)
    if (e.type === 'devour' && e.big === 0) store.showToast(`吞掉了${run.tornados[e.small].name}`)
    if (e.type === 'end') this.finishDistrict(e.win)
  }

  private finishDistrict(win: boolean) {
    const { run, store } = this
    const rank = run.rank()
    const coins =
      Math.floor(Math.sqrt(run.player.mass) * 1.6) +
      (rank === 1 ? 20 : rank === 2 ? 8 : 0) +
      (win ? 15 : 0)
    this.runCoins += coins
    this.syncHud()
    const last = run.index === districts.length - 1
    if (win && !last) {
      const open = perkIds.filter((id) => (store.levels[id] ?? 0) < perks[id].max)
      const offer: PerkId[] = []
      while (offer.length < 3 && open.length)
        offer.push(...open.splice(Math.floor(Math.random() * open.length), 1))
      store.patch({ phase: 'perk', offer })
      this.sound.chime()
      return
    }
    const save = store.save
    save.coins += this.runCoins
    save.runs++
    save.best = Math.max(save.best, run.index + (win ? 1 : 0))
    if (win && last) save.wins++
    writeSave(save)
    store.patch({
      phase: 'result',
      result: {
        win,
        district: run.index,
        coins: this.runCoins,
        mass: Math.round(run.player.mass),
        eaten: run.player.eaten,
        final: win && last,
      },
    })
  }

  private syncHud() {
    const { run, store } = this
    const p = run.player
    store.hud = {
      left: run.left,
      limit: run.limit,
      r: p.r,
      goal: run.district.goal,
      start: p.base,
      rank: run.rank(),
      total: run.tornados.length,
      district: run.index,
      coins: this.runCoins,
      hit: run.goalHit,
      combo: this.combo,
      rivals: [],
    }
    store.emit()
  }

  destroy() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.observer?.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('keyup', this.onKey)
    document.removeEventListener('visibilitychange', this.onVisible)
    this.scene?.dispose()
    this.overlay?.dispose()
    this.sound.destroy()
  }
}
