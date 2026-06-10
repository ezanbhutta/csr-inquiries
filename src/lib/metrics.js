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

export function byProfile(rows) {
  const order = new Map(PROFILES.map((p, i) => [p, i]))
  const groups = {}
  rows.forEach((r) => ((groups[r.profile] = groups[r.profile] || []).push(r)))
  return Object.entries(groups)
    .map(([profile, rs]) => ({ profile, ...tally(rs) }))
    .sort((a, b) => (order.get(a.profile) ?? 99) - (order.get(b.profile) ?? 99))
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

// 7-point rolling average of conversion rate, for the trend line.
export function withRollingRate(daySeries, window = 7) {
  return daySeries.map((d, i) => {
    const slice = daySeries.slice(Math.max(0, i - window + 1), i + 1)
    const inq = slice.reduce((s, x) => s + x.inquiries, 0)
    const conv = slice.reduce((s, x) => s + x.converted, 0)
    return { ...d, rollingRate: pct(conv, inq) }
  })
}
