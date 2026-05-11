import { useState } from 'react'

import AppNav from '../components/AppNav'
import { apiUrl } from '../lib/api'

const FEATURE_CHIPS = [
  'Lap time comparison',
  'Fantasy optimizer',
  'Live race updates',
  'Driver career stats',
]

function FeatureChip({ label }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-block',
        color: '#E8002D',
        backgroundColor: hovered ? 'rgba(232,0,45,0.16)' : 'rgba(232,0,45,0.1)',
        border: `1px solid ${hovered ? '#E8002D' : 'rgba(232,0,45,0.34)'}`,
        borderRadius: '8px',
        padding: '4px 12px',
        fontSize: '13px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: hovered ? '0 0 14px rgba(232,0,45,0.18)' : 'none',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {label}
    </span>
  )
}

function ContactForm() {
  const [fields, setFields] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [serverError, setServerError] = useState('')

  const validate = () => {
    const e = {}
    if (!fields.email.trim()) {
      e.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      e.email = 'Please enter a valid email.'
    }
    if (!fields.message.trim()) {
      e.message = 'Message is required.'
    } else if (fields.message.length > 2000) {
      e.message = 'Message must be under 2000 characters.'
    }
    return e
  }

  const handleChange = (key) => (e) => {
    setFields((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStatus('submitting')
    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setServerError(data.detail || data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setServerError('Could not reach the server. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="cf-success">
        <div className="cf-success-icon">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Message sent</h3>
        <p>Thanks for reaching out — we'll get back to you soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="cf-field">
        <label className="cf-label" htmlFor="cf-name">
          Name <span className="cf-label-optional">— optional</span>
        </label>
        <input
          id="cf-name"
          className="cf-input"
          type="text"
          placeholder="Your name"
          value={fields.name}
          onChange={handleChange('name')}
          autoComplete="name"
        />
      </div>
      <div className="cf-field">
        <label className="cf-label" htmlFor="cf-email">Email</label>
        <input
          id="cf-email"
          className={`cf-input${errors.email ? ' cf-input-error' : ''}`}
          type="email"
          placeholder="you@example.com"
          value={fields.email}
          onChange={handleChange('email')}
          autoComplete="email"
        />
        {errors.email && <span className="cf-error-text">{errors.email}</span>}
      </div>
      <div className="cf-field cf-field-last">
        <label className="cf-label" htmlFor="cf-message">Message</label>
        <textarea
          id="cf-message"
          className={`cf-textarea${errors.message ? ' cf-input-error' : ''}`}
          placeholder="What's on your mind?"
          value={fields.message}
          onChange={handleChange('message')}
        />
        {errors.message && <span className="cf-error-text">{errors.message}</span>}
      </div>
      {status === 'error' && (
        <div className="cf-server-error">{serverError}</div>
      )}
      <button className="cf-submit" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}

export default function Contact({ onNavigate }) {
  return (
    <div className="contact-page min-h-screen text-[#F4F4F5] flex flex-col">
      <AppNav activePage="contact" onNavigate={onNavigate} />

      <main className="contact-shell">
        <header className="contact-header">
          <div className="contact-header-brand" aria-label="ChicaneAI">
            <img src="/logo-mark.png" alt="" className="brand-logo" />
            <span className="brand-wordmark">ChicaneAI</span>
          </div>
          <h1>Get in touch</h1>
          <p>Questions, feedback, or ideas for ChicaneAI.</p>
        </header>

        <section className="contact-stack" aria-label="Contact options">
          <article className="contact-card contact-feature-card">
            <ContactForm />
          </article>

          <article className="contact-card contact-feature-card">
            <div className="contact-feature-heading">
              <span className="contact-status-dot" aria-hidden="true" />
              <div>
                <h2>Feature requests</h2>
                <p>Suggest improvements, new F1 tools, or prediction views that would make ChicaneAI more useful.</p>
              </div>
            </div>
            <div className="contact-chip-grid">
              {FEATURE_CHIPS.map((chip) => (
                <FeatureChip key={chip} label={chip} />
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
