require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Groq } = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;
const IS_VERCEL = process.env.VERCEL === '1';

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CSP for inline scripts/styles needed by the app
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  
  next();
});

// Compression for better performance (skip for streaming routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/chat/')) {
    return next();
  }
  compression()(req, res, next);
});

// CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Static files with cache headers
app.use(express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Cache HTML files for shorter time
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
    // Cache manifest and robots.txt
    if (path.endsWith('.webmanifest') || path.endsWith('robots.txt') || path.endsWith('sitemap.xml')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
    // SVG favicons and OG image
    if (path.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Specific routes for SEO files with correct content types
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.sendFile('sitemap.xml', { root: 'public' });
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile('robots.txt', { root: 'public' });
});

app.get('/site.webmanifest', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile('site.webmanifest', { root: 'public' });
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Debug: Log env var presence (not values) at module load
console.log('[DEBUG] Module loaded');
console.log('[DEBUG] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
console.log('[DEBUG] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
console.log('[DEBUG] VERCEL:', process.env.VERCEL);

const BASE_SYSTEM_PROMPT = "Tum ek helpful AI assistant ho. Abhi ki language: {language}. Agar language 'Auto' hai to user jis language me likhe usi me jawab do. Warna sirf {language} me jawab do, chahe user kisi bhi language me likhe.";

function buildSystemPrompt(language = 'Auto') {
  return BASE_SYSTEM_PROMPT.replace('{language}', language);
}

// Streaming headers helper
function setStreamingHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

app.post('/api/chat/groq', async (req, res) => {
  try {
    const { messages, language = 'Auto' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    setStreamingHeaders(res);

    const stream = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'system', content: buildSystemPrompt(language) }, ...messages],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Groq error:', err);
    const errorMsg = err?.message || err?.error?.message || 'Groq se jawab milne mein error aaya. Kripya dobara koshish karein.';
    if (!res.headersSent) {
      return res.status(500).json({ error: errorMsg });
    }
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

app.post('/api/chat/gemini', async (req, res) => {
  try {
    const { messages, language = 'Auto' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    setStreamingHeaders(res);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: buildSystemPrompt(language)
    });

    const geminiHistory = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const result = await model.generateContentStream({
      contents: geminiHistory
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini error:', err);
    const errorMsg = err?.message || err?.error?.message || 'Gemini se jawab milne mein error aaya. Kripya dobara koshish karein.';
    if (!res.headersSent) {
      return res.status(500).json({ error: errorMsg });
    }
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// Only start server locally, not on Vercel
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on ${DOMAIN}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for Vercel
module.exports = app;
