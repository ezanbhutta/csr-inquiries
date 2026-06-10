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

// Turn one profile tab's raw CSV text into normalized inquiry records.
export function parseTab(profile, csvText) {
  const { data } = Papa.parse(csvText, { skipEmptyLines: false })
  const head = detectHeaderRow(data)
  if (!head) return { rows: [], skipped: 0, headerFound: false }

  const { index, map } = head
  const records = []
  let skipped = 0

  for (let r = index + 1; r < data.length; r++) {
    const row = data[r] || []
    const clientRaw = firstNonEmpty(row, map.client)
    if (!looksLikeClient(clientRaw)) {
      if (row.some((c) => String(c || '').trim() !== '')) skipped++
      continue
    }

    const statusRaw = firstNonEmpty(row, map.status)
    const d = parseDate(firstNonEmpty(row, map.date))
    const csrCanonical = map.csr ? matchCsr(firstNonEmpty(row, map.csr)) : null
    const shiftFromCol = normalizeShift(firstNonEmpty(row, map.shift))
    // Prefer an explicit shift; otherwise infer from the CSR's roster shift.
    const shift =
      shiftFromCol !== 'Unassigned' ? shiftFromCol : csrShift(csrCanonical) || 'Unassigned'

    records.push({
      profile,
      client: String(clientRaw).replace(/\s+/g, ' ').trim(),
      country: normalizeCountry(firstNonEmpty(row, map.country)),
      status: normalizeStatus(statusRaw),
      converted: isConverted(statusRaw),
      shift,
      csr: csrCanonical, // null when absent/unrecognized
      hasCsrColumn: !!map.csr,
      value: parseMoney(firstNonEmpty(row, map.value)),
      upsell: /true/i.test(String(firstNonEmpty(row, map.upsell))),
      notes: String(firstNonEmpty(row, map.notes) || '').replace(/\s+/g, ' ').trim(),
      date: dateKey(firstNonEmpty(row, map.date)),
      ts: d ? d.getTime() : null,
    })
  }
  return { rows: records, skipped, headerFound: true }
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
  const perProfile = {}
  const errors = []
  results.forEach((r, i) => {
    const profile = PROFILES[i]
    if (r.status === 'fulfilled') {
      rows.push(...r.value.rows)
      perProfile[profile] = { count: r.value.rows.length, skipped: r.value.skipped }
    } else {
      errors.push(String(r.reason?.message || r.reason))
      perProfile[profile] = { count: 0, skipped: 0, error: true }
    }
  })

  return { rows, perProfile, errors, syncedAt: Date.now() }
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
