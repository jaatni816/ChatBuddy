import React, { useEffect, useRef } from 'react';

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
            <p className="text-[15px] whitespace-pre-wrap">{message.content}</p>
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
        <p className="text-[15px] whitespace-pre-wrap">{message.content}</p>
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col">
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isTyping={isTyping && message.id === messages[messages.length - 1]?.id}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;