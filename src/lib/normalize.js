// ---------------------------------------------------------------------------
// Tolerant normalizers for the (very dirty) Client Daily Inquiries sheet.
// Every tab has a different header layout, banner rows, trailing whitespace,
// mixed date formats, "$90" vs "$145.00", column-bleed, etc. Parse defensively.
// ---------------------------------------------------------------------------
import {
  CONVERTED_STATUSES,
  CSR_ALIASES,
  CSR_SHIFT,
  ROSTER,
  SHIFTS,
  UNASSIGNED,
} from './config.js'

const clean = (v) =>
  v == null ? '' : String(v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

// --- Header -> canonical key -----------------------------------------------
// Order matters: most specific patterns first (e.g. "Last Contact Date"
// must win over the bare "date" rule).
export function headerKey(raw) {
  const s = clean(raw).toLowerCase()
  if (!s) return null
  if (/last\s*contact/.test(s)) return 'lastContact'
  if (/client\s*name|buyer|user\s*name|username/.test(s)) return 'client'
  if (/country/.test(s)) return 'country'
  if (/order\s*status|^status$/.test(s)) return 'status'
  if (/order\s*(value|price)|^value$|^price$/.test(s)) return 'value'
  if (/up\s*sell|upsell/.test(s)) return 'upsell'
  if (/completed\s*order|total\s*orders?|total\s*order\s*completed/.test(s)) return 'completed'
  if (/fiverr\s*since/.test(s)) return 'fiverrSince'
  if (/follow\s*-?up\s*3|followup\s*3/.test(s)) return 'followup3'
  if (/follow\s*-?up\s*2|followup\s*2/.test(s)) return 'followup2'
  if (/follow\s*-?up(\s*1)?$|followup$/.test(s)) return 'followup1'
  if (/shift/.test(s)) return 'shift'
  if (/\bcsr\b|\bagent\b|^rep$|handled\s*by/.test(s)) return 'csr'
  if (/gig/.test(s)) return 'gig'
  if (/website/.test(s)) return 'website'
  if (/note/.test(s)) return 'notes'
  if (/date/.test(s)) return 'date'
  return null
}

// Build { key -> [colIndex, ...] } from a header row (cols can repeat, e.g.
// two "Note" columns); we coalesce repeats per-row at read time.
export function mapHeader(headerCells) {
  const map = {}
  headerCells.forEach((cell, i) => {
    const k = headerKey(cell)
    if (!k) return
    ;(map[k] = map[k] || []).push(i)
  })
  return map
}

// A header row is one that has a client column AND a date or status column.
export function detectHeaderRow(rows, scan = 8) {
  for (let i = 0; i < Math.min(scan, rows.length); i++) {
    const map = mapHeader(rows[i] || [])
    if (map.client && (map.date || map.status)) return { index: i, map }
  }
  return null
}

// --- Dates ------------------------------------------------------------------
const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

const pad = (n) => String(n).padStart(2, '0')
const toKey = (d) =>
  d ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` : null

// Reject implausible dates so typos don't blow out the time axis:
//  - a "2926" year, and
//  - inquiry dates in the future (the Date column is when the inquiry came in).
const plausible = (d) => {
  if (!d || isNaN(d)) return null
  const y = d.getUTCFullYear()
  if (y < 2023 || y > 2028) return null
  if (d.getTime() > Date.now() + 2 * 86_400_000) return null
  return d
}

export function parseDate(raw) {
  const s = clean(raw)
  if (!s) return null
  let m
  // D Mon YYYY  /  D-Mon-YYYY  /  D-Month-YYYY  (separators: space, -, /)
  m = s.match(/^(\d{1,2})[\s\-/]+([A-Za-z]{3,})[\s\-/]+(\d{2,4})$/)
  if (m && MONTHS[m[2].toLowerCase()] != null) {
    let y = +m[3]
    if (y < 100) y += 2000
    return plausible(new Date(Date.UTC(y, MONTHS[m[2].toLowerCase()], +m[1])))
  }
  // Mon D, YYYY
  m = s.match(/^([A-Za-z]{3,})[\s\-/]+(\d{1,2}),?[\s\-/]+(\d{2,4})$/)
  if (m && MONTHS[m[1].toLowerCase()] != null) {
    let y = +m[3]
    if (y < 100) y += 2000
    return plausible(new Date(Date.UTC(y, MONTHS[m[1].toLowerCase()], +m[2])))
  }
  // Numeric: YYYY-MM-DD or D-M-YY(YY) (sheet locale is day-first)
  m = s.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/)
  if (m) {
    if (m[1].length === 4) return plausible(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])))
    let y = +m[3]
    if (y < 100) y += 2000
    return plausible(new Date(Date.UTC(y, +m[2] - 1, +m[1])))
  }
  const t = Date.parse(s)
  return plausible(isNaN(t) ? null : new Date(t))
}

export const dateKey = (raw) => toKey(parseDate(raw))

// --- Money ------------------------------------------------------------------
export function parseMoney(raw) {
  const s = clean(raw).replace(/[$,]/g, '')
  if (!s) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// --- Status / conversion ----------------------------------------------------
export function normalizeStatus(raw) {
  const s = clean(raw).toLowerCase()
  if (!s) return ''
  // "not placed" must be tested before "placed" (it contains the word).
  if (s.includes('not placed')) return 'Not Placed'
  if (s.includes('direct order')) return 'Direct Order'
  if (/\bplaced\b/.test(s)) return 'Placed'
  if (s.includes('out of scope')) return 'Out of Scope'
  if (s.includes('cancel')) return 'Cancelled'
  if (s.includes('spam') || s.includes('scam')) return 'Spam/Scam'
  if (s.includes('no response')) return 'No Response'
  return 'Other'
}

export const isConverted = (statusRaw) =>
  ['Placed', 'Direct Order'].includes(normalizeStatus(statusRaw))
// CONVERTED_STATUSES documents the intent; normalizeStatus is the source of truth.
void CONVERTED_STATUSES

// --- Shift ------------------------------------------------------------------
export function normalizeShift(raw) {
  const s = clean(raw).toLowerCase()
  const hit = SHIFTS.find((x) => x.toLowerCase() === s)
  return hit || UNASSIGNED
}

// --- CSR matching (mirrors CSR Pulse matchCsr_) -----------------------------
const ROSTER_FLAT = ROSTER.map((r) => r.name)

export function matchCsr(raw) {
  const s = clean(raw).toLowerCase().replace(/[^\w\s,/&;]/g, '')
  if (!s) return null
  const firstChunk = s.split(/[,/&;]/)[0].trim()
  const firstWord = firstChunk.split(/\s+/)[0]
  if (!firstWord) return null
  // Reject obvious non-names that bleed into the CSR column.
  if (/^(false|true|morning|evening|night|placed|not|waiting|closed|meeting|budget|date|client|response|in|out|no|yes|na|none|nil|tbd|done|pending|new|old|spam|scam)$/.test(firstWord))
    return null
  if (CSR_ALIASES[firstWord]) return CSR_ALIASES[firstWord]
  if (CSR_ALIASES[firstChunk]) return CSR_ALIASES[firstChunk]
  const byRoster = ROSTER_FLAT.find(
    (n) => n.toLowerCase() === firstChunk || n.toLowerCase().split(/\s+/)[0] === firstWord,
  )
  if (byRoster) return byRoster
  // A filled cell with a plausible (alphabetic) name that just isn't in the
  // roster yet — e.g. "Zaheen" — is still a recorded CSR. Keep it (Title Case)
  // so it's attributed and not wrongly flagged as missing. Reject digits/initials.
  if (/\d/.test(firstChunk) || firstChunk.replace(/[^a-z]/g, '').length < 2) return null
  return firstChunk.replace(/\b\w/g, (m) => m.toUpperCase())
}

export const csrShift = (canonicalCsr) =>
  canonicalCsr ? CSR_SHIFT[canonicalCsr.toLowerCase()] || null : null

// --- Country canonicalization ------------------------------------------------
// Case-insensitive: title-casing merges pure case variants (UK/uk, United
// States/united states), the alias map folds abbreviations + common typos, and
// junk (usernames/dates that landed in the Country column) becomes Unknown.
const COUNTRY_ALIASES = {
  // United States
  us: 'United States', usa: 'United States', 'united state': 'United States',
  'united stated': 'United States', 'united states of america': 'United States', america: 'United States',
  // United Kingdom
  uk: 'United Kingdom', gb: 'United Kingdom', 'great britain': 'United Kingdom', britain: 'United Kingdom',
  england: 'United Kingdom', 'united kingdoms': 'United Kingdom', 'united kingdom': 'United Kingdom',
  'united kindom': 'United Kingdom',
  // UAE / Saudi
  uae: 'United Arab Emirates', ksa: 'Saudi Arabia', 'saudia arabia': 'Saudi Arabia', 'saudi arab': 'Saudi Arabia',
  // abbreviations + typos
  mex: 'Mexico', netherland: 'Netherlands', germay: 'Germany', ausralia: 'Australia', canda: 'Canada',
  moroco: 'Morocco', switzarland: 'Switzerland', isreal: 'Israel', philipines: 'Philippines',
  philippinesphilippines: 'Philippines', malysia: 'Malaysia', newzeland: 'New Zealand', 'new zeland': 'New Zealand',
  veitnam: 'Vietnam', indonasia: 'Indonesia', sangapur: 'Singapore', luxemborg: 'Luxembourg', suedia: 'Sweden',
}

const SMALL_WORDS = new Set(['and', 'of', 'the', 'da', 'di', 'de', 'el', 'la', 'do', 'dos'])
const titleCaseCountry = (s) =>
  s
    .split(' ')
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')

export function normalizeCountry(raw) {
  const s = clean(raw).replace(/[.,;]+$/, '').trim()
  if (!s) return ''
  const key = s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key]
  // Usernames / dates that bled into the Country column → Unknown.
  if (/[\d_]/.test(key) || key.length < 2) return ''
  return titleCaseCountry(key)
}

// A cell is junk-as-client when it's clearly not a buyer username.
const CLIENT_JUNK = /^(client name|date|shift|morning|evening|night|false|true|order status|notes?|country)$/i
export const looksLikeClient = (raw) => {
  const s = clean(raw)
  return s.length > 0 && !CLIENT_JUNK.test(s)
}
