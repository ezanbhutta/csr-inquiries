import { Card, RateBadge, fmt } from './ui.jsx'

const TONE = {
  Morning: '#f59e0b',
  Evening: '#6366f1',
  Night: '#0ea5e9',
  Unassigned: '#64748b',
}

export default function ShiftBreakdown({ rows }) {
  const total = rows.reduce((s, r) => s + r.inquiries, 0)
  return (
    <Card title="By shift" subtitle="Which shift the inquiry came in on">
      <div className="space-y-4">
        {rows.map((r) => {
          const share = total > 0 ? Math.round((r.inquiries / total) * 100) : 0
          return (
            <div key={r.shift}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-white/85">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[r.shift] }} />
                  {r.shift}
                </span>
                <span className="text-white/50">
                  {fmt(r.inquiries)} inq · {fmt(r.converted)} won · <RateBadge rate={r.conversionRate} />
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full"
                  style={{ width: `${share}%`, background: TONE[r.shift] }}
                  title={`${share}% of inquiries`}
                />
              </div>
            </div>
          )
        })}
        {total === 0 && <div className="text-sm text-white/40">No inquiries in this range.</div>}
      </div>
    </Card>
  )
}
