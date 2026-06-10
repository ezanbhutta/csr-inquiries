// Small shared presentational primitives (HaseebMadeIt light theme).
import logoUrl from '../assets/haseebmadeit-logo.svg'

export function Logo({ size = 40 }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="HaseebMadeIt"
      style={{ borderRadius: size * 0.18, display: 'block' }}
    />
  )
}

export function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-dim">{subtitle}</p>}
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
    default: 'text-ink',
    win: 'text-mint',
    warn: 'text-amber',
    accent: 'text-brand',
  }[tone]
  return (
    <div className="card transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-dim">{label}</div>
      <div className={`disp mt-2 text-3xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

// Thin inline bar for table rows.
export function MiniBar({ value, max, tone = 'accent' }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  const bg = { accent: 'bg-brand', win: 'bg-mint', warn: 'bg-amber' }[tone] || 'bg-brand'
  return (
    <div className="h-1.5 w-full rounded-full bg-raised">
      <div className={`h-1.5 rounded-full ${bg}`} style={{ width: `${w}%` }} />
    </div>
  )
}

export function RateBadge({ rate }) {
  const tone = rate >= 35 ? 'text-mint' : rate >= 20 ? 'text-amber' : 'text-dim'
  return <span className={`font-semibold tabular-nums ${tone}`}>{rate}%</span>
}

export const fmt = (n) => (n == null ? '—' : n.toLocaleString('en-US'))
export const money = (n) => (n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'))
