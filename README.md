# ChatBuddy - Free AI Chat Assistant

**ChatBuddy** is a free AI chat web app powered by **Groq (Llama 3.3 70B)** and **Google Gemini (1.5 Flash)**. Chat in **Hindi, English, Hinglish, Punjabi, Bengali, Tamil, Telugu & 20+ languages** — no login required.

## 🚀 Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** HTML, CSS, Vanilla JavaScript (ES6+)
- **AI Providers:** Groq (llama-3.3-70b-versatile), Google Gemini (gemini-1.5-flash)
- **Packages:** express, cors, dotenv, groq-sdk, @google/generative-ai, compression

## 📁 Folder Structure

```
chatbuddy/
  server.js
  package.json
  .env
  .env.example
  .gitignore
  public/
    index.html          # Main HTML with full SEO meta tags
    style.css           # Dark theme, responsive styles
    script.js           # Chat logic, streaming, multi-language
    favicon.svg         # SVG favicon (scalable)
    og-image.svg        # Open Graph image (1200x630)
    site.webmanifest    # PWA manifest
    robots.txt          # Search engine crawling rules
    sitemap.xml         # XML sitemap with hreflang
  README.md
```

## ⚙️ Setup & Run

### 1. Clone Repository

```bash
git clone https://github.com/jaatni816/ChatBuddy.git
cd ChatBuddy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
DOMAIN=http://localhost:3000
```

**Required:**
- `GROQ_API_KEY` — Get from [Groq Console](https://console.groq.com/keys)
- `GEMINI_API_KEY` — Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- `DOMAIN` — **IMPORTANT:** Set to your live URL after deployment (e.g., `https://chatbuddy.example.com`). For local dev, use `http://localhost:3000`.

> ⚠️ **Never commit `.env`** — it's in `.gitignore`.

### 4. Start Server

```bash
npm start
```

Open browser: [http://localhost:3000](http://localhost:3000)

## ✨ Features

1. **ChatGPT-like UI** — Sidebar (new chat, history), dark theme, mobile responsive
2. **Model Selector** — Switch between Groq & Gemini
3. **Streaming Responses** — Word-by-word streaming via SSE
4. **Conversation Memory** — Full chat history sent to API
5. **LocalStorage History** — Chats persist in browser, deletable
6. **Markdown + Code Blocks** — Syntax highlighting, copy button
7. **Typing Indicator** — "AI likh raha hai..." animation
8. **Error Handling** — Friendly messages on API failures
9. **Multi-Language (22+)** — Hindi, English, Hinglish, Punjabi, Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Urdu, Spanish, French, German, Arabic, Japanese, Korean, Chinese, Russian
10. **RTL Support** — Arabic, Urdu display correctly
11. **Noto Sans Fonts** — All international characters render properly

## 🌐 Multi-Language Support

### How it Works

1. **Dropdown Selection** — Choose from 22 languages
2. **Natural Language Commands** — Type things like:
   - "Tamil me bolo"
   - "Hindi me jawab do"
   - "Speak in French"
   - "Ab se English me baat karo"
   - "German me reply do"
   
   AI detects the language and replies in it.

3. **Persisted Per Chat** — Language saved in `localStorage` per conversation
4. **RTL Support** — Automatic for Arabic, Urdu

### System Prompt

```
Tum ek helpful AI assistant ho. Abhi ki language: {language}. Agar language 'Auto' hai to user jis language me likhe usi me jawab do. Warna sirf {language} me jawab do, chahe user kisi bhi language me likhe.
```

## 🔌 API Routes

- `POST /api/chat/groq` — messages[] + language → Groq streaming
- `POST /api/chat/gemini` — messages[] + language → Gemini streaming

Both include proper error handling.

## 📈 SEO Implementation (Complete)

### Meta Tags (`public/index.html`)
- ✅ `<html lang="en">` with full **hreflang** for 20 languages
- ✅ Unique `<title>` (50-60 chars): `ChatBuddy - Free AI Chat Assistant | Hindi, English & 20+ Languages`
- ✅ Meta description (150-160 chars) with natural keywords
- ✅ Meta keywords, author, robots (`index, follow`), theme-color, color-scheme
- ✅ Canonical URL tag
- ✅ Favicon (SVG), apple-touch-icon, manifest, all sizes

### Social Sharing
- ✅ **Open Graph:** og:title, og:description, og:type, og:url, og:image (1200x630 SVG), og:site_name, og:locale + alternates
- ✅ **Twitter Card:** summary_large_image with title, description, image

### Structured Data (JSON-LD)
- ✅ `WebApplication` schema with features, languages, offers (free)
- ✅ `BreadcrumbList` schema

### Technical SEO Files
- ✅ `robots.txt` — Allow all, sitemap reference
- ✅ `sitemap.xml` — With xhtml:link hreflang for all 20 languages
- ✅ `site.webmanifest` — PWA manifest with shortcuts
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Compression (gzip/brotli via `compression` package)
- ✅ Cache headers for static assets (1 year for immutable, 1 day for SEO files)

### Performance
- ✅ DNS prefetch for Google Fonts
- ✅ Preconnect for fonts
- ✅ SVG favicon & OG image (scalable, small size)
- ✅ Proper cache-control headers

## 🚀 Deploy

### Render (Recommended for Node.js)

1. Create account on [Render](https://render.com)
2. "New Web Service" → Connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. **Environment Variables:**
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `PORT` (Render sets automatically)
   - `DOMAIN` — **Set to your live URL** (e.g., `https://chatbuddy.onrender.com`)
6. Deploy

### Vercel (Requires API Route Conversion)

1. Account on [Vercel](https://vercel.com)
2. Import GitHub repo
3. Framework: "Other"
4. Build: `npm install`
5. Output: `public`
6. **Environment Variables:** `GROQ_API_KEY`, `GEMINI_API_KEY`, `DOMAIN`
7. Deploy

> **Note:** Vercel needs `server.js` converted to API routes. Render runs native Node.js easier.

### After Deploy — Update DOMAIN

**Critical:** After deployment, update `DOMAIN` in your hosting platform's environment variables to your live URL (e.g., `https://chatbuddy.example.com`). This updates:
- Canonical URLs
- Open Graph URLs
- Twitter Card URLs
- JSON-LD structured data URLs
- Sitemap URLs
- Hreflang URLs

Then redeploy.

### Generate PNG Favicons (Optional but Recommended)

For maximum browser compatibility, convert `favicon.svg` to PNG sizes:
- `favicon-16.png` (16×16)
- `favicon-32.png` (32×32)
- `favicon-192.png` (192×192)
- `favicon-512.png` (512×512)
- `apple-touch-icon.png` (180×180)

Tools: [realfavicongenerator.net](https://realfavicongenerator.net) or [favicon.io](https://favicon.io/favicon-converter/)

Update `public/index.html` and `public/site.webmanifest` with the PNG paths.

## 🔑 API Keys

- **Groq:** [console.groq.com/keys](https://console.groq.com/keys)
- **Google Gemini:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## 📄 License

MIT