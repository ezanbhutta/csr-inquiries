import { useEffect, useMemo, useRef, useState } from 'react'
import { PROFILES, ROSTER, SHIFTS, UNASSIGNED } from './lib/config.js'
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
  duplicateClients,
  followupStats,
  inErrorScope,
  kpis,
  lostReasons,
  scopeErrorRecords,
  withRollingRate,
} from './lib/metrics.js'
import Gate, { isUnlocked } from './components/Gate.jsx'
import TimeChart from './components/TimeChart.jsx'
import DataQuality from './components/DataQuality.jsx'
import FollowUps from './components/FollowUps.jsx'
import LogPage from './components/LogPage.jsx'
import CountryBreakdown from './components/CountryBreakdown.jsx'
import LostReasons from './components/LostReasons.jsx'
import DuplicateClients from './components/DuplicateClients.jsx'
import DateRangePicker from './components/DateRangePicker.jsx'
import RosterPage from './components/RosterPage.jsx'
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

const LOG_LABEL = { profile: 'Profile', shift: 'Shift', country: 'Country', status: 'Status', date: 'Day', client: 'Client', csr: 'CSR' }

const ROSTER_KEY = 'csr-inquiries:roster'
const SHIFTHIST_KEY = 'csr-inquiries:shifthistory'
const loadRoster = () => {
  try {
    const r = JSON.parse(localStorage.getItem(ROSTER_KEY))
    return Array.isArray(r) && r.length ? r : ROSTER
  } catch {
    return ROSTER
  }
}
const loadJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

