# CSR Inquiries

A daily **inquiry → conversion** dashboard for the Fiverr CSR operation — the sibling
to **CSR Pulse** (which covers completed-order revenue). Where CSR Pulse answers
*"how much did we make,"* CSR Inquiries answers *"how many people asked, and how many
did we convert."*

It reads the **Client Daily Inquiries** Google Sheet live (no backend, no manual
export), normalizes the messy per-profile tabs, and shows conversion by profile, by
day, by shift, and by CSR.

---

## What it shows

- **KPIs** — total inquiries, converted, conversion rate, won value, and CSR-logging
  coverage — each with a vs-previous-period delta.
- **Inquiries & conversion over time** — daily volume, conversions, and a 7-day rolling
  conversion rate.
- **By profile** — which of the 10 profiles get the inquiries and convert them (sortable).
- **By shift** — Morning / Evening / Night (which shift the inquiry came in on).
- **By CSR** — *who wrote the query*, for the tabs where a CSR is recorded, with a
  coverage badge so you know how representative it is.
- **Outcome mix** — the Order Status breakdown (Placed / Direct Order / Not Placed / …).
- **Export PDF** — a one-page CEO summary.

**Converted** = `Order Status ∈ { Placed, Direct Order }`.

---

## Data source

- Workbook: **Client Daily Inquiries** (`VITE_SHEET_ID`), shared *"anyone with link can view."*
- One tab per profile: `Abdul Haseeb, Tariq Mahmood, Eikon Designs, Alee Studioz,
  Carpicon, Dygram Designs, Storm Design, WeDesignz, Grid Designs, X Studioz`.
- Pulled client-side from the public CSV endpoint, on load and on **Refresh**:
  `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={Profile}`
- Cached in `localStorage` so reloads are instant; the sheet is always the source of truth.

### The sheet is messy — here's how it's handled

Each of the 10 tabs has a **different header layout**, plus banner rows, trailing
whitespace, mixed date formats and `$90` vs `$145.00`. The parser (`src/lib/normalize.js`,
`src/lib/sync.js`) deals with this:

- **Header auto-detection** per tab + a header **alias map** (`Order Value`/`Order Price`,
  `Up Sell`/`Upsell`, `Follow Up`/`FollowUp`, `Note`/`Notes`, banner-prefixed `Date`…).
- **Tolerant dates** — `1-Dec-2025`, `03-Feb-2026`, `8 Feb 2026`, `20-April-2026`, etc.,
  with implausible (`2926`) and future-dated typos rejected.
- **Status normalization** — `not placed` is matched before `placed` (it contains the word).
- **CSR aliasing** — `Basit → Abdul Basit`, `Hasnain → Hasnain Gillani`, `Saad Khan → Saad`,
  matched against the CSR Pulse roster; unrecognized/blank CSR = unattributed.
- **Shift validation** — only `Morning/Evening/Night` are accepted; column-bleed
  (dates, `FALSE`, notes) falls through to *Unassigned*; if a shift is missing but the CSR
  is known, the CSR's roster shift is used.
- Empty checkbox-only rows (`FALSE | FALSE | …`) are ignored.

Run `npm run verify-data` to print the parsed numbers straight from the live sheet.

---

## Known data limitations (and how to improve them)

1. **CSR coverage is partial.** Only some tabs fill the `CSR` column, so per-CSR numbers
   cover a subset of inquiries (the dashboard shows the exact %). To make it complete, add
   a **CSR** column to every profile tab and fill it.
2. **No channel/source field.** "How the inquiry came in" is only captured as `Shift`.
   If you want a true acquisition channel (chat / custom offer / direct / meeting), add a
   structured **Source** column to the sheet and it can become its own panel.
3. **~9% of rows have no parseable date** — they still count everywhere, but drop out of
   the time chart only.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # production build → dist/
npm run preview    # serve the build → http://localhost:4174
npm run verify-data  # parse the live sheet in Node and print a summary
```

## Configuration

Set via `.env.local` (dev) or Vercel env vars — see `.env.example`:

- `VITE_SHEET_ID` — the inquiries workbook ID.
- `VITE_DASH_PASSWORD` — the access password.

> **Note on the password gate:** it's a *light, client-side* gate — the value is bundled
> into the static site, so treat it as "keep casual eyes out," not real security. For
> stronger protection put the deployment behind Vercel password protection / SSO, or an
> auth proxy.

## Deploy (Vercel)

1. Import the repo into Vercel (framework auto-detects as **Vite**; `vercel.json` is included).
2. Add `VITE_SHEET_ID` and `VITE_DASH_PASSWORD` as environment variables.
3. Deploy. It rebuilds and re-syncs from the sheet on every load.

---

## Project layout

```
src/
  lib/
    config.js      profiles, roster, CSR aliases, sheet ID, constants
    normalize.js   tolerant parsers + header detection (the dirty-data core)
    sync.js        fetch all tabs via gviz CSV, normalize, cache
    metrics.js     aggregations (by profile / day / shift / CSR / status)
    pdf.js         jsPDF CEO summary (lazy-loaded on export)
  components/      Gate, KPIs, TimeChart, ProfileTable, ShiftBreakdown,
                   StatusBreakdown, CsrLeaderboard, shared UI
  App.jsx          state, sync, filters, layout
scripts/
  verify-data.mjs  live-sheet parse check
  screenshot.mjs   headless screenshot
```
