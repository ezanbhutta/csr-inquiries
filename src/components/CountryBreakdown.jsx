import { Card, RateBadge, fmt } from './ui.jsx'

export default function CountryBreakdown({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.inquiries))
  return (
    <Card title="By country" subtitle="Where the inquiries come from (top 12)">
      {rows.length === 0 ? (
        <div className="text-sm text-dim">No inquiries in this range.</div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.country}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate font-medium text-ink">{r.country}</span>
                <span className="ml-2 shrink-0 text-muted">
                  {fmt(r.inquiries)} · <RateBadge rate={r.conversionRate} />
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.round((r.inquiries / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
