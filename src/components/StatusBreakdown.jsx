import { Card, fmt } from './ui.jsx'

const TONE = {
  Placed: '#22c55e',
  'Direct Order': '#16a34a',
  'Not Placed': '#64748b',
  'No status': '#475569',
  'No Response': '#475569',
  'Out of Scope': '#f59e0b',
  Cancelled: '#ef4444',
  'Spam/Scam': '#ef4444',
  Other: '#94a3b8',
}

export default function StatusBreakdown({ rows }) {
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <Card title="Outcome mix" subtitle="Order Status across all inquiries in range">
      <div className="space-y-2.5">
        {rows.map((r) => {
          const share = total > 0 ? (r.count / total) * 100 : 0
          return (
            <div key={r.status} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-white/70">{r.status}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, background: TONE[r.status] || '#94a3b8' }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums text-white/60">
                {fmt(r.count)} · {Math.round(share)}%
              </span>
            </div>
          )
        })}
        {total === 0 && <div className="text-sm text-white/40">No inquiries in this range.</div>}
      </div>
    </Card>
  )
}
