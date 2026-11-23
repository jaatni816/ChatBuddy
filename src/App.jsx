import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import VoiceOverlay from './components/VoiceOverlay';

function App() {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);

  messagesRef.current = messages;
  currentChatIdRef.current = currentChatId;

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([]);
    setIsSidebarOpen(false);
    return newChat.id;
  };

  const selectChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  const addMessage = (message, chatId) => {
    const newMessage = {
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7),
      ...message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);

    const targetChatId = chatId || currentChatIdRef.current;
    if (targetChatId) {
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          const updatedMessages = [...(chat.messages || []), newMessage];
          const title = chat.title === 'New Chat' && updatedMessages.length > 0
            ? (updatedMessages[0].content || 'Image message').substring(0, 30) + ((updatedMessages[0].content || '').length > 30 ? '...' : '')
            : chat.title;
          return { ...chat, messages: updatedMessages, title };
        }
        return chat;
      }));
    }
    return newMessage.id;
  };

  const updateMessage = (messageId, content, chatId) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, content } : m
    ));
    const targetChatId = chatId || currentChatIdRef.current;
    if (targetChatId) {
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          const updatedMessages = (chat.messages || []).map(m =>
            m.id === messageId ? { ...m, content } : m
          );
          return { ...chat, messages: updatedMessages };
        }
        return chat;
      }));
    }
  };

  const sendMessage = async (content, images = [], language = 'Auto') => {
    if ((!content || !content.trim()) && images.length === 0) return;

    // Ensure we have a chat
    let chatId = currentChatIdRef.current;
    if (!chatId) {
      chatId = createNewChat();
      currentChatIdRef.current = chatId;
    }

    const userMessage = {
      role: 'user',
      content: content || '',
      images: images.length > 0 ? images : undefined
    };

    addMessage(userMessage, chatId);
    setIsTyping(true);

    const allMessages = [...messagesRef.current, userMessage];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages,
          images: images.length > 0 ? images : undefined,
          language
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantId = Date.now().toString() + '-assistant';

      addMessage({ id: assistantId, role: 'assistant', content: '' }, chatId);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                updateMessage(assistantId, assistantMessage, chatId);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore parsing errors for individual chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again. / माफ़ करें, कुछ गलती हुई। कृपया फिर कोशिश करें।'
      }, chatId);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-20 transition-transform duration-300 ease-in-out`}>
        <Sidebar
          chats={chats}
          currentChatId={currentChatId}
          onCreateNew={createNewChat}
          onSelectChat={selectChat}
          onDeleteChat={deleteChat}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col relative">
        <MainArea
          messages={messages}
          isTyping={isTyping}
          onSendMessage={sendMessage}
          onOpenVoiceMode={() => setIsVoiceMode(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      </div>

      {isVoiceMode && (
        <VoiceOverlay
          onClose={() => setIsVoiceMode(false)}
          onSendMessage={sendMessage}
          messages={messages}
          isTyping={isTyping}
        />
      )}
    </div>
  );
}

export default App;