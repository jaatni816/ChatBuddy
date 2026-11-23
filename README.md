# Voice AI Agent

A modern minimalist voice AI chat assistant with React + Vite + Tailwind CSS. Features voice conversation mode with speech-to-text, text-to-speech, image understanding (vision), and AI-powered responses.

## 🚀 Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Icons:** lucide-react
- **Backend:** Node.js + Express
- **AI Provider:** Groq (llama-3.2-11b-preview for text, llama-4-scout for vision)
- **Voice:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Audio:** MediaRecorder API + Groq Whisper (whisper-large-v3-turbo)

## 📁 Folder Structure

```
voice-ai-agent/
  server.js
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  index.html
  src/
    main.jsx
    App.jsx
    index.css
    components/
      Sidebar.jsx
      MainArea.jsx
      MessageList.jsx
      VoiceOverlay.jsx
  dist/
  .env
  .env.example
  README.md
```

## ⚙️ Setup & Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
TEXT_MODEL=llama-3.2-11b-preview
VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
PORT=3000
DOMAIN=http://localhost:3000
```

Get your Groq API key from [console.groq.com/keys](https://console.groq.com/keys).

### 3. Development Mode

Start both the Vite dev server and Express backend:

```bash
npm run dev
```

Open browser: [http://localhost:5173](http://localhost:5173)

### 4. Production Build

```bash
npm run build
npm start
```

Open browser: [http://localhost:3000](http://localhost:3000)

## ✨ Features

1. **Modern Minimalist UI** — Clean, calm interface with lots of whitespace
2. **Responsive Design** — Works on desktop and mobile devices
3. **Voice Conversation Mode** — Full hands-free voice chat with animated orb
4. **Speech-to-Text** — Hindi (hi-IN), English (en-IN), Auto language selection
5. **Text-to-Speech** — Browser speech synthesis with hi-IN voice detection
6. **Streaming AI Responses** — Word-by-word streaming from Groq
7. **Image Understanding (Vision)** — Upload images, drag-and-drop, paste screenshots
8. **Audio Transcription Fallback** — MediaRecorder + Groq Whisper API
9. **Voice Activity Detection** — Auto-stop after 1.5s silence
10. **Barge-in Support** — Interrupt agent speech by speaking
11. **Chat History** — Saved locally with auto-title generation
12. **Multi-Language Support** — Hindi, English, Hinglish

## 🎨 Color Palette

- **Background:** #FFFFFF
- **Sidebar:** #FAF9F5
- **Border:** #E8E6DC
- **Text:** #1F1E1D
- **Muted:** #6B6A66
- **Accent (Orange):** #D97757
- **Link Blue:** #2563EB

## 🔌 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with text + optional images (vision) |
| `/api/chat/groq` | POST | Legacy text-only chat endpoint |
| `/api/transcribe` | POST | Audio transcription via Groq Whisper |

## 🧪 How to Test

### Test 1: Hindi Voice
1. Open the app in Chrome/Edge
2. Click the **waveform button** (Volume2 icon) to open Voice Mode
3. Say **"Namaste"** or **"नमस्ते"**
4. Agent should respond in Hindi with TTS

### Test 2: Image Upload + Question
1. Click the **+ button** in the input card
2. Upload a screenshot or photo
3. Type **"isme kya likha hai?"** or **"what does this say?"**
4. Agent should read the text and describe the image

### Test 3: Mic Dictation
1. Click the **mic button** (Mic icon) in the input card
2. Speak in Hindi or English
3. Text appears in the textarea
4. Press Enter to send

### Test 4: Voice Conversation
1. Open Voice Mode
2. Speak a question
3. Agent responds via voice (TTS)
4. Agent automatically listens again
5. Try interrupting (barge-in) by speaking while agent talks

## 🌐 Browser Support

| Feature | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| SpeechRecognition | ✅ | ⚠️ Limited | ❌ |
| SpeechSynthesis | ✅ | ✅ | ⚠️ Limited |
| MediaRecorder | ✅ | ✅ | ✅ |
| Drag & Drop | ✅ | ✅ | ✅ |

## 🔒 Security

- API keys only in server `.env` — never exposed to frontend
- Rate limiting (60 requests/minute)
- Request size limits (50MB for chat, 10MB for audio)
- File type validation for uploads
- CSP headers configured

## 📄 License

MIT