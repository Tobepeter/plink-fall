import './rush-loading.css'

// 真实资源加载期间的机体装配
export function RushLoading() {
  return (
    <section className="rush-loading" role="status" aria-label="机体装配中，完成后自动进入战场">
      <div className="rush-loading-rig" aria-hidden="true">
        <svg className="rush-loading-ring" viewBox="0 0 180 180">
          <circle className="rush-loading-track" cx="90" cy="90" r="73" />
          <circle className="rush-loading-charge" cx="90" cy="90" r="65" />
          <path d="M69 15h42M69 165h42M15 69v42M165 69v42" />
        </svg>
        <svg className="rush-loading-body" viewBox="0 0 100 126">
          <g className="rush-loading-leg is-left">
            <path className="is-ivory" d="m28 83 14-1 1 27-9 7-14-6 5-9z" />
            <path className="is-mint" d="m24 104 12 2 2 9-10 5-14-5z" />
          </g>
          <g className="rush-loading-leg is-right">
            <path className="is-ivory" d="m58 84 13-2 5 26-10 9-11-5z" />
            <path className="is-mint" d="m59 106 11-2 8 10-11 7-13-4z" />
          </g>
          <g className="rush-loading-arm is-left">
            <path className="is-ivory" d="m27 50 7 19-10 14-14-9 4-22z" />
            <path className="is-mint" d="m14 63 14 2-1 12-11 2-7-7z" />
          </g>
          <g className="rush-loading-core">
            <path className="is-ivory" d="m31 48 36-1 11 22-9 23-37 1-12-22z" />
            <path className="is-mint" d="m37 58 27-1 4 13-9 8H42l-9-8z" />
            <path className="is-brass" d="M31 84h36v8H31z" />
            <path className="is-ink" d="M44 64h12v7H44z" />
          </g>
          <g className="rush-loading-arm is-right">
            <path className="is-ivory" d="m66 51 15-3 11 18-11 13-15-9z" />
            <path className="is-ink" d="M66 68h30v10H66z" />
            <path className="is-brass" d="M75 63h8v6h-8z" />
            <path className="is-mint" d="M89 66h9v5h-9z" />
          </g>
          <g className="rush-loading-head">
            <path className="is-ivory" d="m31 9 31-2 14 14v26L65 57 32 54 20 41V22z" />
            <path className="is-mint" d="m31 9 11-2 7 9 19 4 7 8-15-1-14-8-17-2z" />
            <path className="is-ink" d="m30 27 39 2v14l-12 5-29-6z" />
            <path className="is-mint" d="M41 31h24v4H41z" />
            <path className="is-brass" d="M23 29h8v13h-8z" />
          </g>
          <path className="rush-loading-ignition" d="m91 70 8-6-1 7 7 4-8 3 2 8-8-7-6-1z" />
        </svg>
        <span className="rush-loading-clamp is-left" />
        <span className="rush-loading-clamp is-right" />
      </div>
      <b>零点突围</b>
      <span className="rush-loading-caption">
        机体装配中 <i />
        <i />
        <i />
      </span>
    </section>
  )
}
