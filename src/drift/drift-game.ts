import { Application } from 'pixi.js'
import { Run } from './model/run'
import { buy } from './model/rewards'
import type { DriftEvent } from './model/types'
import { Art } from './render/art/art'
import { DriftScene } from './render/scene'
import { DriftSound } from './audio/sound'
import { DriftStore } from './meta/store'
import { purchase, runConfig, starlight, writeSave, type ShopKey } from './meta/save'
import { regions, forkRewards } from './data/regions'
import type { BlessingId } from './data/blessings'

// 流灯运行时：Pixi、固定步长、阶段切换、输入、声音、存档
export class DriftGame {
  readonly store = new DriftStore()
  readonly sound = new DriftSound()
  run: Run
  scene: DriftScene | null = null
  private app = new Application()
  private art = new Art()
  private observer: ResizeObserver | null = null
  private raf = 0
  private last = 0
  private acc = 0
  private time = 0
  private endTimer = 0
  private hudTimer = 0
  private disposed = false

  constructor() {
    this.run = this.demo()
  }

  async init(stage: HTMLElement) {
    await this.app.init({
      width: Math.max(1, stage.clientWidth),
      height: Math.max(1, stage.clientHeight),
      resolution: Math.min(devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: false,
      background: '#04070d',
      preference: 'webgl',
      powerPreference: 'high-performance',
      autoStart: false,
    })
    if (this.disposed) return this.app.destroy(true)
    stage.appendChild(this.app.canvas)
    this.app.canvas.setAttribute('role', 'application')
    this.app.canvas.setAttribute('aria-label', '流灯：轻点水面激起涟漪，推动河灯避开礁石与暗影')
    this.art.init()
    this.rebuild()
    const resize = () => {
      const w = Math.max(1, stage.clientWidth),
        h = Math.max(1, stage.clientHeight)
      this.app.renderer.resolution = Math.min(devicePixelRatio || 1, 2)
      this.app.renderer.resize(w, h)
      this.scene?.resize(w, h)
    }
    this.observer = new ResizeObserver(resize)
    this.observer.observe(stage)
    resize()
    const save = this.store.save
    const gift = starlight(save)
    if (gift > 0) save.wishes += gift
    writeSave(save)
    this.sound.muted = save.muted
    this.store.patch({ gift })
    this.app.canvas.addEventListener('pointerdown', this.onPointer)
    window.addEventListener('pointerdown', this.unlock, { passive: true })
    document.addEventListener('visibilitychange', this.onVisible)
    window.addEventListener('pagehide', this.persist)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private demo() {
    const seed = Math.floor(Math.random() * 1e6)
    return new Run({
      seed,
      pool: ['warm', 'jade', 'gold'],
      start: ['warm', 'jade', 'rose', 'warm', 'gold', 'violet'],
      loop: 0,
      demo: true,
    })
  }

  private rebuild() {
    this.scene?.destroy()
    this.scene = new DriftScene(this.art, this.run)
    this.app.stage.addChild(this.scene.view)
    const { width, height } = this.app.screen
    this.scene.resize(width, height)
  }

  // 阶段动作
  start() {
    this.sound.unlock()
    this.run = new Run(runConfig(this.store.save, Math.floor(Math.random() * 1e6)))
    this.rebuild()
    this.sound.setRegion(0)
    this.store.patch({
      phase: 'play',
      paused: false,
      offer: null,
      shop: null,
      result: null,
      hint: !this.store.save.hinted,
    })
    this.store.showBanner(regions[0].name, '轻点水面，推灯前行')
  }

  toTitle() {
    this.run = this.demo()
    this.rebuild()
    this.sound.boss = false
    this.store.patch({ phase: 'title', paused: false, offer: null, shop: null })
  }

  openWorkshop() {
    this.store.patch({ phase: 'workshop' })
  }

  pick(id: BlessingId) {
    this.run.pickBlessing(id)
    this.drain()
    this.store.patch({ offer: this.run.offer })
  }

  buy(index: number) {
    const item = this.run.shop?.[index]
    if (!item || !buy(this.run, item)) return false
    this.drain()
    this.syncHud()
    this.store.patch({ shop: [...this.run.shop!] })
    return true
  }

  closeShop() {
    this.run.shop = null
    this.store.patch({ shop: null })
  }

  pause(on: boolean) {
    if (this.store.phase !== 'play') return
    this.store.patch({ paused: on })
  }

  retire() {
    if (this.store.phase !== 'play') return
    this.store.patch({ paused: false })
    this.run.retire()
  }

  purchase(key: ShopKey) {
    const ok = purchase(this.store.save, key)
    this.store.emit()
    return ok
  }

  setMuted(on: boolean) {
    this.store.save.muted = on
    writeSave(this.store.save)
    this.sound.setMuted(on)
    this.store.emit()
  }

  private unlock = () => this.sound.unlock()

  private persist = () => writeSave(this.store.save)

  private onPointer = (e: PointerEvent) => {
    const { store, scene } = this
    if (!scene || store.paused || store.offer || store.shop) return
    if (store.phase !== 'play' && store.phase !== 'title' && store.phase !== 'workshop') return
    const rect = this.app.canvas.getBoundingClientRect()
    const p = scene.toWorld(e.clientX - rect.left, e.clientY - rect.top)
    if (this.run.tap(p.x, p.y) && store.hint) {
      store.save.hinted = true
      store.patch({ hint: false })
    }
  }

  private onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      this.sound.suspend()
      writeSave(this.store.save)
      if (this.store.phase === 'play') this.store.patch({ paused: true })
      return
    }
    this.sound.resume()
    if (this.raf || this.disposed) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.disposed || !this.scene) return
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const { store } = this
    const scale = store.paused ? 0 : store.offer || store.shop ? 0.12 : 1
    this.acc += dt * scale
    let steps = 0
    while (this.acc >= 1 / 60 && steps++ < 6) {
      this.acc -= 1 / 60
      this.step(1 / 60)
    }
    if (steps >= 6) this.acc = 0
    if (store.phase === 'ending') {
      this.endTimer -= dt
      if (this.endTimer <= 0) this.result()
    }
    this.hudTimer -= dt
    if (this.hudTimer <= 0 && store.phase === 'play') {
      this.hudTimer = 0.1
      this.syncHud()
    }
    this.sound.update(Math.min(1, this.run.shadows.length / 6))
    this.scene.render(this.time, dt * scale)
    this.app.render()
  }

  private step(dt: number) {
    const scene = this.scene!
    this.time += dt
    scene.follow(dt)
    this.run.waves.scroll(scene.cam.y - scene.viewHeight / 2 - 120)
    this.run.step(dt)
    this.run.waves.step()
    this.run.waves.step()
    this.drain()
  }

  private drain() {
    const events = this.run.events
    if (!events.length) return
    this.scene?.handle(events)
    for (const e of events) {
      this.sound.event(e, this.run.train.length)
      this.react(e)
    }
    events.length = 0
  }

  private react(e: DriftEvent) {
    const { store, run } = this
    if (run.config.demo) return
    // 安卓触感：心火受损重震，落灯轻震
    if (e.type === 'hurt') navigator.vibrate?.(40)
    if (e.type === 'lose') navigator.vibrate?.(12)
    if (e.type === 'offer') store.patch({ offer: run.offer })
    if (e.type === 'shop') store.patch({ shop: run.shop ? [...run.shop] : null })
    if (e.type === 'region') store.showBanner(regions[e.region].name)
    if (e.type === 'boss') store.showBanner(e.name, '预兆时点中它')
    if (e.type === 'choose') store.showToast(forkRewards[e.reward].desc)
    if (e.type === 'segment' && e.kind === 'fork') store.showToast('前有分流 · 点水择道')
    if (e.type === 'finale') store.showBanner('星河', '灯将归天')
    if (e.type === 'over' || e.type === 'win') {
      store.patch({ phase: 'ending', offer: null, shop: null })
      this.endTimer = e.type === 'win' ? 4.2 : 3.4
      this.scene?.release()
    }
  }

  private result() {
    const { run, store } = this
    const save = store.save
    const lanterns = run.train.filter((f) => f.lit).length
    const wishes =
      lanterns + run.tally.reaches * 2 + run.tally.bosses * 12 + run.level + (run.won ? 30 : 0)
    save.wishes += wishes
    save.sky += lanterns
    save.runs++
    if (run.won) save.wins++
    save.best = Math.max(save.best, run.seg.region)
    writeSave(save)
    store.patch({
      phase: 'result',
      result: {
        won: run.won,
        region: run.seg.region,
        lanterns,
        kills: run.tally.kills,
        level: run.level,
        reaches: run.tally.reaches,
        bosses: run.tally.bosses,
        wishes,
      },
    })
  }

  private syncHud() {
    const { run, store } = this
    const seg = run.seg
    const inRegion = run.route.segments.filter((s) => s.region === seg.region && s.kind !== 'gate')
    const forks = inRegion.filter((s) => s.kind === 'fork').map((s) => s.chosen ?? null)
    store.hud = {
      flame: run.flame,
      maxFlame: run.stats.maxFlame,
      glow: run.glow,
      need: run.levelNeed,
      level: run.level,
      petals: Math.floor(run.petalCount),
      train: run.train.length - 1,
      maxTrain: run.stats.maxTrain,
      region: seg.region,
      step: Math.max(0, inRegion.indexOf(seg)),
      forks: [forks[0] ?? null, forks[1] ?? null],
      boss:
        run.boss && run.boss.mode !== 'die'
          ? { name: run.boss.name, hp: Math.max(0, run.boss.hp / run.boss.max) }
          : null,
      shield: run.shield,
    }
    store.emit()
  }

  destroy() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.observer?.disconnect()
    document.removeEventListener('visibilitychange', this.onVisible)
    window.removeEventListener('pointerdown', this.unlock)
    window.removeEventListener('pagehide', this.persist)
    this.app.canvas?.removeEventListener('pointerdown', this.onPointer)
    writeSave(this.store.save)
    this.scene?.destroy()
    this.art.destroy()
    this.sound.destroy()
    if (this.app.renderer) this.app.destroy(true)
  }
}
