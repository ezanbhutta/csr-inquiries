import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from './ui.jsx'

const short = (key) => {
  const d = new Date(key + 'T00:00:00Z')
  return isNaN(d) ? key : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}
const longLabel = (key) => {
  const d = new Date(key + 'T00:00:00Z')
  return isNaN(d) ? key : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const Row = ({ c, k, v }) => (
  <div className="flex items-center gap-1.5 text-muted">
    <i className="h-2 w-2 rounded-full" style={{ background: c }} />
    {k}: <b className="text-ink">{v}</b>
  </div>
)

function TipBox({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs" style={{ boxShadow: '0 10px 30px rgba(22,10,51,0.12)' }}>
      <div className="mb-1.5 font-semibold text-ink">{longLabel(row.date)}</div>
      <Row c="#10B981" k="Converted" v={row.converted} />
      <Row c="#B79BFF" k="Inquiries" v={row.inquiries} />
      <div className="mt-1 border-t border-line pt-1 text-muted">
        Conversion <b className="text-brand">{row.conversionRate}%</b>
      </div>
    </div>
  )
}

const LEGEND = [
  { id: 'converted', label: 'Converted', color: '#10B981' },
  { id: 'rest', label: 'Not converted', color: '#C9B6FF' },
]

export default function TimeChart({ data, onSelect }) {
  const [show, setShow] = useState({ converted: true, rest: true })
  const series = data.map((d) => ({ ...d, rest: Math.max(0, d.inquiries - d.converted) }))
  const toggle = (id) => setShow((s) => ({ ...s, [id]: !s[id] }))

  return (
    <Card
      title="Inquiries & conversion over time"
      subtitle="Each bar is a day's inquiries — green is what converted. Tap a bar to open that day's log; tap a chip to toggle a series."
    >
      {data.length === 0 ? (
        <div className="grid h-64 place-items-center text-sm text-dim">No dated inquiries in this range.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={series}
              margin={{ top: 10, right: 6, bottom: 0, left: -20 }}
              onClick={(e) => e?.activeLabel && onSelect?.(e.activeLabel)}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="gWin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gRest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B79BFF" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#CBB8FF" stopOpacity={0.32} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="#ECE9F6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={short}
                tick={{ fontSize: 11, fill: '#8B82A8' }}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={44}
              />
              <YAxis tick={{ fontSize: 11, fill: '#8B82A8' }} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
              <Tooltip content={<TipBox />} cursor={{ fill: 'rgba(114,41,255,0.06)' }} />
              {show.converted && (
                <Bar dataKey="converted" stackId="v" fill="url(#gWin)" maxBarSize={26} radius={show.rest ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
              )}
              {show.rest && <Bar dataKey="rest" stackId="v" fill="url(#gRest)" maxBarSize={26} radius={[4, 4, 0, 0]} />}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-2">
            {LEGEND.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => toggle(l.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${show[l.id] ? 'border-line text-muted hover:bg-hover' : 'border-line text-dim line-through opacity-50'}`}
              >
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} /> {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
