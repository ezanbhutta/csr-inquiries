import { SHIFTS } from '../lib/config.js'
import { Card, fmt } from './ui.jsx'

const SHIFT_TONE = { Morning: '#F59E0B', Evening: '#0EA5E9', Night: '#7229FF' }

function Member({ m, count, onSelect, former }) {
  return (
    <button
      type="button"
      onClick={() => count && onSelect?.(m.name)}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-hover ${former ? 'opacity-60' : ''}`}
      title={count ? 'Open this CSR’s handled inquiries' : 'No attributed inquiries yet'}
    >
      <span className="flex items-center gap-2">
        <span className="font-medium text-ink">{m.name}</span>
        {m.role === 'Manager' && (
          <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">Manager</span>
        )}
        {former && <span className="text-[10px] uppercase tracking-wide text-dim">former</span>}
      </span>
      <span className="shrink-0 text-xs text-muted">{count ? `${fmt(count)} inq` : '—'}</span>
    </button>
  )
}

// The team roster, taken verbatim from CSR Pulse, grouped by shift. Each name
// shows how many inquiries it has handled; click to open that CSR's log.
export default function RosterPage({ roster, counts, onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {SHIFTS.map((shift) => {
        const members = roster.filter((m) => m.shift === shift)
        const active = members.filter((m) => m.active)
        const former = members.filter((m) => !m.active)
        return (
          <Card
            key={shift}
            title={
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: SHIFT_TONE[shift] }} />
                {shift} shift
              </span>
            }
            subtitle={`${active.length} active`}
          >
            <div className="space-y-0.5">
              {active.map((m) => (
                <Member key={m.id} m={m} count={counts[m.name]} onSelect={onSelect} />
              ))}
              {former.length > 0 && (
                <>
                  <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-dim">Former</div>
                  {former.map((m) => (
                    <Member key={m.id} m={m} count={counts[m.name]} onSelect={onSelect} former />
                  ))}
                </>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
