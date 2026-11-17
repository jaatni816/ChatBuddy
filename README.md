# MyGPT - AI Assistant

ChatGPT jaisa AI chat web app jo Node.js, Express, Groq aur Google Gemini par bana hai.

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **AI Providers:** Groq (llama-3.3-70b-versatile), Google Gemini (gemini-1.5-flash)
- **Packages:** express, cors, dotenv, groq-sdk, @google/generative-ai

## Folder Structure

```
mygpt/
  server.js
  package.json
  .env
  .env.example
  .gitignore
  public/
    index.html
    style.css
    script.js
  README.md
```

## Setup aur Run Karne ka Tarika

### 1. Repository clone ya extract karein

### 2. Dependencies install karein

```bash
npm install
```

### 3. API Keys Set Karein

`.env.example` file ki copy `.env` ke naam se banayi gayi hai. Usme apni API keys daalein:

```
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

**Zarooriyan:**
- `GROQ_API_KEY` — [Groq Console](https://console.groq.com) se milegi
- `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/app/apikey) se milegi
- Keys kabhi frontend code me mat likhna
- `.env` pehle se `.gitignore` me hai, isliye ye commit nahi hoga

### 4. Server Start Karein

```bash
npm start
```

Browser me kholein: [http://localhost:3000](http://localhost:3000)

## Features

1. **ChatGPT jaisa UI** — Sidebar (naya chat, purani chats), dark theme, mobile responsive
2. **Model Selector** — Groq ya Gemini select karein
3. **Streaming Response** — Jawab word-by-word screen par aata hai
4. **Conversation Memory** — Poori chat history API ko bheji jati hai
5. **LocalStorage History** — Purani chats browser me save rehti hain, delete bhi kar sakte hain
6. **Markdown + Code Blocks** — Sahi display, code block par Copy button
7. **Typing Indicator** — "AI likh raha hai..." animation
8. **Error Handling** — API fail hone par friendly message
9. **Multi-Language Support** — 22 bhashayon mein baat karne ka option

## Multi-Language Feature

### Kaise kaam karta hai

App mein ek **Language selector** diya gaya hai model selector ke paas. Isse aap ye kar sakte hain:

1. **Dropdown se language chunein** — 22 bhashayon mein se koi bhi chunein (Auto, Hindi, Hinglish, English, Punjabi, Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Urdu, Spanish, French, German, Arabic, Japanese, Korean, Chinese, Russian)

2. **Message mein language maangein** — Chat mein likhein jaise:
   - "Tamil me bolo"
   - "Hindi me jawab do"
   - "Speak in French"
   - "Ab se English me baat karo"
   - "German me reply do"

   AI us bhasha ko detect karke agle sabhi jawab usi bhasha mein dega.

3. **Language yaad rakhti hai** — Aapki chuni hui language `localStorage` mein save ho jati hai. Page refresh karne ke baad bhi wahi language rahegi.

4. **Har chat ke liye alag language** — Har nayi chat ki apni language preference ho sakti hai.

5. **RTL support** — Arabic, Urdu jaisay right-to-left bhashayon ke liye message bubble sahi dikhai degi.

6. **Noto Sans font** — Sabhi Indian aur antarastriya characters sahi render hote hain.

### System Prompt

Backend mein ye system prompt bhejta hai:
> Tum ek helpful AI assistant ho. Abhi ki language: {language}. Agar language 'Auto' hai to user jis language me likhe usi me jawab do. Warna sirf {language} me jawab do, chahe user kisi bhi language me likhe.

## API Routes

- `POST /api/chat/groq` — messages array aur language lekar Groq se streaming reply
- `POST /api/chat/gemini` — messages array aur language lekar Gemini se streaming reply

Dono routes mein proper try/catch aur error messages hain.

## Deploy Karna

### Render par

1. [Render](https://render.com) par account banayein
2. "New Web Service" select karein aur GitHub repo connect karein
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment Variables me `GROQ_API_KEY`, `GEMINI_API_KEY`, `PORT` add karein
6. Deploy karein

### Vercel par

1. [Vercel](https://vercel.com) par account banayein
2. GitHub repo import karein
3. Framework preset: "Other"
4. Build command: `npm install`
5. Output directory: `public`
6. Environment Variables me `GROQ_API_KEY`, `GEMINI_API_KEY`, `PORT` add karein
7. Deploy karein

**Note:** Vercel serverless functions ke liye `server.js` ko API route mein convert karna padega. Render par seedha Node.js server asaan hai.

## API Keys Kahan se Milegi

- **Groq:** [https://console.groq.com/keys](https://console.groq.com/keys) — Sign up karein aur "Create API Key" par click karein
- **Google Gemini:** [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — Sign in karein aur API key generate karein

## License

MIT
