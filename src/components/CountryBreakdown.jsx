import { Card, RateBadge, fmt } from './ui.jsx'

export default function CountryBreakdown({ rows, onSelect }) {
  const max = Math.max(1, ...rows.map((r) => r.inquiries))
  return (
    <Card title="By country" subtitle="June 2026 onward · top 12 · click a country to open its log">
      {rows.length === 0 ? (
        <div className="text-sm text-dim">No inquiries in this range.</div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
          {rows.map((r) => (
            <button
              key={r.country}
              type="button"
              onClick={() => onSelect?.(r.country)}
              className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-hover"
            >
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
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
