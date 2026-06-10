import { useState } from 'react'
import { Card, RateBadge, fmt } from './ui.jsx'

// 3 sequential follow-up slots, filled = done.
function Dots({ n }) {
  return (
    <span className="inline-flex gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: i < n ? '#7229FF' : '#E1DCF0' }}
        />
      ))}
    </span>
  )
}

function DaysAgo({ d }) {
  if (d == null) return <span className="text-dim">—</span>
  const tone = d > 7 ? 'text-coral' : d > 3 ? 'text-amber' : 'text-muted'
  return <span className={tone}>{d}d ago</span>
}

const LIMIT = 20

export default function FollowUps({ stats }) {
  const [expanded, setExpanded] = useState(false)
  const { funnel, openTotal, underCount, zeroOpenPct, avgTouches, due } = stats
  const maxInq = Math.max(1, ...funnel.map((f) => f.inquiries))
  const shown = expanded ? due : due.slice(0, LIMIT)

  return (
    <Card
      title="Follow-up system"
      subtitle="Follow Up 1·2·3 → touches per lead. Open lead = Not Placed & not yet won."
      right={
        <span className="pill border-brand/40 text-brand">avg {avgTouches} / open lead</span>
      }
    >
      {/* Research-grounded nudge */}
      <p
        className="mb-4 rounded-lg border px-3 py-2 text-xs"
        style={{ background: '#F1EBFF', borderColor: '#D9C9FF', color: '#5E1FD8' }}
      >
        📈 ~80% of sales need <b>5+ follow-ups</b>, yet ~44% of reps stop after one. Right now{' '}
        <b>{zeroOpenPct}%</b> of your {fmt(openTotal)} open leads have had <b>zero</b> follow-ups, and{' '}
        <b>{fmt(underCount)}</b> still have room for more.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Funnel: conversion by # of follow-ups */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-dim">
            Conversion by # of follow-ups
          </div>
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.touches}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <Dots n={f.touches} /> {f.touches} follow-up{f.touches === 1 ? '' : 's'}
                  </span>
                  <span className="text-muted">
                    {fmt(f.inquiries)} · <RateBadge rate={f.conversionRate} />
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.round((f.inquiries / maxInq) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Due-for-follow-up queue */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-dim">
              Due for follow-up
            </span>
            <span className="pill border-coral/40 text-coral">{fmt(due.length)} leads</span>
          </div>
          {due.length === 0 ? (
            <div className="rounded-lg border border-line bg-raised px-3 py-4 text-center text-sm text-mint">
              ✓ No open leads waiting on a follow-up.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Client</th>
                    <th className="th">Profile</th>
                    <th className="th">Done</th>
                    <th className="th text-right">Last contact</th>
                    <th className="th">Next</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr key={i} className="hover:bg-hover">
                      <td className="td font-medium text-ink">{r.client}</td>
                      <td className="td whitespace-nowrap text-muted">{r.profile}</td>
                      <td className="td"><Dots n={r.followups} /></td>
                      <td className="td whitespace-nowrap text-right"><DaysAgo d={r.daysSince} /></td>
                      <td className="td whitespace-nowrap text-brand">#{r.followups + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {due.length > LIMIT && (
                <button className="seg mt-2 text-brand" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Show less' : `Show all ${fmt(due.length)} →`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
