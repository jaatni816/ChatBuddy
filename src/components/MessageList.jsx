import React, { useEffect, useRef, useState, useCallback } from 'react';

const Message = ({ message, isTyping }) => {
  const isUser = message.role === 'user';
  const hasImages = message.images && message.images.length > 0;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="bg-input-bg rounded-2xl px-4 py-3 max-w-[80%]">
          {hasImages && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Shared image ${i + 1}`}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
          {message.content && (
            <p className="text-[15px] whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-4 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5V15M20 25V35M5 20H15M25 20H35M9.5 9.5L16.5 16.5M23.5 23.5L30.5 30.5M9.5 30.5L16.5 23.5M23.5 16.5L30.5 9.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="flex-1 pt-1">
        <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        {isTyping && (
          <div className="flex gap-1 mt-2">
            <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
};

const MessageList = ({ messages, isTyping }) => {
  const containerRef = useRef(null);
  const endRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAtBottomRef = useRef(true);

  const checkIfAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, []);

  const handleScroll = useCallback(() => {
    checkIfAtBottom();
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      isAtBottomRef.current = true;
      setShowScrollButton(false);
    }
  }, []);

  // Only auto-scroll if user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(messages.length > 0 ? 'smooth' : 'instant');
    }
  }, [messages, isTyping, scrollToBottom]);

  // Check scroll position on mount
  useEffect(() => {
    checkIfAtBottom();
  }, [checkIfAtBottom]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 max-h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin px-1 max-h-full"
      >
        <div className="flex flex-col py-4">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isTyping={isTyping && message.id === messages[messages.length - 1]?.id}
            />
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-white border border-border shadow-card rounded-full flex items-center justify-center hover:bg-hover transition-colors z-10"
          aria-label="Scroll to bottom"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MessageList;