import { arena } from '../../model/arena'
import type { RushState, Vec } from '../../types'

// 有限竞技场位置与边界
export function RushRadar(props: { state: RushState }) {
  const { state } = props
  const project = (point: Vec) => ({
    x: 3 + ((point.x - arena.left) / arena.width) * 66,
    y: 3 + ((point.y - arena.top) / arena.height) * 48,
  })
  const player = project(state.player)
  const edge =
    Math.min(
      state.player.x - arena.left,
      arena.right - state.player.x,
      state.player.y - arena.top,
      arena.bottom - state.player.y,
    ) < 90
  return (
    <div
      className={`rush-radar${edge ? ' near-edge' : ''}`}
      aria-label={edge ? '接近竞技场边界' : '竞技场位置雷达'}
    >
      <svg viewBox="0 0 72 54" aria-hidden="true">
        <path className="rush-radar-bound" d="M7 3h58l4 4v40l-4 4H7l-4-4V7z" />
        <path className="rush-radar-grid" d="M3 27h66M36 3v48" />
        {state.enemies.slice(0, 48).map((enemy) => {
          const point = project(enemy)
          return (
            <circle
              key={enemy.id}
              cx={point.x}
              cy={point.y}
              r={enemy.kind === 'boss' ? 2.8 : 1.1}
              className={enemy.kind === 'boss' ? 'is-boss' : 'is-foe'}
            />
          )
        })}
        <circle className="is-player" cx={player.x} cy={player.y} r="2.3" />
      </svg>
      <small>{edge ? '边界' : '竞技场'}</small>
    </div>
  )
}
