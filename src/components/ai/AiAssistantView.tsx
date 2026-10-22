'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Sparkles, 
  Send, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Calendar,
  Repeat,
  Wrench,
  MapPin,
  RefreshCw
} from 'lucide-react';

interface ChatEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  isError?: boolean;
}

const SUGGESTED_PROMPTS_EN = [
  {
    icon: MapPin,
    title: 'Report Hazards',
    text: 'How do I report a flash flood or pothole on the Resilience Map?',
    targetTab: 'resilience',
  },
  {
    icon: Calendar,
    title: 'Upcoming Events',
    text: 'What community events and activities are happening this month?',
    targetTab: 'home',
  },
  {
    icon: Repeat,
    title: 'Circular Exchange',
    text: 'How does the Circular Exchange work and what items are available?',
    targetTab: 'exchange',
  },
  {
    icon: Wrench,
    title: 'Local Services',
    text: 'Where can I find plumbing, tutoring, or home repair services in Elmina?',
    targetTab: 'services',
  },
  {
    icon: ShieldCheck,
    title: 'Auxiliary Police',
    text: 'What is the 24/7 hotline for Elmina Auxiliary Police and how are patrols scheduled?',
    targetTab: 'home',
  },
  {
    icon: HelpCircle,
    title: 'Township Guidelines',
    text: 'What are the official community bylaws and verification rules for residents?',
    targetTab: 'feed',
  },
];

const SUGGESTED_PROMPTS_BM = [
  {
    icon: MapPin,
    title: 'Lapor Aduan',
    text: 'Bagaimana cara melaporkan banjir kilat atau jalan rosak di Peta Ketahanan?',
    targetTab: 'resilience',
  },
  {
    icon: Calendar,
    title: 'Acara Komuniti',
    text: 'Apakah aktiviti dan program komuniti yang dijadualkan bulan ini?',
    targetTab: 'home',
  },
  {
    icon: Repeat,
    title: 'Circular Exchange',
    text: 'Bagaimana cara menyumbang atau menukar barangan di Circular Exchange?',
    targetTab: 'exchange',
  },
  {
    icon: Wrench,
    title: 'Servis Tempatan',
    text: 'Bagaimana mencari perkhidmatan paip, kelas tuisyen atau bantuan di Elmina?',
    targetTab: 'services',
  },
  {
    icon: ShieldCheck,
    title: 'Polis Bantuan',
    text: 'Apakah nombor kecemasan Polis Bantuan Elmina dan waktu rondaan keselamatan?',
    targetTab: 'home',
  },
  {
    icon: HelpCircle,
    title: 'Panduan Komuniti',
    text: 'Apakah peraturan komuniti dan proses pengesahan aduan penduduk?',
    targetTab: 'feed',
  },
];

