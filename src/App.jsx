import { useEffect, useMemo, useRef, useState } from 'react'
import { PROFILES, SHIFTS, UNASSIGNED } from './lib/config.js'
import { loadCache, saveCache, syncAll } from './lib/sync.js'
import {
  applyFilters,
  businessDayTodayKey,
  byCountry,
  byDay,
  byProfile,
  byShift,
  byStatus,
  dataQuality,
  dateRangePreset,
  followupStats,
  inErrorScope,
  kpis,
  withRollingRate,
} from './lib/metrics.js'
import Gate, { isUnlocked } from './components/Gate.jsx'
import TimeChart from './components/TimeChart.jsx'
import DataQuality from './components/DataQuality.jsx'
import FollowUps from './components/FollowUps.jsx'
import CountryBreakdown from './components/CountryBreakdown.jsx'
import DateRangePicker from './components/DateRangePicker.jsx'
import ProfileTable from './components/ProfileTable.jsx'
import ShiftBreakdown from './components/ShiftBreakdown.jsx'
import StatusBreakdown from './components/StatusBreakdown.jsx'
import { Logo, Stat, fmt, money } from './components/ui.jsx'

const SHIFT_OPTS = [...SHIFTS, UNASSIGNED]
const PRESET_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom',
}

const viewFromHash = () => {
  const h = (typeof location !== 'undefined' && location.hash) || ''
  return h === '#errors' ? 'errors' : h === '#followups' ? 'followups' : 'dashboard'
}

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
  const [customStart, setCustomStart] = useState(null)
  const [customEnd, setCustomEnd] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [shifts, setShifts] = useState([])
  const [view, setView] = useState(viewFromHash)

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

  useEffect(() => {
    const h = () => setView(viewFromHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  const range = useMemo(
    () => dateRangePreset(preset, rows, { start: customStart, end: customEnd }),
    [preset, rows, customStart, customEnd],
  )
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
  // Breakdown panels stay full "pickers": the profile list ignores the profile
  // filter (and vice-versa) so you can always click another to isolate it,
  // while the rest of the dashboard reflects the selection.
  const filteredNoProfile = useMemo(
    () => applyFilters(rows, { shifts, from: range.from, to: range.to }),
    [rows, shifts, range],
  )
  const filteredNoShift = useMemo(
    () => applyFilters(rows, { profiles, from: range.from, to: range.to }),
    [rows, profiles, range],
  )
  const prof = useMemo(() => byProfile(filteredNoProfile, PROFILES), [filteredNoProfile])
  const shiftRows = useMemo(() => byShift(filteredNoShift), [filteredNoShift])
  const countryRows = useMemo(() => byCountry(filtered), [filtered])
  const daySeries = useMemo(() => withRollingRate(byDay(filtered)), [filtered])
  const statusRows = useMemo(() => byStatus(filtered), [filtered])
  const fuStats = useMemo(() => followupStats(rows), [rows])
  const datedCount = useMemo(() => filtered.filter((r) => r.date).length, [filtered])

  // Errors: only inquiries from June 2026 onward (all profiles).
  const errorsDq = useMemo(
    () => dataQuality([...rows, ...orphans].filter(inErrorScope)),
    [rows, orphans],
  )

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />

  const rangeLabel =
    preset === 'all'
      ? `All time${range.from ? ` (${range.from} → ${range.to})` : ''}`
      : `${PRESET_LABELS[preset] || preset} · ${range.from || '—'} → ${range.to || '—'}`

  const go = (v) => {
    location.hash = v === 'dashboard' ? '' : '#' + v
    setView(v)
  }

  const exportPdf = async () => {
    setExporting(true)
    try {
      const { exportSummaryPdf } = await import('./lib/pdf.js')
      exportSummaryPdf({
        rangeLabel,
        kpis: k,
        profiles: prof,
        shifts: shiftRows,
        csr: { leaderboard: [], logged: 0, total: 0 },
        syncedAt: syncedAt || Date.now(),
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-line backdrop-blur-xl"
        style={{ background: 'rgba(250,250,254,0.9)' }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <Logo size={40} />
              <div>
                <div className="disp text-lg font-bold leading-tight text-ink">CSR Inquiries</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand">
                  HaseebMadeIt
                </div>
              </div>
            </div>
            <nav className="flex items-center gap-1 rounded-lg border border-line bg-raised p-1">
              <button className={`seg ${view === 'dashboard' ? 'seg-on' : ''}`} onClick={() => go('dashboard')}>
                Dashboard
              </button>
              <button className={`seg ${view === 'followups' ? 'seg-on' : ''}`} onClick={() => go('followups')}>
                Follow-ups
                {fuStats.due.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {fmt(fuStats.due.length)}
                  </span>
                )}
              </button>
              <button
                className={`seg ${view === 'errors' ? 'seg-on' : ''}`}
                onClick={() => go('errors')}
              >
                Errors
                {errorsDq.withIssues > 0 && (
                  <span className="ml-1.5 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {fmt(errorsDq.withIssues)}
                  </span>
                )}
              </button>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" onClick={refresh} disabled={loading}>
              {loading ? 'Syncing…' : '↻ Refresh'}
            </button>
            <button className="btn btn-accent" disabled={exporting || rows.length === 0} onClick={exportPdf}>
              {exporting ? 'Preparing…' : '⬇ Export PDF'}
            </button>
          </div>
        </div>
      </header>

      {view === 'errors' ? (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="disp text-2xl font-bold text-ink">Errors</h1>
            <p className="mt-0.5 text-sm text-muted">
              Inquiries from <b>June 2026 onward</b> that are missing a required field
              (Date, Client Name, Order Status, Shift, CSR). Earlier data isn’t checked, and every
              other column is optional — a blank there never errors.
            </p>
          </div>
          <DataQuality dq={errorsDq} scope="June 2026 onward" />
        </main>
      ) : view === 'followups' ? (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="disp text-2xl font-bold text-ink">Follow-ups</h1>
            <p className="mt-0.5 text-sm text-muted">
              Open (Not Placed) leads only — Placed &amp; Direct Orders are already won. Work the
              queue: search, filter by touches or profile, and sort by who's been waiting longest.
            </p>
          </div>
          <FollowUps stats={fuStats} />
        </main>
      ) : (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
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
            <DateRangePicker
              preset={preset}
              setPreset={setPreset}
              customStart={customStart}
              customEnd={customEnd}
              setCustomStart={setCustomStart}
              setCustomEnd={setCustomEnd}
              windowStart={range.from}
              windowEnd={range.to}
              today={businessDayTodayKey()}
            />
            <FilterMenu label="Profiles" allLabel="All profiles" options={PROFILES} selected={profiles} onChange={setProfiles} />
            <FilterMenu label="Shift" allLabel="All shifts" options={SHIFT_OPTS} selected={shifts} onChange={setShifts} />
          </div>

          {errors.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-2 text-sm text-amber">
              Some tabs didn’t load: {errors.join('; ')}
            </div>
          )}

          {/* KPIs (conversion is what matters: by profile / date / shift below) */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          </div>

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
            <div className="lg:col-span-2">
              <ProfileTable
                rows={prof}
                selected={profiles}
                onSelect={(p) => setProfiles(profiles.length === 1 && profiles[0] === p ? [] : [p])}
              />
            </div>
            <div className="lg:col-span-1">
              <ShiftBreakdown
                rows={shiftRows}
                selected={shifts}
                onSelect={(s) => setShifts(shifts.length === 1 && shifts[0] === s ? [] : [s])}
              />
            </div>
            <div className="lg:col-span-2">
              <CountryBreakdown rows={countryRows} />
            </div>
            <div className="lg:col-span-1">
              <StatusBreakdown rows={statusRows} />
            </div>
          </div>

          <footer className="mt-8 border-t border-line pt-4 text-xs text-dim">
            Source: <span className="text-muted">Client Daily Inquiries</span> Google Sheet · Converted = Placed + Direct Order ·
            Conversion shown by profile, date &amp; shift · Shift = when the inquiry came in · Business day rolls at 5 AM PKT.
          </footer>
        </main>
      )}
    </div>
  )
}
