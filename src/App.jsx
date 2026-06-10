import { useEffect, useMemo, useRef, useState } from 'react'
import { PROFILES, SHIFTS, UNASSIGNED } from './lib/config.js'
import { loadCache, saveCache, syncAll } from './lib/sync.js'
import {
  applyFilters,
  byCsr,
  byDay,
  byProfile,
  byShift,
  byStatus,
  dateRangePreset,
  kpis,
  withRollingRate,
} from './lib/metrics.js'
import Gate, { isUnlocked } from './components/Gate.jsx'
import TimeChart from './components/TimeChart.jsx'
import ProfileTable from './components/ProfileTable.jsx'
import ShiftBreakdown from './components/ShiftBreakdown.jsx'
import StatusBreakdown from './components/StatusBreakdown.jsx'
import CsrLeaderboard from './components/CsrLeaderboard.jsx'
import { Stat, fmt, money } from './components/ui.jsx'

const RANGES = [
  ['today', 'Today'],
  ['7d', '7d'],
  ['30d', '30d'],
  ['90d', '90d'],
  ['all', 'All'],
]
const SHIFT_OPTS = [...SHIFTS, UNASSIGNED]

function shiftRangeBack({ from, to }) {
  if (!from || !to) return null
  const a = new Date(from + 'T00:00:00Z')
  const b = new Date(to + 'T00:00:00Z')
  const days = Math.round((b - a) / 86_400_000) + 1
  const pe = new Date(a)
  pe.setUTCDate(pe.getUTCDate() - 1)
  const ps = new Date(pe)
  ps.setUTCDate(ps.getUTCDate() - (days - 1))
  const k = (d) => d.toISOString().slice(0, 10)
  return { from: k(ps), to: k(pe) }
}

function Delta({ now, prev, suffix = '' }) {
  if (prev == null || prev === 0) return null
  const diff = now - prev
  if (diff === 0) return <span className="text-white/30">±0{suffix}</span>
  const up = diff > 0
  return (
    <span className={up ? 'text-win' : 'text-loss'}>
      {up ? '▲' : '▼'} {Math.abs(diff).toLocaleString('en-US')}
      {suffix} vs prev
    </span>
  )
}

