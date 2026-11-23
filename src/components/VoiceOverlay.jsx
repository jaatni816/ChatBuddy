import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

const stripMarkdown = (text) => {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/>\s/g, '');
};

const pickVoice = (text, lang) => {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const targetLang = hasDevanagari ? 'hi-IN' : (lang === 'auto' ? 'en-IN' : lang);
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang === targetLang) ||
    voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
  return match || null;
};

const VoiceOverlay = ({ onClose, onSendMessage, messages, isTyping }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState('hi-IN');
  const [voiceState, setVoiceState] = useState('idle');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const messagesEndRef = useRef(null);
  const voiceStateRef = useRef(voiceState);
  const mutedRef = useRef(isMuted);
  const langRef = useRef(language);
  const conversationActiveRef = useRef(false);
  const lastAssistantIdRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set());
  const pendingSpeechTimeoutRef = useRef(null);

  voiceStateRef.current = voiceState;
  mutedRef.current = isMuted;
  langRef.current = language;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speak = useCallback((text) => {
    if (!text || mutedRef.current) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const cleanText = stripMarkdown(text);
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = pickVoice(cleanText, langRef.current);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || (langRef.current === 'auto' ? 'en-IN' : langRef.current);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setVoiceState('speaking');
      voiceStateRef.current = 'speaking';
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (voiceStateRef.current === 'speaking') {
        if (conversationActiveRef.current) {
          setVoiceState('idle');
          voiceStateRef.current = 'idle';
          setTimeout(() => startListening(), 400);
        } else {
          setVoiceState('idle');
          voiceStateRef.current = 'idle';
        }
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    if (isSpeaking) return;
    setError(null);

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = langRef.current === 'auto' ? 'en-IN' : langRef.current;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceState('listening');
      voiceStateRef.current = 'listening';
      setTranscript('');
      setInterimTranscript('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      if (interimTranscript) {
        setInterimTranscript(interimTranscript);
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setInterimTranscript('');
        setVoiceState('thinking');
        voiceStateRef.current = 'thinking';
        onSendMessage(finalTranscript);

        if (pendingSpeechTimeoutRef.current) {
          clearTimeout(pendingSpeechTimeoutRef.current);
        }
        pendingSpeechTimeoutRef.current = setTimeout(() => {
          checkAndSpeakResponse();
        }, 1500);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setVoiceState('idle');
      voiceStateRef.current = 'idle';

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic access.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
      } else if (event.error !== 'aborted') {
        setError('Error: ' + event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceStateRef.current === 'listening') {
        setVoiceState('idle');
        voiceStateRef.current = 'idle';
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error('Recognition start error:', err);
      setIsListening(false);
    }
  }, [isSpeaking, onSendMessage]);

  const checkAndSpeakResponse = useCallback(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' &&
      !processedMessageIdsRef.current.has(lastMsg.id) &&
      lastMsg.content) {
      processedMessageIdsRef.current.add(lastMsg.id);
      lastAssistantIdRef.current = lastMsg.id;
      speak(lastMsg.content);
    } else if (!isTyping && conversationActiveRef.current) {
      startListening();
    }
  }, [messages, isTyping, speak, startListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleMute = useCallback(() => {
    if (mutedRef.current) {
      setIsMuted(false);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } else {
      setIsMuted(true);
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    }
  }, []);

  // Barge-in: stop speaking when user starts listening
  useEffect(() => {
    if (isListening && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      voiceStateRef.current = 'listening';
    }
  }, [isListening, isSpeaking]);

  // Auto-start conversation when overlay opens
  useEffect(() => {
    conversationActiveRef.current = true;
    const timer = setTimeout(() => {
      startListening();
    }, 500);
    return () => {
      clearTimeout(timer);
      conversationActiveRef.current = false;
    };
  }, []);

  // Watch for new assistant messages
  useEffect(() => {
    if (!conversationActiveRef.current) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' &&
      !processedMessageIdsRef.current.has(lastMsg.id) &&
      lastMsg.content &&
      voiceStateRef.current === 'thinking') {
      processedMessageIdsRef.current.add(lastMsg.id);
      lastAssistantIdRef.current = lastMsg.id;
      if (pendingSpeechTimeoutRef.current) {
        clearTimeout(pendingSpeechTimeoutRef.current);
      }
      pendingSpeechTimeoutRef.current = setTimeout(() => {
        speak(lastMsg.content);
      }, 300);
    }
  }, [messages, speak]);

  useEffect(() => {
    return () => {
      conversationActiveRef.current = false;
      if (pendingSpeechTimeoutRef.current) {
        clearTimeout(pendingSpeechTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (synthRef.current && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 5V15M20 25V35M5 20H15M25 20H35M9.5 9.5L16.5 16.5M23.5 23.5L30.5 30.5M9.5 30.5L16.5 23.5M23.5 16.5L30.5 9.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-serif text-xl">Voice Mode</span>
          </div>
          <button
            onClick={() => {
              conversationActiveRef.current = false;
              if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
              if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover transition-colors"
            aria-label="Close voice mode"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="relative w-40 h-40 mb-8">
            <div
              className={`absolute inset-0 rounded-full transition-all duration-500 ${
                voiceState === 'listening'
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse-orb'
                  : voiceState === 'thinking'
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600 animate-pulse'
                  : voiceState === 'speaking'
                  ? 'bg-gradient-to-br from-green-400 to-green-600 animate-pulse'
                  : 'bg-gradient-to-br from-gray-300 to-gray-400'
              }`}
            />

            {voiceState === 'listening' && (
              <div className="absolute inset-0 flex items-center justify-center gap-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white rounded-full animate-wave-bar"
                    style={{
                      animationDelay: `${i * 100}ms`,
                      animationDuration: `${0.4 + Math.random() * 0.6}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-serif mb-2">
            {voiceState === 'listening' && 'Listening... / सुन रहे हैं...'}
            {voiceState === 'thinking' && 'Thinking... / सोच रहे हैं...'}
            {voiceState === 'speaking' && 'Speaking... / बोल रहे हैं...'}
            {voiceState === 'idle' && 'Ready / तैयार'}
          </h2>

          {error && (
            <p className="text-sm text-red-500 mt-2 text-center max-w-xs">{error}</p>
          )}

          <div className="flex gap-2 mt-4">
            {[
              { code: 'en-IN', label: 'English' },
              { code: 'hi-IN', label: 'हिन्दी' },
              { code: 'auto', label: 'Auto' }
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  if (isListening) {
                    stopListening();
                    setTimeout(() => startListening(), 300);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  language === lang.code
                    ? 'bg-accent text-white'
                    : 'bg-input-bg hover:bg-hover'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {(transcript || interimTranscript) && (
            <p className="mt-4 text-center text-muted max-w-sm truncate">
              "{interimTranscript || transcript}"
            </p>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-red-100 text-red-600' : 'bg-input-bg hover:bg-hover'
            }`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <div className="w-12" />
        </div>

        {messages.length > 0 && (
          <div className="max-h-32 overflow-y-auto border-t border-border p-4">
            {messages.slice(-3).map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block rounded-lg px-3 py-1.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-input-bg'
                      : 'bg-transparent'
                  }`}
                >
                  {msg.content.substring(0, 60)}{msg.content.length > 60 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceOverlay;