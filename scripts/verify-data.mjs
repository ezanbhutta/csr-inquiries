// Pull the live sheet through the real sync + metrics code and print a summary.
// Run: npm run verify-data
import { syncAll } from '../src/lib/sync.js'
import { byProfile, byShift, byCsr, byStatus, byDay, kpis } from '../src/lib/metrics.js'

const fmt = (n) => n.toLocaleString('en-US')
const bar = (v, max, w = 24) => '█'.repeat(Math.round((v / (max || 1)) * w))

const { rows, perProfile, errors, syncedAt } = await syncAll({
  onProgress: (p) => process.stdout.write(`  ✓ ${p}\n`),
})

console.log('\n=== SYNC ===')
console.log('synced at:', new Date(syncedAt).toISOString())
if (errors.length) console.log('errors:', errors)
console.log('total inquiry rows:', fmt(rows.length))

const k = kpis(rows)
console.log('\n=== KPIs (all time) ===')
console.log(`inquiries        : ${fmt(k.inquiries)}`)
console.log(`converted        : ${fmt(k.converted)}  (Placed + Direct Order)`)
console.log(`conversion rate  : ${k.conversionRate}%`)
console.log(`converted value  : $${fmt(k.convertedValue)}`)
console.log(`avg deal value   : $${fmt(k.avgDealValue)}`)
console.log(`CSR logged       : ${k.csrLoggedPct}% of all inquiries`)

console.log('\n=== BY PROFILE ===')
const prof = byProfile(rows)
const maxInq = Math.max(...prof.map((p) => p.inquiries))
prof.forEach((p) =>
  console.log(
    `${p.profile.padEnd(15)} inq ${String(p.inquiries).padStart(4)} | conv ${String(
      p.converted,
    ).padStart(3)} | ${String(p.conversionRate).padStart(5)}%  ${bar(p.inquiries, maxInq)}`,
  ),
)

console.log('\n=== BY SHIFT ===')
byShift(rows).forEach((s) =>
  console.log(
    `${s.shift.padEnd(12)} inq ${String(s.inquiries).padStart(4)} | conv ${String(
      s.converted,
    ).padStart(3)} | ${s.conversionRate}%`,
  ),
)

console.log('\n=== STATUS BREAKDOWN ===')
byStatus(rows).forEach((s) => console.log(`${String(s.status).padEnd(14)} ${fmt(s.count)}`))

console.log('\n=== CSR LEADERBOARD (where logged) ===')
const c = byCsr(rows)
console.log(`coverage: ${c.logged}/${c.total} inquiries have a recognized CSR`)
c.leaderboard
  .slice(0, 15)
  .forEach((x) =>
    console.log(
      `${x.csr.padEnd(16)} inq ${String(x.inquiries).padStart(4)} | conv ${String(
        x.converted,
      ).padStart(3)} | ${x.conversionRate}%`,
    ),
  )

const days = byDay(rows)
console.log('\n=== TIME RANGE ===')
console.log(`days with data: ${days.length}`)
if (days.length) console.log(`first: ${days[0].date}   last: ${days[days.length - 1].date}`)

console.log('\n=== PER-PROFILE PARSE HEALTH ===')
Object.entries(perProfile).forEach(([p, s]) =>
  console.log(`${p.padEnd(15)} parsed ${String(s.count).padStart(4)} | skipped ${s.skipped || 0}${s.error ? ' | ERROR' : ''}`),
)
