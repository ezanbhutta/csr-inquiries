import { Card, RateBadge, fmt } from './ui.jsx'

export default function CsrLeaderboard({ data }) {
  const { leaderboard, logged, total } = data
  const coverage = total > 0 ? Math.round((logged / total) * 100) : 0
  const lowCoverage = coverage < 50

  return (
    <Card
      title="By CSR — who wrote the query"
      subtitle="Only counts inquiries where a CSR name is recorded"
      right={
        <span
          className={`pill ${lowCoverage ? 'border-amber/50 text-amber' : 'border-mint/50 text-mint'}`}
          title="Share of inquiries that have a recognized CSR logged"
        >
          {coverage}% logged
        </span>
      }
    >
      {lowCoverage && (
        <p
          className="mb-3 rounded-lg border px-3 py-2 text-xs"
          style={{ background: '#FEF4DE', borderColor: '#F4D58A', color: '#92610A' }}
        >
          Heads up: a CSR name is recorded on only {coverage}% of inquiries ({fmt(logged)} of {fmt(total)}).
          Per-CSR numbers reflect just those rows. Add a <b>CSR</b> column to every profile tab to make this complete.
        </p>
      )}
      {leaderboard.length === 0 ? (
        <div className="text-sm text-dim">No CSR-attributed inquiries in this range.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">CSR</th>
                <th className="th text-right">Inquiries</th>
                <th className="th text-right">Converted</th>
                <th className="th text-right">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((r, i) => (
                <tr key={r.csr} className="hover:bg-hover">
                  <td className="td">
                    <span className="mr-2 text-dim">{i + 1}</span>
                    <span className="font-medium text-ink">{r.csr}</span>
                  </td>
                  <td className="td text-right tabular-nums text-ink">{fmt(r.inquiries)}</td>
                  <td className="td text-right tabular-nums text-mint">{fmt(r.converted)}</td>
                  <td className="td text-right"><RateBadge rate={r.conversionRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
