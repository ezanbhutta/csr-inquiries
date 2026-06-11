// ---------------------------------------------------------------------------
// CSR Inquiries — canonical configuration.
// Values are lifted verbatim from CSR Pulse so the two dashboards line up
// (same profiles, same roster, same shift model, same 5 AM PKT business day).
// ---------------------------------------------------------------------------

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

// The "Client Daily Inquiries" workbook (shared "anyone with link can view").
// Each tab is one profile; tabs are read live via the public gviz CSV endpoint.
export const SHEET_ID =
  env.VITE_SHEET_ID || '1Pp6RhsR96FzGfB3MV--CYj7Idja2-iyF7BNPhJ9Md_A'

// Light, client-side gate (not real security — see README). Override per deploy.
// Defaults to the CSR Pulse password so staff use one credential across both.
export const DASH_PASSWORD = env.VITE_DASH_PASSWORD || 'Haseeb@0900#'

// The 10 profile tabs, named exactly as they appear in the workbook.
export const PROFILES = [
  'Abdul Haseeb',
  'Tariq Mahmood',
  'Eikon Designs',
  'Alee Studioz',
  'Carpicon',
  'Dygram Designs',
  'Storm Design',
  'WeDesignz',
  'Grid Designs',
  'X Studioz',
]

export const SHIFTS = ['Morning', 'Evening', 'Night']
export const UNASSIGNED = 'Unassigned'

// An inquiry "converted" when its Order Status is one of these (lower-cased).
export const CONVERTED_STATUSES = ['placed', 'direct order']

// Business day rolls at 5 AM PKT (UTC+5), same as CSR Pulse.
export const BUSINESS_DAY_CUTOFF_HOUR = 5
export const PKT_OFFSET_HOURS = 5

// Roster — taken verbatim from CSR Pulse (id, name, shift, role, active).
// Former CSRs are kept (active: false) so historical inquiries still attribute.
export const ROSTER = [
  { id: 'tanzeel', name: 'Tanzeel', shift: 'Morning', role: 'CSR', active: true },
  { id: 'iqra', name: 'Iqra', shift: 'Morning', role: 'CSR', active: true },
  { id: 'hassan', name: 'Hassan', shift: 'Morning', role: 'CSR', active: true },
  { id: 'hira', name: 'Hira', shift: 'Morning', role: 'CSR', active: true },
  { id: 'misbah', name: 'Misbah', shift: 'Morning', role: 'CSR', active: true },
  { id: 'gulba', name: 'Gulba', shift: 'Morning', role: 'CSR', active: true },
  { id: 'amrah', name: 'Amrah', shift: 'Morning', role: 'CSR', active: true },
  { id: 'tayyab', name: 'Tayyab', shift: 'Evening', role: 'CSR', active: true },
  { id: 'hasnain', name: 'Hasnain Gillani', shift: 'Evening', role: 'CSR', active: true },
  { id: 'alishakeel', name: 'Ali Shakeel', shift: 'Evening', role: 'CSR', active: true },
  { id: 'basit', name: 'Abdul Basit', shift: 'Evening', role: 'CSR', active: true },
  { id: 'hadi', name: 'Hadi', shift: 'Evening', role: 'CSR', active: true },
  { id: 'aneeq', name: 'Aneeq', shift: 'Evening', role: 'CSR', active: true },
  { id: 'faiz', name: 'Faiz', shift: 'Evening', role: 'CSR', active: true },
  { id: 'salman', name: 'Salman', shift: 'Night', role: 'CSR', active: true },
  { id: 'saad', name: 'Saad', shift: 'Night', role: 'CSR', active: true },
  { id: 'shahzaib', name: 'Shahzaib', shift: 'Night', role: 'CSR', active: true },
  { id: 'swaid', name: 'Swaid', shift: 'Night', role: 'CSR', active: true },
  { id: 'samama', name: 'Samama', shift: 'Night', role: 'CSR', active: true },
  { id: 'ahmad', name: 'Ahmad', shift: 'Night', role: 'CSR', active: true },
  { id: 'nadir', name: 'Nadir', shift: 'Night', role: 'CSR', active: true },
  { id: 'zuhair', name: 'Zuhair', shift: 'Night', role: 'CSR', active: true },
  { id: 'noor', name: 'Noor', shift: 'Night', role: 'CSR', active: true },
  { id: 'zubair', name: 'Zubair', shift: 'Night', role: 'Manager', active: true },
  { id: 'ezan', name: 'Ezan', shift: 'Night', role: 'Manager', active: true },
  // Former CSRs — kept for historical attribution, marked inactive.
  { id: 'fatima', name: 'Fatima', shift: 'Morning', role: 'CSR', active: false },
  { id: 'laiba', name: 'Laiba', shift: 'Morning', role: 'CSR', active: false },
  { id: 'maria', name: 'Maria', shift: 'Morning', role: 'CSR', active: false },
  { id: 'rida', name: 'Rida', shift: 'Morning', role: 'CSR', active: false },
]

// Flat canonical name -> shift, for attributing a CSR to a shift.
export const CSR_SHIFT = ROSTER.reduce((acc, r) => {
  acc[r.name.toLowerCase()] = r.shift
  return acc
}, {})

// Alias map for the messy CSR values seen in the inquiry sheet -> canonical.
// Mirrors CSR Pulse's CSR_ALIASES intent; keys are lower-cased.
export const CSR_ALIASES = {
  basit: 'Abdul Basit',
  'abdul basit': 'Abdul Basit',
  hasnain: 'Hasnain Gillani',
  'hasnain gillani': 'Hasnain Gillani',
  ali: 'Ali Shakeel',
  'ali shakeel': 'Ali Shakeel',
  saad: 'Saad',
  'saad khan': 'Saad',
  samama: 'Samama',
  ahmad: 'Ahmad',
  'ahmad bibrash': 'Ahmad',
  ezan: 'Ezan',
  zubair: 'Zubair',
  tayyab: 'Tayyab',
  tanzeel: 'Tanzeel',
  salman: 'Salman',
  amrah: 'Amrah',
  swaid: 'Swaid',
  iqra: 'Iqra',
  hassan: 'Hassan',
  hira: 'Hira',
  misbah: 'Misbah',
  gulba: 'Gulba',
  hadi: 'Hadi',
  aneeq: 'Aneeq',
  faiz: 'Faiz',
  shahzaib: 'Shahzaib',
  nadir: 'Nadir',
  noor: 'Noor',
}

export const gvizCsvUrl = (sheetName) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName,
  )}`
