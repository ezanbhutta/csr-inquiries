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
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs" style={{ boxShadow: '0 10px 30px rgba(22,10,51,0.12)' }}>
      <div className="mb-1 font-semibold text-ink">{label}</div>
      <div className="text-muted">Inquiries: <b className="text-ink">{row.inquiries}</b></div>
      <div className="text-muted">Converted: <b className="text-mint">{row.converted}</b></div>
      <div className="text-muted">
        Conversion: <b className="text-brand">{row.conversionRate}%</b>
      </div>
      {row.rollingRate != null && <div className="text-dim">7-day avg: {row.rollingRate}%</div>}
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
        <div className="grid h-64 place-items-center text-sm text-dim">
          No dated inquiries in this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE9F6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={short}
              tick={{ fontSize: 11, fill: '#8B82A8' }}
              tickMargin={8}
              stroke="#E8E5F3"
              interval="preserveStartEnd"
              minTickGap={44}
            />
            <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#8B82A8' }} stroke="#E8E5F3" allowDecimals={false} />
            <YAxis
              yAxisId="r"
              orientation="right"
              tick={{ fontSize: 11, fill: '#8B82A8' }}
              stroke="#E8E5F3"
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<TipBox />} cursor={{ fill: 'rgba(114,41,255,0.06)' }} />
            <Bar yAxisId="l" dataKey="inquiries" fill="#9F66FF" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar yAxisId="l" dataKey="converted" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Line yAxisId="r" type="monotone" dataKey="rollingRate" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: '#9F66FF' }} /> Inquiries</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: '#10B981' }} /> Converted</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: '#F59E0B' }} /> 7-day conversion %</span>
      </div>
    </Card>
  )
}
