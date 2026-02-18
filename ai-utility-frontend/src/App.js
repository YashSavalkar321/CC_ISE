import React, { useState, useRef } from 'react';
import ServiceCard from './ServiceCard';
import './index.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

/* ── helpers ── */

/** Extract readable text from the Gemini-parsed backend response */
function extractReadableOutput(json, service) {
  const data = json?.output;
  if (!data) return '';

  if (typeof data === 'string') return data;

  if (service === 'summarize') {
    let lines = '';
    if (data.summary) lines += data.summary + '\n\n';
    if (Array.isArray(data.bullets)) lines += data.bullets.map(b => `• ${b}`).join('\n');
    return lines.trim() || JSON.stringify(data, null, 2);
  }

  if (service === 'email') {
    let lines = '';
    if (data.subject) lines += `Subject: ${data.subject}\n\n`;
    if (data.body) lines += data.body;
    return lines.trim() || JSON.stringify(data, null, 2);
  }

  if (service === 'explain-code') {
    let lines = '';
    if (data.summary) lines += data.summary + '\n\n';
    if (Array.isArray(data.steps)) lines += data.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    if (data.complexity) lines += `\n\nComplexity: ${data.complexity}`;
    return lines.trim() || JSON.stringify(data, null, 2);
  }

  if (service === 'rewrite') {
    if (data.rewritten) return data.rewritten;
    return JSON.stringify(data, null, 2);
  }

  return JSON.stringify(data, null, 2);
}

/* ── component ── */

function App() {
  const [service, setService] = useState('summarize');
  const [input, setInput] = useState('');
  const [extra, setExtra] = useState({});
  const [loading, setLoading] = useState(false);
  const [jsonResult, setJsonResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef(null);

  const services = [
    { id: 'summarize', title: 'Summarize', desc: 'Summarize long text into bullets', icon: '📝',
      detail: 'Paste any long article, document, or notes and get 4 concise bullet points plus a one-liner summary. Great for quickly digesting reports or research papers.' },
    { id: 'email', title: 'Email Generator', desc: 'Generate a professional email', icon: '✉️',
      detail: 'Provide the recipient role, tone, purpose and rough details — get a polished, ready-to-send email with subject line.' },
    { id: 'explain-code', title: 'Code Explainer', desc: 'Explain code in simple terms', icon: '💻',
      detail: 'Paste a code snippet in any language. Receive a plain-language summary, step-by-step breakdown, and complexity analysis.' },
    { id: 'rewrite', title: 'Tone Rewriter', desc: 'Rewrite text in a given tone', icon: '🔄',
      detail: 'Input any text and a target tone (formal, friendly, urgent, etc.) to get a rewritten version that matches the tone you need.' }
  ];

  const activeService = services.find(s => s.id === service);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setJsonResult(null);
    setCopied(false);

    try {
      let url = `${BACKEND}/api/${service}`;
      let body = {};

      if (service === 'summarize') {
        body = { text: input };
      } else if (service === 'email') {
        body = { recipientRole: extra.recipientRole || 'manager', tone: extra.tone || 'professional', purpose: extra.purpose || 'request', details: input };
      } else if (service === 'explain-code') {
        body = { code: input };
      } else if (service === 'rewrite') {
        body = { text: input, tone: extra.tone || 'friendly' };
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await resp.json();
      if (!resp.ok) {
        setError(json.error || json.message || 'Something went wrong');
      } else {
        setJsonResult(json);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const text = extractReadableOutput(jsonResult, service);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const outputText = jsonResult ? extractReadableOutput(jsonResult, service) : '';

  return (
    <div className="app">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <div className="logo">AI</div>
            <span className="brand-name">AI Utility Hub</span>
          </div>
          <ul className="nav-links">
            <li><a href="#tools-section">Tools</a></li>
            <li><a href="#about-section">About</a></li>
            <li><a href="#main-panel">Try Now</a></li>
          </ul>
          <button className="btn btn-sm" onClick={() => { const el = document.getElementById('main-panel'); if(el) el.scrollIntoView({behavior:'smooth'}); }}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-left">
          <h2>Small, practical AI utilities for everyday tasks</h2>
          <p>Summarize long text, generate professional emails, explain code, and rewrite text in different tones — fast and privacy-focused.</p>
          <div className="cta-row">
            <button className="btn" onClick={() => { const el = document.getElementById('main-panel'); if(el) el.scrollIntoView({behavior:'smooth'}); }}>Get started</button>
            <a href="#about-section" className="btn ghost">Learn more</a>
          </div>
        </div>
      </section>

      {/* ── Tools explainer ── */}
      <section id="about-section" className="tools-about">
        <h2>What are these tools?</h2>
        <p className="tools-about-subtitle">Each tool sends your input to a Gemini-powered backend that returns structured, copyable results. Your API key stays safely on the server.</p>
        <div id="tools-section" className="tools-grid">
          {services.map(s => (
            <div key={s.id} className="tool-card">
              <span className="tool-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main workspace ── */}
      <main className="container">
        <aside className="sidebar">
          {services.map(s => (
            <ServiceCard key={s.id} service={s} active={service === s.id} onClick={() => { setService(s.id); setJsonResult(null); setError(null); setCopied(false); }} />
          ))}
        </aside>

        <section id="main-panel" className="panel">
          <form onSubmit={handleSubmit}>
            <label className="label">Service: <strong>{activeService?.title}</strong></label>
            <p className="service-hint">{activeService?.detail}</p>

            {service === 'email' && (
              <div className="row">
                <input className="input" placeholder="Recipient role (e.g., hiring manager)" value={extra.recipientRole || ''} onChange={e => setExtra({ ...extra, recipientRole: e.target.value })} />
                <input className="input" placeholder="Tone (e.g., polite)" value={extra.tone || ''} onChange={e => setExtra({ ...extra, tone: e.target.value })} />
              </div>
            )}

            {service === 'rewrite' && (
              <div className="row">
                <input className="input" placeholder="Tone (e.g., formal, friendly, urgent)" value={extra.tone || ''} onChange={e => setExtra({ ...extra, tone: e.target.value })} />
              </div>
            )}

            <textarea
              className="textarea"
              placeholder={
                service === 'summarize'
                  ? 'Paste long text to summarize...'
                  : service === 'explain-code'
                  ? 'Paste code (Java/C++/JS)...'
                  : service === 'email'
                  ? 'Write details to convert into a professional email (what you want to say)...'
                  : 'Text to rewrite...'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
            />

            <div className="actions">
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Processing...' : 'Generate'}
              </button>
              <button type="button" className="btn ghost" onClick={() => { setInput(''); setJsonResult(null); setError(null); setCopied(false); }}>
                Clear
              </button>
            </div>
          </form>

          {/* ── Output area ── */}
          <div className="output">
            <div className="output-header">
              <h3>Result</h3>
              {jsonResult && (
                <button className="btn btn-sm copy-btn" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {error && <div className="output-error">{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</div>}

            {jsonResult && (
              <textarea
                ref={outputRef}
                className="output-snippet"
                readOnly
                value={outputText}
                onClick={e => e.target.select()}
              />
            )}

            {!jsonResult && !error && <div className="hint">No output yet — pick a service, enter your input, and click Generate.</div>}
          </div>
        </section>
      </main>

      <footer className="footer">Stateless · No DB · Backend proxies Gemini</footer>
    </div>
  );
}

export default App;
