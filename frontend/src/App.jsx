// src/App.jsx
import { wakeUpBackend } from './api/client'
wakeUpBackend()
import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Results from './pages/Results'
import Mitigation from './pages/Mitigation'
import Report from './pages/Report'

export default function App() {
  const location = useLocation()

  return (
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
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
