import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthContext } from '../AuthContext'
import { getHistory, getDownloadModelUrl } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

export default function History() {
  const { user, login, loading: authLoading } = useContext(AuthContext)
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    if (!user) return

    const fetchHistory = async () => {
      setLoading(true)
      setError('')
      try {
        const token = await user.getIdToken()
        const res = await getHistory(token)
        setAudits(res.data || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load audit history.')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  const formatDate = (isoStr) => {
    if (!isoStr) return '—'
    try {
      const date = new Date(isoStr)
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoStr
    }
  }

  // Filter & Sort audits
  const filteredAudits = audits
    .filter(a => {
      const name = (a.filename || '').toLowerCase()
      const target = (a.target_col || '').toLowerCase()
      const protectedAttr = (a.protected_attr || '').toLowerCase()
      const term = search.toLowerCase()
      return name.includes(term) || target.includes(term) || protectedAttr.includes(term)
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      }
      if (sortBy === 'oldest') {
        return new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
      }
      if (sortBy === 'accuracy') {
        return (b.accuracy || 0) - (a.accuracy || 0)
      }
      if (sortBy === 'fairness') {
        return Math.abs(a.demographic_parity_difference || 0) - Math.abs(b.demographic_parity_difference || 0)
      }
      return 0
    })

  if (authLoading) {
    return (
      <div className="container page-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner message="Authenticating..." />
      </div>
    )
  }

  // Logged-out Presentation Screen
  if (!user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section" style={{ padding: '60px 0 100px' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '54px', marginBottom: 24, background: 'var(--primary-dim)', 
            width: 96, height: 96, borderRadius: '50%', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            border: '1px solid rgba(37,99,235,0.2)'
          }}>🗄️</div>
          <h1 className="t-h1" style={{ marginBottom: 12 }}>Unlock Audit History</h1>
          <p className="t-body" style={{ fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
            Securely save previous audits, compare changes over time, download historical model pickles (.pkl), and reopen interactive governance reports. Keep your audits organized for presentation.
          </p>
          <div className="card" style={{ background: 'var(--bg-card)', padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="t-body" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              Sign in using Google or a local demo session to activate your dashboard.
            </p>
            <button className="btn btn-primary btn-lg" style={{ alignSelf: 'center', minWidth: 200 }} onClick={login}>
              Sign In to Continue
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="t-h1" style={{ marginBottom: 4 }}>Audit History</h1>
          <p className="t-body">Manage, compare, and download your previous fairness audit results.</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          + Run New Audit
        </Link>
      </div>

      {/* Toolbar */}
      <div className="card-sm" style={{ 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border)', 
        padding: 16, 
        borderRadius: 'var(--radius-md)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        gap: 16, 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <input 
          type="text" 
          placeholder="Search by dataset or attributes..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="select-field"
          style={{ flex: 1, minWidth: 240, backgroundImage: 'none', paddingRight: 14 }}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="t-sm" style={{ whiteSpace: 'nowrap' }}>Sort By:</span>
          <select 
            className="select-field" 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="accuracy">Highest Accuracy</option>
            <option value="fairness">Fairest Model</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ padding: '60px 0' }}>
          <LoadingSpinner message="Fetching previous audits..." />
        </div>
      ) : error ? (
        <div className="alert alert-error" style={{ justifyContent: 'center' }}>⚠ {error}</div>
      ) : filteredAudits.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="t-body" style={{ fontSize: 15, marginBottom: 16 }}>
            {search ? 'No audits match your search query.' : 'You have not saved any audits yet.'}
          </p>
          {!search && (
            <Link to="/upload" className="btn btn-primary">
              Run Your First Audit
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredAudits.map(item => {
            const dpd = item.demographic_parity_difference || 0
            const isFair = Math.abs(dpd) < 0.1
            const badgeColor = isFair ? 'var(--success)' : Math.abs(dpd) < 0.15 ? 'var(--warning)' : 'var(--error)'
            const verdict = isFair ? 'Fair' : Math.abs(dpd) < 0.15 ? 'Slight Bias' : 'Significant Bias'

            // Extract recommended model name
            const bestModel = item.recommended_model?.best_balanced || 'logistic_regression'
            const formattedModelName = bestModel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

            return (
              <motion.div 
                layout
                key={item.job_id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 16, 
                  borderColor: isFair ? 'var(--border)' : `${badgeColor}25`
                }}
              >
                {/* Meta Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 className="t-h3" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      📁 {item.filename || 'dataset.csv'}
                    </h2>
                    <span className="t-sm" style={{ marginTop: 2, display: 'inline-block' }}>
                      Audited: {formatDate(item.timestamp)}
                    </span>
                  </div>
                  <span className="badge" style={{ background: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}25` }}>
                    {verdict}
                  </span>
                </div>

                <div className="divider" />

                {/* Info Blocks */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                  <div>
                    <span className="t-label" style={{ display: 'block', marginBottom: 4 }}>Configuration</span>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      Target: <strong>{item.target_col}</strong>
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      Protected: <strong>{item.protected_attr}</strong>
                    </p>
                  </div>
                  <div>
                    <span className="t-label" style={{ display: 'block', marginBottom: 4 }}>Accuracy</span>
                    <span className="t-mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.accuracy ? `${(item.accuracy * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="t-label" style={{ display: 'block', marginBottom: 4 }}>Parity Diff</span>
                    <span className="t-mono" style={{ fontSize: 16, fontWeight: 600, color: badgeColor }}>
                      {dpd != null ? dpd.toFixed(4) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="t-label" style={{ display: 'block', marginBottom: 4 }}>Recommended Model</span>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                      {formattedModelName}
                    </span>
                  </div>
                </div>

                <div className="divider" />

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a 
                      href={getDownloadModelUrl(item.job_id, bestModel)} 
                      className="btn btn-secondary" 
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      💾 Download Recommended Model (.pkl)
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/results/${item.job_id}`} className="btn btn-primary" style={{ padding: '6px 16px' }}>
                      Open Results →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
