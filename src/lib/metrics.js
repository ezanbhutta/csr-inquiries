// ---------------------------------------------------------------------------
// Pure aggregation helpers over the normalized inquiry records.
// ---------------------------------------------------------------------------
import { BUSINESS_DAY_CUTOFF_HOUR, CSR_SHIFT, PKT_OFFSET_HOURS, PROFILES, SHIFTS, UNASSIGNED } from './config.js'

const rate = (num, den) => (den > 0 ? num / den : 0)
export const pct = (num, den) => Math.round(rate(num, den) * 1000) / 10

// Today's business day key in PKT, honoring the 5 AM cutoff (same as CSR Pulse).
export function businessDayTodayKey(now = new Date()) {
  const pkt = new Date(now.getTime() + PKT_OFFSET_HOURS * 3600_000)
  if (pkt.getUTCHours() < BUSINESS_DAY_CUTOFF_HOUR) pkt.setUTCDate(pkt.getUTCDate() - 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${pkt.getUTCFullYear()}-${p(pkt.getUTCMonth() + 1)}-${p(pkt.getUTCDate())}`
}

export function dateRangePreset(preset, rows, custom = {}) {
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
    case 'yesterday': {
      const y = shift(1)
      return { from: y, to: y }
    }
    case '7d':
      return { from: shift(6), to: end }
    case '30d':
      return { from: shift(29), to: end }
    case '90d':
      return { from: shift(89), to: end }
    case 'custom':
      return { from: custom.start || null, to: custom.end || null }
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
export function followupStats(rows) {
  // Placed & Direct Orders are already won — follow-ups don't apply, so they're
  // excluded. Only open (Not Placed) leads are in scope. A lead that's had all
  // 3 follow-ups with no response is Closed; under 3 touches = still Active.
  const open = rows
    .filter((r) => r.status === 'Not Placed')
    .map((r) => {
      const followups = r.followups || 0
      // A clear Note (spam, ordered elsewhere, "no need to follow up") closes a
      // lead even before the 3rd touch — there's no point chasing it.
      const closedByNote = followups < 3 && noFollowUpNeeded(r.notes)
      const closed = followups >= 3 || closedByNote
      return {
        profile: r.profile,
        client: r.client,
        shift: r.shift,
        country: r.country,
        followups,
        lastContact: r.lastContact,
        date: r.date,
        notes: r.notes,
        closed,
        closedByNote,
        // Closed leads carry a client-attributed reason; active leads don't.
        closeReason: closed ? closeReason(r.notes) : null,
        status: closed ? 'Closed' : 'Active',
      }
    })

  // Touch funnel = the live follow-up pipeline. Note-closed leads are out of the
  // pipeline, so they're excluded; the 0-touch bar then equals the gap below.
  const pipeline = open.filter((r) => !r.closedByNote)
  const funnel = [0, 1, 2, 3].map((touches) => {
    const count = pipeline.filter((r) => r.followups === touches).length
    return { touches, count, share: pct(count, pipeline.length) }
  })
  const active = open.filter((r) => !r.closed) // still need follow-up
  const closed = open.filter((r) => r.closed) // 3 touches done, or Note says stop
  const zeroOpen = active.filter((r) => r.followups === 0).length // real gap only

  // Closed leads grouped by disposition — all client-side, not missed follow-ups.
  const reasonOrder = new Map(
    ['Client rejected', 'Chose another seller', 'Spam', 'No response'].map((r, i) => [r, i]),
  )
  const reasonCounts = {}
  closed.forEach((r) => (reasonCounts[r.closeReason] = (reasonCounts[r.closeReason] || 0) + 1))
  const closedReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count, share: pct(count, closed.length) }))
    .sort((a, b) => b.count - a.count || (reasonOrder.get(a.reason) ?? 9) - (reasonOrder.get(b.reason) ?? 9))

  // Per-profile follow-up coverage — surfaces which profiles neglect follow-ups.
  const order = new Map(PROFILES.map((p, i) => [p, i]))
  const groups = {}
  open.forEach((r) => {
    const g = (groups[r.profile] = groups[r.profile] || { open: 0, zero: 0, active: 0, closed: 0, touches: 0 })
    g.open += 1
    g.touches += r.followups
    if (!r.closed && r.followups === 0) g.zero += 1
    if (r.closed) g.closed += 1
    else g.active += 1
  })
  const byProfile = Object.entries(groups)
    .map(([profile, g]) => ({
      profile,
      open: g.open,
      zero: g.zero,
      active: g.active,
      closed: g.closed,
      avgTouches: g.open ? Math.round((g.touches / g.open) * 100) / 100 : 0,
      zeroPct: pct(g.zero, g.open),
    }))
    .sort((a, b) => b.active - a.active || (order.get(a.profile) ?? 99) - (order.get(b.profile) ?? 99))

  return {
    leads: open,
    funnel,
    byProfile,
    closedReasons,
    openTotal: open.length,
    activeCount: active.length,
    closedCount: closed.length,
    zeroOpenCount: zeroOpen,
    zeroOpenPct: pct(zeroOpen, open.length),
    avgTouches: open.length
      ? Math.round((open.reduce((s, r) => s + r.followups, 0) / open.length) * 100) / 100
      : 0,
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

// Who WROTE the inquiries. The CSR column is whoever logged the row, not who
// converted it — and a CSR often writes inquiries that came in on a shift other
// than their own. This ranks CSRs by how many they wrote, with a per-shift
// breakdown (the shift the query came in on) so cross-shift logging is visible.
// `homeShift` is the CSR's own roster shift, when known.
export function csrWriters(rows) {
  const cats = [...SHIFTS, UNASSIGNED]
  const groups = {}
  rows.forEach((r) => {
    if (!r.csr) return
    const g = (groups[r.csr] = groups[r.csr] || { csr: r.csr, total: 0, shifts: Object.fromEntries(cats.map((c) => [c, 0])) })
    g.total += 1
    g.shifts[cats.includes(r.shift) ? r.shift : UNASSIGNED] += 1
  })
  const writers = Object.values(groups)
    .map((g) => {
      const homeShift = CSR_SHIFT[g.csr.toLowerCase()] || null
      const byShift = cats
        .map((shift) => ({ shift, count: g.shifts[shift], offHome: homeShift != null && shift !== homeShift && g.shifts[shift] > 0 }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count)
      const offHome = homeShift ? g.total - g.shifts[homeShift] : 0
      return { csr: g.csr, total: g.total, homeShift, byShift, offHome }
    })
    .sort((a, b) => b.total - a.total || a.csr.localeCompare(b.csr))
  return { writers, totalWritten: writers.reduce((s, w) => s + w.total, 0) }
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
// The fields that MUST be present on every inquiry. "Order Value" is required
// only when the order is won (Placed / Direct Order) — a won order with no value
// is an error. Every other column is fetched but optional.
export const REQUIRED_FIELDS = ['Date', 'Client Name', 'Order Status', 'Shift', 'CSR', 'Order Value']

// June 2026 is the cutoff for everything date-scoped. Earlier data is left alone.
export const ERRORS_SINCE = '2026-06-01'

// Dashboard scope: a row counts as June onward only when its Date (or, if blank,
// Last Contact) is June 1 2026 or later. Undated rows are excluded so the
// conversion analytics stay clean.
export const inErrorScope = (r) => {
  const eff = r.date || r.lastContact
  return eff != null && eff >= ERRORS_SINCE
}

// Errors-page scope. Same June cutoff, but it must ALSO catch a brand-new row
// where the employee wrote just the client name and skipped the Date — that row
// has no date to test. The daily logs are append-only, so a row sitting below
// the last confirmed pre-June row in its sheet was added later (= current) and
// is flagged; an undated row up in the old data is left alone. This is what
// lets "just the name, missing everything else" surface without dragging in the
// whole sheet's historical gaps.
export function scopeErrorRecords(records) {
  // Per sheet, the furthest-down row position that still has a pre-June date.
  const lastOld = {}
  for (const r of records) {
    if (r.rowIndex == null || !r.date || r.date >= ERRORS_SINCE) continue
    if (lastOld[r.profile] == null || r.rowIndex > lastOld[r.profile]) lastOld[r.profile] = r.rowIndex
  }
  return records.filter((r) => {
    if (r.date) return r.date >= ERRORS_SINCE // dated row → plain date check
    if (r.lastContact && r.lastContact >= ERRORS_SINCE) return true // touched in June
    if (r.rowIndex == null) return false
    const line = lastOld[r.profile]
    return line == null || r.rowIndex > line // appended after the last old row
  })
}

export function missingRequired(r) {
  const m = []
  if (!r.date) m.push('Date')
  if (!r.client) m.push('Client Name')
  if (!r.status) m.push('Order Status') // '' = blank = missing
  if (r.shift === 'Unassigned') m.push('Shift')
  if (!r.csr) m.push('CSR')
  // A won order (Placed / Direct Order) must have a value entered.
  if (r.converted && r.value == null) m.push('Order Value')
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

// Duplicate clients — an inquiry should appear once per Fiverr buyer, so a
// username that shows up more than once is flagged as an error.
export function duplicateClients(records) {
  const groups = {}
  records.forEach((r) => {
    const key = (r.client || '').toLowerCase().trim()
    if (!key) return // missing client is its own error, not a duplicate
    ;(groups[key] = groups[key] || []).push(r)
  })
  return Object.values(groups)
    .filter((g) => g.length > 1)
    .map((g) => ({
      client: g[0].client,
      count: g.length,
      rows: g.map((r) => ({ profile: r.profile, date: r.date, status: r.status })),
    }))
    .sort((a, b) => b.count - a.count)
}

// Lost-reason analysis — classify the Notes on "Not Placed" leads.
// Synonyms and the many sheet misspellings fold into one canonical reason each
// (e.g. all the "waiting/wating/witing client response" variants -> Awaiting
// reply). Order matters: a decisive reason wins over a pending/in-progress one.
const LOST_REASONS = [
  ['Scam / Spam', /scam|spam|fraud|\bfake\b|fiverr\s*block/i],
  [
    'Chose another seller',
    /ano(?:t)?her\s*(?:seller|designer|buyer|agency|provider|side|vendor)|cho(?:o|0)?se?d?\s*another|hired\s+\w+\s*(?:seller|designer|buyer)?|(?:better|other)\s*(?:option|seller|designer|buyer|vendor)|found\s*(?:a\s*)?(?:better|another)|(?:go|gon|going|went|move\w*)\s*(?:forward\s*)?with\s*another|select\w*\s*another|order\s*plac\w*\s*(?:to\s*)?(?:the\s*)?another|plac\w*\s*the\s*order\s*(?:to|another)/i,
  ],
  ['Budget', /budg|afford|expensiv|too\s*(?:much|high|costly|low)|low\s*-?ball|price\s*(?:too|is|was|high)|out\s*of\s*budget/i],
  [
    'Declined',
    /will\s*not\s*(?:take|order|proceed|buy|go)|won.?t\s*(?:take|order|proceed|buy)|not\s*(?:interest|intrest)|no\s*longer\s*(?:interest|intrest)|declin|chang\w*\s*(?:his|her|their|the)?\s*mind|not\s*(?:going|gonna)\s*(?:to\s*)?(?:order|buy|proceed|take)|back\w*\s*out|not\s*(?:taking|placing)\s*(?:the\s*)?order/i,
  ],
  ['Meeting', /meeting|zoom|google\s*meet|\bcall\s*(?:schedul|set|book)|schedul\w*\s*(?:a\s*)?(?:call|meeting)/i],
  ['Custom offer', /offer|quote|package|pricing/i],
  ['Following up', /follow.?up/i],
  [
    // "Awaiting reply" and "no response" are the same outcome — the client
    // hasn't replied — so they're one reason.
    'No response',
    /await|wait\w*|wat[ie]ng|witing|wting|respons|respon|resposne|repon\w*|feedback|final\s*reply|first\s*response|first\s*(?:msg|message)|client\s*respo|\bno+\s*response|not\s*respond|not\s*repl|\bno\s*repl|did?\s*n.?t\s*repl|no\s*answer|for\s*(?:his|her|the|client'?s?)?\s*-?\s*respon|get\s*back\s*to\s*you|need(?:s)?\s*(?:some\s*)?time|ask\w*\s*for\s*(?:some\s*)?time|i\s*will\s*confirm|in\s*process|on\s*cr\b|chat\s*continue/i,
  ],
]
export function classifyLostReason(notes) {
  const s = String(notes || '')
  for (const [reason, re] of LOST_REASONS) if (re.test(s)) return reason
  // No category matched — surface the actual note (trimmed) rather than a vague
  // "Other", so the real reason is always visible. Blank = genuinely no note.
  const t = s.replace(/\s+/g, ' ').trim()
  if (!t) return 'No note'
  return t.length > 42 ? `${t.slice(0, 42).trim()}…` : t
}

// A Note can make it clear a lead is dead and needs no further follow-up —
// spam/scam, the client ordered with another seller, or an explicit "no need to
// follow up / not interested / dead lead". Such leads are Closed even before the
// 3rd touch, so they drop out of the active backlog and the zero-follow-up gap.
const NO_FOLLOWUP_RE =
  /no\s*(?:need|point|use|reason)\s*(?:to|of|in|for)?\s*(?:follow|reply|contact|chase|respond|pursu)|(?:do\s*n.?t|don.?t|dont|stop|never)\s*(?:bother\s*)?(?:to\s*)?follow|follow.?up\s*not\s*(?:need|require)|not\s*(?:interest|intrest)|no\s*longer\s*(?:interest|intrest)|not\s*(?:a\s*)?serious|dead\s*lead|lead\s*(?:is\s*)?(?:dead|lost|closed)|close\s*(?:this\s*)?lead|won.?t\s*(?:order|buy|proceed)|time\s*wast|wast\w*\s*(?:my|our|the)?\s*time|wrong\s*number/i
export function noFollowUpNeeded(notes) {
  const s = String(notes || '')
  if (!s.trim()) return false
  if (NO_FOLLOWUP_RE.test(s)) return true
  const reason = classifyLostReason(s)
  return reason === 'Scam / Spam' || reason === 'Chose another seller'
}

// Why a Not-Placed lead is Closed — phrased as the disposition, so the outcome
// reads as the client's call (or a non-genuine lead), not a missed follow-up.
// "No response" is the lead that got all 3 touches and never replied.
export function closeReason(notes) {
  const s = String(notes || '')
  const reason = classifyLostReason(s)
  if (reason === 'Scam / Spam') return 'Spam'
  if (reason === 'Chose another seller') return 'Chose another seller'
  if (NO_FOLLOWUP_RE.test(s)) return 'Client rejected'
  return 'No response'
}

export function lostReasons(rows) {
  const lost = rows.filter((r) => !r.converted && r.status === 'Not Placed')
  const counts = {}
  lost.forEach((r) => {
    const k = classifyLostReason(r.notes)
    counts[k] = (counts[k] || 0) + 1
  })
  return {
    total: lost.length,
    reasons: Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
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
