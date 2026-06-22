import { ROSTER, SHIFTS } from '../lib/config.js'

const SHIFT_TONE = { Morning: '#F59E0B', Evening: '#0EA5E9', Night: '#7229FF' }

function Pill({ children, color }) {
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${color}1a`, color }}>
      {children}
    </span>
  )
}

// Read-only roster, grouped by shift. The roster is shared for everyone (it
// lives in the app config, the same for every viewer) and drives the shift /
// off-shift attribution used across the dashboard.
export default function RosterPage() {
  const active = ROSTER.filter((c) => c.active)
  const archived = ROSTER.filter((c) => !c.active)

  return (
    <div className="space-y-6">
      {SHIFTS.map((shift) => {
        const people = active.filter((c) => c.shift === shift)
        if (!people.length) return null
        return (
          <div key={shift}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: SHIFT_TONE[shift] }} />
              <h3 className="text-sm font-bold text-ink">{shift}</h3>
              <span className="text-xs text-dim">· {people.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((c) => (
                <div key={c.id} className="card flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{c.name}</span>
                  <Pill color={c.role === 'Manager' ? '#F59E0B' : '#0EA5E9'}>{c.role}</Pill>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {archived.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-dim">Archived</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <div key={c.id} className="card flex items-center justify-between gap-2" style={{ opacity: 0.6 }}>
                <span className="font-medium text-ink">{c.name}</span>
                <Pill color={SHIFT_TONE[c.shift] || '#8B82A8'}>{c.shift}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
