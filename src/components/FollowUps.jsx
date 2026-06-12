import { useMemo, useState } from 'react'
import { Card, Stat, fmt } from './ui.jsx'

// 3 sequential follow-up slots, filled = done.
function Dots({ n }) {
  return (
    <span className="inline-flex gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <i key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < n ? '#7229FF' : '#E1DCF0' }} />
      ))}
    </span>
  )
}

// Closed leads read by their disposition (the client's call / a dead lead),
// not a flat "Closed" — so the outcome isn't pinned on the CSR.
const CLOSE_TONE = {
  'Client rejected': '#F59E0B',
  'Chose another seller': '#0EA5E9',
  Spam: '#EF4444',
  'No response': '#8B82A8',
}

function StatusBadge({ lead }) {
  if (!lead.closed) {
    return <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">Active</span>
  }
  const tone = CLOSE_TONE[lead.closeReason] || '#8B82A8'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: tone, background: `${tone}1A` }}
    >
      {lead.closeReason || 'Closed'}
    </span>
  )
}

const PAGE = 40
const MAX = 300

export default function FollowUps({ stats }) {
  const { leads, funnel, byProfile, closedReasons, openTotal, activeCount, closedCount, zeroOpenCount, zeroOpenPct } = stats
  const [touch, setTouch] = useState(null) // null | 0 | 1 | 2 | 3
  const [profileF, setProfileF] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all') // all | active | closed
  const [sort, setSort] = useState({ key: 'followups', dir: 1 })
  const [expanded, setExpanded] = useState(false)

  const filtered = useMemo(() => {
    let rows = leads
    if (touch != null) rows = rows.filter((r) => r.followups === touch)
    if (profileF) rows = rows.filter((r) => r.profile === profileF)
    if (status !== 'all') rows = rows.filter((r) => (status === 'closed' ? r.closed : !r.closed))
    const term = q.trim().toLowerCase()
    if (term) rows = rows.filter((r) => r.client.toLowerCase().includes(term))
    const dir = sort.dir
    return [...rows].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'string') return dir * String(av).localeCompare(String(bv))
      return dir * ((av ?? -1) - (bv ?? -1))
    })
  }, [leads, touch, profileF, status, q, sort])

  const shown = filtered.slice(0, expanded ? MAX : PAGE)
  const maxCount = Math.max(1, ...funnel.map((f) => f.count))
  const maxOpen = Math.max(1, ...byProfile.map((p) => p.open))
  const totalZero = Math.max(1, byProfile.reduce((s, p) => s + p.zero, 0))
  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'client' || key === 'profile' ? 1 : -1 }))
  const arrow = (key) => (sort.key === key ? (sort.dir < 0 ? ' ↓' : ' ↑') : '')

  return (
    <div className="space-y-4">
      <p
        className="rounded-xl border px-4 py-3 text-sm"
        style={{ background: '#F1EBFF', borderColor: '#D9C9FF', color: '#5E1FD8' }}
      >
        📈 Persistence closes deals — yet ~44% of reps give up after the first follow-up. Your standard is{' '}
        <b>3 touches</b> before a lead is closed. Of your <b>{fmt(openTotal)}</b> open leads, <b>{fmt(activeCount)}</b> still
        need a follow-up and <b>{fmt(zeroOpenPct)}%</b> have had none. The <b>{fmt(closedCount)}</b> closed leads ended on the
        client's side — rejected, went with another seller, spam, or no reply after 3 follow-ups — not a missed touch.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Need follow-up" tone="accent" value={fmt(activeCount)} sub="active leads, under 3 touches" />
        <Stat label="Zero follow-ups" tone="warn" value={fmt(zeroOpenCount)} sub={`${zeroOpenPct}% of open leads`} />
        <Stat label="Closed" value={fmt(closedCount)} sub="client's call — see breakdown" />
      </div>

      {/* Funnel + coverage */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Open leads by # of follow-ups" subtitle="Live pipeline — click a row to filter · 3 done = closed · note-closed leads excluded">
          <div className="space-y-2">
            {funnel.map((f) => {
              const active = touch === f.touches
              return (
                <button
                  key={f.touches}
                  type="button"
                  onClick={() => setTouch(active ? null : f.touches)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition ${active ? 'bg-brand/10 ring-1 ring-brand/40' : 'hover:bg-hover'}`}
                >
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <Dots n={f.touches} /> {f.touches} follow-up{f.touches === 1 ? '' : 's'}
                      {f.touches === 3 && <span className="text-xs font-normal text-dim">(closed)</span>}
                    </span>
                    <span className="text-muted">{fmt(f.count)} · {f.share}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((f.count / maxCount) * 100)}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Coverage by profile" subtitle="Open leads per profile · the % is each profile's share of all zero-follow-up leads (adds to 100%)">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Profile</th>
                  <th className="th text-right">Open</th>
                  <th className="th text-right">0 follow-ups</th>
                  <th className="th text-right">Closed</th>
                </tr>
              </thead>
              <tbody>
                {byProfile.map((p) => (
                  <tr
                    key={p.profile}
                    onClick={() => setProfileF(profileF === p.profile ? null : p.profile)}
                    className={`cursor-pointer ${profileF === p.profile ? 'bg-brand/10' : 'hover:bg-hover'}`}
                  >
                    <td className="td">
                      <div className="font-medium text-ink">{p.profile}</div>
                      <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-raised">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((p.open / maxOpen) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="td text-right tabular-nums text-ink">{fmt(p.open)}</td>
                    <td className="td text-right tabular-nums text-muted">
                      {fmt(p.zero)} · {Math.round((p.zero / totalZero) * 100)}%
                    </td>
                    <td className="td text-right tabular-nums text-dim">{fmt(p.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Why leads closed — every closure framed as the client's call, not a missed touch */}
      {closedReasons.length > 0 && (
        <Card
          title="Why leads closed"
          subtitle="The outcome was on the client's side — a rejection, a competitor or spam — or no reply after 3 follow-ups"
          right={<span className="pill">{fmt(closedCount)} closed</span>}
        >
          <div className="space-y-2.5">
            {closedReasons.map((r) => (
              <button
                key={r.reason}
                type="button"
                onClick={() => {
                  setStatus('closed')
                  setQ('')
                  setTouch(null)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-hover"
              >
                <span className="w-40 shrink-0 text-sm text-muted">{r.reason}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full" style={{ width: `${r.share}%`, background: CLOSE_TONE[r.reason] || '#A99FC4' }} />
                </div>
                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted">
                  {fmt(r.count)} · {r.share}%
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Interactive leads table */}
      <Card
        title="Leads"
        subtitle="Every open lead — search, filter and sort to work the queue"
        right={<span className="pill">{fmt(filtered.length)} shown</span>}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search client…"
            className="rounded-lg border border-line bg-raised px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
          />
          <div className="flex items-center gap-1 rounded-lg border border-line bg-raised p-1">
            {[null, 0, 1, 2, 3].map((t) => (
              <button
                key={String(t)}
                onClick={() => setTouch(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${touch === t ? 'bg-brand text-white' : 'text-dim hover:text-ink'}`}
              >
                {t == null ? 'All' : `${t} FU`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-raised p-1">
            {['all', 'active', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${status === s ? 'bg-brand text-white' : 'text-dim hover:text-ink'}`}
              >
                {s}
              </button>
            ))}
          </div>
          {profileF && (
            <button onClick={() => setProfileF(null)} className="pill border-brand/40 text-brand">
              {profileF} ✕
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th cursor-pointer" onClick={() => toggleSort('client')}>Client{arrow('client')}</th>
                <th className="th cursor-pointer" onClick={() => toggleSort('profile')}>Profile{arrow('profile')}</th>
                <th className="th">Shift</th>
                <th className="th cursor-pointer" onClick={() => toggleSort('followups')}>Follow-ups{arrow('followups')}</th>
                <th className="th">Status</th>
                <th className="th">Next</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} className="hover:bg-hover">
                  <td className="td font-medium text-ink">{r.client}</td>
                  <td className="td whitespace-nowrap text-muted">{r.profile}</td>
                  <td className="td whitespace-nowrap text-muted">{r.shift}</td>
                  <td className="td"><Dots n={r.followups} /></td>
                  <td className="td"><StatusBadge lead={r} /></td>
                  <td className="td whitespace-nowrap">
                    {r.closed ? <span className="text-dim">—</span> : <span className="text-brand">Follow-up #{r.followups + 1}</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="td text-center text-dim">No leads match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE && (
          <button className="seg mt-2 text-brand" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `Show more (of ${fmt(filtered.length)})`}
          </button>
        )}
        {expanded && filtered.length > MAX && (
          <p className="mt-1 text-xs text-dim">Showing first {MAX} — refine the filters to narrow down.</p>
        )}
      </Card>
    </div>
  )
}
