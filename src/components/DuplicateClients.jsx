import { Card, fmt } from './ui.jsx'

// Informational — NOT an error. A buyer username on more than one inquiry is
// almost always the same buyer contacting several of our profiles (shopping
// around), which is useful to see but not a data mistake. Click a row to open
// that buyer's full history.
export default function DuplicateClients({ groups, onSelect }) {
  return (
    <Card
      title="Repeat buyers"
      subtitle="Same buyer on more than one inquiry — usually one buyer contacting several profiles. Informational, not an error."
      right={
        groups.length > 0 ? (
          <span className="pill border-brand/30 text-brand">{fmt(groups.length)} buyers</span>
        ) : (
          <span className="pill border-line text-muted">none</span>
        )
      }
    >
      {groups.length === 0 ? (
        <div className="rounded-lg border border-line bg-raised px-3 py-4 text-center text-sm text-muted">
          No repeat buyers in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Buyer</th>
                <th className="th text-right">Inquiries</th>
                <th className="th">Where</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.client} onClick={() => onSelect?.(g.client)} className="cursor-pointer hover:bg-hover">
                  <td className="td font-medium text-ink">{g.client}</td>
                  <td className="td text-right font-semibold tabular-nums text-brand">{g.count}×</td>
                  <td className="td text-xs text-muted">
                    {g.rows.map((r, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        {r.profile}
                        {r.date ? ` (${r.date})` : ''}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
