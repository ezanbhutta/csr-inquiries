import { useState } from 'react'
import { SHIFTS } from '../lib/config.js'

const SHIFT_TONE = { Morning: '#F59E0B', Evening: '#0EA5E9', Night: '#7229FF' }

const ArchiveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
  </svg>
)
const RestoreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M9 13l3-3 3 3M12 10v6" />
  </svg>
)

function Pill({ children, color }) {
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${color}1a`, color }}>
      {children}
    </span>
  )
}

function EditableName({ name, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(name)
  if (editing) {
    const commit = () => {
      setEditing(false)
      if (val.trim() && val.trim() !== name) onSave(val.trim())
      else setVal(name)
    }
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setVal(name)
            setEditing(false)
          }
        }}
        className="w-40 rounded border border-brand/50 bg-raised px-1.5 py-0.5 text-sm font-medium text-ink outline-none"
      />
    )
  }
  return (
    <button onClick={() => { setVal(name); setEditing(true) }} className="font-medium text-ink hover:text-brand" title="Click to edit name">
      {name}
    </button>
  )
}

export default function RosterPage({ roster, shiftHistory, onChangeShift, onToggleArchive, onEditName, onAddPerson }) {
  const [adding, setAdding] = useState(false)
  const [np, setNp] = useState({ name: '', shift: 'Morning', role: 'CSR' })
  const submitAdd = (e) => {
    e.preventDefault()
    if (!np.name.trim()) return
    onAddPerson(np)
    setNp({ name: '', shift: 'Morning', role: 'CSR' })
    setAdding(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Shift changes apply going forward · archived members keep their history</p>
        <button className="btn btn-accent" onClick={() => setAdding((v) => !v)}>＋ Add person</button>
      </div>

      {adding && (
        <form onSubmit={submitAdd} className="card mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-dim">
            Name
            <input
              autoFocus
              value={np.name}
              onChange={(e) => setNp({ ...np, name: e.target.value })}
              placeholder="Full name"
              className="w-52 rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-dim">
            Shift
            <select value={np.shift} onChange={(e) => setNp({ ...np, shift: e.target.value })} className="rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink">
              {SHIFTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-dim">
            Role
            <select value={np.role} onChange={(e) => setNp({ ...np, role: e.target.value })} className="rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink">
              <option>CSR</option>
              <option>Manager</option>
            </select>
          </label>
          <button type="submit" className="btn btn-accent">Add</button>
          <button type="button" className="btn" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {roster.map((c) => (
          <div key={c.id} className="card" style={{ opacity: c.active ? 1 : 0.6 }}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <EditableName name={c.name} onSave={(n) => onEditName(c.id, n)} />
                <div className="mt-1 flex items-center gap-1.5">
                  <Pill color={c.role === 'Manager' ? '#F59E0B' : '#0EA5E9'}>{c.role}</Pill>
                  {!c.active && <Pill color="#EF4444">Archived</Pill>}
                </div>
              </div>
              <button
                onClick={() => onToggleArchive(c.id)}
                className="rounded p-1.5 transition hover:bg-hover"
                title={c.active ? 'Archive' : 'Restore'}
                style={{ color: c.active ? '#8B82A8' : '#10B981' }}
              >
                {c.active ? <ArchiveIcon /> : <RestoreIcon />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-dim">Shift</span>
              <select
                value={c.shift}
                disabled={!c.active}
                onChange={(e) => onChangeShift(c.id, e.target.value)}
                className="rounded-md border border-line bg-raised px-2 py-1 text-xs font-semibold disabled:opacity-50"
                style={{ color: SHIFT_TONE[c.shift] }}
              >
                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {shiftHistory.length > 0 && (
        <div className="card mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink">Shift change history</h3>
          <div className="divide-y divide-line">
            {shiftHistory.slice().reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="font-medium text-ink">{h.name}</span>
                <span className="text-muted">
                  <span style={{ color: SHIFT_TONE[h.from] }}>{h.from}</span> → <span style={{ color: SHIFT_TONE[h.to] }}>{h.to}</span>
                </span>
                <span className="text-dim">{h.changedOn}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
