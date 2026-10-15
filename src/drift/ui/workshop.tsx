import type { ReactNode } from 'react'
import { useDrift, type GameProps } from './drift-app'
import { Icon } from './icons'
import { followerKinds, lanternKinds } from '../data/kinds'
import {
  boats,
  kindCosts,
  kindNotes,
  upgrades,
  type BoatId,
  type UpgradeId,
} from '../data/workshop'

const boatIcon: Record<BoatId, string> = { paper: 'paper', lotus: 'leaf', crane: 'crane' }
const upIcon: Record<UpgradeId, string> = {
  start: 'start',
  ripple: 'ripple',
  light: 'wick',
  flame: 'flamePlus',
}

// 灯坊：用愿解锁灯种、灯舟与修习
export function Workshop(props: GameProps) {
  const { game } = props
  const store = useDrift(game)
  const save = store.save
  const back = () => (game.store.result ? game.store.patch({ phase: 'result' }) : game.toTitle())
  return (
    <div className="pe absolute inset-0 flex flex-col bg-[#05080f]/80 backdrop-blur-sm">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button className="drift-btn h-9 w-9" aria-label="返回" onClick={back}>
          <Icon name="back" size={18} />
        </button>
        <div className="brush text-3xl tracking-[0.3em]">灯坊</div>
        <div className="flex-1" />
        <div className="drift-panel num flex items-center gap-1.5 rounded-full px-3 py-1">
          <Icon name="wish" size={16} className="text-[var(--amber)]" />
          {save.wishes}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <Section title="灯种" sub="入河后可遇见">
          {followerKinds.map((kind) => {
            const k = lanternKinds[kind]
            const owned = save.kinds.includes(kind)
            return (
              <Item
                key={kind}
                icon={<Icon name="lotus" size={26} style={{ color: k.petal }} />}
                name={k.name}
                note={kindNotes[kind]}
                state={owned ? 'owned' : 'buy'}
                cost={kindCosts[kind]}
                afford={save.wishes >= kindCosts[kind]}
                onClick={() => game.purchase(`kind:${kind}`)}
              />
            )
          })}
        </Section>
        <Section title="灯舟" sub="心灯所乘">
          {(Object.keys(boats) as BoatId[]).map((id) => {
            const b = boats[id]
            const owned = save.boats.includes(id)
            const state = save.boat === id ? 'active' : owned ? 'owned' : 'buy'
            return (
              <Item
                key={id}
                icon={<Icon name={boatIcon[id]} size={26} className="text-[var(--cream)]" />}
                name={b.name}
                note={b.desc}
                state={state}
                cost={b.cost}
                afford={save.wishes >= b.cost}
                onClick={() => game.purchase(`boat:${id}`)}
              />
            )
          })}
        </Section>
        <Section title="修习" sub="永久生效">
          {(Object.keys(upgrades) as UpgradeId[]).map((id) => {
            const u = upgrades[id]
            const lv = save.upgrades[id]
            const costs: readonly number[] = u.costs
            const maxed = lv >= costs.length
            return (
              <Item
                key={id}
                icon={<Icon name={upIcon[id]} size={26} className="text-[var(--amber)]" />}
                name={u.name}
                note={u.desc}
                state={maxed ? 'owned' : 'buy'}
                cost={costs[lv] ?? 0}
                afford={save.wishes >= (costs[lv] ?? 0)}
                onClick={() => game.purchase(`up:${id}`)}
              >
                <div className="mt-1 flex gap-1">
                  {costs.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-3 rounded-full ${i < lv ? 'bg-[var(--amber)]' : 'bg-white/15'}`}
                    />
                  ))}
                </div>
              </Item>
            )
          })}
        </Section>
        {/* 夜空 */}
        <div className="mt-6 flex flex-col items-center gap-1 text-[var(--muted)]">
          <Sky count={save.sky} />
          <div className="text-xs tracking-[0.3em]">夜空已有 {save.sky} 盏灯</div>
          <div className="text-[10px] tracking-widest opacity-70">离开时，它们替你攒下星光</div>
        </div>
      </div>
    </div>
  )
}

function Section(props: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline gap-2">
        <div className="brush text-2xl tracking-[0.3em]">{props.title}</div>
        <div className="text-[11px] tracking-widest text-[var(--muted)]">{props.sub}</div>
      </div>
      <div className="grid grid-cols-1 gap-2">{props.children}</div>
    </div>
  )
}

function Item(props: {
  icon: ReactNode
  name: string
  note: string
  state: 'owned' | 'active' | 'buy'
  cost: number
  afford: boolean
  onClick: () => void
  children?: ReactNode
}) {
  const { state } = props
  return (
    <div className="drift-panel flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5">
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="brush text-xl tracking-widest">{props.name}</div>
        <div className="truncate text-[11px] text-[var(--muted)]">{props.note}</div>
        {props.children}
      </div>
      {state === 'buy' && (
        <button
          className="drift-btn num h-9 min-w-16 gap-1 px-3 text-sm"
          disabled={!props.afford}
          onClick={props.onClick}
        >
          <Icon name="wish" size={14} className="text-[var(--amber)]" />
          {props.cost}
        </button>
      )}
      {state === 'owned' && (
        <button
          className="drift-btn h-9 min-w-16 px-3 text-xs tracking-widest text-[var(--muted)]"
          onClick={props.onClick}
        >
          <Icon name="check" size={14} />
        </button>
      )}
      {state === 'active' && (
        <div className="min-w-16 text-center text-xs tracking-widest text-[var(--amber)]">
          乘用中
        </div>
      )}
    </div>
  )
}

// 夜空缩影：每盏放飞的灯一颗暖点
function Sky(props: { count: number }) {
  const n = Math.min(240, props.count)
  const dots = Array.from({ length: n }, (_, i) => {
    const a = i * 2.399963
    const r = Math.sqrt(i / Math.max(1, n)) * 46
    return { x: 60 + Math.cos(a) * r * 1.9, y: 50 + Math.sin(a) * r, s: 0.6 + ((i * 37) % 10) / 12 }
  })
  return (
    <svg width="240" height="100" viewBox="0 0 240 100" className="opacity-90">
      <defs>
        <radialGradient id="drift-dot">
          <stop offset="0" stopColor="#ffd9a0" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x + 60} cy={d.y} r={d.s * 2.4} fill="url(#drift-dot)" />
      ))}
      {n === 0 && (
        <text
          x="120"
          y="55"
          textAnchor="middle"
          fontSize="11"
          fill="rgba(244,234,214,0.4)"
          letterSpacing="4"
        >
          尚无一盏
        </text>
      )}
    </svg>
  )
}
