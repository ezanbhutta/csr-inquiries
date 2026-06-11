import { Card, fmt } from './ui.jsx'

const TONE = {
  Placed: '#10B981',
  'Direct Order': '#0D9488',
  'Not Placed': '#8B82A8',
  'No status': '#C4BDD8',
  'No Response': '#C4BDD8',
  'Out of Scope': '#F59E0B',
  Cancelled: '#EF4444',
  'Spam/Scam': '#EF4444',
  Other: '#A99FC4',
}

export default function StatusBreakdown({ rows, onSelect }) {
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <Card title="Outcome mix" subtitle="Order Status · click a status to open its log">
      <div className="space-y-1">
        {rows.map((r) => {
          const share = total > 0 ? (r.count / total) * 100 : 0
          return (
            <button
              key={r.status}
              type="button"
              onClick={() => onSelect?.(r.status)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-hover"
            >
              <span className="w-28 shrink-0 text-left text-sm text-muted">{r.status}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, background: TONE[r.status] || '#A99FC4' }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted">
                {fmt(r.count)} · {Math.round(share)}%
              </span>
            </button>
          )
        })}
        {total === 0 && <div className="text-sm text-dim">No inquiries in this range.</div>}
      </div>
    </Card>
  )
}