const parseHash = () => {
  const h = ((typeof location !== 'undefined' && location.hash) || '').replace(/^#/, '')
  if (h === 'errors') return { view: 'errors' }
  if (h === 'followups') return { view: 'followups' }
  if (h === 'roster') return { view: 'roster' }
  if (h.startsWith('log/')) {
    const parts = h.split('/')
    return { view: 'log', logType: parts[1] || 'profile', logValue: decodeURIComponent(parts.slice(2).join('/')) }
  }
  return { view: 'dashboard' }
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
  const [roster, setRoster] = useState(loadRoster)
  const [shiftHistory, setShiftHistory] = useState(() => loadJSON(SHIFTHIST_KEY, []))
  const [route, setRoute] = useState(parseHash)
  const view = route.view

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
    const h = () => setRoute(parseHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  // Persist roster edits locally (like CSR Pulse).
  useEffect(() => {
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
    } catch {
      /* ignore */
    }
  }, [roster])
  useEffect(() => {
    try {
      localStorage.setItem(SHIFTHIST_KEY, JSON.stringify(shiftHistory))
    } catch {
      /* ignore */
    }
  }, [shiftHistory])

  // The whole dashboard is locked to June 2026 onward; the date picker drills
  // within it. Pre-June data is never shown.
  const juneRows = useMemo(() => rows.filter(inErrorScope), [rows])

  const range = useMemo(
    () => dateRangePreset(preset, juneRows, { start: customStart, end: customEnd }),
    [preset, juneRows, customStart, customEnd],
  )
  const filtered = useMemo(
    () => applyFilters(juneRows, { profiles, shifts, from: range.from, to: range.to }),
    [juneRows, profiles, shifts, range],
  )
  const prevRange = useMemo(() => (preset === 'all' ? null : shiftRangeBack(range)), [preset, range])
  const prevFiltered = useMemo(
    () => (prevRange ? applyFilters(juneRows, { profiles, shifts, ...prevRange }) : []),
    [juneRows, profiles, shifts, prevRange],
  )

  const k = useMemo(() => kpis(filtered), [filtered])
  const kPrev = useMemo(() => kpis(prevFiltered), [prevFiltered])
  const prof = useMemo(
    () => byProfile(filtered, profiles.length ? profiles : PROFILES),
    [filtered, profiles],
  )
  const shiftRows = useMemo(() => byShift(filtered), [filtered])
  const countryRows = useMemo(() => byCountry(filtered), [filtered])
  const daySeries = useMemo(() => withRollingRate(byDay(filtered)), [filtered])
  const statusRows = useMemo(() => byStatus(filtered), [filtered])
  const fuStats = useMemo(() => followupStats(filtered), [filtered])
  // Nav badge / dashboard pill show the full June backlog, independent of filters.
  const fuStatsAll = useMemo(() => followupStats(juneRows), [juneRows])
  const datedCount = useMemo(() => filtered.filter((r) => r.date).length, [filtered])

  const lostData = useMemo(() => lostReasons(filtered), [filtered])

  // Errors: inquiries from June 2026 onward (all profiles), PLUS any new row
  // appended below the latest one — so a "just the name" entry with missing
  // details is flagged even before its Date is filled in.
  const errorRecords = useMemo(() => scopeErrorRecords([...rows, ...orphans]), [rows, orphans])
  const errorsDq = useMemo(() => dataQuality(errorRecords), [errorRecords])
  const errorDupes = useMemo(() => duplicateClients(errorRecords), [errorRecords])

  // Shared filter bar (date range + Profiles + Shift). Rendered on both the
  // Dashboard and the Follow-ups page so they filter identically.
  const filterBar = (
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
  )

  // What changed today (business day, 5 AM PKT cutoff).
  const todayKey = businessDayTodayKey()
  const todayStats = useMemo(() => {
    const t = rows.filter((r) => r.date === todayKey)
    const converted = t.filter((r) => r.converted).length
    const d = new Date(todayKey + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    const yInq = rows.filter((r) => r.date === d.toISOString().slice(0, 10)).length
    return {
      inquiries: t.length,
      converted,
      rate: t.length ? Math.round((converted / t.length) * 1000) / 10 : 0,
      yInq,
    }
  }, [rows, todayKey])

  // Drill-down log: every inquiry for a profile / shift / country / status / day
  // / client, newest first. Includes missing-client rows (shown as "missing").
  const logRows = useMemo(() => {
    if (route.view !== 'log') return []
    const v = route.logValue
    const matchers = {
      profile: (r) => r.profile === v,
      shift: (r) => r.shift === v,
      country: (r) => r.country === v,
      status: (r) => (r.status || 'No status') === v,
      date: (r) => r.date === v,
      client: (r) => (r.client || '').toLowerCase() === String(v).toLowerCase(),
      csr: (r) => (r.csr || '').toLowerCase() === String(v).toLowerCase(),
    }
    const match = matchers[route.logType] || matchers.profile
    return [...rows, ...orphans].filter(match).sort((a, b) => (b.ts ?? -Infinity) - (a.ts ?? -Infinity))
  }, [rows, orphans, route])

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />

  const rangeLabel =
    preset === 'all'
      ? `All time${range.from ? ` (${range.from} → ${range.to})` : ''}`
      : `${PRESET_LABELS[preset] || preset} · ${range.from || '—'} → ${range.to || '—'}`

  const go = (v) => {
    location.hash = v === 'dashboard' ? '' : v
    setRoute(parseHash())
  }
  const openLog = (type, value) => {
    location.hash = `log/${type}/${encodeURIComponent(value)}`
    setRoute(parseHash())
  }

  // Roster editing (same model as CSR Pulse).
  const rosterChangeShift = (id, newShift) => {
    const c = roster.find((x) => x.id === id)
    if (!c || c.shift === newShift) return
    setShiftHistory((h) => [...h, { name: c.name, from: c.shift, to: newShift, changedOn: businessDayTodayKey() }])
    setRoster((rs) => rs.map((x) => (x.id === id ? { ...x, shift: newShift } : x)))
  }
  const rosterToggleArchive = (id) =>
    setRoster((rs) => rs.map((x) => (x.id === id ? { ...x, active: !x.active } : x)))
  const rosterEditName = (id, name) => {
    const n = name.trim()
    if (!n) return
    setRoster((rs) => rs.map((x) => (x.id === id ? { ...x, name: n } : x)))
  }
  const rosterAddPerson = ({ name, shift, role }) => {
    const nm = name.trim()
    if (!nm) return
    const base = nm.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'csr'
    let id = base
    let n = 2
    while (roster.find((r) => r.id === id)) id = base + n++
    setRoster((rs) => [...rs, { id, name: nm, shift, role, active: true }])
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
                {fuStatsAll.activeCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {fmt(fuStatsAll.activeCount)}
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
              <button className={`seg ${view === 'roster' ? 'seg-on' : ''}`} onClick={() => go('roster')}>
                Roster
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

      {view === 'log' ? (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button className="btn" onClick={() => go('dashboard')}>← Back</button>
            <div>
              <h1 className="disp text-2xl font-bold text-ink">{route.logValue}</h1>
              <p className="mt-0.5 text-sm text-muted">
                Full inquiry log · {LOG_LABEL[route.logType] || 'Profile'} · newest first
              </p>
            </div>
          </div>
          <LogPage rows={logRows} />
        </main>
      ) : view === 'roster' ? (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="disp text-2xl font-bold text-ink">Team roster</h1>
            <p className="mt-0.5 text-sm text-muted">
              Edit names, change shifts, add people and archive — same as CSR Pulse. Saved on this device.
            </p>
          </div>
          <RosterPage
            roster={roster}
            shiftHistory={shiftHistory}
            onChangeShift={rosterChangeShift}
            onToggleArchive={rosterToggleArchive}
            onEditName={rosterEditName}
            onAddPerson={rosterAddPerson}
          />
        </main>
      ) : view === 'errors' ? (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="disp text-2xl font-bold text-ink">Errors</h1>
            <p className="mt-0.5 text-sm text-muted">
              Inquiries from <b>June 2026 onward</b> that are missing a required field
              (Date, Client Name, Order Status, Shift, CSR). Any <b>new row added below the latest one</b> counts as a
              current inquiry, so a “just the name” entry is flagged even before its date is filled in. Earlier data
              isn’t checked, and every other column is optional — a blank there never errors.
            </p>
          </div>
          <div className="space-y-4">
            <DataQuality dq={errorsDq} scope="June 2026 onward" />
            <DuplicateClients groups={errorDupes} onSelect={(c) => openLog('client', c)} />
          </div>
        </main>
      ) : view === 'followups' ? (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="disp text-2xl font-bold text-ink">Follow-ups</h1>
            <p className="mt-0.5 text-sm text-muted">
              Open (Not Placed) leads from <b>June 2026 onward</b> — Placed &amp; Direct Orders are already
              won. A lead is active until it&rsquo;s closed — 3 follow-ups done, or the Note shows it&rsquo;s dead. Filter by
              date, profile or shift below, then work the queue.
            </p>
          </div>
          {filterBar}
          <FollowUps stats={fuStats} />
        </main>
      ) : (
        <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="disp text-2xl font-bold text-ink">Daily inquiry &amp; conversion</h1>
            <p className="mt-0.5 text-sm text-muted">
              {syncedAt ? `Synced ${new Date(syncedAt).toLocaleString()}` : 'Loading…'}
              <span className="text-dim"> · June 2026 onward</span>
            </p>
          </div>

          {/* What changed today */}
          <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-card px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-ink">Today</span>
              <span className="text-dim">
                {new Date(todayKey + 'T00:00:00Z').toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
              </span>
            </span>
            <span className="text-muted"><b className="text-ink">{fmt(todayStats.inquiries)}</b> inquiries</span>
            <span className="text-muted"><b className="text-mint">{fmt(todayStats.converted)}</b> converted</span>
            <span className="text-muted"><b className="text-brand">{todayStats.rate}%</b> conversion</span>
            {todayStats.yInq > 0 && todayStats.inquiries !== todayStats.yInq && (
              <span className={todayStats.inquiries > todayStats.yInq ? 'text-mint' : 'text-coral'}>
                {todayStats.inquiries > todayStats.yInq ? '▲' : '▼'} {Math.abs(todayStats.inquiries - todayStats.yInq)} vs yesterday
              </span>
            )}
            <span className="flex flex-wrap gap-2 sm:ml-auto">
              <button onClick={() => go('followups')} className="pill border-amber/40 text-amber">
                {fmt(fuStatsAll.activeCount)} need follow-up
              </button>
              <button
                onClick={() => go('errors')}
                className={`pill ${errorsDq.withIssues ? 'border-coral/40 text-coral' : 'border-mint/50 text-mint'}`}
              >
                {fmt(errorsDq.withIssues)} errors
              </button>
            </span>
          </div>

          {/* Controls */}
          {filterBar}

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
              <TimeChart data={daySeries} onSelect={(d) => openLog('date', d)} />
              {datedCount < k.inquiries && (
                <p className="mt-1.5 px-1 text-xs text-dim">
                  {fmt(k.inquiries - datedCount)} inquiries without a parseable date are excluded from the chart but counted everywhere else.
                </p>
              )}
            </div>
            <div className="lg:col-span-2">
              <ProfileTable rows={prof} onSelect={(p) => openLog('profile', p)} />
            </div>
            <div className="lg:col-span-1">
              <ShiftBreakdown rows={shiftRows} onSelect={(s) => openLog('shift', s)} />
            </div>
            <div className="lg:col-span-1">
              <StatusBreakdown rows={statusRows} onSelect={(s) => openLog('status', s)} />
            </div>
            <div className="lg:col-span-2">
              <LostReasons data={lostData} />
            </div>
            <div className="lg:col-span-3">
              <CountryBreakdown rows={countryRows} onSelect={(c) => openLog('country', c)} />
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
