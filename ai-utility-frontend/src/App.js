import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import './index.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

function App() {
  const [service, setService] = useState('summarize');
  const [input, setInput] = useState('');
  const [extra, setExtra] = useState({});
  const [loading, setLoading] = useState(false);
  const [jsonResult, setJsonResult] = useState(null);
  const [error, setError] = useState(null);

  const services = [
    { id: 'summarize', title: 'Summarize', desc: 'Summarize long text into bullets' },
    { id: 'email', title: 'Email Generator', desc: 'Generate a professional email' },
    { id: 'explain-code', title: 'Code Explainer', desc: 'Explain code in simple terms' },
    { id: 'rewrite', title: 'Tone Rewriter', desc: 'Rewrite text in a given tone' }
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setJsonResult(null);

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
        setError(json);
      } else {
        setJsonResult(json);
      }
    } catch (err) {
      setError({ message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <div className="logo">AI</div>
          <div>
            <h1>AI Utility Hub</h1>
            <p>Multiple utilities powered by your LLM (backend hides the API key)</p>
          </div>
        </div>

        <div className="nav-cta">
          <button className="btn" onClick={() => { const el = document.getElementById('main-panel'); if(el) el.scrollIntoView({behavior:'smooth'}); }}>Try a tool</button>
          <button className="btn ghost">Docs</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <h2>Small, practical AI utilities for everyday tasks</h2>
          <p>Summarize long text, generate professional emails, explain code, and rewrite text in different tones — fast and privacy-focused.</p>
          <div className="cta-row">
            <button className="btn" onClick={() => { const el = document.getElementById('main-panel'); if(el) el.scrollIntoView({behavior:'smooth'}); }}>Get started</button>
            <button className="btn ghost">Learn more</button>
          </div>
        </div>
        <div className="hero-right">
          {/* decorative / could hold illustration */}
        </div>
      </section>

      <main className="container">
        <aside className="sidebar">
          {services.map(s => (
            <ServiceCard key={s.id} service={s} active={service === s.id} onClick={() => { setService(s.id); setJsonResult(null); setError(null); }} />
          ))}
        </aside>

        <section id="main-panel" className="panel">
          <form onSubmit={handleSubmit}>
            <label className="label">Service: <strong>{service}</strong></label>

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
              <button type="button" className="btn ghost" onClick={() => { setInput(''); setJsonResult(null); setError(null); }}>
                Clear
              </button>
            </div>
          </form>

          <div className="output">
            <h3>Result (JSON)</h3>
            {error && <pre className="json error">{JSON.stringify(error, null, 2)}</pre>}
            {jsonResult && <pre className="json">{JSON.stringify(jsonResult, null, 2)}</pre>}
            {!jsonResult && !error && <div className="hint">No output yet — try a service and click Generate.</div>}
          </div>
        </section>
      </main>

      <footer className="footer">Stateless · No DB · Backend proxies LLM</footer>
    </div>
  );
}

export default App;
