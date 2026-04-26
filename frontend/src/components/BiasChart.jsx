import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--primary-light)' }}>
        {(payload[0].value * 100).toFixed(1)}%
      </p>
    </div>
  )
}

export default function BiasChart({ title, data, dataKey = 'rate', nameKey = 'group' }) {
  if (!data?.length) return (
    <div className="card" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="t-sm">No data available</p>
    </div>
  )

  const avg = data.reduce((s, d) => s + d[dataKey], 0) / data.length
  const COLORS = ['#2563eb','#0ea5e9','#06b6d4','#3b82f6','#38bdf8']

  return (
    <div className="card">
      <p className="t-label" style={{ marginBottom: 20 }}>{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border)" />
          <XAxis dataKey={nameKey} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <ReferenceLine y={avg} stroke="var(--border-bright)" strokeDasharray="4 3" label={{ value: 'avg', fill: 'var(--text-muted)', fontSize: 10, position: 'right' }} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
