import React, { useCallback, useState } from 'react'

export default function UploadZone({ onFile, file }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  const handleChange = (e) => {
    const f = e.target.files[0]
    if (f) onFile(f)
  }

  return (
    <label
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{ display: 'block', cursor: 'pointer' }}
    >
      <input type="file" accept=".csv" onChange={handleChange} style={{ display: 'none' }} />
      <div style={{ fontSize: '28px', marginBottom: 12, opacity: 0.5 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto', display: 'block' }}>
          <path d="M16 4v16M10 10l6-6 6 6" stroke="var(--primary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 22v4a2 2 0 002 2h16a2 2 0 002-2v-4" stroke="var(--border-bright)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4, color: 'var(--text-primary)' }}>
        {file ? file.name : 'Drop CSV file here'}
      </p>
      <p className="t-sm">{file ? 'File ready to upload' : 'or click to browse — CSV only'}</p>
    </label>
  )
}
