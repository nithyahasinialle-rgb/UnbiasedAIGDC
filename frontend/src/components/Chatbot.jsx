import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, X, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChatMessage } from '../api/client'

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hello! I am your AI Fairness Consultant. Ask me anything about algorithmic fairness, demographic parity, SHAP explainability, or how to mitigate bias in your model!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  
  const location = useLocation()
  
  // Extract jobId from URL path if on Results or Mitigation pages
  const pathParts = location.pathname.split('/')
  const isResultsPage = pathParts.includes('results') || pathParts.includes('mitigate')
  const jobId = isResultsPage ? pathParts[pathParts.length - 1] : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', text: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }))
      const res = await sendChatMessage(userMessage.text, history, jobId)
      setMessages(prev => [...prev, { role: 'model', text: res.data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to my service. Please ensure your backend is running and try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Bubble Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="btn"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
          zIndex: 1000,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: '92px',
              right: '24px',
              width: '360px',
              height: '480px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-pop)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Gemini Advisor Chat</span>
              </div>
              {jobId && (
                <span className="badge badge-info" style={{ fontSize: '8px', padding: '1px 5px' }}>Active Audit Context</span>
              )}
            </div>

            {/* Message Log */}
            <div style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.map((m, idx) => {
                const isAI = m.role === 'model'
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignSelf: isAI ? 'flex-start' : 'flex-end',
                      flexDirection: isAI ? 'row' : 'row-reverse',
                      maxWidth: '85%'
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isAI ? 'var(--primary-dim)' : 'var(--border-mid)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isAI ? <Bot size={13} color="var(--primary-light)" /> : <User size={13} />}
                    </div>
                    <div style={{
                      background: isAI ? 'var(--bg-surface)' : 'var(--primary)',
                      border: isAI ? '1px solid var(--border)' : 'none',
                      borderRadius: isAI ? '0 12px 12px 12px' : '12px 0 12px 12px',
                      padding: '10px 14px',
                      color: isAI ? 'var(--text-primary)' : 'white',
                      fontSize: '12.5px',
                      lineHeight: '1.55',
                      boxShadow: 'var(--shadow-card)'
                    }}>
                      {isAI ? (
                        <div className="advisor-markdown" style={{ fontSize: '12px' }}>
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--primary-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bot size={13} color="var(--primary-light)" />
                  </div>
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '0 12px 12px 12px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    Typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} style={{
              padding: '12px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={jobId ? "Ask about this audit..." : "Ask me a question..."}
                style={{
                  flex: 1,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
                disabled={loading}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && !loading ? 1 : 0.4,
                  padding: 0
                }}
                disabled={!input.trim() || loading}
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
