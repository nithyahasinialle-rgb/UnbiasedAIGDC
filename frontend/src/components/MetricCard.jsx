import React from 'react'

export default function MetricCard({ label, value, indicator, color = 'var(--text-primary)', subtext }) {
  return (
    <div className="card card-sm" style={{ padding: '20px 20px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span className="t-label">{label}</span>
        {indicator && (
          <span className="badge" style={{
            background: `${color}18`, color: color,
            border: `1px solid ${color}30`,
            fontSize: '10px'
          }}>{indicator}</span>
        )}
      </div>
      <div className="t-num" style={{ color }}>{value}</div>
      {subtext && <p className="t-sm" style={{ marginTop: 6 }}>{subtext}</p>}
    </div>
  )
}
