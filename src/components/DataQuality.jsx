import { useState } from 'react'
import { REQUIRED_FIELDS } from '../lib/metrics.js'
import { Card, fmt } from './ui.jsx'

function FieldTile({ field, missing }) {
  const ok = missing === 0
  return (
    <div
      className="rounded-lg border p-3"
      style={
        ok
          ? { background: '#E7F8F1', borderColor: '#B6E8D4' }
          : { background: '#FDE9E9', borderColor: '#F6BCBC' }
      }
    >
      <div className="text-xs font-medium text-muted">{field}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${ok ? 'text-mint' : 'text-coral'}`}>
        {ok ? '✓ complete' : `${fmt(missing)} missing`}
      </div>
    </div>
  )
}

function Chip({ label }) {
  return (
    <span
      className="mr-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ background: '#FDE9E9', color: '#B42318' }}
    >
      {label}
    </span>
  )
}

const LIMIT = 25

export default function DataQuality({ dq }) {
  const [expanded, setExpanded] = useState(false)
  const { total, withIssues, counts, issues, noCsrColumnProfiles } = dq
  const allClean = withIssues === 0
  const shown = expanded ? issues : issues.slice(0, LIMIT)

  return (
    <Card
      title="Data quality"
      subtitle="Required on every inquiry: Date · Client Name · Order Status · Shift · CSR (across all dates & shifts)"
      right={
        <span
          className={`pill ${allClean ? 'border-mint/50 text-mint' : 'border-coral/50 text-coral'}`}
        >
          {allClean ? '✓ all clean' : `${fmt(withIssues)} need attention`}
        </span>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {REQUIRED_FIELDS.map((f) => (
          <FieldTile key={f} field={f} missing={counts[f]} />
        ))}
      </div>

      {noCsrColumnProfiles.length > 0 && (
        <p
          className="mb-3 rounded-lg border px-3 py-2 text-xs"
          style={{ background: '#FEF4DE', borderColor: '#F4D58A', color: '#92610A' }}
        >
          These tabs have no <b>CSR</b> column at all — add it so those inquiries can be attributed:{' '}
          <b>{noCsrColumnProfiles.join(', ')}</b>.
        </p>
      )}

      {allClean ? (
        <div className="rounded-lg border border-line bg-raised px-3 py-4 text-center text-sm text-mint">
          ✓ Every inquiry has all required fields. Nice.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="mb-2 text-xs text-dim">
            {fmt(withIssues)} of {fmt(total)} inquiries are missing at least one required field — worst first:
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Profile</th>
                <th className="th">Client</th>
                <th className="th">Date</th>
                <th className="th">Missing</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} className="hover:bg-hover">
                  <td className="td whitespace-nowrap text-muted">{r.profile}</td>
                  <td className="td font-medium text-ink">{r.client || <span className="text-coral">— none —</span>}</td>
                  <td className="td whitespace-nowrap text-muted">{r.date || <span className="text-coral">—</span>}</td>
                  <td className="td">{r.missing.map((m) => <Chip key={m} label={m} />)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length > LIMIT && (
            <button className="seg mt-2 text-brand" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less' : `Show all ${fmt(issues.length)} →`}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
