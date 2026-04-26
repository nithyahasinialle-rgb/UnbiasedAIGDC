import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import UploadZone from '../components/UploadZone'
import LoadingSpinner from '../components/LoadingSpinner'
import { uploadCSV, startAudit, pollStatus } from '../api/client'

const Step = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div className={`step-dot ${done ? 'done' : active ? 'active' : ''}`}>
      {done ? '✓' : n}
    </div>
    <span style={{ fontSize: 13, fontWeight: active || done ? 500 : 400, color: active || done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
  </div>
)

// Extract the most useful error message from an axios error
function extractError(err) {
  if (err?.response?.data?.error) return err.response.data.error
  if (err?.response?.data?.message) return err.response.data.message
  if (err?.response?.status === 404) return 'Session expired — please re-upload your file.'
  if (err?.response?.status === 400) return err.response.data ? JSON.stringify(err.response.data) : 'Bad request.'
  if (err?.message?.includes('Network Error') || err?.code === 'ERR_NETWORK') return `Cannot reach the backend. URL: ${err?.config?.url} - ${err?.message}`
  if (err?.code === 'ECONNABORTED') return 'Request timed out. The server may be overloaded.'
  return err?.message || 'Unexpected error.'
}

export default function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [columns, setColumns] = useState([])
  const [fileId, setFileId] = useState(null)
  const [targetCol, setTargetCol] = useState('')
  const [protectedAttr, setProtectedAttr] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const handleFile = useCallback(async (f) => {
    setFile(f); setError(''); setPhase('uploading')
    try {
      const res = await uploadCSV(f, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
      })
      setFileId(res.data.file_id)
      setColumns(res.data.columns || [])
      setPhase('configuring')
    } catch (err) {
      setError(extractError(err))
      setPhase('idle')
    }
  }, [])

  const handleStartAudit = async () => {
    if (!targetCol || !protectedAttr) return
    setError(''); setPhase('auditing')
    try {
      const res = await startAudit(fileId, targetCol, protectedAttr)
      pollForResult(res.data.job_id)
    } catch (err) {
      setError(extractError(err))
      setPhase('configuring')
    }
  }

  const pollForResult = (jobId) => {
  if (intervalRef.current) clearInterval(intervalRef.current)
  let networkRetries = 0
  const maxRetries = 15  // wait up to ~75 seconds for backend to wake

  intervalRef.current = setInterval(async () => {
    try {
      const res = await pollStatus(jobId)
      networkRetries = 0  // reset on success
      if (res.data.status === 'done') {
        clearInterval(intervalRef.current); intervalRef.current = null
        navigate(`/results/${jobId}`)
      } else if (res.data.status === 'error') {
        clearInterval(intervalRef.current); intervalRef.current = null
        setError(res.data.error || 'Audit failed.')
        setPhase('configuring')
      }
    } catch (err) {
      networkRetries++
      if (networkRetries >= maxRetries) {
        clearInterval(intervalRef.current); intervalRef.current = null
        setError(extractError(err))
        setPhase('configuring')
      }
      // else: keep polling silently
    }
  }, 5000)
}

  const currentStep = { idle: 1, uploading: 1, configuring: 2, auditing: 3 }[phase] || 1

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 className="t-h1" style={{ marginBottom: 6 }}>New Fairness Audit</h1>
          <p className="t-body">Upload a dataset and configure your audit parameters.</p>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 32, padding: '14px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <Step n="1" label="Upload" active={currentStep === 1} done={currentStep > 1} />
          <div style={{ width: 24, height: 1, background: 'var(--border)', alignSelf: 'center' }} />
          <Step n="2" label="Configure" active={currentStep === 2} done={currentStep > 2} />
          <div style={{ width: 24, height: 1, background: 'var(--border)', alignSelf: 'center' }} />
          <Step n="3" label="Running" active={currentStep === 3} done={false} />
        </div>

        {phase === 'idle' && (
          <div className="card">
            <UploadZone onFile={handleFile} file={file} />
            {error && <div className="alert alert-error" style={{ marginTop: 16 }}><span>⚠</span>{error}</div>}
          </div>
        )}

        {phase === 'uploading' && (
          <div className="card" style={{ padding: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Uploading {file?.name}…</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="t-sm" style={{ marginTop: 8 }}>{uploadProgress}%</p>
          </div>
        )}

        {phase === 'configuring' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '10px 14px', background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7 }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--success)' }}>{file?.name}</span>
              <span className="t-sm" style={{ marginLeft: 'auto' }}>{columns.length} columns</span>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Target Column <span style={{ color: 'var(--error)' }}>*</span></label>
                <select className="select-field" value={targetCol} onChange={e => setTargetCol(e.target.value)}>
                  <option value="">Select the column to predict…</option>
                  {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.dtype})</option>)}
                </select>
                <p className="t-sm" style={{ marginTop: 6 }}>The binary outcome your model predicts</p>
              </div>

              <div>
                <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Protected Attribute <span style={{ color: 'var(--error)' }}>*</span></label>
                <select className="select-field" value={protectedAttr} onChange={e => setProtectedAttr(e.target.value)}>
                  <option value="">Select the sensitive attribute…</option>
                  {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.dtype})</option>)}
                </select>
                <p className="t-sm" style={{ marginTop: 6 }}>E.g. gender, race, age group</p>
              </div>
            </div>

            {error && <div className="alert alert-error" style={{ marginTop: 20 }}><span>⚠</span>{error}</div>}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 28 }}
              disabled={!targetCol || !protectedAttr}
              onClick={handleStartAudit}
            >
              Run Fairness Audit
            </button>
          </motion.div>
        )}

        {phase === 'auditing' && (
          <div className="card">
            <LoadingSpinner message="Running Audit…" subMessage="Training model and computing fairness metrics" />
          </div>
        )}
      </div>
    </motion.div>
  )
}
