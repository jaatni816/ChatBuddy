const MODELS = {
  groq: 'groq',
  gemini: 'gemini'
};

const STORAGE_KEY = 'mygpt_chats';
const CURRENT_CHAT_KEY = 'mygpt_current_chat';

const LANGUAGE_KEY_PREFIX = 'mygpt_lang_';

const modelSelect = document.getElementById('modelSelect');
const languageSelect = document.getElementById('languageSelect');
const languageDisplay = document.getElementById('languageDisplay');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const messagesEl = document.getElementById('messages');
const emptyState = document.getElementById('emptyState');
const typingEl = document.getElementById('typing');
const newChatBtn = document.getElementById('newChatBtn');
const chatListEl = document.getElementById('chatList');

let chats = loadChats();
let currentChatId = loadCurrentChatId();
let currentChat = null;
let currentLanguage = 'Auto';

const LANGUAGE_MAP = {
  'tamil': 'Tamil', 'hindi': 'Hindi', 'hinglish': 'Hinglish', 'english': 'English',
  'punjabi': 'Punjabi', 'bengali': 'Bengali', 'marathi': 'Marathi', 'gujarati': 'Gujarati',
  'telugu': 'Telugu', 'kannada': 'Kannada', 'malayalam': 'Malayalam', 'urdu': 'Urdu',
  'spanish': 'Spanish', 'french': 'French', 'german': 'German', 'arabic': 'Arabic',
  'japanese': 'Japanese', 'korean': 'Korean', 'chinese': 'Chinese', 'russian': 'Russian'
};

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function loadCurrentChatId() {
  try {
    return localStorage.getItem(CURRENT_CHAT_KEY);
  } catch (e) {
    return null;
  }
}

function saveCurrentChatId(id) {
  try {
    localStorage.setItem(CURRENT_CHAT_KEY, id);
  } catch (e) {}
}

function getChatLanguage(chatId) {
  try {
    return localStorage.getItem(LANGUAGE_KEY_PREFIX + chatId) || 'Auto';
  } catch (e) {
    return 'Auto';
  }
}

function saveChatLanguage(chatId, lang) {
  try {
    localStorage.setItem(LANGUAGE_KEY_PREFIX + chatId, lang);
  } catch (e) {}
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getChatTitle(firstMessage) {
  if (!firstMessage) return 'Naya Chat';
  return firstMessage.length > 40 ? firstMessage.slice(0, 40) + '...' : firstMessage;
}

function renderSidebar() {
  chatListEl.innerHTML = '';
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  sorted.forEach(chat => {
    const item = document.createElement('div');
    item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.innerHTML = `
      <div class="title">${escapeHtml(getChatTitle(chat.messages.find(m => m.role === 'user')?.content))}</div>
      <div class="delete" title="Delete">&times;</div>
    `;
    item.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    item.addEventListener('click', () => loadChat(chat.id));
    chatListEl.appendChild(item);
  });
}

function loadChat(id) {
  currentChatId = id;
  currentChat = chats.find(c => c.id === id);
  saveCurrentChatId(id);
  currentLanguage = getChatLanguage(id);
  languageSelect.value = currentLanguage;
  languageDisplay.textContent = `Language: ${currentLanguage}`;
  renderSidebar();
  renderMessages();
}

function createNewChat() {
  const id = generateId();
  const newChat = {
    id,
    title: 'Naya Chat',
    messages: [],
    language: 'Auto',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  chats.unshift(newChat);
  saveChats();
  currentChatId = id;
  currentChat = newChat;
  saveCurrentChatId(id);
  currentLanguage = 'Auto';
  saveChatLanguage(id, 'Auto');
  languageSelect.value = 'Auto';
  languageDisplay.textContent = 'Language: Auto';
  renderSidebar();
  renderMessages();
}

function deleteChat(id) {
  if (chats.length <= 1 && id === currentChatId) {
    if (!confirm('Ye aakhri chat hai. Delete karna chahte ho?')) return;
  }
  chats = chats.filter(c => c.id !== id);
  localStorage.removeItem(LANGUAGE_KEY_PREFIX + id);
  if (currentChatId === id) {
    currentChatId = chats[0]?.id || null;
    currentChat = chats.find(c => c.id === currentChatId) || null;
    saveCurrentChatId(currentChatId);
    if (currentChat) {
      currentLanguage = getChatLanguage(currentChatId);
      languageSelect.value = currentLanguage;
      languageDisplay.textContent = `Language: ${currentLanguage}`;
    }
  }
  saveChats();
  renderSidebar();
  renderMessages();
}

function renderMessages() {
  messagesEl.innerHTML = '';
  if (!currentChat || currentChat.messages.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  currentChat.messages.forEach(msg => appendMessage(msg.role, msg.content, false));
  scrollToBottom();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function detectLanguageCommand(text) {
  const lower = text.toLowerCase().trim();

  const hindiPatterns = [
    /(\w+)\s+me\s+bolo/i,
    /(\w+)\s+me\s+jawab\s+do/i,
    /(\w+)\s+me\s+baat\s+karo/i,
    /ab\s+se\s+(\w+)\s+me\s+baat/i,
    /(\w+)\s+me\s+baat\s+karo/i
  ];

  const englishPatterns = [
    /speak\s+in\s+(\w+)/i,
    /talk\s+in\s+(\w+)/i,
    /respond\s+in\s+(\w+)/i,
    /reply\s+in\s+(\w+)/i,
    /use\s+(\w+)/i
  ];

  const allPatterns = [...hindiPatterns, ...englishPatterns];

  for (const pattern of allPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const langName = match[1].toLowerCase();
      if (LANGUAGE_MAP[langName]) {
        return LANGUAGE_MAP[langName];
      }
      if (langName === 'auto') {
        return 'Auto';
      }
    }
  }

  return null;
}

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const langClass = lang ? ` language-${lang}` : '';
    return `<pre><code class="${langClass}">${escapeHtml(code.trim())}</code><button class="copy-btn">Copy</button></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function appendMessage(role, content, scroll = true) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.setAttribute('dir', 'auto');
  const avatar = role === 'user' ? 'You' : 'AI';
  const html = renderMarkdown(content);
  div.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="bubble">${html}</div>
  `;
  messagesEl.appendChild(div);
  if (scroll) scrollToBottom();

  div.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pre = btn.parentElement.querySelector('code');
      const text = pre ? pre.textContent : '';
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 1200);
      });
    });
  });
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping(show) {
  typingEl.style.display = show ? 'block' : 'none';
  if (show) scrollToBottom();
}

function setInputEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
  if (enabled) messageInput.focus();
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;

  const detectedLang = detectLanguageCommand(text);
  if (detectedLang) {
    currentLanguage = detectedLang;
    languageSelect.value = currentLanguage;
    languageDisplay.textContent = `Language: ${currentLanguage}`;
    saveChatLanguage(currentChatId, currentLanguage);
    if (currentChat) {
      currentChat.language = currentLanguage;
      saveChats();
    }
  }

  messageInput.value = '';
  messageInput.style.height = 'auto';

  appendMessage('user', text);
  currentChat.messages.push({ role: 'user', content: text });
  currentChat.updatedAt = Date.now();
  saveChats();
  renderSidebar();

  const model = modelSelect.value;
  showTyping(true);
  setInputEnabled(false);

  const aiDiv = document.createElement('div');
  aiDiv.className = 'message ai';
  aiDiv.setAttribute('dir', 'auto');
  aiDiv.innerHTML = `<div class="avatar">AI</div><div class="bubble"><span class="cursor">▌</span></div>`;
  messagesEl.appendChild(aiDiv);
  scrollToBottom();

  const bubble = aiDiv.querySelector('.bubble');
  let aiContent = '';

  try {
    const res = await fetch(`/api/chat/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: currentChat.messages, language: currentLanguage })
    });

    if (!res.ok || !res.body) {
      throw new Error('Server response error');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              aiContent += parsed.content;
              bubble.innerHTML = renderMarkdown(aiContent) + '<span class="cursor">▌</span>';
              scrollToBottom();
            }
          } catch (e) {
            console.warn('Parse chunk failed', e);
          }
        }
      }
    }

    bubble.innerHTML = renderMarkdown(aiContent);
    currentChat.messages.push({ role: 'assistant', content: aiContent });
    currentChat.updatedAt = Date.now();
    saveChats();
    renderSidebar();
  } catch (err) {
    console.error(err);
    bubble.innerHTML = `<span style="color:#ef4444;">Kami hai: Jawab nahi mil paaya. Kripya dobara koshish karein.</span>`;
    currentChat.messages.push({ role: 'assistant', content: 'Kami hai: Jawab nahi mil paaya. Kripya dobara koshish karein.' });
    currentChat.updatedAt = Date.now();
    saveChats();
    renderSidebar();
  } finally {
    showTyping(false);
    setInputEnabled(true);
    scrollToBottom();
  }
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';
});

newChatBtn.addEventListener('click', createNewChat);

languageSelect.addEventListener('change', () => {
  currentLanguage = languageSelect.value;
  languageDisplay.textContent = `Language: ${currentLanguage}`;
  saveChatLanguage(currentChatId, currentLanguage);
  if (currentChat) {
    currentChat.language = currentLanguage;
    saveChats();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  if (chats.length === 0) {
    createNewChat();
  } else {
    if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
      currentChatId = chats[0].id;
      saveCurrentChatId(currentChatId);
    }
    currentChat = chats.find(c => c.id === currentChatId);
    currentLanguage = getChatLanguage(currentChatId);
    languageSelect.value = currentLanguage;
    languageDisplay.textContent = `Language: ${currentLanguage}`;
    renderSidebar();
    renderMessages();
  }
  messageInput.focus();
});
