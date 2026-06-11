import { useEffect, useRef, useState } from 'react'

// Preset chips + branded calendar popover, mirroring CSR Pulse. Operates purely
// on YYYY-MM-DD business-day strings to stay in lockstep with the rest of the app.
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`
const parseYmd = (s) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || ''))
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null
}
const fmtChip = (s) => {
  const p = parseYmd(s)
  return p ? `${MONTHS[p.m].slice(0, 3)} ${p.d}` : '—'
}
const fmtLong = (s) => {
  const p = parseYmd(s)
  return p ? `${MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}` : '—'
}

const PRESETS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7d', '7d'],
  ['30d', '30d'],
  ['90d', '90d'],
  ['all', 'All'],
]

const CalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

export default function DateRangePicker({
  preset,
  setPreset,
  customStart,
  customEnd,
  setCustomStart,
  setCustomEnd,
  windowStart,
  windowEnd,
  today,
}) {
  const [open, setOpen] = useState(false)
  const [pendingStart, setPendingStart] = useState(null) // first click of a range
  const [hoverDay, setHoverDay] = useState(null)
  const seed = parseYmd(customEnd) || parseYmd(today) || { y: 2026, m: 5 }
  const [view, setView] = useState({ y: seed.y, m: seed.m })
  const rootRef = useRef(null)

  // Jump the visible month to the active range whenever the popover opens.
  useEffect(() => {
    if (!open) return
    const p = parseYmd(customStart) || parseYmd(today)
    if (p) setView({ y: p.y, m: p.m })
    setPendingStart(null)
    setHoverDay(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside-click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pickPreset = (v) => {
    setPreset(v)
    setOpen(false)
  }

  // Seed the custom range from the currently-visible window so switching keeps
  // the same dates rather than snapping to today.
  const openCustom = () => {
    if (preset !== 'custom') {
      if (windowStart) setCustomStart(windowStart)
      if (windowEnd) setCustomEnd(windowEnd)
      setPreset('custom')
      setOpen(true)
    } else {
      setOpen((o) => !o)
    }
  }

  const pickDay = (d) => {
    const cur = ymd(view.y, view.m, d)
    setPreset('custom')
    if (!pendingStart) {
      setPendingStart(cur)
      setCustomStart(cur)
      setCustomEnd(cur)
    } else {
      const [s, e] = pendingStart <= cur ? [pendingStart, cur] : [cur, pendingStart]
      setCustomStart(s)
      setCustomEnd(e)
      setPendingStart(null)
    }
  }

  const shiftMonth = (delta) =>
    setView((v) => {
      let m = v.m + delta
      let y = v.y
      if (m < 0) {
        m = 11
        y -= 1
      }
      if (m > 11) {
        m = 0
        y += 1
      }
      return { y, m }
    })

  const firstDow = new Date(view.y, view.m, 1).getDay()
  const numDays = new Date(view.y, view.m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= numDays; d++) cells.push(d)

  const isCustom = preset === 'custom'
  const chip = (active) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-brand text-white' : 'text-dim hover:text-ink'}`

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-1 rounded-lg border border-line bg-raised p-1">
      {PRESETS.map(([v, l]) => (
        <button key={v} type="button" onClick={() => pickPreset(v)} className={chip(preset === v)}>
          {l}
        </button>
      ))}

      <button type="button" onClick={openCustom} className={`flex items-center gap-1.5 ${chip(isCustom)}`}>
        <CalIcon />
        {isCustom ? `${fmtChip(customStart)} – ${fmtChip(customEnd)}` : 'Custom'}
        <span className="opacity-70">▾</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-40 mt-2 rounded-xl border border-line bg-card p-3"
          style={{ width: 272, boxShadow: '0 14px 44px rgba(22,10,51,0.18)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-md px-2 py-1 text-muted hover:bg-hover">
              ‹
            </button>
            <div className="text-xs font-bold text-ink">
              {MONTHS[view.m]} {view.y}
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-md px-2 py-1 text-muted hover:bg-hover">
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[9px] font-semibold uppercase text-dim">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setHoverDay(null)}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const cur = ymd(view.y, view.m, d)
              let lo = customStart
              let hi = customEnd
              if (pendingStart) {
                const h = hoverDay ? ymd(view.y, view.m, hoverDay) : pendingStart
                ;[lo, hi] = pendingStart <= h ? [pendingStart, h] : [h, pendingStart]
              }
              const inRange = lo && hi && cur >= lo && cur <= hi
              const isEdge = cur === lo || cur === hi
              const isToday = cur === today
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  onMouseEnter={() => setHoverDay(d)}
                  className="h-8 rounded-md text-xs transition-colors"
                  style={{
                    background: isEdge ? '#7229FF' : inRange ? '#F1EBFF' : 'transparent',
                    color: isEdge ? '#FFFFFF' : inRange ? '#5E1FD8' : '#160A33',
                    fontWeight: isEdge ? 700 : inRange ? 600 : 400,
                    border: `1px solid ${isToday && !isEdge ? '#E1DCF0' : 'transparent'}`,
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <span className="text-[10px] text-muted">
              {fmtLong(customStart)} → {fmtLong(customEnd)}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="btn-accent rounded-md px-2.5 py-1 text-[11px] font-semibold">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
