# CSR Inquiries Dashboard — Build Log & Discussion

A running record of the conversation and decisions behind this project.
It's a companion to the code: **what** we built, **why**, and **how** each choice
was made. (Written as a structured log of the discussion rather than a verbatim
transcript.)

---

## What this is

A **daily-inquiries analytics dashboard** for a Fiverr CSR/design agency
(HaseebMadeIt). It tracks, per profile, how many inquiries come in and how many
convert — sliced by **profile**, **date**, and **shift** — plus follow-ups,
data-quality errors, lost-reason analysis, and who logged each inquiry. It is a
sibling to the existing **CSR Pulse** dashboard and matches its look, stack, and
roster.

### Core domain rules (agreed early, kept throughout)
- **Converted** = Order Status is **Placed** or **Direct Order**.
- **Shift** = *when the inquiry came in* (not who handled it).
- **CSR** = *who wrote/logged the inquiry* — **not** a conversion dimension.
  Conversion is measured by **profile, date, and shift**.
- Everything the dashboard shows is scoped to **June 2026 onward**.

### Tech stack
- **React 18 + Vite 5 + Tailwind CSS 3** — a static single-page app, no backend.
- Reads a Google Sheet live via the public **gviz CSV** endpoint (one tab per
  profile), parsed client-side with **PapaParse**.
- **Recharts** for charts; **jsPDF** for PDF export (lazy-loaded).
- Hosted on **GitHub Pages**, deployed by a GitHub Actions workflow on every
  merge to `main`.
- Data refreshes live on every reload (a localStorage cache paints instantly,
  then the fresh sheet data overwrites it).

---

## The discussion, phase by phase

### Phase 1 — Kickoff & the first dashboard
The ask: build one project off the daily-inquiries sheet — how many inquiries a
profile gets and how many convert, in which shift the query came, who wrote it.
Match CSR Pulse's colours (mostly white, the violet HaseebMadeIt scheme, same
logo). Decisions locked in: a **full dashboard**; **Converted = Placed + Direct
Order**; "in which the query came" = **which shift**; CSR shown where available
plus a hygiene stat. Built the tolerant parser for 10 differently-structured,
messy tabs, the KPI cards, by-profile / by-shift / by-day views, and shipped it.

### Phase 2 — Data quality / Errors
Ask: show an error if anything is missing — what matters most is **Date, Client
Name, Order Status, Shift, CSR**; other fields are fetched but don't error.
Built the data-quality checks and an Errors view listing rows missing any
required field, plus duplicate-client detection.

### Phase 3 — Country breakdown + a follow-up system
Added a country-wise breakdown. Then a **follow-up system**: Follow Up 1/2/3
give a 0–3 touch count; open (Not Placed) leads should be worked; researched the
best way to present it (funnel, coverage-by-profile, a searchable queue).
Clarified that Placed / Direct Orders are already won, so follow-ups don't apply
to them.

### Phase 4 — Shift/CSR semantics + June-only errors
Clarified the model: shift = when the query came in; CSR = who wrote it; **CSR
does not matter for conversion** — conversion is by profile/date/shift. Also:
what matters is **June onward** — don't show pre-June errors on the main page;
move errors to their own page/tab.

### Phase 5 — Country aliases
"United Kingdom = UK", "United States = US", etc. — found and merged the
aliases so the country view stops double-counting. (174 → 118 distinct.)

### Phase 6 — Deploy: public link + refresh
Ask: this should be shareable — a link anyone can open, behind a password; and
on reload the data updates (cached first, then overwritten by fresh sheet data),
like CSR Pulse. Set up GitHub Pages deploy via GitHub Actions; the site reads
the sheet live so every reload is current.

