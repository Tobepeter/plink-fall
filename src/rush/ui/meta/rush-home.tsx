import {
  ArrowRight,
  Bot,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Star,
  Wrench,
} from 'lucide-react'
import { frameDefinitions } from '../../model/data'
import { frameStats } from '../../model/frames'
import { difficultyDefinitions } from '../../model/campaign/difficulty'
import type { RushState } from '../../types'
import { WeaponGlyph } from '../weapon-glyph'
import { RushHangar } from './rush-hangar'

export type RushMenuPage = 'home' | 'frames' | 'upgrades' | 'difficulty' | 'stats' | 'settings'

const entries = [
  { page: 'frames', name: '机体', icon: Bot },
  { page: 'upgrades', name: '强化', icon: Wrench },
  { page: 'stats', name: '战绩', icon: ChartNoAxesColumnIncreasing },
] as const

// 首屏只展示本次出击，细节由玩家主动打开
export function RushHome(props: {
  state: RushState
  start: () => void
  open: (page: RushMenuPage) => void
}) {
  const { record } = props.state
  const frame = frameDefinitions.find((item) => item.id === record.selected)!
  const stats = frameStats[frame.id]
  const difficulty = difficultyDefinitions[record.difficulty]
  return (
    <div className="rush-home">
      <div className="rush-home-hero">
        <RushHangar frame={frame.id} />
        <h1>{frame.name}</h1>
        <span className="rush-home-skill">
          <WeaponGlyph id={stats.startingSkill} size={30} />
          {stats.skillName}
        </span>
      </div>
      <div className="rush-home-controls">
        <button
          className="rush-difficulty-chip"
          data-menu-entry="difficulty"
          onClick={() => props.open('difficulty')}
          aria-label={`调整难度，当前 ${record.difficulty} 星 ${difficulty.name}`}
        >
          <Star aria-hidden="true" />
          <span>{difficulty.name}</span>
          <b>{record.difficulty} 星</b>
          <ChevronRight aria-hidden="true" />
        </button>
        <button className="rush-start" onClick={props.start}>
          <b>开始突围</b>
          <ArrowRight aria-hidden="true" />
        </button>
        <nav className="rush-home-nav" aria-label="整备功能">
          {entries.map((entry) => (
            <button
              key={entry.page}
              data-menu-entry={entry.page}
              onClick={() => props.open(entry.page)}
              aria-label={`打开${entry.name}`}
            >
              <entry.icon aria-hidden="true" />
              <span>{entry.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
