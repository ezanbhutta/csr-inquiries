import { Card, fmt } from './ui.jsx'

// An inquiry should be once per Fiverr buyer, so a username on more than one
// inquiry is flagged. Click a row to see that client's full history.
export default function DuplicateClients({ groups, onSelect }) {
  return (
    <Card
      title="Duplicate clients"
      subtitle="Same buyer username on more than one inquiry — should be once per Fiverr"
      right={
        groups.length > 0 ? (
          <span className="pill border-coral/40 text-coral">{fmt(groups.length)} clients</span>
        ) : (
          <span className="pill border-mint/50 text-mint">none</span>
        )
      }
    >
      {groups.length === 0 ? (
        <div className="rounded-lg border border-line bg-raised px-3 py-4 text-center text-sm text-mint">
          ✓ No duplicate clients in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Client</th>
                <th className="th text-right">Times</th>
                <th className="th">Where</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.client} onClick={() => onSelect?.(g.client)} className="cursor-pointer hover:bg-hover">
                  <td className="td font-medium text-ink">{g.client}</td>
                  <td className="td text-right font-semibold tabular-nums text-coral">{g.count}×</td>
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
