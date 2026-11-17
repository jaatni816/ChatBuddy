require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Groq } = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const BASE_SYSTEM_PROMPT = "Tum ek helpful AI assistant ho. Abhi ki language: {language}. Agar language 'Auto' hai to user jis language me likhe usi me jawab do. Warna sirf {language} me jawab do, chahe user kisi bhi language me likhe.";

function buildSystemPrompt(language = 'Auto') {
  return BASE_SYSTEM_PROMPT.replace('{language}', language);
}

app.post('/api/chat/groq', async (req, res) => {
  try {
    const { messages, language = 'Auto' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Groq se jawab milne mein error aaya. Kripya dobara koshish karein.' });
    }
    res.write(`data: ${JSON.stringify({ error: 'Groq se jawab milne mein error aaya.' })}\n\n`);
    res.end();
  }
});

app.post('/api/chat/gemini', async (req, res) => {
  try {
    const { messages, language = 'Auto' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Gemini se jawab milne mein error aaya. Kripya dobara koshish karein.' });
    }
    res.write(`data: ${JSON.stringify({ error: 'Gemini se jawab milne mein error aaya.' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
