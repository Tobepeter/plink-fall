const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi']

export function fmt(n: number): string {
  if (!isFinite(n)) return '∞'
  const neg = n < 0
  n = Math.abs(n)
  let s: string
  if (n < 10) s = n.toFixed(n % 1 === 0 ? 0 : 1)
  else if (n < 1000) s = Math.floor(n).toString()
  else {
    const e = Math.floor(Math.log10(n) / 3)
    if (e < UNITS.length) {
      const v = n / 10 ** (e * 3)
      s = (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString()) + UNITS[e]
    } else s = n.toExponential(2).replace('+', '')
  }
  return neg ? '-' + s : s
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  if (m > 0) return `${m}分${Math.floor(sec % 60)}秒`
  return `${Math.floor(sec)}秒`
}
