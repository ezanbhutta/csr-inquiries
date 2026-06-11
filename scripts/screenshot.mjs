// Headless screenshot of the running dashboard (against live sheet data).
// Usage: node scripts/screenshot.mjs [url] [outfile]
// Optional: FIXTURES=/path/to/map.json  — { "Profile Name": "<csv text>", ... }
// When set, gviz requests are served from the fixture instead of the network
// (useful where the headless browser has no outbound egress).
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:4174/'
const out = process.argv[3] || '/tmp/csr-inquiries.png'
const fixtures = process.env.FIXTURES ? JSON.parse(readFileSync(process.env.FIXTURES, 'utf8')) : null

const [vw, vh] = (process.env.VIEWPORT || '1440x2000').split('x').map(Number)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 })
// Pre-unlock the gate so we land straight on the dashboard (unless NO_UNLOCK).
if (!process.env.NO_UNLOCK) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('csr-inquiries:gate', 'unlocked')
    } catch {}
  })
}
if (fixtures) {
  await page.addInitScript((map) => {
    const orig = window.fetch
    window.fetch = async (u, opts) => {
      const s = String(u)
      if (s.includes('/gviz/tq')) {
        const m = s.match(/[?&]sheet=([^&]*)/)
        const name = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''
        if (map[name] != null)
          return new Response(map[name], { status: 200, headers: { 'content-type': 'text/csv' } })
      }
      return orig(u, opts)
    }
  }, fixtures)
}
await page.goto(url, { waitUntil: 'networkidle' })
// Wait for the live sync to populate the KPI cards.
await page.waitForFunction(() => /\d/.test(document.body.innerText) && document.body.innerText.includes('Conversion rate'), { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(2500)
if (process.env.CLIP_TEXT) {
  // Screenshot just the card containing the given text (for focused review).
  await page.locator(`.card:has-text("${process.env.CLIP_TEXT}")`).first().screenshot({ path: out })
} else {
  await page.screenshot({ path: out, fullPage: true })
}
await browser.close()
console.log('saved', out)
