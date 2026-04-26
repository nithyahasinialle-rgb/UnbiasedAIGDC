import React from 'react'

export default function ShapChart({ shapPlotB64, topFeatures }) {
  if (shapPlotB64) {
    return (
      <div className="card">
        <p className="t-label" style={{ marginBottom: 16 }}>Feature Importance (SHAP)</p>
        <img src={`data:image/png;base64,${shapPlotB64}`} alt="SHAP" style={{ width: '100%', borderRadius: 6 }} />
      </div>
    )
  }

  if (!topFeatures?.length) return null

  const max = topFeatures[0]?.importance || 1

  return (
    <div className="card">
      <p className="t-label" style={{ marginBottom: 16 }}>Feature Importance (SHAP)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topFeatures.slice(0, 10).map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 140, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
              {f.feature}
            </span>
            <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(f.importance / max) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
            </div>
            <span style={{ width: 50, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>
              {f.importance.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