### Phase 7 — Lost-reason analysis
Ask: find out **why leads don't convert** from the Notes, and fold
same-meaning phrasings into one reason (e.g. all the "waiting/wating/witing
client response" variants → one). Rebuilt the classifier from the real notes so
the vague "Other" bucket shrank dramatically.

### Phase 8 — Editable roster + click-to-open logs
Ask: make the roster exactly like CSR Pulse — edit a name, change a shift, add a
person, archive — and let clicking a **profile** or **shift** open that item's
full **log** (newest first, every detail, missing fields flagged red). Built the
log pages and the roster editor.

### Phase 9 — Polish
Sleeker, minimal bar charts; a more informative but not-busy layout; a wider
page. Fixed a real bug: a genuine CSR ("Zaheen") was wrongly flagged as
"CSR missing" — corrected the CSR matcher to keep plausible names not yet in the
roster.

### Phase 10 — Lock everything to June 2026 onward
Progressively pinned each panel to June, then locked the **whole dashboard** to
June (`juneRows` as the base for KPIs, charts, and every panel). The date chips
drill *within* June. *(PRs #15–#19.)*

### Phase 11 — Follow-up closures by Note, with client-side reasons
Ask: if a Note makes clear no follow-up is needed (spam, ordered with another
seller, "not interested"), the lead is **Closed**. Then: don't show a flat
"Closed" — label it by a **client-attributed reason** so the outcome lands on
the client's side, not the CSR. Result: leads close by Note even before the 3rd
touch, each labelled **Client rejected / Chose another seller / Spam /
No response**, with a "Why leads closed" breakdown. *(PRs #20, and the follow-up
copy fix in #21 — the intro wrongly cited "5+ follow-ups" while the system
tracks 3; reworded to the real 3-touch standard.)*

### Phase 12 — Flag new "name-only" inquiries by row position *(PR #22)*
Problem: when an employee logs an inquiry with **just the client name** (no
date), the row had no date to scope to June, so it was silently dropped and
never flagged — but removing the date filter would drag in ~1,200 historical
incomplete rows. Fix, using the user's own insight ("check the row number"):
the daily logs are **append-only**, so a row sitting *below the last pre-June
row* in its sheet was added recently and is a current inquiry — flag it if it's
missing required fields; leave old undated rows alone.

### Phase 13 — Filters everywhere *(PRs #23, #24)*
Made **Outcome mix**, **Why leads don't convert**, and **By country** respond to
the dashboard filters (date / profile / shift), like By profile and By shift
already did. Then added the **same filter bar to the Follow-ups page** so the
whole follow-up view narrows with the filter (the nav badge stays a stable
full-backlog count).

### Phase 14 — Profile column on logs *(PR #25)*
On a log that spans multiple profiles (shift, country, status, CSR, date, client
logs) there was no way to tell which profile each row belonged to — added a
**Profile** column. A single-profile log omits it (the title already names it).

### Phase 15 — "Who logged the inquiries" box *(PR #26)*
A scrollable box under **By shift** ranking who **wrote** each inquiry (CSR =
who logged it, not who converted). Click a CSR to see which shifts' inquiries
they wrote, with an amber flag when they logged for a shift other than their own
— surfacing careless cross-shift logging (e.g. a Night CSR writing Morning
rows).

### Phase 16 — Lost-reason "Other" → the real reason *(PR #27)*
Ask: don't show a vague "Other" — show the real reason. Folded the stragglers
into real categories ("Client found another vendor" → Chose another seller;
"Will not take the order" → a new **Declined** reason; "First msg" → No
response) and changed the fallback so any unmatched note shows its **actual
text** instead of "Other".

### Phase 17 — A manager mistakes-log (discussed, parked)
Discussed a system for the manager to log team mistakes (time, shift, reason)
for the CEO to review. Agreed the right shape is a **Google Sheet tab** the app
reads (no database, shared, screenshots as links) — but this idea was set aside
for later.

### Phase 18 — Full audit + fixes *(PR #28)*
Ran a thorough audit of the whole app (data correctness, edge cases, React,
UX). Headline metrics were correct; the substantive findings were in a few
product-logic spots. The manager reviewed the findings and decided:

| # | Finding | Decision | Result |
|---|---------|----------|--------|
| 1 | "Duplicate clients" mostly = the same buyer contacting different profiles | It's **information, not an error** | Reframed as **"Repeat buyers"**, neutral styling, no error count |
| 2 | The editable roster was localStorage-only (per-device, didn't reach the CEO) | Make it **shared, no database** | Roster is now **read-only from the app config** (identical for everyone), grouped by shift, and drives attribution |
| 3 | Avg deal value diluted by won orders with no price | A won order with **no value is an error** | Flags **Order Value** on won (Placed / Direct Order) rows — 11 caught; new Errors tile + red log cell |
| 4 | "Zaheen" was a real CSR missing from the roster | **Add** them (Morning) | Home-shift + off-shift detection now work |
| 5 | A few country typos weren't merged | **Add aliases** | Maxico→Mexico, Germeny→Germany, Phillipines→Philippines, Branzil→Brazil |
| 6 | `byCsr()` was dead code | Remove it; WhoWrote is the only CSR view | Deleted |
| 7 | The password shipped inside the public bundle (could leak) | **No password anywhere, no leaks** | Removed the gate entirely; the app loads straight to content |

Also checked and confirmed fine: date parsing (all dates are textual-month, zero
ambiguity), conversion logic (Placed + Direct Order, no double-count), CSR
matching (no junk), and empty-data / divide-by-zero guards.

---

## Current state / how it works now

- **Pages:** Dashboard, Follow-ups, Errors, Roster, and drill-down Logs (open by
  clicking any profile / shift / country / status / date / client / CSR).
- **Dashboard:** KPI cards, a conversion time chart, By profile, By shift,
  **Who logged the inquiries**, Outcome mix, Why leads don't convert, By country
  — all respond to the date / profile / shift filter bar, scoped to June onward.
- **Follow-ups:** open (Not Placed) leads by touch count; leads close at 3
  touches or when a Note says so, labelled by client-side reason; a "Why leads
  closed" breakdown; the same filter bar as the dashboard.
- **Errors:** June-onward rows missing a required field (Date, Client Name,
  Order Status, Shift, CSR — plus **Order Value on won orders**); brand-new
  name-only rows are caught by sheet position; **Repeat buyers** shown as
  information.
- **Roster:** read-only, grouped by shift, shared for everyone via the app
  config; it drives the shift / off-shift attribution.
- **Access:** the dashboard is **open to anyone with the link** — there is no
  password. This is the honest, leak-proof state for a static site (real login
  would need a backend). The underlying sheet is already public-by-link, so
  treat the **URL itself** as the thing to share carefully.

## Working conventions
- Every change: build → verify against **live sheet data** → screenshot →
  commit → PR → squash-merge to `main` → the Pages deploy runs → confirm green.
- The roster lives in code, so when someone joins/leaves or changes shift, it's
  a code update + redeploy.
