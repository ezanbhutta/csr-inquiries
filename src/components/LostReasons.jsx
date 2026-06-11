import { Card, fmt } from './ui.jsx'

const TONE = {
  'No response': '#8B82A8',
  'Chose another seller': '#0EA5E9',
  Budget: '#F59E0B',
  'Scam / Spam': '#EF4444',
  'Custom offer': '#7229FF',
  Meeting: '#10B981',
  'Following up': '#9F66FF',
  Other: '#A99FC4',
  'No note': '#C4BDD8',
}

// Why "Not Placed" leads didn't convert, inferred from the Notes text.
export default function LostReasons({ data }) {
  const { total, reasons } = data
  return (
    <Card title="Why leads don't convert" subtitle={`Inferred from Notes on ${fmt(total)} Not-Placed leads · June 2026 onward`}>
      <div className="space-y-2.5">
        {reasons.map((r) => {
          const share = total > 0 ? (r.count / total) * 100 : 0
          return (
            <div key={r.reason} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-muted">{r.reason}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full" style={{ width: `${share}%`, background: TONE[r.reason] || '#A99FC4' }} />
              </div>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted">
                {fmt(r.count)} · {Math.round(share)}%
              </span>
            </div>
          )
        })}
        {total === 0 && <div className="text-sm text-dim">No Not-Placed leads in this range.</div>}
      </div>
    </Card>
  )
}
