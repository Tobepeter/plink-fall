import * as Dialog from '@radix-ui/react-dialog'
import { useRef } from 'react'
import {
  ArrowRight,
  Coins,
  FileText,
  Gem,
  Moon,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { regions } from '../model/data'
import type { ForgeState } from '../model/types'
import type { ForgeStore } from '../model/forge-store'
import { ModulesPanel, RecipesPanel, ResearchPanel } from './forge-panels'
import { amount } from './module-icon'

export type ForgeSheet = 'modules' | 'research' | 'recipes' | 'settings' | 'jump' | null

export interface ForgeSheetsProps {
  state: ForgeState
  store: ForgeStore
  sheet: ForgeSheet
  onClose: () => void
}

// 底部抽屉与离线收获
export function ForgeSheets(props: ForgeSheetsProps) {
  const trigger = useRef<HTMLButtonElement | null>(null)
  const offline = props.state.offline
  const current = offline ? 'offline' : props.sheet
  const titles = {
    modules: props.state.choices.length ? '给工坊一点新可能' : '我的产线模块',
    research: '让下一次更轻松',
    recipes: '收集一片月海',
    settings: '工坊小设置',
    jump: '去下一片月海',
    offline: '欢迎回到月背',
  }
  const eyebrows = {
    modules: 'BUILD YOUR WAY',
    research: 'PERMANENT RESEARCH',
    recipes: 'CRYSTAL COLLECTION',
    settings: 'TAKE YOUR TIME',
    jump: 'NEXT JOURNEY',
    offline: 'A LITTLE WELCOME GIFT',
  }
  const close = () => {
    if (offline) props.store.dismissOffline()
    else props.onClose()
  }
  const restoreFocus = (event: Event) => {
    event.preventDefault()
    const previous = trigger.current
    const target =
      previous?.isConnected && !previous.disabled
        ? previous
        : (document.querySelector<HTMLButtonElement>('.forge-main-action button:not(:disabled)') ??
          document.querySelector<HTMLButtonElement>('.forge-nav button:not(:disabled)') ??
          document.querySelector<HTMLButtonElement>('.forge-settings-button:not(:disabled)'))
    target?.focus({ preventScroll: true })
  }
  return (
    <Dialog.Root
      open={current !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="forge-sheet-overlay" />
        <Dialog.Content
          className="forge-sheet"
          aria-describedby="forge-sheet-description"
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLButtonElement)
              trigger.current = document.activeElement
          }}
          onCloseAutoFocus={restoreFocus}
        >
          <div className="forge-sheet-handle" />
          <div className="forge-sheet-heading">
            <div>
              <span className="forge-eyebrow">{current ? eyebrows[current] : ''}</span>
              <Dialog.Title>{current ? titles[current] : ''}</Dialog.Title>
            </div>
            <Dialog.Close className="forge-icon-button" aria-label="关闭面板">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description id="forge-sheet-description" className="forge-sr-only">
            点选操作，随时关闭回到工坊
          </Dialog.Description>
          <div className="forge-sheet-scroll">
            {current === 'modules' && <ModulesPanel {...props} onClose={close} />}
            {current === 'research' && <ResearchPanel {...props} onClose={close} />}
            {current === 'recipes' && <RecipesPanel {...props} onClose={close} />}
            {current === 'settings' && <SettingsPanel {...props} />}
            {current === 'jump' && <JumpPanel {...props} />}
            {current === 'offline' && offline && (
              <div className="forge-offline-panel">
                <span className="forge-offline-moon">
                  <Moon size={31} strokeWidth={1.5} />
                </span>
                <p>
                  离开了 {duration(offline.seconds)}，<br />
                  工坊为你攒好了一份小收获
                </p>
                <div className="forge-offline-rewards">
                  <span>
                    <Gem size={20} />
                    <b>+{amount(offline.stock)}</b>
                    <small>结晶</small>
                  </span>
                  <span>
                    <Coins size={20} />
                    <b>+{amount(offline.coins)}</b>
                    <small>晶币</small>
                  </span>
                </div>
                <p className="forge-offline-note">
                  按产线收益的 50% 结算，最多计算 4 小时
                  <br />
                  订单留给你回来亲自交付
                </p>
                <button className="forge-button forge-button-primary" onClick={close}>
                  <span>收下，继续开工</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SettingsPanel(props: ForgeSheetsProps) {
  const state = props.state
  const controls: {
    label: string
    description: string
    icon: ReactNode
    action: () => void
    pressed: boolean
    value: string
  }[] = [
    {
      label: '声音',
      description: '轻柔的机械声和结晶声',
      icon: state.muted ? <VolumeX size={20} /> : <Volume2 size={20} />,
      action: () => props.store.toggleSound(),
      pressed: !state.muted,
      value: state.muted ? '已关闭' : '已开启',
    },
  ]
  if (state.started)
    controls.push({
      label: state.paused ? '继续加工' : '暂停工坊',
      description: '主动暂停时，不累计离线收益',
      icon: state.paused ? <Play size={20} /> : <Pause size={20} />,
      action: () => props.store.setPaused(!state.paused),
      pressed: state.paused,
      value: state.paused ? '已暂停' : '运行中',
    })
  return (
    <div className="forge-panel-body">
      <div className="forge-settings-list">
        {controls.map((item) => (
          <button
            className="forge-setting-row"
            onClick={item.action}
            key={item.label}
            aria-pressed={item.pressed}
          >
            {item.icon}
            <span>
              <b>{item.label}</b>
              <small>{item.description}</small>
            </span>
            <em>{item.value}</em>
          </button>
        ))}
      </div>
      <div className="forge-howto">
        <span className="forge-eyebrow">A SMALL GUIDE</span>
        <h3>慢慢来，工坊会自己忙</h3>
        <ol>
          <li>
            <i>01</i>
            <span>矿石自动加工，装满一箱后点“交付订单”</span>
          </li>
          <li>
            <i>02</i>
            <span>从新模块里选一个，试出自己的产线搭配</span>
          </li>
          <li>
            <i>03</i>
            <span>用蓝图做永久研究，交付 4 箱后去下一片月海</span>
          </li>
        </ol>
      </div>
      <p className="forge-save-note">进度自动保存在当前浏览器，回来时继续这段旅程</p>
    </div>
  )
}

function JumpPanel(props: ForgeSheetsProps) {
  const next = regions[(props.state.region + 1) % regions.length]
  const canJump =
    !props.state.paused && props.state.deliveries >= 4 && props.state.choices.length === 0
  return (
    <div className="forge-panel-body forge-jump-panel">
      <span className="forge-jump-mark" style={{ background: next.color }}>
        <Moon size={38} strokeWidth={1.25} />
      </span>
      <span className="forge-eyebrow">
        JOURNEY / {String(props.state.region + 2).padStart(2, '0')}
      </span>
      <h3>{next.name}</h3>
      <p>{next.subtitle}</p>
      <div className="forge-jump-summary">
        <span>
          <FileText size={16} />
          研究、蓝图、晶币和收藏随你启程
        </span>
        <span>
          <Gem size={16} />
          当前库存与模块留在这一片月海
        </span>
      </div>
      {props.state.choices.length > 0 && (
        <p className="forge-panel-intro">先选好这次送来的模块，再开启下一段旅程</p>
      )}
      {props.state.paused && <p className="forge-panel-intro">工坊正在休息，继续加工后就能启程</p>}
      <button
        className="forge-button forge-button-primary"
        disabled={!canJump}
        onClick={() => {
          if (props.store.jump()) props.onClose()
        }}
      >
        <span>带着收获，启程</span>
        <ArrowRight size={18} />
      </button>
    </div>
  )
}

function duration(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.floor(seconds))} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`
  return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分钟`
}
