import React, { useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../AuthContext'

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect width="28" height="28" rx="7" fill="#2563eb"/>
    <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="14" cy="14" r="3" fill="white" fillOpacity="0.25"/>
  </svg>
)

export default function Navbar() {
  const loc = useLocation()
  const { user, login, logout, loading, isMock } = useContext(AuthContext)
  const isActive = (path) => loc.pathname.startsWith(path)

  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo />
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Unbiased
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 6px',
            background: 'var(--primary-dim)', color: 'var(--primary-light)',
            border: '1px solid rgba(37,99,235,0.3)', borderRadius: '4px',
            letterSpacing: '0.05em', textTransform: 'uppercase'
          }}>Beta</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/upload" className={`btn btn-ghost ${isActive('/upload') ? '' : ''}`}
            style={{ fontSize: '13px', color: isActive('/upload') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            New Audit
          </Link>
          <Link to="/history" className={`btn btn-ghost ${isActive('/history') ? '' : ''}`}
            style={{ fontSize: '13px', color: isActive('/history') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            History
          </Link>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

          {loading ? (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading...</span>
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={user.email}>
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.displayName}`} 
                  alt="avatar" 
                  style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border-bright)', background: 'var(--bg-surface)' }} 
                />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }} className="hide-mobile">
                  {user.displayName || 'User'}
                </span>
                {isMock && (
                  <span className="badge badge-neutral" style={{ fontSize: '8px', padding: '1px 4px', transform: 'scale(0.9)', border: 'none' }}>Demo</span>
                )}
              </div>
              <button onClick={logout} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={login} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
