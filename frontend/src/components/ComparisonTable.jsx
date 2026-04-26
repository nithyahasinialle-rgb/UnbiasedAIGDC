import React from 'react'

export default function ComparisonTable({ before, after, method }) {
  if (!before || !after) return null

  const metrics = [
    { label: 'Model Accuracy', b: before.accuracy, a: after.accuracy, type: 'pct', higherBetter: true },
    { label: 'Demographic Parity Diff.', b: before.demographic_parity_difference, a: after.demographic_parity_difference, type: 'num', higherBetter: false },
    { label: 'Demographic Parity Ratio', b: before.demographic_parity_ratio, a: after.demographic_parity_ratio, type: 'num', higherBetter: true },
    { label: 'Equalized Odds Diff.', b: before.equalized_odds_difference, a: after.equalized_odds_difference, type: 'num', higherBetter: false },
  ]

  const fmt = (v, type) => {
    if (v == null || isNaN(v)) return '—'
    return type === 'pct' ? `${(v * 100).toFixed(1)}%` : v.toFixed(4)
  }

  const methodLabel = method === 'threshold_optimizer' ? 'Threshold Optimizer' : 'Exponentiated Gradient'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="t-label">Mitigation Impact</p>
        <span className="badge badge-info">{methodLabel}</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th style={{ textAlign: 'right' }}>Baseline</th>
            <th style={{ textAlign: 'right' }}>Mitigated</th>
            <th style={{ textAlign: 'right' }}>Change</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => {
            const delta = m.a - m.b
            const improved = m.higherBetter ? delta > 0 : delta < 0
            const neutral = Math.abs(delta) < 0.0001
            const color = neutral ? 'var(--text-muted)' : improved ? 'var(--success)' : 'var(--error)'
            const sign = delta > 0 ? '+' : ''
            const deltaFmt = m.type === 'pct'
              ? `${sign}${(delta * 100).toFixed(2)}pp`
              : `${sign}${delta.toFixed(4)}`

            return (
              <tr key={m.label}>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.label}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(m.b, m.type)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color }}>{fmt(m.a, m.type)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color }}>
                  {neutral ? '—' : deltaFmt}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
