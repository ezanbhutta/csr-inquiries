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
export const DASH_PASSWORD = env.VITE_DASH_PASSWORD || 'inquiries'

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

// Roster — canonical CSR names by shift (night managers fold into Night).
export const ROSTER = {
  Morning: ['Tanzeel', 'Iqra', 'Hassan', 'Hira', 'Misbah', 'Gulba', 'Amrah'],
  Evening: ['Tayyab', 'Hasnain Gillani', 'Ali Shakeel', 'Abdul Basit', 'Hadi', 'Aneeq', 'Faiz'],
  Night: ['Salman', 'Saad', 'Shahzaib', 'Swaid', 'Samama', 'Ahmad', 'Nadir', 'Zuhair', 'Noor', 'Zubair', 'Ezan'],
}

// Flat canonical name -> shift, for attributing a CSR to a shift.
export const CSR_SHIFT = Object.entries(ROSTER).reduce((acc, [shift, names]) => {
  names.forEach((n) => (acc[n.toLowerCase()] = shift))
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
