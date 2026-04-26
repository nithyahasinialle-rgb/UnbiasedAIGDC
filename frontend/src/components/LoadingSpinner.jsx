import React from 'react'

export default function LoadingSpinner({ message = 'Processing...', subMessage = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '56px 24px' }}>
      <div className="spinner" />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: 4 }}>{message}</p>
        {subMessage && <p className="t-sm">{subMessage}</p>}
      </div>
    </div>
  )
}
