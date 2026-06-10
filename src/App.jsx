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
  dataQuality,
  dateRangePreset,
  kpis,
  withRollingRate,
} from './lib/metrics.js'
import Gate, { isUnlocked } from './components/Gate.jsx'
import TimeChart from './components/TimeChart.jsx'
import DataQuality from './components/DataQuality.jsx'
import ProfileTable from './components/ProfileTable.jsx'
import ShiftBreakdown from './components/ShiftBreakdown.jsx'
import StatusBreakdown from './components/StatusBreakdown.jsx'
import CsrLeaderboard from './components/CsrLeaderboard.jsx'
import { Logo, Stat, fmt, money } from './components/ui.jsx'

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
  if (diff === 0) return <span className="text-dim">±0{suffix}</span>
  const up = diff > 0
  return (
    <span className={up ? 'text-mint' : 'text-coral'}>
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
        {label}: <span className="text-ink">{all ? allLabel : `${selected.length} selected`}</span>
        <span className="text-dim">▾</span>
      </button>
      {open && (
        <div
          className="absolute z-20 mt-2 max-h-72 w-56 overflow-auto rounded-xl border border-line bg-card p-1.5"
          style={{ boxShadow: '0 14px 44px rgba(22,10,51,0.18)' }}
        >
          <button className="seg w-full text-left" onClick={() => onChange([])}>
            {all ? '✓ ' : ''}
            {allLabel}
          </button>
          {options.map((o) => (
            <button key={o} className="seg flex w-full items-center gap-2 text-left" onClick={() => toggle(o)}>
              <span className="w-3 text-brand">{selected.includes(o) ? '✓' : ''}</span>
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
  const [orphans, setOrphans] = useState(() => loadCache()?.orphans ?? [])
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
      setOrphans(res.orphans)
      setSyncedAt(res.syncedAt)
      setErrors(res.errors)
      saveCache({ rows: res.rows, orphans: res.orphans, syncedAt: res.syncedAt })
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

  // Data quality is checked over the full set (profile filter only) — date/shift
  // filters would hide the very rows that are missing a date or shift.
  const dq = useMemo(() => {
    const pick = (arr) => (profiles.length ? arr.filter((r) => profiles.includes(r.profile)) : arr)
    return dataQuality([...pick(rows), ...pick(orphans)])
  }, [rows, orphans, profiles])

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />

  const rangeLabel =
    preset === 'all'
      ? `All time${range.from ? ` (${range.from} → ${range.to})` : ''}`
      : `${RANGES.find((r) => r[0] === preset)[1]} · ${range.from} → ${range.to}`

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-line backdrop-blur-xl"
        style={{ background: 'rgba(250,250,254,0.9)' }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <div className="disp text-lg font-bold leading-tight text-ink">CSR Inquiries</div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand">
                HaseebMadeIt
              </div>
            </div>
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="disp text-2xl font-bold text-ink">Daily inquiry &amp; conversion</h1>
          <p className="mt-0.5 text-sm text-muted">
            {syncedAt ? `Synced ${new Date(syncedAt).toLocaleString()}` : 'Loading…'}
            {' · '}
            {fmt(rows.length)} inquiries across {PROFILES.length} profiles
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-raised p-1">
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
          <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-2 text-sm text-amber">
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

        {/* Data quality banner */}
        {dq.withIssues > 0 ? (
          <div
            className="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
            style={{ background: '#FDE9E9', borderColor: '#F6BCBC', color: '#B42318' }}
          >
            <span className="mt-0.5">⚠</span>
            <span>
              <b>{fmt(dq.withIssues)}</b> {dq.withIssues === 1 ? 'inquiry is' : 'inquiries are'} missing a
              required field (Date, Client Name, Order Status, Shift, or CSR). See <b>Data quality</b> below.
            </span>
          </div>
        ) : rows.length > 0 ? (
          <div
            className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"
            style={{ background: '#E7F8F1', borderColor: '#B6E8D4', color: '#0F7A52' }}
          >
            <span>✓</span>
            <span>All inquiries have the required fields (Date, Client Name, Order Status, Shift, CSR).</span>
          </div>
        ) : null}

        {/* Charts & tables */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <TimeChart data={daySeries} />
            {datedCount < k.inquiries && (
              <p className="mt-1.5 px-1 text-xs text-dim">
                {fmt(k.inquiries - datedCount)} inquiries without a parseable date are excluded from the chart but counted everywhere else.
              </p>
            )}
          </div>
          <div className="lg:col-span-3">
            <DataQuality dq={dq} />
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

        <footer className="mt-8 border-t border-line pt-4 text-xs text-dim">
          Source: <span className="text-muted">Client Daily Inquiries</span> Google Sheet · Converted = Placed + Direct Order ·
          Shift = when the inquiry came in · Business day rolls at 5 AM PKT.
        </footer>
      </main>
    </div>
  )
}
