import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from './ui.jsx'

const short = (key) => {
  const d = new Date(key + 'T00:00:00Z')
  return isNaN(d) ? key : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}

function TipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-white/80">{label}</div>
      <div className="text-white/60">Inquiries: <b className="text-white">{row.inquiries}</b></div>
      <div className="text-white/60">Converted: <b className="text-win">{row.converted}</b></div>
      <div className="text-white/60">
        Conversion: <b className="text-accent-soft">{row.conversionRate}%</b>
      </div>
      {row.rollingRate != null && (
        <div className="text-white/40">7-day avg: {row.rollingRate}%</div>
      )}
    </div>
  )
}

export default function TimeChart({ data }) {
  return (
    <Card
      title="Inquiries & conversion over time"
      subtitle="Daily inquiry volume, conversions, and 7-day rolling conversion rate"
    >
      {data.length === 0 ? (
        <div className="grid h-64 place-items-center text-sm text-white/40">
          No dated inquiries in this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={short}
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={44}
            />
            <YAxis yAxisId="l" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
            <YAxis
              yAxisId="r"
              orientation="right"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<TipBox />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar yAxisId="l" dataKey="inquiries" fill="#7c8fd6" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar yAxisId="l" dataKey="converted" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Line
              yAxisId="r"
              type="monotone"
              dataKey="rollingRate"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: '#7c8fd6' }} /> Inquiries</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-win" /> Converted</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: '#f59e0b' }} /> 7-day conversion %</span>
      </div>
    </Card>
  )
}
