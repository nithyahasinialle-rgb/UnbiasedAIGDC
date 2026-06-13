// src/App.jsx
import { wakeUpBackend } from './api/client'
wakeUpBackend()
import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Results from './pages/Results'
import Mitigation from './pages/Mitigation'
import Report from './pages/Report'
import History from './pages/History'
import Chatbot from './components/Chatbot'
import { authService } from './api/firebase'
import { AuthContext } from './AuthContext'

export default function App() {
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((usr) => {
      setUser(usr)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const login = async () => {
    setLoading(true)
    try {
      const usr = await authService.signInWithGoogle()
      setUser(usr)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await authService.signOut()
      setUser(null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isMock: authService.isMockMode() }}>
      <div className="layout">
        <Navbar />
        <main className="main-content">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/results/:jobId" element={<Results />} />
              <Route path="/mitigate/:jobId" element={<Mitigation />} />
              <Route path="/report/:jobId" element={<Report />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </AnimatePresence>
        </main>
        <Chatbot />
      </div>
    </AuthContext.Provider>
  )
}
