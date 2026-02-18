/**
 * server.js
 * Node/Express backend that proxies AI utility endpoints to Google Gemini.
 * Expects environment variables:
 *   GEMINI_API_KEY  - your Google AI / Gemini API key
 *   GEMINI_MODEL    - model name (default: gemini-2.0-flash)
 *   PORT (optional)
 *
 * Responses are always JSON and contain:
 *  { success: true|false, service: "...", input: {...}, output: <parsed LLM text> }
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Config - set these in .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Set it in .env for production.');
}

/**
 * Call Google Gemini generateContent endpoint.
 * Docs: https://ai.google.dev/api/generate-content
 */
async function callLLM(prompt, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      maxOutputTokens: opts.max_tokens || 512,
      temperature: typeof opts.temperature !== 'undefined' ? opts.temperature : 0.2
    }
  };

  try {
    const resp = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    // Extract text from Gemini response
    const candidates = resp.data.candidates || [];
    const text = candidates[0]?.content?.parts?.[0]?.text || '';

    // Try to parse as JSON (our prompts ask for JSON output)
    let parsed;
    try {
      // Strip markdown code fences if Gemini wraps the JSON
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = text; // Return raw text if not valid JSON
    }

    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err.response ? { status: err.response.status, data: err.response.data } : { message: err.message }
    };
  }
}

/* ---------------------
   Prompt templates
   --------------------- */

function promptSummarize(text) {
  return `Summarize the following text in 4 short bullet points. Keep them concise and focus on key facts. Output as JSON with keys: "bullets" (array of strings) and "summary" (one-liner).
---
Text:
${text}
`;
}

function promptEmailGen(context) {
  // context: { recipientRole, tone, purpose, details }
  return `Write a professional, concise email using the details below.
Output JSON exactly with keys: "subject" and "body".
Do not include any explanation outside the JSON.
---
Recipient role: ${context.recipientRole || 'colleague'}
Tone: ${context.tone || 'professional'}
Purpose: ${context.purpose || 'requesting meeting'}
Details: ${context.details || ''}
`;
}

function promptExplainCode(code) {
  return `Explain the following code for a beginner. Produce a JSON object with keys:
- "summary": one-paragraph plain-language summary
- "steps": array of numbered-step strings that explain key parts
- "complexity": short note on time/space complexity (if known) or "unknown".
Do not add anything outside the JSON.
---
Code:
${code}
`;
}

function promptRewriteTone(text, tone) {
  return `Rewrite the following text to have a "${tone}" tone.
Return JSON with key "rewritten".
Do not add anything else.
---
Original:
${text}
`;
}

/* ---------------------
   Endpoints
   --------------------- */

app.post('/api/summarize', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });

  const prompt = promptSummarize(text);
  const result = await callLLM(prompt, { max_tokens: 300, temperature: 0.1 });

  if (!result.ok) return res.status(502).json({ success: false, service: 'summarize', error: result.error });

  return res.json({ success: true, service: 'summarize', input: { text }, output: result.data });
});

app.post('/api/email', async (req, res) => {
  const { recipientRole, tone, purpose, details } = req.body || {};
  if (!details) return res.status(400).json({ success: false, error: 'details is required' });

  const prompt = promptEmailGen({ recipientRole, tone, purpose, details });
  const result = await callLLM(prompt, { max_tokens: 300, temperature: 0.2 });

  if (!result.ok) return res.status(502).json({ success: false, service: 'email', error: result.error });

  return res.json({ success: true, service: 'email', input: { recipientRole, tone, purpose, details }, output: result.data });
});

app.post('/api/explain-code', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ success: false, error: 'code is required' });

  const prompt = promptExplainCode(code);
  const result = await callLLM(prompt, { max_tokens: 600, temperature: 0.0 });

  if (!result.ok) return res.status(502).json({ success: false, service: 'explain-code', error: result.error });

  return res.json({ success: true, service: 'explain-code', input: { code: code.slice(0, 500) + (code.length>500? '...[truncated]':'' ) }, output: result.data });
});

app.post('/api/rewrite', async (req, res) => {
  const { text, tone } = req.body || {};
  if (!text || !tone) return res.status(400).json({ success: false, error: 'text and tone are required' });

  const prompt = promptRewriteTone(text, tone);
  const result = await callLLM(prompt, { max_tokens: 300, temperature: 0.3 });

  if (!result.ok) return res.status(502).json({ success: false, service: 'rewrite', error: result.error });

  return res.json({ success: true, service: 'rewrite', input: { tone, text: text.slice(0, 500) }, output: result.data });
});

/* health */
app.get('/api/health', (_req, res) => res.json({ success: true, uptime: process.uptime() }));

/* start */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
