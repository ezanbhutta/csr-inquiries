import { useState } from 'react'
import { Card, fmt } from './ui.jsx'

const SHIFT_TONE = { Morning: '#F59E0B', Evening: '#0EA5E9', Night: '#7229FF', Unassigned: '#8B82A8' }

// Who WROTE the inquiries. CSR = whoever logged the row (not who converted it).
// Ranked by how many each wrote; click a CSR to see the shifts those inquiries
// came in on, so cross-shift logging (a Night CSR writing Morning rows) shows.
export default function WhoWrote({ data, onOpen }) {
  const { writers } = data
  const [open, setOpen] = useState(null)
  const max = Math.max(1, ...writers.map((w) => w.total))

  return (
    <Card
      title="Who logged the inquiries"
      subtitle="CSR = who wrote it, not who converted · click a name for the shifts they logged"
    >
      {writers.length === 0 ? (
        <div className="text-sm text-dim">No CSR names in this range.</div>
      ) : (
        <div className="max-h-[22rem] space-y-1 overflow-y-auto pr-1">
          {writers.map((w) => {
            const isOpen = open === w.csr
            return (
              <div key={w.csr}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : w.csr)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition ${isOpen ? 'bg-brand/10' : 'hover:bg-hover'}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
                      <span className={`shrink-0 text-dim transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                      <span className="truncate">{w.csr}</span>
                      {w.homeShift && (
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ color: SHIFT_TONE[w.homeShift], background: `${SHIFT_TONE[w.homeShift]}1A` }}
                        >
                          {w.homeShift}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {fmt(w.total)}
                      {w.offHome > 0 && <span className="ml-1 text-amber">· {fmt(w.offHome)} off-shift</span>}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((w.total / max) * 100)}%` }} />
                  </div>
                </button>

                {isOpen && (
                  <div className="mb-1 mt-1 space-y-1.5 rounded-lg bg-raised px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-wide text-dim">
                      Written by the shift the query came in on
                    </div>
                    {w.byShift.map((s) => (
                      <div key={s.shift} className="flex items-center gap-2 text-sm">
                        <span className="flex w-24 shrink-0 items-center gap-1.5 text-muted">
                          <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: SHIFT_TONE[s.shift] }} />
                          {s.shift}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-card">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round((s.count / w.total) * 100)}%`, background: SHIFT_TONE[s.shift] }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right tabular-nums text-muted">
                          {fmt(s.count)}
                          {s.offHome && <span className="ml-1 text-amber" title="Not this CSR's own shift">⚠</span>}
                        </span>
                      </div>
                    ))}
                    {w.homeShift && (
                      <div className="pt-0.5 text-[11px] text-dim">
                        Own shift: <span className="font-medium" style={{ color: SHIFT_TONE[w.homeShift] }}>{w.homeShift}</span>
                        {w.offHome > 0 ? ` · ${fmt(w.offHome)} written for other shifts` : ' · all on own shift'}
                      </div>
                    )}
                    {onOpen && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpen(w.csr) }}
                        className="seg mt-1 text-brand"
                      >
                        Open {w.csr}'s full log →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
