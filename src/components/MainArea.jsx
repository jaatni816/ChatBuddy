import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Mic, MicOff, ChevronDown, Volume2, Menu, Ghost, X, Image } from 'lucide-react';
import MessageList from './MessageList';

// Orange asterisk SVG logo
const AsteriskLogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 5V15M20 25V35M5 20H15M25 20H35M9.5 9.5L16.5 16.5M23.5 23.5L30.5 30.5M9.5 30.5L16.5 23.5M23.5 16.5L30.5 9.5" stroke="#D97757" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const Greeting = ({ userName = 'nargish' }) => {
  const greetings = [
    `Back at it, ${userName}`,
    `Good to see you, ${userName}`,
    `Ready when you are, ${userName}`,
    `Let's get started, ${userName}`
  ];

  const [greetingIndex] = useState(Math.floor(Math.random() * greetings.length));

  return (
    <div className="text-center mb-8 animate-fade-in">
      <div className="flex items-center justify-center gap-3 mb-4">
        <AsteriskLogo size={36} />
        <h1 className="font-serif text-[40px] font-normal">
          {greetings[greetingIndex]}
        </h1>
      </div>
    </div>
  );
};

const TOAST_DURATION = 3500;

const InputCard = ({ onSendMessage, onOpenVoiceMode }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('Chat');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [images, setImages] = useState([]);
  const [toast, setToast] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const toastTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // Image compression
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxSize = 1536;
          if (width > height && width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files) => {
    const validFiles = Array.from(files).filter(f =>
      f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    );

    if (validFiles.length === 0) {
      showToast('कृपया एक मान्य छवि चुनें (PNG, JPG, WEBP, max 5MB) / Please select a valid image (max 5MB)');
      return;
    }

    const remaining = 4 - images.length;
    if (remaining <= 0) {
      showToast('अधिकतम 4 छवियां हो सकती हैं / Maximum 4 images allowed');
      return;
    }

    const filesToAdd = validFiles.slice(0, remaining);
    const compressed = await Promise.all(filesToAdd.map(compressImage));
    const validCompressed = compressed.filter(c => c !== null);
    setImages(prev => [...prev, ...validCompressed].slice(0, 4));
    textareaRef.current?.focus();
  }, [images, showToast]);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files) handleFiles(files);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // VAD-based silence detection
  const startVAD = useCallback((stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      micStreamRef.current = stream;
      checkSilence();
    } catch (e) {
      console.warn('VAD not available:', e);
    }
  }, []);

  const checkSilence = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;

    if (avg < 5) {
      silenceTimerRef.current = setTimeout(() => {
        if (isListening && mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 1500);
    } else {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }

    if (isListening) {
      requestAnimationFrame(checkSilence);
    }
  }, [isListening]);

  // Fallback: MediaRecorder transcription
  const transcribeWithMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVAD(stream);

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.text) {
            setInput(prev => prev + data.text);
          } else {
            showToast('कोई भाषण नहीं मिला / No speech detected');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          showToast('नेटवर्क त्रुटि / Network error');
        }

        stream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error('Microphone error:', err);
      showToast('माइक्रोफ़ोन एक्सेस अस्वीकृत / Microphone access denied');
    }
  }, [startVAD, showToast]);

  const handleMicClick = useCallback(async () => {
    if (isListening) {
      // Stop listening
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      setInterimText('');
      return;
    }

    // Start listening
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Fallback to MediaRecorder
      setIsListening(true);
      await transcribeWithMediaRecorder();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'hi-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInput(prev => prev + finalTranscript);
      }
      setInterimText(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimText('');

      if (event.error === 'not-allowed') {
        showToast('माइक्रोफ़ोन एक्सेस अस्वीकृत / Microphone access denied');
      } else if (event.error === 'no-speech') {
        showToast('कोई भाषण नहीं मिला / No speech detected');
      } else if (event.error === 'network') {
        showToast('नेटवर्क त्रुटि / Network error');
      } else {
        showToast('त्रुटि: ' + event.error + ' / Error occurred');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error('Recognition start error:', err);
      setIsListening(false);
    }
  }, [isListening, transcribeWithMediaRecorder, showToast]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text && images.length === 0) return;

    onSendMessage(text || 'Describe this image and read any text in it.', images);
    setInput('');
    setImages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) handleFiles(files);
  }, [handleFiles]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.addEventListener('paste', handlePaste);
      return () => el.removeEventListener('paste', handlePaste);
    }
  }, [handlePaste]);

  return (
    <div className="w-full max-w-[660px] mx-auto">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm z-50 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`bg-white border rounded-[24px] shadow-card p-5 transition-colors duration-200 ${
          isDragging ? 'border-accent border-2' : 'border-[#E1DFD5]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {images.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img}
                  alt={`Preview ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'सुन रहे हैं... / Listening...' : 'Type / for skills'}
            className="w-full border-none outline-none resize-none bg-transparent text-[16px] placeholder:text-muted min-h-[60px]"
            rows={2}
          />
          {isListening && interimText && (
            <div className="absolute bottom-0 left-0 right-0 text-[14px] text-muted italic">
              {interimText}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover transition-colors"
              aria-label="Attach image"
            >
              <Plus size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex items-center bg-input-bg rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMode('Chat')}
                className={`px-3 py-1 rounded-md text-[14px] transition-colors ${
                  mode === 'Chat' ? 'bg-white shadow-sm' : ''
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMode('Cowork')}
                className={`px-3 py-1 rounded-md text-[14px] transition-colors ${
                  mode === 'Cowork' ? 'bg-white shadow-sm' : ''
                }`}
              >
                Cowork
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[14px] text-muted">
              Groq <span className="ml-1">Fast</span>
            </div>

            <button
              type="button"
              onClick={handleMicClick}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-hover'
              }`}
              aria-label={isListening ? 'Stop recording' : 'Start dictation'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              onClick={onOpenVoiceMode}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover transition-colors"
              aria-label="Open voice mode"
            >
              <Volume2 size={18} />
              <ChevronDown size={12} className="ml-0.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const MainArea = ({ messages, isTyping, onSendMessage, onOpenVoiceMode, onOpenSidebar }) => {
  const hasMessages = messages.length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onOpenSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="flex-1" />
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors" aria-label="Private mode">
          <Ghost size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {!hasMessages ? (
          <div className="w-full max-w-[650px]">
            <div className="flex justify-center mb-6">
              <div className="bg-input-bg rounded-full px-4 py-2 text-[13px]">
                Free plan · <span className="text-link underline cursor-pointer">Upgrade</span>
              </div>
            </div>

            <Greeting userName="nargish" />

            <InputCard onSendMessage={onSendMessage} onOpenVoiceMode={onOpenVoiceMode} />
          </div>
        ) : (
          <div className="w-full max-w-[650px] flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin mb-4">
              <MessageList messages={messages} isTyping={isTyping} />
            </div>

            <InputCard onSendMessage={onSendMessage} onOpenVoiceMode={onOpenVoiceMode} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainArea;