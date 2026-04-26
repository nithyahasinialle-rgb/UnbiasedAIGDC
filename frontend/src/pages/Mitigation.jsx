import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ComparisonTable from '../components/ComparisonTable'
import LoadingSpinner from '../components/LoadingSpinner'
import { applyMitigation } from '../api/client'

const METHODS = [
  {
    id: 'exponentiated_gradient',
    label: 'Exponentiated Gradient',
    tag: 'In-processing',
    desc: 'Adjusts model training to directly optimize for demographic parity. Generally achieves a better fairness-accuracy trade-off.',
  },
  {
    id: 'threshold_optimizer',
    label: 'Threshold Optimizer',
    tag: 'Post-processing',
    desc: 'Calibrates decision thresholds per group after training. Faster and non-intrusive to the original model.',
  },
]

export default function Mitigation() {
  const { jobId } = useParams()
  const [selected, setSelected] = useState('exponentiated_gradient')
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleMitigate = async () => {
    setError(''); setPhase('running')
    try {
      const res = await applyMitigation(jobId, selected)
      setResult(res.data)
      setPhase('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Mitigation failed. Please try again.')
      setPhase('idle')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link to={`/results/${jobId}`} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>← Back</Link>
          </div>
          <h1 className="t-h1" style={{ marginBottom: 6 }}>Bias Mitigation</h1>
          <p className="t-body">Apply an algorithmic correction to reduce demographic disparities.</p>
        </div>

        {(phase === 'idle' || phase === 'running') && (
          <div className="card" style={{ marginBottom: phase === 'idle' ? 0 : 20 }}>
            <p className="t-label" style={{ marginBottom: 14 }}>Select Strategy</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {METHODS.map(m => (
                <div
                  key={m.id}
                  className={`method-card ${selected === m.id ? 'selected' : ''}`}
                  onClick={() => phase === 'idle' && setSelected(m.id)}
                  style={{ pointerEvents: phase === 'running' ? 'none' : 'auto' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', border: '2px solid',
                      borderColor: selected === m.id ? 'var(--primary)' : 'var(--border-mid)',
                      background: selected === m.id ? 'var(--primary)' : 'transparent',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {selected === m.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: selected === m.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{m.label}</span>
                    <span className="badge badge-neutral" style={{ marginLeft: 'auto', fontSize: 10 }}>{m.tag}</span>
                  </div>
                  <p className="t-body" style={{ fontSize: 12, paddingLeft: 24 }}>{m.desc}</p>
                </div>
              ))}
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>⚠</span>{error}</div>}

            {phase === 'idle' ? (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleMitigate}>
                Apply Mitigation
              </button>
            ) : (
              <LoadingSpinner message="Applying Corrections…" subMessage="Optimizing model for demographic parity" />
            )}
          </div>
        )}

        {phase === 'done' && result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ComparisonTable before={result.before} after={result.after} method={result.method} />

            {/* Summary */}
            {result.after && result.before && (() => {
              const dpdBefore = Math.abs(result.before.demographic_parity_difference)
              const dpdAfter = Math.abs(result.after.demographic_parity_difference)
              const improved = dpdAfter < dpdBefore
              return (
                <div className={`alert ${improved ? 'alert-success' : 'alert-error'}`}>
                  <span>{improved ? '✓' : '⚠'}</span>
                  <span>
                    {improved
                      ? `Parity difference reduced from ${dpdBefore.toFixed(4)} → ${dpdAfter.toFixed(4)} (${((1 - dpdAfter/dpdBefore)*100).toFixed(1)}% improvement)`
                      : `Mitigation did not improve parity. Consider trying a different strategy.`
                    }
                  </span>
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: 10 }}>
              <Link to={`/report/${jobId}`} className="btn btn-primary btn-lg">Generate Report</Link>
              <button className="btn btn-secondary" onClick={() => { setPhase('idle'); setResult(null) }}>Try Another Method</button>
              <Link to={`/results/${jobId}`} className="btn btn-ghost">Back to Results</Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
