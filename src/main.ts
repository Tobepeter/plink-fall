import './style.css'
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>plink-fall</h1>
  <p>Hello World · Vite + TypeScript + Pixi</p>
  <p style="opacity:.6">build ${new Date().toISOString()}</p>
`
