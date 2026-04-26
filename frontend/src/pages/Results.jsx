import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import MetricCard from '../components/MetricCard'
import BiasChart from '../components/BiasChart'
import ShapChart from '../components/ShapChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { getResult, pollStatus } from '../api/client'

export default function Results() {
  const { jobId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const startPolling = () => {
      if (intervalRef.current) return
      intervalRef.current = setInterval(async () => {
        try {
          const sr = await pollStatus(jobId)
          if (cancelled) return
          if (sr.data.status === 'done') {
            clearInterval(intervalRef.current); intervalRef.current = null
            const fr = await getResult(jobId)
            if (!cancelled) { setResult(fr.data); setLoading(false) }
          } else if (sr.data.status === 'error') {
            clearInterval(intervalRef.current); intervalRef.current = null
            if (!cancelled) { setError(sr.data.error || 'Audit failed.'); setLoading(false) }
          }
        } catch {
          if (!cancelled) {
            clearInterval(intervalRef.current); intervalRef.current = null
            setError('Connection lost.'); setLoading(false)
          }
        }
      }, 2000)
    }

    const fetchResult = async () => {
      try {
        const res = await getResult(jobId)
        if (cancelled) return
        if (res.data.status === 'done') { setResult(res.data); setLoading(false) }
        else if (res.data.status === 'error') { setError(res.data.error || 'Audit failed.'); setLoading(false) }
        else startPolling()
      } catch (err) {
        if (cancelled) return
        setError(err.response?.data?.error || 'Failed to load results.')
        setLoading(false)
      }
    }

    fetchResult()
    return () => {
      cancelled = true
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [jobId])

  if (loading) return <div className="container page-section"><LoadingSpinner message="Running Fairness Audit…" subMessage="This may take 30–60 seconds" /></div>

  if (error) return (
    <div className="container page-section" style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div className="alert alert-error" style={{ marginBottom: 24, justifyContent: 'center' }}>⚠ {error}</div>
      <Link to="/upload" className="btn btn-primary">Start New Audit</Link>
    </div>
  )
  if (!result) return null

  const dpd = result.demographic_parity_difference
  const isFair = Math.abs(dpd) < 0.1
  const verdictColor = isFair ? 'var(--success)' : Math.abs(dpd) < 0.15 ? 'var(--warning)' : 'var(--error)'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: verdictColor }} />
            <h1 className="t-h1">{isFair ? 'No Significant Bias' : 'Bias Detected'}</h1>
          </div>
          <p className="t-body">
            <strong style={{ color: 'var(--text-primary)' }}>{result.target_col}</strong>
            <span> · Protected: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{result.protected_attr}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/mitigate/${jobId}`} className="btn btn-secondary">Mitigate</Link>
          <Link to={`/report/${jobId}`} className="btn btn-primary">Report</Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <MetricCard label="Model Accuracy" value={`${(result.accuracy * 100).toFixed(1)}%`}
          indicator={result.accuracy > 0.8 ? 'Good' : 'Moderate'}
          color={result.accuracy > 0.8 ? 'var(--success)' : 'var(--text-primary)'} />
        <MetricCard label="Parity Difference" value={dpd.toFixed(4)}
          indicator={isFair ? 'Fair' : 'Biased'} color={verdictColor}
          subtext="< 0.10 is acceptable" />
        <MetricCard label="Parity Ratio" value={result.demographic_parity_ratio?.toFixed(4) ?? '—'}
          indicator="Ratio" color="var(--accent)" subtext="1.0 is perfect parity" />
        <MetricCard label="Equalized Odds" value={result.equalized_odds_difference?.toFixed(4) ?? '—'}
          indicator="EO Diff" color="var(--primary-light)" />
      </div>

      {/* Main content */}
      <div className="grid grid-dash" style={{ gap: 16 }}>
        <div className="grid" style={{ gap: 16, alignContent: 'start' }}>
          <BiasChart title="Selection Rate by Group" data={result.selection_rates} />
          <ShapChart shapPlotB64={result.shap_plot_b64} topFeatures={result.top_features} />
        </div>

        <div className="grid" style={{ gap: 16, alignContent: 'start' }}>
          {/* Verdict card */}
          <div className="card" style={{ borderColor: verdictColor + '40', background: verdictColor === 'var(--success)' ? 'var(--success-dim)' : verdictColor === 'var(--warning)' ? 'var(--warning-dim)' : 'var(--error-dim)' }}>
            <p className="t-label" style={{ marginBottom: 10 }}>Verdict</p>
            <p style={{ fontWeight: 700, fontSize: 15, color: verdictColor, marginBottom: 8 }}>
              {result.bias_verdict?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <p className="t-body" style={{ fontSize: 12 }}>
              {isFair
                ? 'This model meets standard fairness thresholds across all measured groups.'
                : 'Demographic parity difference exceeds 0.10. Consider running bias mitigation.'}
            </p>
          </div>

          {/* Config card */}
          <div className="card">
            <p className="t-label" style={{ marginBottom: 14 }}>Audit Config</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { k: 'Target', v: result.target_col },
                { k: 'Protected', v: result.protected_attr },
                { k: 'Groups', v: result.selection_rates?.length ?? '—' },
              ].map(r => (
                <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <span className="t-sm">{r.k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-group table */}
          {result.group_metrics && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p className="t-label">Per-Group Metrics</p>
              </div>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th style={{ textAlign: 'right' }}>Select%</th>
                    <th style={{ textAlign: 'right' }}>Acc%</th>
                    <th style={{ textAlign: 'right' }}>FPR</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.group_metrics).map(([g, m]) => (
                    <tr key={g}>
                      <td style={{ fontWeight: 500 }}>{g}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{(m.selection_rate * 100).toFixed(1)}%</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{(m.accuracy * 100).toFixed(1)}%</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.fpr.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
