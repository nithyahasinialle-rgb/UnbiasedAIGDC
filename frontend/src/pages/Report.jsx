import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import LoadingSpinner from '../components/LoadingSpinner'
import { generateReport } from '../api/client'

export default function Report() {
  const { jobId } = useParams()
  const [phase, setPhase] = useState('idle')
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setError(''); setPhase('loading')
    try {
      const res = await generateReport(jobId)
      setReport(res.data.report_markdown)
      setPhase('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Report generation failed.')
      setPhase('idle')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Link to={`/results/${jobId}`} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>← Results</Link>
            </div>
            <h1 className="t-h1" style={{ marginBottom: 6 }}>Executive Report</h1>
            <p className="t-body">AI-generated narrative summary of your fairness audit.</p>
          </div>
          {phase === 'done' && (
            <button className="btn btn-secondary" onClick={() => window.print()}>Print / Export</button>
          )}
        </div>

        {phase === 'idle' && (
          <div className="card" style={{ padding: '56px 40px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: 'var(--primary-dim)',
              border: '1px solid rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, margin: '0 auto 20px'
            }}>✨</div>
            <h2 className="t-h2" style={{ marginBottom: 10 }}>Generate Narrative Report</h2>
            <p className="t-body" style={{ maxWidth: 380, margin: '0 auto 28px' }}>
              Gemini will analyze your audit metrics and produce a plain-English summary of bias patterns and mitigation recommendations.
            </p>
            {error && <div className="alert alert-error" style={{ marginBottom: 20, justifyContent: 'center' }}><span>⚠</span>{error}</div>}
            <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
              Generate with Gemini
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="card">
            <LoadingSpinner message="Generating Report…" subMessage="Gemini is analyzing your fairness audit data" />
          </div>
        )}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card" style={{ padding: '36px 40px' }}>
              <div className="report-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <Link to="/upload" className="btn btn-primary">New Audit</Link>
              <Link to={`/results/${jobId}`} className="btn btn-secondary">Back to Dashboard</Link>
              <button className="btn btn-ghost" onClick={() => { setPhase('idle'); setReport('') }}>Regenerate</button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
