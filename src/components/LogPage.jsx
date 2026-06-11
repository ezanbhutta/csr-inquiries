import { Card, fmt, money } from './ui.jsx'

const Miss = () => <span className="font-semibold text-coral">missing</span>
const Dash = () => <span className="text-dim">—</span>

function Dots({ n }) {
  return (
    <span className="inline-flex gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <i key={i} className="h-2 w-2 rounded-full" style={{ background: i < n ? '#7229FF' : '#E1DCF0' }} />
      ))}
    </span>
  )
}

const StatusCell = ({ status }) => {
  if (!status) return <Miss />
  const won = status === 'Placed' || status === 'Direct Order'
  return <span className={won ? 'font-medium text-mint' : 'text-muted'}>{status}</span>
}

// Full inquiry log for one profile or shift — every field, with required fields
// (Date, Client, Order Status, Shift, CSR) flagged in red when missing.
export default function LogPage({ rows }) {
  const missingCount = rows.filter(
    (r) => !r.date || !r.client || !r.status || r.shift === 'Unassigned' || !r.csr,
  ).length

  return (
    <Card
      title={`${fmt(rows.length)} inquiries`}
      subtitle="Newest first · required fields (Date, Client, Status, Shift, CSR) show red when missing"
      right={
        missingCount > 0 ? (
          <span className="pill border-coral/40 text-coral">{fmt(missingCount)} with a gap</span>
        ) : (
          <span className="pill border-mint/50 text-mint">all complete</span>
        )
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="th">Date</th>
              <th className="th">Client</th>
              <th className="th">Country</th>
              <th className="th">Status</th>
              <th className="th">Shift</th>
              <th className="th">CSR</th>
              <th className="th text-right">Value</th>
              <th className="th">Upsell</th>
              <th className="th">Follow-ups</th>
              <th className="th">Last contact</th>
              <th className="th">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="align-top hover:bg-hover">
                <td className="td whitespace-nowrap">{r.date || <Miss />}</td>
                <td className="td font-medium text-ink">{r.client || <Miss />}</td>
                <td className="td whitespace-nowrap text-muted">{r.country || <Dash />}</td>
                <td className="td whitespace-nowrap"><StatusCell status={r.status} /></td>
                <td className="td whitespace-nowrap">{r.shift && r.shift !== 'Unassigned' ? <span className="text-muted">{r.shift}</span> : <Miss />}</td>
                <td className="td whitespace-nowrap">{r.csr || <Miss />}</td>
                <td className="td text-right tabular-nums text-muted">{r.value != null ? money(r.value) : <Dash />}</td>
                <td className="td">{r.upsell ? <span className="text-mint">Yes</span> : <Dash />}</td>
                <td className="td whitespace-nowrap"><Dots n={r.followups || 0} /></td>
                <td className="td whitespace-nowrap text-muted">{r.lastContact || <Dash />}</td>
                <td className="td min-w-[12rem] max-w-sm text-muted">{r.notes || <Dash />}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={11} className="td text-center text-dim">No inquiries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
