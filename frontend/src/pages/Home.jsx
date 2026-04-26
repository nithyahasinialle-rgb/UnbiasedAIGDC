import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const Feature = ({ icon, title, desc }) => (
  <div style={{ display: 'flex', gap: 14 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginTop: 2,
      background: 'var(--primary-dim)', border: '1px solid rgba(37,99,235,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
    }}>{icon}</div>
    <div>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>{title}</p>
      <p className="t-body" style={{ fontSize: 13 }}>{desc}</p>
    </div>
  </div>
)

const MockDashboard = () => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
    {/* Title bar */}
    <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)', opacity: 0.7 }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', opacity: 0.7 }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', opacity: 0.7 }} />
      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>Fairness Audit — loan_model_v3.csv</span>
    </div>
    {/* Banner */}
    <div style={{ padding: '14px 20px', background: 'var(--error-dim)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--error)', flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Significant Bias Detected</span>
      <span className="badge badge-error" style={{ marginLeft: 'auto' }}>High Risk</span>
    </div>
    {/* Metrics */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid var(--border)' }}>
      {[
        { l: 'Accuracy', v: '84.2%', c: 'var(--text-primary)' },
        { l: 'Parity Diff', v: '0.1842', c: 'var(--error)' },
        { l: 'EO Diff', v: '0.2130', c: 'var(--warning)' },
      ].map((m, i) => (
        <div key={i} style={{ padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.l}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: m.c }}>{m.v}</p>
        </div>
      ))}
    </div>
    {/* Chart sketch */}
    <div style={{ padding: '16px 20px' }}>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Group Selection Rates</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 56 }}>
        {[0.72, 0.38, 0.65, 0.29, 0.58].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h * 100}%`, background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
        ))}
      </div>
    </div>
  </div>
)

export default function Home() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <section style={{ padding: '72px 0 64px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="badge badge-info" style={{ marginBottom: 20 }}>AI Fairness Platform</div>
              <h1 className="t-display" style={{ marginBottom: 16 }}>
                Detect and Fix<br />
                <span style={{ color: 'var(--primary-light)' }}>Algorithmic Bias</span>
              </h1>
              <p className="t-body" style={{ fontSize: 15, marginBottom: 32, maxWidth: 420 }}>
                Upload any CSV dataset, select your target and protected attributes, and get a complete fairness audit with SHAP explainability in under a minute.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Link to="/upload" className="btn btn-primary btn-lg">Start Free Audit</Link>
                <span className="t-sm">No account required</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <MockDashboard />
            </motion.div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', padding: '56px 0' }}>
        <div className="container">
          <p className="t-label" style={{ textAlign: 'center', marginBottom: 32 }}>What Unbiased Does</p>
          <div className="grid grid-3" style={{ gap: 28 }}>
            <Feature icon="🔍" title="Detect Disparities" desc="Compute demographic parity and equalized odds metrics across all protected groups automatically." />
            <Feature icon="🧠" title="Explain Decisions" desc="SHAP values reveal which features drive biased outcomes and by how much." />
            <Feature icon="⚖️" title="Mitigate Bias" desc="Apply Fairlearn's Exponentiated Gradient or Threshold Optimizer in one click." />
          </div>
        </div>
      </section>
    </motion.div>
  )
}
