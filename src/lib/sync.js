// ---------------------------------------------------------------------------
// Sync layer: pull every profile tab from the public gviz CSV endpoint,
// normalize the dirty rows into a flat, JSON-serializable record set, and
// cache the result in localStorage. Mirrors CSR Pulse's autoSyncFromGSheets.
// ---------------------------------------------------------------------------
import Papa from 'papaparse'
import { PROFILES, gvizCsvUrl } from './config.js'
import {
  detectHeaderRow,
  parseDate,
  dateKey,
  parseMoney,
  normalizeStatus,
  isConverted,
  normalizeShift,
  matchCsr,
  csrShift,
  normalizeCountry,
  looksLikeClient,
} from './normalize.js'

const CACHE_KEY = 'csr-inquiries:cache:v1'

const firstNonEmpty = (row, indices = []) => {
  for (const i of indices) {
    const v = row[i]
    if (v != null && String(v).trim() !== '') return v
  }
  return ''
}

// Normalize one CSV row into a record. `client` is '' when the cell isn't a
// real buyer username (used to detect orphan rows in the data-quality check).
function normalizeRow(profile, row, map) {
  const dateRaw = firstNonEmpty(row, map.date)
  const statusRaw = firstNonEmpty(row, map.status)
  const d = parseDate(dateRaw)
  const csr = map.csr ? matchCsr(firstNonEmpty(row, map.csr)) : null
  const shiftCol = normalizeShift(firstNonEmpty(row, map.shift))
  // Prefer an explicit shift; otherwise infer from the CSR's roster shift.
  const shift = shiftCol !== 'Unassigned' ? shiftCol : csrShift(csr) || 'Unassigned'
  const clientRaw = firstNonEmpty(row, map.client)
  // Follow Up 1/2/3 are sequential TRUE/FALSE checkboxes → a 0–3 touch count.
  const fu = (idx) => /true/i.test(String(firstNonEmpty(row, idx)))
  const followups = [map.followup1, map.followup2, map.followup3].reduce((n, idx) => n + (fu(idx) ? 1 : 0), 0)
  const lcRaw = firstNonEmpty(row, map.lastContact)
  const lcDate = parseDate(lcRaw)
  return {
    profile,
    client: looksLikeClient(clientRaw) ? String(clientRaw).replace(/\s+/g, ' ').trim() : '',
    country: normalizeCountry(firstNonEmpty(row, map.country)),
    status: normalizeStatus(statusRaw),
    converted: isConverted(statusRaw),
    shift,
    csr, // null when absent/unrecognized
    hasCsrColumn: !!map.csr,
    value: parseMoney(firstNonEmpty(row, map.value)),
    upsell: /true/i.test(String(firstNonEmpty(row, map.upsell))),
    followups,
    lastContact: dateKey(lcRaw),
    lastContactTs: lcDate ? lcDate.getTime() : null,
    notes: String(firstNonEmpty(row, map.notes) || '').replace(/\s+/g, ' ').trim(),
    date: dateKey(dateRaw),
    ts: d ? d.getTime() : null,
  }
}

// Turn one profile tab's raw CSV text into normalized inquiry records.
// `rows` = real inquiries (have a client). `orphans` = rows that carry real
// data (a date / status / shift / CSR) but are missing the client name —
// surfaced by the data-quality check rather than silently dropped.
export function parseTab(profile, csvText) {
  const { data } = Papa.parse(csvText, { skipEmptyLines: false })
  const head = detectHeaderRow(data)
  if (!head) return { rows: [], orphans: [], skipped: 0, hasCsrColumn: false, headerFound: false }

  const { index, map } = head
  const records = []
  const orphans = []
  let skipped = 0

  for (let r = index + 1; r < data.length; r++) {
    const row = data[r] || []
    const rec = normalizeRow(profile, row, map)
    if (rec.client) {
      records.push(rec)
      continue
    }
    // No client name: keep it as an orphan only if it has a real signal,
    // so empty/FALSE-checkbox template rows are still ignored.
    const signal =
      rec.date != null || (rec.status && rec.status !== 'Other') || rec.shift !== 'Unassigned' || rec.csr
    if (signal) orphans.push(rec)
    else if (row.some((c) => String(c || '').trim() !== '')) skipped++
  }
  return { rows: records, orphans, skipped, hasCsrColumn: !!map.csr, headerFound: true }
}

// Fetch + parse all profile tabs. Tolerant: a failing tab doesn't sink the load.
export async function syncAll({ onProgress } = {}) {
  const results = await Promise.allSettled(
    PROFILES.map(async (profile) => {
      const res = await fetch(gvizCsvUrl(profile), { redirect: 'follow' })
      if (!res.ok) throw new Error(`${profile}: HTTP ${res.status}`)
      const text = await res.text()
      const parsed = parseTab(profile, text)
      onProgress?.(profile)
      return { profile, ...parsed }
    }),
  )

  const rows = []
  const orphans = []
  const perProfile = {}
  const errors = []
  results.forEach((r, i) => {
    const profile = PROFILES[i]
    if (r.status === 'fulfilled') {
      rows.push(...r.value.rows)
      orphans.push(...r.value.orphans)
      perProfile[profile] = {
        count: r.value.rows.length,
        orphans: r.value.orphans.length,
        skipped: r.value.skipped,
        hasCsrColumn: r.value.hasCsrColumn,
      }
    } else {
      errors.push(String(r.reason?.message || r.reason))
      perProfile[profile] = { count: 0, orphans: 0, skipped: 0, hasCsrColumn: false, error: true }
    }
  })

  return { rows, orphans, perProfile, errors, syncedAt: Date.now() }
}

// --- localStorage cache (no-op outside the browser) -------------------------
const hasLS = () => typeof localStorage !== 'undefined'

export function loadCache() {
  if (!hasLS()) return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCache(payload) {
  if (!hasLS()) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / serialization — ignore, sheet is the source of truth */
  }
}
