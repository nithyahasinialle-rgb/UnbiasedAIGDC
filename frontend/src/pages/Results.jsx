import React, { useEffect, useState, useRef, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MetricCard from '../components/MetricCard'
import BiasChart from '../components/BiasChart'
import ShapChart from '../components/ShapChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { getResult, pollStatus, getAdvisorGuidance, getDownloadModelUrl, associateAudit } from '../api/client'
import { AuthContext } from '../AuthContext'

export default function Results() {
  const { jobId } = useParams()
  const { user } = useContext(AuthContext)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  // Advisor state
  const [advisorMarkdown, setAdvisorMarkdown] = useState('')
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const [advisorError, setAdvisorError] = useState('')

  // Selected active model state for detailed explorer
  const [activeModel, setActiveModel] = useState('logistic_regression')

  // 1. Fetch Job Results & Poll if running
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
            if (!cancelled) { 
              setResult(fr.data)
              setLoading(false) 
            }
          } else if (sr.data.status === 'error') {
            clearInterval(intervalRef.current); intervalRef.current = null
            if (!cancelled) { 
              setError(sr.data.error || 'Audit failed.')
              setLoading(false) 
            }
          }
        } catch {
          if (!cancelled) {
            clearInterval(intervalRef.current); intervalRef.current = null
            setError('Connection lost.')
            setLoading(false)
          }
        }
      }, 2000)
    }

    const fetchResult = async () => {
      try {
        const res = await getResult(jobId)
        if (cancelled) return
        if (res.data.status === 'done') { 
          setResult(res.data)
          setLoading(false) 
        }
        else if (res.data.status === 'error') { 
          setError(res.data.error || 'Audit failed.')
          setLoading(false) 
        }
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

  // 2. Associate Job with Logged-In User
  useEffect(() => {
    if (user && jobId && result && result.status === 'done') {
      const linkJob = async () => {
        try {
          const token = await user.getIdToken()
          await associateAudit(jobId, token)
        } catch (e) {
          console.warn("Failed to associate audit with user:", e)
        }
      }
      linkJob()
    }
  }, [user, jobId, result])

  // 3. Fetch Gemini Advisor guidance when results are ready
  useEffect(() => {
    if (result && result.status === 'done' && !advisorMarkdown && !advisorLoading) {
      const fetchAdvisor = async () => {
        setAdvisorLoading(true)
        setAdvisorError('')
        try {
          const res = await getAdvisorGuidance(jobId)
          setAdvisorMarkdown(res.data.advisor_markdown)
        } catch (e) {
          setAdvisorError('Consultant guidance unavailable. Please verify GEMINI_API_KEY.')
        } finally {
          setAdvisorLoading(false)
        }
      }
      fetchAdvisor()
    }
  }, [result, jobId])

  if (loading) {
    return (
      <div className="container page-section">
        <LoadingSpinner message="Running Fairness Audit…" subMessage="Training LR, Random Forest, and XGBoost models side-by-side" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container page-section" style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div className="alert alert-error" style={{ marginBottom: 24, justifyContent: 'center' }}>⚠ {error}</div>
        <Link to="/upload" className="btn btn-primary">Start New Audit</Link>
      </div>
    )
  }

  if (!result) return null

  // Models Dictionary mapping
  // If result.models does not exist (fallback for old audits), build a single-entry dictionary using root keys
  const modelsMap = result.models || {
    logistic_regression: {
      accuracy: result.accuracy,
      precision: result.precision || 0.8,
      recall: result.recall || 0.8,
      f1_score: result.f1_score || 0.8,
      demographic_parity_difference: result.demographic_parity_difference,
      demographic_parity_ratio: result.demographic_parity_ratio,
      equalized_odds_difference: result.equalized_odds_difference,
      equal_opportunity_difference: result.equal_opportunity_difference || 0.0,
      group_metrics: result.group_metrics,
      selection_rates: result.selection_rates,
      top_features: result.top_features,
      shap_plot_b64: result.shap_plot_b64,
      bias_verdict: result.bias_verdict
    }
  }

  const activeModelData = modelsMap[activeModel] || modelsMap['logistic_regression']
  
  // Overall Fairness Verdict based on Recommended Model or Active Model
  const activeDpd = activeModelData.demographic_parity_difference || 0
  const isFair = Math.abs(activeDpd) < 0.1
  const severityColor = isFair ? 'var(--success)' : Math.abs(activeDpd) < 0.15 ? 'var(--warning)' : 'var(--error)'
  const severityBadge = isFair ? 'badge-success' : Math.abs(activeDpd) < 0.15 ? 'badge-warning' : 'badge-error'
  const severityLabel = isFair ? 'Low Risk' : Math.abs(activeDpd) < 0.15 ? 'Medium Risk' : 'High Risk'

  // Format model identifiers to labels
  const getModelLabel = (key) => {
    return {
      logistic_regression: 'Logistic Regression',
      random_forest: 'Random Forest',
      xgboost: 'XGBoost'
    }[key] || key
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section">
      
      {/* ── HEADER & CONFIG ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor }} />
            <h1 className="t-h1">Model Fairness Audit & Analysis</h1>
          </div>
          <p className="t-body">
            Dataset: <strong style={{ color: 'var(--text-primary)' }}>{result.filename || 'dataset.csv'}</strong>
            <span style={{ margin: '0 8px' }}>·</span>
            Target: <strong style={{ color: 'var(--text-primary)' }}>{result.target_col}</strong>
            <span style={{ margin: '0 8px' }}>·</span>
            Sensitive Feature: <strong style={{ color: 'var(--text-primary)' }}>{result.protected_attr}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/mitigate/${jobId}`} className="btn btn-secondary">
            Run Mitigation
          </Link>
          <Link to={`/report/${jobId}`} className="btn btn-secondary">
            Full Report
          </Link>
        </div>
      </div>

      {/* ── TOP-LEVEL SUMMARY CARDS ── */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        
        {/* Card 1: Fairness Severity Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `4px solid ${severityColor}` }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="t-label">Bias Severity Index</span>
              <span className={`badge ${severityBadge}`}>{severityLabel}</span>
            </div>
            <div className="t-num" style={{ color: severityColor, fontSize: '28px', fontWeight: 700 }}>
              {activeModelData.bias_verdict?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Fair'}
            </div>
          </div>
          <p className="t-sm" style={{ marginTop: 8 }}>
            {isFair 
              ? 'Model is compliant with standard regulatory parity thresholds (gap < 10%).'
              : 'Disparities detected in model selection rates across groups. Mitigation recommended.'}
          </p>
        </div>

        {/* Card 2: Recommended Model Choice */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--accent)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="t-label">Recommended Model</span>
              <span className="badge badge-info">Balanced Choice</span>
            </div>
            <div className="t-num" style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: 700 }}>
              {result.recommended_model ? getModelLabel(result.recommended_model.best_balanced) : 'Logistic Regression'}
            </div>
          </div>
          <p className="t-sm" style={{ marginTop: 8 }}>
            Best trade-off between predictive accuracy and demographic fairness metrics.
          </p>
        </div>

        {/* Card 3: Download Models Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="t-label">Download Trained Model (.pkl)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
            {Object.keys(modelsMap).map(mKey => (
              <a 
                key={mKey}
                href={getDownloadModelUrl(jobId, mKey)}
                download
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{getModelLabel(mKey)}</span>
                <span className="t-sm" style={{ opacity: 0.6 }}>.pkl</span>
              </a>
            ))}
          </div>
        </div>

      </div>

      {/* ── DASHBOARD GRID ── */}
      <div className="grid grid-dash" style={{ gap: 20 }}>
        
        {/* LEFT COLUMN: Comparisons and Explorers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Section A: Model Comparison Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="t-label">Multi-Model Performance & Fairness Comparison</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '12px', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Model Name</th>
                    <th style={{ textAlign: 'right' }}>Accuracy</th>
                    <th style={{ textAlign: 'right' }}>F1 Score</th>
                    <th style={{ textAlign: 'right' }}>Parity Diff (SPD)</th>
                    <th style={{ textAlign: 'right' }}>Parity Ratio (DI)</th>
                    <th style={{ textAlign: 'right' }}>Eq. Opp. Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(modelsMap).map(([mKey, mVal]) => {
                    const spd = mVal.demographic_parity_difference || 0
                    const spdColor = Math.abs(spd) < 0.1 ? 'var(--success)' : Math.abs(spd) < 0.15 ? 'var(--warning)' : 'var(--error)'
                    const isBalanced = result.recommended_model?.best_balanced === mKey

                    return (
                      <tr 
                        key={mKey} 
                        style={{ 
                          background: isBalanced ? 'rgba(6, 182, 212, 0.04)' : 'transparent',
                          fontWeight: isBalanced ? '600' : '400'
                        }}
                      >
                        <td style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getModelLabel(mKey)}
                          {isBalanced && <span className="badge badge-info" style={{ fontSize: '8px', padding: '1px 4px' }}>Best</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(mVal.accuracy * 100).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mVal.f1_score ? `${(mVal.f1_score * 100).toFixed(1)}%` : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: spdColor }}>{spd.toFixed(4)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mVal.demographic_parity_ratio ? mVal.demographic_parity_ratio.toFixed(4) : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mVal.equal_opportunity_difference ? mVal.equal_opportunity_difference.toFixed(4) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Model Visual Explorer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="t-label">Interactive Explorer:</span>
              <div style={{ display: 'inline-flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: 2 }}>
                {Object.keys(modelsMap).map(mKey => (
                  <button
                    key={mKey}
                    onClick={() => setActiveModel(mKey)}
                    className="btn"
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      background: activeModel === mKey ? 'var(--primary)' : 'transparent',
                      color: activeModel === mKey ? 'white' : 'var(--text-secondary)',
                      borderRadius: '4px',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    {getModelLabel(mKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-2">
              <BiasChart title={`Selection Rate (${getModelLabel(activeModel)})`} data={activeModelData.selection_rates} />
              <ShapChart shapPlotB64={activeModelData.shap_plot_b64} topFeatures={activeModelData.top_features} />
            </div>
            
            {activeModelData.group_metrics && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p className="t-label">Group-Specific Metrics ({getModelLabel(activeModel)})</p>
                </div>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Protected Group</th>
                      <th style={{ textAlign: 'right' }}>Selection Rate</th>
                      <th style={{ textAlign: 'right' }}>Accuracy</th>
                      <th style={{ textAlign: 'right' }}>False Positive Rate</th>
                      <th style={{ textAlign: 'right' }}>False Negative Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(activeModelData.group_metrics).map(([group, metrics]) => (
                      <tr key={group}>
                        <td style={{ fontWeight: 500 }}>{group}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(metrics.selection_rate * 100).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(metrics.accuracy * 100).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{metrics.fpr.toFixed(3)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{metrics.fnr ? metrics.fnr.toFixed(3) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Gemini Advisor & Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Gemini Fairness Advisor Panel */}
          <div className="card" style={{ 
            borderColor: 'rgba(37,99,235,0.2)', 
            boxShadow: '0 4px 24px rgba(37,99,235,0.06)',
            position: 'relative' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-dim)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 
              }}>🤖</div>
              <div>
                <p className="t-label" style={{ margin: 0, lineHeight: 1 }}>Gemini Fairness Advisor</p>
                <span className="t-sm" style={{ fontSize: 10 }}>Intelligent Governance Guidance</span>
              </div>
            </div>

            <div className="divider" style={{ marginBottom: 16 }} />

            <div style={{ minHeight: 200, fontSize: '13px', lineHeight: '1.65' }}>
              {advisorLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
                  <LoadingSpinner message="Consulting Gemini..." />
                  <span className="t-sm" style={{ opacity: 0.6, fontSize: 11 }}>Generating audit analysis narrative...</span>
                </div>
              ) : advisorError ? (
                <div className="alert alert-error" style={{ fontSize: '12px' }}>
                  <span>⚠</span>
                  {advisorError}
                </div>
              ) : (
                <div className="advisor-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {advisorMarkdown}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Transparent Recommendation Card */}
          {result.recommended_model && (
            <div className="card">
              <span className="t-label" style={{ display: 'block', marginBottom: 12 }}>Transparent Model Selection Guidance</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { title: '🥇 Best Accuracy Choice', model: result.recommended_model.best_accuracy },
                  { title: '⚖️ Fairest Choice', model: result.recommended_model.fairest },
                  { title: '💡 Best Balanced Choice', model: result.recommended_model.best_balanced },
                ].map(rec => (
                  <div key={rec.title} style={{ padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{rec.title}</p>
                    <span className="t-mono" style={{ fontSize: 13, color: 'var(--primary-light)' }}>
                      {getModelLabel(rec.model)}
                    </span>
                  </div>
                ))}
                
                <div style={{ background: 'var(--bg-hover)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border-mid)', marginTop: 4 }}>
                  <p className="t-label" style={{ fontSize: '9px', marginBottom: 4 }}>Selection Logic Formula</p>
                  <p className="t-body" style={{ fontSize: 11, lineHeight: 1.5 }}>
                    {result.recommended_model.logic}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </motion.div>
  )
}