export default function AiAssistantView() {
  const { currentUser, language, setLanguage, setActiveTab, navigateToItem } = useApp();

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const isMalay = language === 'bm' || language === 'ms-MY';
  const suggestedPrompts = isMalay ? SUGGESTED_PROMPTS_BM : SUGGESTED_PROMPTS_EN;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setInputValue('');

    const userMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for API (last 6 messages)
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          preferredLanguage: isMalay ? 'bm' : 'en',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorText = data.answer || data.error || 'Failed to receive response from AI Assistant.';
        const errorEntry: ChatEntry = {
          id: `ai-err-${Date.now()}`,
          role: 'model',
          text: errorText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          modelUsed: data.model || 'Gemini Flash',
        };
        setMessages((prev) => [...prev, errorEntry]);
        setErrorMessage(errorText);
      } else {
        const assistantMessage: ChatEntry = {
          id: `ai-${Date.now()}`,
          role: 'model',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: data.model || 'Gemini Flash',
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const networkErrorEntry: ChatEntry = {
        id: `ai-neterr-${Date.now()}`,
        role: 'model',
        text: isMalay
          ? 'Ralat komunikasi rangkaian. Sila semak sambungan internet anda dan cuba lagi.'
          : 'Network communication error. Please check your internet connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, networkErrorEntry]);
      setErrorMessage(networkErrorEntry.text);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Parses assistant markdown and turns bracketed navigation cues
   * e.g. [Resilience Map], [Community Feed], [Circular Exchange], [Local Services]
   * into clickable deep-link buttons.
   */
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');

    return (
      <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <div key={lIdx} className="h-1.5" />;
          }

          // Bullet points
          const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
          const lineClean = isBullet ? line.trim().substring(2) : line;

          // Replace section tokens with interactive tags
          const parts = lineClean.split(/(\[[^\]]+\]|\*\*[^*]+\*\*)/g);

          const renderedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 dark:text-slate-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }

            if (part.startsWith('[') && part.endsWith(']')) {
              const label = part.slice(1, -1);
              const labelLower = label.toLowerCase();

              let targetTab: string | null = null;
              if (labelLower.includes('resilience') || labelLower.includes('peta ketahanan') || labelLower.includes('map')) {
                targetTab = 'resilience';
              } else if (labelLower.includes('feed') || labelLower.includes('announcement') || labelLower.includes('pengumuman')) {
                targetTab = 'feed';
              } else if (labelLower.includes('exchange') || labelLower.includes('circular') || labelLower.includes('barter')) {
                targetTab = 'exchange';
              } else if (labelLower.includes('service') || labelLower.includes('perkhidmatan')) {
                targetTab = 'services';
              } else if (labelLower.includes('event') || labelLower.includes('home') || labelLower.includes('acara')) {
                targetTab = 'home';
              } else if (labelLower.includes('setting') || labelLower.includes('tetapan')) {
                targetTab = 'settings';
              }

              if (targetTab) {
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setActiveTab(targetTab!)}
                    className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 text-[#BA1B1D] dark:text-rose-300 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors cursor-pointer"
                    title={`Navigate to ${label}`}
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </button>
                );
              }

              return (
                <span key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">
                  {label}
                </span>
              );
            }

            return <span key={pIdx}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BA1B1D] dark:bg-rose-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">{renderedLine}</div>
              </div>
            );
          }

          return <p key={lIdx}>{renderedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#F8F9FA] dark:bg-[#0F1113] overflow-hidden select-none">
      {/* 1. Header Bar */}
      <header className="shrink-0 bg-white dark:bg-[#15181C] border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BA1B1D] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                AI Assistant
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isMalay 
                ? 'Panduan Komuniti Bandar Elmina & Navigasi Pintar' 
                : 'Bandar Elmina Smart Township Guide & Navigator'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                !isMalay
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ms-MY')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                isMalay
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              BM
            </button>
          </div>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isMalay ? 'Padamkan Perbualan' : 'Clear Chat History'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMalay ? 'Padam Sembang' : 'Clear Chat'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Privacy Shield Sub-Bar */}
      <div className="shrink-0 bg-slate-100/90 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/80 px-4 py-1.5 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>{isMalay ? 'Privasi Terlindung:' : 'Privacy Shield Active:'}</strong>{' '}
            {isMalay 
              ? 'Perbualan tidak disimpan. Nombor telefon dan data sulit penduduk dirahsiakan.' 
              : 'Zero conversation persistence. Private resident contacts & unverified reports are protected.'}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-slate-500 text-[10px]">
          <span>Elmina Auxiliary Police:</span>
          <strong className="text-[#BA1B1D] dark:text-rose-400 font-mono">03-7845 2222</strong>
        </div>
      </div>

      {/* 3. Chat Message Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* Welcome Banner Card */}
            <div className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 text-[#BA1B1D] dark:text-rose-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isMalay
                    ? `Selamat Sejahtera, ${currentUser.displayName || currentUser.fullName}!`
                    : `Welcome to TESDH AI, ${currentUser.displayName || currentUser.fullName}!`}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isMalay
                    ? 'Saya pembantu AI rasmi komuniti Bandar Elmina. Saya boleh membantu anda mencari pengumuman JMB, menyemak acara bulanan, memahami cara membuat laporan banjir kilat di Peta Ketahanan, serta meneroka barangan di Circular Exchange.'
                    : 'I am the official AI Assistant for Bandar Elmina residents. Ask me about official JMB announcements, upcoming community events, reporting environmental incidents on the Resilience Map, or exploring items on the Circular Exchange.'}
                </p>
              </div>
            </div>

            {/* Quick Suggestion Prompts Grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
                {isMalay ? 'Soalan & Topik Dicadangkan' : 'Suggested Questions & Topics'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestedPrompts.map((prompt, idx) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt.text)}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#15181C] hover:border-[#BA1B1D]/40 dark:hover:border-rose-500/40 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-left transition-all duration-150 cursor-pointer shadow-2xs group flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-[#BA1B1D] group-hover:text-white transition-colors flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#BA1B1D] dark:group-hover:text-rose-400 transition-colors">
                          {prompt.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                        {prompt.text}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* AI Avatar */}
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-xl bg-[#BA1B1D] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-[#BA1B1D] text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/80 text-rose-950 dark:text-rose-200 rounded-bl-xs'
                      : 'bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Message Meta Info */}
                  <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] opacity-75">
                    <span className="font-bold">
                      {msg.role === 'user'
                        ? currentUser.displayName || currentUser.fullName
                        : 'AI Assistant'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Text Content */}
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {msg.text}
                    </p>
                  ) : (
                    renderFormattedText(msg.text)
                  )}

                  {/* Retry button for error states */}
                  {msg.isError && (
                    <div className="mt-3 pt-2.5 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                      <span className="text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {isMalay ? 'Permintaan tidak dapat diproses' : 'Query could not be processed'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                          if (lastUserMsg) {
                            handleSendMessage(lastUserMsg.text);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{isMalay ? 'Cuba Semula' : 'Retry'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 mt-0.5"
                  />
                )}
              </div>
            ))}

            {/* Loading / Thinking Indicator */}
            {isLoading && (
              <div className="flex gap-3 items-start justify-start animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-xl bg-[#BA1B1D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-bl-xs p-4 shadow-2xs flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#BA1B1D] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#BA1B1D] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#BA1B1D] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {isMalay ? 'Sedang memproses...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 4. Bottom Input Form Box */}
      <div className="shrink-0 bg-white dark:bg-[#15181C] border-t border-slate-200/80 dark:border-slate-800 p-4 sm:px-6 shadow-md z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="max-w-3xl mx-auto space-y-2"
        >
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 focus-within:border-[#BA1B1D] focus-within:ring-2 focus-within:ring-[#BA1B1D]/20 transition-all p-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, 1000))}
              onKeyDown={handleKeyDown}
              placeholder={
                isMalay
                  ? 'Tanya mengenai acara, servis, exchange, atau cara lapor isu komuniti...'
                  : 'Ask about community events, local services, exchange, or incident reporting...'
              }
              disabled={isLoading}
              className="flex-1 bg-transparent border-0 focus:outline-hidden resize-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 max-h-32 p-1.5 leading-normal"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                inputValue.trim() && !isLoading
                  ? 'bg-[#BA1B1D] hover:bg-[#991517] text-white shadow-xs scale-100'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed scale-95 opacity-60'
              }`}
              title={isMalay ? 'Hantar mesej' : 'Send message'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Footer note & character counter */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
            <span>
              {isMalay 
                ? 'Kecemasan keselamatan? Hubungi Polis Bantuan Elmina di 03-7845 2222.' 
                : 'Security emergency? Call Elmina Auxiliary Police directly at 03-7845 2222.'}
            </span>
            <span className={`${inputValue.length > 900 ? 'text-amber-600 font-bold' : ''}`}>
              {inputValue.length}/1000
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
