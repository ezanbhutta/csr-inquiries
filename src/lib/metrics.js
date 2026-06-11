// ---------------------------------------------------------------------------
// Pure aggregation helpers over the normalized inquiry records.
// ---------------------------------------------------------------------------
import { BUSINESS_DAY_CUTOFF_HOUR, PKT_OFFSET_HOURS, PROFILES, SHIFTS, UNASSIGNED } from './config.js'

const rate = (num, den) => (den > 0 ? num / den : 0)
export const pct = (num, den) => Math.round(rate(num, den) * 1000) / 10

// Today's business day key in PKT, honoring the 5 AM cutoff (same as CSR Pulse).
export function businessDayTodayKey(now = new Date()) {
  const pkt = new Date(now.getTime() + PKT_OFFSET_HOURS * 3600_000)
  if (pkt.getUTCHours() < BUSINESS_DAY_CUTOFF_HOUR) pkt.setUTCDate(pkt.getUTCDate() - 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${pkt.getUTCFullYear()}-${p(pkt.getUTCMonth() + 1)}-${p(pkt.getUTCDate())}`
}

export function dateRangePreset(preset, rows) {
  const today = businessDayTodayKey()
  const end = today
  const shift = (days) => {
    const d = new Date(today + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - days)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
  }
  switch (preset) {
    case 'today':
      return { from: today, to: end }
    case '7d':
      return { from: shift(6), to: end }
    case '30d':
      return { from: shift(29), to: end }
    case '90d':
      return { from: shift(89), to: end }
    case 'all':
    default: {
      const dated = rows.map((r) => r.date).filter(Boolean).sort()
      return { from: dated[0] || null, to: dated[dated.length - 1] || end }
    }
  }
}

export function applyFilters(rows, { profiles, shifts, from, to } = {}) {
  return rows.filter((r) => {
    if (profiles && profiles.length && !profiles.includes(r.profile)) return false
    if (shifts && shifts.length && !shifts.includes(r.shift)) return false
    if (from && (!r.date || r.date < from)) return false
    if (to && (!r.date || r.date > to)) return false
    return true
  })
}

export function kpis(rows) {
  const inquiries = rows.length
  const converted = rows.filter((r) => r.converted).length
  const convertedValue = rows
    .filter((r) => r.converted && r.value != null)
    .reduce((s, r) => s + r.value, 0)
  const withCsr = rows.filter((r) => r.csr).length
  const csrEligible = rows.filter((r) => r.hasCsrColumn).length
  return {
    inquiries,
    converted,
    conversionRate: pct(converted, inquiries),
    convertedValue,
    avgDealValue: converted ? Math.round(convertedValue / converted) : 0,
    csrLoggedPct: pct(withCsr, inquiries),
    csrColumnPct: pct(csrEligible, inquiries),
  }
}

const tally = (rows) => {
  const inquiries = rows.length
  const converted = rows.filter((r) => r.converted).length
  const value = rows
    .filter((r) => r.converted && r.value != null)
    .reduce((s, r) => s + r.value, 0)
  return { inquiries, converted, conversionRate: pct(converted, inquiries), value }
}

// Always lists every profile in `include` (default: all 10), with zeros for
// profiles that have no inquiries in the current filter.
export function byProfile(rows, include = PROFILES) {
  const order = new Map(PROFILES.map((p, i) => [p, i]))
  const groups = {}
  rows.forEach((r) => ((groups[r.profile] = groups[r.profile] || []).push(r)))
  const names = include && include.length ? include : PROFILES
  return names
    .map((profile) => ({ profile, ...tally(groups[profile] || []) }))
    .sort((a, b) => (order.get(a.profile) ?? 99) - (order.get(b.profile) ?? 99))
}

export function byCountry(rows, topN = 12) {
  const groups = {}
  rows.forEach((r) => {
    const c = r.country || 'Unknown'
    ;(groups[c] = groups[c] || []).push(r)
  })
  return Object.entries(groups)
    .map(([country, rs]) => ({ country, ...tally(rs) }))
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, topN)
}

// Follow-up requirements system. Follow Up 1/2/3 give a 0–3 touch count.
// Open lead = Not Placed and not converted; best practice = keep following up.
export function followupStats(rows, { dueWindowDays = 21 } = {}) {
  const funnel = [0, 1, 2, 3].map((touches) => {
    const rs = rows.filter((r) => (r.followups || 0) === touches)
    return { touches, ...tally(rs) }
  })
  const open = rows.filter((r) => !r.converted && r.status === 'Not Placed')
  const under = open.filter((r) => (r.followups || 0) < 3)
  const zeroOpen = open.filter((r) => (r.followups || 0) === 0).length
  const now = Date.now()
  const daysSince = (r) => {
    const ts = r.lastContactTs || r.ts
    return ts ? Math.floor((now - ts) / 86_400_000) : null
  }
  const due = under
    .map((r) => ({
      profile: r.profile,
      client: r.client,
      followups: r.followups || 0,
      daysSince: daysSince(r),
      lastContact: r.lastContact,
    }))
    // Focus the queue on the actionable window; ancient open leads are dead.
    .filter((r) => r.daysSince != null && r.daysSince <= dueWindowDays)
    .sort((a, b) => b.daysSince - a.daysSince)
  return {
    funnel,
    openTotal: open.length,
    underCount: under.length,
    zeroOpenPct: pct(zeroOpen, open.length),
    avgTouches: open.length
      ? Math.round((open.reduce((s, r) => s + (r.followups || 0), 0) / open.length) * 100) / 100
      : 0,
    due,
  }
}

export function byShift(rows) {
  const cats = [...SHIFTS, UNASSIGNED]
  const groups = Object.fromEntries(cats.map((c) => [c, []]))
  rows.forEach((r) => (groups[r.shift] || groups[UNASSIGNED]).push(r))
  return cats.map((shift) => ({ shift, ...tally(groups[shift]) }))
}

export function byDay(rows) {
  const groups = {}
  rows.forEach((r) => {
    if (!r.date) return
    ;(groups[r.date] = groups[r.date] || []).push(r)
  })
  return Object.keys(groups)
    .sort()
    .map((date) => {
      const t = tally(groups[date])
      return { date, inquiries: t.inquiries, converted: t.converted, conversionRate: t.conversionRate }
    })
}

export function byCsr(rows) {
  const eligible = rows.filter((r) => r.hasCsrColumn)
  const groups = {}
  rows.forEach((r) => {
    if (!r.csr) return
    ;(groups[r.csr] = groups[r.csr] || []).push(r)
  })
  const leaderboard = Object.entries(groups)
    .map(([csr, rs]) => ({ csr, ...tally(rs) }))
    .sort((a, b) => b.converted - a.converted || b.inquiries - a.inquiries)
  return {
    leaderboard,
    logged: rows.filter((r) => r.csr).length,
    eligible: eligible.length,
    total: rows.length,
  }
}

export function byStatus(rows) {
  const groups = {}
  rows.forEach((r) => {
    const k = r.status || 'No status'
    groups[k] = (groups[k] || 0) + 1
  })
  return Object.entries(groups)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

// --- Data quality ----------------------------------------------------------
// The fields that MUST be present on every inquiry. Everything else is fetched
// but optional (a blank doesn't raise an error).
export const REQUIRED_FIELDS = ['Date', 'Client Name', 'Order Status', 'Shift', 'CSR']

// Errors are only flagged for inquiries from this date onward (and undated rows).
// Historical data before this is left alone.
export const ERRORS_SINCE = '2026-06-01'
export const inErrorScope = (r) => {
  const eff = r.date || r.lastContact
  return !eff || eff >= ERRORS_SINCE
}

export function missingRequired(r) {
  const m = []
  if (!r.date) m.push('Date')
  if (!r.client) m.push('Client Name')
  if (!r.status) m.push('Order Status') // '' = blank = missing
  if (r.shift === 'Unassigned') m.push('Shift')
  if (!r.csr) m.push('CSR')
  return m
}

// `records` = inquiries (+ orphan rows that lack a client name).
export function dataQuality(records) {
  const counts = Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, 0]))
  const issues = []
  const noCsrColumn = new Set()
  for (const r of records) {
    if (r.hasCsrColumn === false) noCsrColumn.add(r.profile)
    const missing = missingRequired(r)
    if (missing.length) {
      missing.forEach((f) => (counts[f] += 1))
      issues.push({ profile: r.profile, client: r.client || '', date: r.date || '', missing })
    }
  }
  // Worst rows first (most missing fields), so the list is good for triage.
  issues.sort((a, b) => b.missing.length - a.missing.length)
  return {
    total: records.length,
    withIssues: issues.length,
    clean: records.length - issues.length,
    counts,
    issues,
    noCsrColumnProfiles: [...noCsrColumn],
  }
}

// 7-point rolling average of conversion rate, for the trend line.
export function withRollingRate(daySeries, window = 7) {
  return daySeries.map((d, i) => {
    const slice = daySeries.slice(Math.max(0, i - window + 1), i + 1)
    const inq = slice.reduce((s, x) => s + x.inquiries, 0)
    const conv = slice.reduce((s, x) => s + x.converted, 0)
    return { ...d, rollingRate: pct(conv, inq) }
  })
}
