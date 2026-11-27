require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { Groq } = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;
const IS_VERCEL = process.env.VERCEL === '1';

const TEXT_MODEL = process.env.TEXT_MODEL || 'openai/gpt-oss-20b';
const VISION_MODEL = process.env.VISION_MODEL || 'openai/gpt-oss-120b';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

console.log('[DEBUG] Module loaded');
console.log('[DEBUG] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
console.log('[DEBUG] VERCEL:', process.env.VERCEL);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' }
});

// Multer setup for audio transcription
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/mpeg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Use webm, ogg, wav, mp4, or mp3.'));
    }
  }
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.groq.com ws://localhost:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));

  next();
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Compression (skip for streaming routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/chat/') || req.path === '/api/transcribe') {
    return next();
  }
  compression()(req, res, next);
});

// Static files
app.use(express.static('dist', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
    if (path.endsWith('.webmanifest') || path.endsWith('robots.txt') || path.endsWith('sitemap.xml')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    if (path.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.sendFile('sitemap.xml', { root: 'dist' });
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile('robots.txt', { root: 'dist' });
});

app.get('/site.webmanifest', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile('site.webmanifest', { root: 'dist' });
});

const SYSTEM_PROMPT = "You are a friendly voice assistant. You MUST reply in the SAME language the user writes in — if they write in Hindi (Devanagari script), reply in Hindi; if English, reply in English; if Hinglish (Hindi words in Roman/Latin script), reply in Hinglish. Mirror the user's language and script exactly. If the user asks for a specific language, obey that. Keep answers short and conversational because they will be spoken aloud. When an image is provided, carefully read all visible text and describe what matters. Never invent text that is not visible in the image; say if something is unclear.";

function setStreamingHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

// Audio transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: req.file.buffer,
      model: 'whisper-large-v3-turbo',
      language: req.body.language || undefined,
    });

    res.json({ text: transcription.text || '' });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Transcription failed: ' + (err?.message || 'Unknown error') });
  }
});

// Chat endpoint (text + vision)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, images } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    setStreamingHeaders(res);

    const hasImages = images && Array.isArray(images) && images.length > 0;
    const model = hasImages ? VISION_MODEL : TEXT_MODEL;

    let apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];

    for (const msg of messages) {
      if (msg.role === 'user' && hasImages && msg === messages[messages.length - 1]) {
        const contentParts = [{ type: 'text', text: msg.content || 'Describe this image and read any text in it.' }];
        for (const img of images) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: img }
          });
        }
        apiMessages.push({ role: 'user', content: contentParts });
      } else {
        apiMessages.push({
          role: msg.role,
          content: msg.content || ''
        });
      }
    }

    const stream = await groq.chat.completions.create({
      model,
      messages: apiMessages,
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
    console.error('Chat error:', err);
    const errorMsg = err?.message || err?.error?.message || 'Error processing request.';
    if (!res.headersSent) {
      return res.status(500).json({ error: errorMsg });
    }
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// Legacy Groq endpoint (keep for backward compat)
app.post('/api/chat/groq', async (req, res) => {
  try {
    const { messages, language = 'Auto' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    setStreamingHeaders(res);

    const stream = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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
    const errorMsg = err?.message || err?.error?.message || 'Error processing request.';
    if (!res.headersSent) {
      return res.status(500).json({ error: errorMsg });
    }
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  next();
});

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on ${DOMAIN}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;