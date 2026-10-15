import type { RushState } from '../../types'

// 九波战线与首领节点
export function RushWaveTrack(props: { state: RushState }) {
  const s = props.state
  const completed = s.phase === 'won' ? 9 : s.wave.index - 1 + Number(s.wave.phase === 'breather')
  return (
    <span
      className="rush-wave-track"
      role="progressbar"
      aria-label="九波战线"
      aria-valuemin={0}
      aria-valuemax={9}
      aria-valuenow={completed}
      aria-valuetext={`第 ${s.wave.index} 波，已完成 ${completed} 波`}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <i
          key={index}
          className={`${(index + 1) % 3 === 0 ? 'is-boss ' : ''}${index < completed ? 'is-cleared' : index + 1 === s.wave.index ? 'is-current' : ''}`}
        />
      ))}
    </span>
  )
}
