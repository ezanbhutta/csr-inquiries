import { useState } from 'react'
import { Card, MiniBar, RateBadge, fmt, money } from './ui.jsx'

const COLS = [
  { key: 'profile', label: 'Profile', align: 'left' },
  { key: 'inquiries', label: 'Inquiries', align: 'right' },
  { key: 'converted', label: 'Converted', align: 'right' },
  { key: 'conversionRate', label: 'Conv %', align: 'right' },
  { key: 'value', label: 'Won value', align: 'right' },
]

export default function ProfileTable({ rows }) {
  const [sort, setSort] = useState({ key: 'inquiries', dir: -1 })
  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.key]
    const bv = b[sort.key]
    if (typeof av === 'string') return sort.dir * av.localeCompare(bv)
    return sort.dir * ((av ?? 0) - (bv ?? 0))
  })
  const maxInq = Math.max(1, ...rows.map((r) => r.inquiries))
  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'profile' ? 1 : -1 }))

  return (
    <Card title="By profile" subtitle="Which profiles get the inquiries — and convert them">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`th cursor-pointer select-none ${c.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => toggle(c.key)}
                >
                  {c.label}
                  {sort.key === c.key ? (sort.dir < 0 ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.profile} className="hover:bg-white/[0.03]">
                <td className="td">
                  <div className="font-medium text-white/90">{r.profile}</div>
                  <div className="mt-1.5 w-32"><MiniBar value={r.inquiries} max={maxInq} /></div>
                </td>
                <td className="td text-right tabular-nums">{fmt(r.inquiries)}</td>
                <td className="td text-right tabular-nums text-win">{fmt(r.converted)}</td>
                <td className="td text-right"><RateBadge rate={r.conversionRate} /></td>
                <td className="td text-right tabular-nums text-white/70">{money(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
