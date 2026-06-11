import { Card, RateBadge, fmt } from './ui.jsx'

// Shift accent colors mirror CSR Pulse.
const TONE = {
  Morning: '#F59E0B',
  Evening: '#0EA5E9',
  Night: '#7229FF',
  Unassigned: '#8B82A8',
}

export default function ShiftBreakdown({ rows, selected = [], onSelect }) {
  const total = rows.reduce((s, r) => s + r.inquiries, 0)
  return (
    <Card title="By shift" subtitle="Click a shift to open its full inquiry log">
      <div className="space-y-1.5">
        {rows.map((r) => {
          const share = total > 0 ? Math.round((r.inquiries / total) * 100) : 0
          const active = selected.includes(r.shift)
          return (
            <button
              key={r.shift}
              type="button"
              onClick={() => onSelect?.(r.shift)}
              className={`block w-full rounded-lg px-2 py-1.5 text-left transition ${active ? 'bg-brand/10 ring-1 ring-brand/30' : 'hover:bg-hover'}`}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[r.shift] }} />
                  {r.shift}
                </span>
                <span className="text-muted">
                  {fmt(r.inquiries)} inq · {fmt(r.converted)} won · <RateBadge rate={r.conversionRate} />
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-raised">
                <div className="h-full" style={{ width: `${share}%`, background: TONE[r.shift] }} title={`${share}% of inquiries`} />
              </div>
            </button>
          )
        })}
        {total === 0 && <div className="text-sm text-dim">No inquiries in this range.</div>}
      </div>
    </Card>
  )
}