// Lightweight checkbox popover.
function FilterMenu({ label, options, selected, onChange, allLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const all = selected.length === 0
  const toggle = (o) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o])
  return (
    <div className="relative" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)}>
        {label}: <span className="text-white/90">{all ? allLabel : `${selected.length} selected`}</span>
        <span className="text-white/40">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 max-h-72 w-56 overflow-auto rounded-xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
          <button className="seg w-full text-left" onClick={() => onChange([])}>
            {all ? '✓ ' : ''}
            {allLabel}
          </button>
          {options.map((o) => (
            <button key={o} className="seg flex w-full items-center gap-2 text-left" onClick={() => toggle(o)}>
              <span className="w-3">{selected.includes(o) ? '✓' : ''}</span>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked())
  const [rows, setRows] = useState(() => loadCache()?.rows ?? [])
  const [syncedAt, setSyncedAt] = useState(() => loadCache()?.syncedAt ?? null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [errors, setErrors] = useState([])
  const [preset, setPreset] = useState('30d')
  const [profiles, setProfiles] = useState([])
  const [shifts, setShifts] = useState([])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await syncAll()
      setRows(res.rows)
      setSyncedAt(res.syncedAt)
      setErrors(res.errors)
      saveCache({ rows: res.rows, syncedAt: res.syncedAt })
    } catch (e) {
      setErrors([String(e?.message || e)])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (unlocked) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  const range = useMemo(() => dateRangePreset(preset, rows), [preset, rows])
  const filtered = useMemo(
    () => applyFilters(rows, { profiles, shifts, from: range.from, to: range.to }),
    [rows, profiles, shifts, range],
  )
  const prevRange = useMemo(() => (preset === 'all' ? null : shiftRangeBack(range)), [preset, range])
  const prevFiltered = useMemo(
    () => (prevRange ? applyFilters(rows, { profiles, shifts, ...prevRange }) : []),
    [rows, profiles, shifts, prevRange],
  )

  const k = useMemo(() => kpis(filtered), [filtered])
  const kPrev = useMemo(() => kpis(prevFiltered), [prevFiltered])
  const prof = useMemo(() => byProfile(filtered), [filtered])
  const shiftRows = useMemo(() => byShift(filtered), [filtered])
  const daySeries = useMemo(() => withRollingRate(byDay(filtered)), [filtered])
  const csrData = useMemo(() => byCsr(filtered), [filtered])
  const statusRows = useMemo(() => byStatus(filtered), [filtered])
  const datedCount = useMemo(() => filtered.filter((r) => r.date).length, [filtered])

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />

  const rangeLabel =
    preset === 'all'
      ? `All time${range.from ? ` (${range.from} → ${range.to})` : ''}`
      : `${RANGES.find((r) => r[0] === preset)[1]} · ${range.from} → ${range.to}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
            CSR Inquiries
          </div>
          <h1 className="text-2xl font-extrabold">Daily inquiry &amp; conversion</h1>
          <p className="mt-0.5 text-sm text-white/45">
            {syncedAt ? `Synced ${new Date(syncedAt).toLocaleString()}` : 'Loading…'}
            {' · '}
            {fmt(rows.length)} inquiries across {PROFILES.length} profiles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={refresh} disabled={loading}>
            {loading ? 'Syncing…' : '↻ Refresh'}
          </button>
          <button
            className="btn btn-accent"
            disabled={exporting || rows.length === 0}
            onClick={async () => {
              setExporting(true)
              try {
                const { exportSummaryPdf } = await import('./lib/pdf.js')
                exportSummaryPdf({
                  rangeLabel,
                  kpis: k,
                  profiles: prof,
                  shifts: shiftRows,
                  csr: csrData,
                  syncedAt: syncedAt || Date.now(),
                })
              } finally {
                setExporting(false)
              }
            }}
          >
            {exporting ? 'Preparing…' : '⬇ Export PDF'}
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          {RANGES.map(([key, label]) => (
            <button
              key={key}
              className={`seg ${preset === key ? 'seg-on' : ''}`}
              onClick={() => setPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <FilterMenu
          label="Profiles"
          allLabel="All profiles"
          options={PROFILES}
          selected={profiles}
          onChange={setProfiles}
        />
        <FilterMenu
          label="Shift"
          allLabel="All shifts"
          options={SHIFT_OPTS}
          selected={shifts}
          onChange={setShifts}
        />
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2 text-sm text-warn">
          Some tabs didn’t load: {errors.join('; ')}
        </div>
      )}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat
          label="Inquiries"
          value={fmt(k.inquiries)}
          sub={<Delta now={k.inquiries} prev={prevRange ? kPrev.inquiries : null} />}
        />
        <Stat
          label="Converted"
          tone="win"
          value={fmt(k.converted)}
          sub={<Delta now={k.converted} prev={prevRange ? kPrev.converted : null} />}
        />
        <Stat
          label="Conversion rate"
          tone="accent"
          value={`${k.conversionRate}%`}
          sub={<Delta now={k.conversionRate} prev={prevRange ? kPrev.conversionRate : null} suffix=" pts" />}
        />
        <Stat label="Won value" value={money(k.convertedValue)} sub={`Avg deal ${money(k.avgDealValue)}`} />
        <Stat
          label="CSR logged"
          tone={k.csrLoggedPct < 50 ? 'warn' : 'default'}
          value={`${k.csrLoggedPct}%`}
          sub="of inquiries attributed"
        />
      </div>

      {/* Charts & tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <TimeChart data={daySeries} />
          {datedCount < k.inquiries && (
            <p className="mt-1.5 px-1 text-xs text-white/35">
              {fmt(k.inquiries - datedCount)} inquiries without a parseable date are excluded from the chart but counted everywhere else.
            </p>
          )}
        </div>
        <div className="lg:col-span-2">
          <ProfileTable rows={prof} />
        </div>
        <div className="lg:col-span-1">
          <ShiftBreakdown rows={shiftRows} />
        </div>
        <div className="lg:col-span-1">
          <StatusBreakdown rows={statusRows} />
        </div>
        <div className="lg:col-span-2">
          <CsrLeaderboard data={csrData} />
        </div>
      </div>

      <footer className="mt-8 border-t border-white/5 pt-4 text-xs text-white/30">
        Source: <span className="text-white/50">Client Daily Inquiries</span> Google Sheet · Converted = Placed + Direct Order ·
        Shift = when the inquiry came in · Business day rolls at 5 AM PKT.
      </footer>
    </div>
  )
}
