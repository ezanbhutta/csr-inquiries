// Small shared presentational primitives.

export function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-white/80">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'default' }) {
  const toneClass = {
    default: 'text-white',
    win: 'text-win',
    warn: 'text-warn',
    accent: 'text-accent-soft',
  }[tone]
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/45">{sub}</div>}
    </div>
  )
}

// Thin inline bar for table rows.
export function MiniBar({ value, max, tone = 'accent' }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  const bg = { accent: 'bg-accent', win: 'bg-win', warn: 'bg-warn' }[tone] || 'bg-accent'
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div className={`h-1.5 rounded-full ${bg}`} style={{ width: `${w}%` }} />
    </div>
  )
}

export function RateBadge({ rate }) {
  const tone = rate >= 35 ? 'text-win' : rate >= 20 ? 'text-warn' : 'text-white/60'
  return <span className={`font-semibold tabular-nums ${tone}`}>{rate}%</span>
}

export const fmt = (n) => (n == null ? '—' : n.toLocaleString('en-US'))
export const money = (n) => (n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'))
