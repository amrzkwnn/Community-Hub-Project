'use client';

import React, { useState, useTransition } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  AiManagementInsight, 
  InsightCategory, 
  InsightPriority,
  ManagementAiChatMessage 
} from '@/types';
import { 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  Filter, 
  Search, 
  Send, 
  Bot, 
  User, 
  Clock, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  HelpCircle
} from 'lucide-react';

interface AiInsightsPanelProps {
  onNavigateTab: (tab: string, filter?: { filterKey?: string; filterValue?: string }) => void;
}

const CATEGORY_NAMES: Record<InsightCategory, { en: string; bm: string }> = {
  community_overview: { en: 'Community Overview', bm: 'Gambaran Komuniti' },
  emerging_issues: { en: 'Emerging Issues', bm: 'Isu Muncul' },
  incident_trends: { en: 'Incident Trends', bm: 'Trend Insiden' },
  moderation_insights: { en: 'Moderation Insights', bm: 'Wawasan Moderasi' },
  resident_concerns: { en: 'Resident Concerns', bm: 'Kebimbangan Penduduk' },
  service_exchange: { en: 'Service & Exchange', bm: 'Servis & Pertukaran' },
  recommended_actions: { en: 'Recommended Actions', bm: 'Cadangan Tindakan' },
};

const SUGGESTED_QUERIES = [
  { en: 'Summarize unresolved incidents this month.', bm: 'Ringkaskan laporan yang belum diselesaikan bulan ini.' },
  { en: 'What are the most common community problems?', bm: 'Apakah masalah komuniti paling kerap dilaporkan?' },
  { en: 'Which incident categories have the longest resolution times?', bm: 'Kategori insiden mana yang paling lama diselesaikan?' },
  { en: 'Show the moderation workload for the last 30 days.', bm: 'Tunjukkan beban kerja moderasi bagi 30 hari lepas.' },
  { en: 'What changed in community activity this week?', bm: 'Apa perubahan dalam aktiviti komuniti minggu ini?' },
];

export default function AiInsightsPanel({ onNavigateTab }: AiInsightsPanelProps) {
  const { 
    aiInsights, 
    isAiInsightsLoading, 
    fetchAiInsights, 
    askManagementAi, 
    managementPeriod,
    language 
  } = useApp();

  const isMalay = language === 'bm' || language === 'ms-MY';

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Ask Management AI Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ManagementAiChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: isMalay
        ? 'Selamat datang ke Pembantu AI Pengurusan TESDH. Anda boleh bertanya sebarang soalan analitikal berkaitan data insiden, moderasi, atau aktiviti komuniti yang disahkan.'
        : 'Welcome to TESDH Management AI Intelligence. You can ask operational and analytical questions about verified incidents, moderation workload, or community activity trends.',
      timestamp: new Date().toISOString(),
      suggestedFollowUps: isMalay ? [
        'Ringkaskan laporan yang belum diselesaikan.',
        'Apakah masalah komuniti paling kerap dilaporkan?',
        'Tunjukkan beban kerja moderasi bagi 30 hari lepas.'
      ] : [
        'Summarize unresolved incidents this month.',
        'What are the most common community problems?',
        'Show the moderation workload for the last 30 days.'
      ],
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filtered insights
  const filteredInsights = aiInsights.filter((insight) => {
    if (selectedCategory !== 'all' && insight.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = insight.title.toLowerCase().includes(q);
      const matchExpl = insight.explanation.toLowerCase().includes(q);
      if (!matchTitle && !matchExpl) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority: InsightPriority) => {
    switch (priority) {
      case 'critical':
        return { label: 'Critical', bg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800' };
      case 'high':
        return { label: 'High Priority', bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800' };
      case 'medium':
        return { label: 'Medium', bg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800' };
      case 'low':
        return { label: 'Routine', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
      default:
        return { label: 'Info', bg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' };
    }
  };

  const handleSendQuery = async (queryToSend?: string) => {
    const text = (queryToSend || chatInput).trim();
    if (!text || isAsking) return;

    const userMessage: ManagementAiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsAsking(true);

    try {
      const response = await askManagementAi(text, chatMessages);
      if (response) {
        setChatMessages((prev) => [...prev, response]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: isMalay
              ? 'Maaf, perkhidmatan AI tidak dapat diakses buat masa ini. Sila semak tab Analitik & Laporan untuk data langsung.'
              : 'Unable to process question at this time. Please check the Analytics & Reports tab for deterministic live data.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Error handling
    } finally {
      setIsAsking(false);
    }
  };

  const handleActionClick = (action: AiManagementInsight['suggestedAction']) => {
    if (!action) return;
    const filterKey = action.targetFilter ? Object.keys(action.targetFilter)[0] : undefined;
    const filterValue = filterKey && action.targetFilter ? action.targetFilter[filterKey] : undefined;
    onNavigateTab(action.targetTab, filterKey ? { filterKey, filterValue } : undefined);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Refresh */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isMalay ? 'Pengurusan AI' : 'AI Management'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                startTransition(() => {
                  fetchAiInsights(true);
                });
              }}
              disabled={isAiInsightsLoading || isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(isAiInsightsLoading || isPending) ? 'animate-spin' : ''}`} />
              <span>{isMalay ? 'Segar Semula Wawasan' : 'Refresh AI Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Ask Management AI Assistant Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9E1315] to-rose-700 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isMalay ? 'Pembantu Pengurusan AI' : 'AI Management Assistant'}
              </h3>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            Coverage: {managementPeriod}
          </div>
        </div>

        {/* Chat Stream */}
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {chatMessages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isModel 
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`space-y-2 max-w-[85%] ${isModel ? 'text-left' : 'text-right'}`}>
                  <div 
                    className={`inline-block p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isModel 
                        ? 'bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-xs' 
                        : 'bg-[#9E1315] text-white shadow-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Supporting Navigation Links */}
                  {isModel && msg.supportingLinks && msg.supportingLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.supportingLinks.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const filterKey = link.filter ? Object.keys(link.filter)[0] : undefined;
                            const filterValue = filterKey && link.filter ? link.filter[filterKey] : undefined;
                            onNavigateTab(link.tab, filterKey ? { filterKey, filterValue } : undefined);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-[#9E1315] dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggested Follow-Ups */}
                  {isModel && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedFollowUps.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendQuery(prompt)}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp & Latency */}
                  {isModel && msg.metrics && (
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <Clock className="w-3 h-3 inline" />
                      <span>{msg.metrics.durationMs}ms</span>
                      <span>•</span>
                      <span>{msg.metrics.modelUsed || 'Gemini 3.1'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAsking && (
            <div className="flex gap-3 items-center text-xs text-rose-700 dark:text-rose-400 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-[#9E1315]" />
              <span>{isMalay ? 'Sedang menganalisis pangkalan data operasi...' : 'Querying verified database metrics and formulating operational analysis...'}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={isMalay ? 'Tanya soalan operasi (cth: "Ringkaskan laporan yang belum diselesaikan")...' : 'Ask an operational question (e.g. "Which category has the longest resolution time?")...'}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#9E1315] transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAsking}
              className="px-5 py-3 rounded-2xl bg-[#9E1315] hover:bg-rose-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <span>{isMalay ? 'Hantar' : 'Ask'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Suggested Queries */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 shrink-0">
              {isMalay ? 'Cadangan:' : 'Suggested:'}
            </span>
            {SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuery(isMalay ? q.bm : q.en)}
                className="shrink-0 text-[11px] font-medium px-3 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-[#9E1315] dark:hover:text-rose-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {isMalay ? q.bm : q.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Operational Findings Filter Strip */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{isMalay ? 'Dapatan Operasi Berstruktur' : 'Evidence-Based Operational Findings'}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {filteredInsights.length} {isMalay ? 'Dapatan' : 'Findings'}
              </span>
            </h3>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMalay ? 'Cari dapatan wawasan...' : 'Search insights...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#9E1315]"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              selectedCategory === 'all'
                ? 'bg-[#9E1315] text-white border-[#9E1315] shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {isMalay ? 'Semua Kategori' : 'All Categories'} ({aiInsights.length})
          </button>
          {(Object.keys(CATEGORY_NAMES) as InsightCategory[]).map((cat) => {
            const count = aiInsights.filter((i) => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#9E1315] text-white border-[#9E1315] shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {isMalay ? CATEGORY_NAMES[cat].bm : CATEGORY_NAMES[cat].en} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Insight Cards Grid */}
      {filteredInsights.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isMalay ? 'Tiada Wawasan Dijumpai' : 'No Insights Found Matching Filter'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isMalay ? 'Cuba ubah carian kata kunci atau pilih kategori lain.' : 'Try adjusting your search criteria or resetting category filters.'}
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-[#9E1315] hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInsights.map((insight) => {
            const priorityBadge = getPriorityBadge(insight.priority);
            const categoryLabel = CATEGORY_NAMES[insight.category] 
              ? (isMalay ? CATEGORY_NAMES[insight.category].bm : CATEGORY_NAMES[insight.category].en)
              : insight.category;

            return (
              <div
                key={insight.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Category & Priority Strip */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {categoryLabel}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${priorityBadge.bg}`}>
                      {priorityBadge.label}
                    </span>
                  </div>

                  {/* Title & Explanation */}
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      {insight.explanation}
                    </p>
                  </div>

                  {/* Verified Evidence Box */}
                  {insight.evidence && insight.evidence.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {isMalay ? 'Bukti Data Bersepadu:' : 'Supporting Verified Telemetry:'}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {insight.evidence.map((ev, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-2xs">
                            <div className="text-[10px] text-slate-500 truncate">{ev.metricName}</div>
                            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">{ev.value}</div>
                            {ev.context && (
                              <div className="text-[9px] text-slate-400 truncate mt-0.5">{ev.context}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested Action Bar */}
                {insight.suggestedAction && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 font-medium truncate">
                      {insight.reportingPeriod}
                    </span>
                    <button
                      onClick={() => handleActionClick(insight.suggestedAction)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-[#9E1315] dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <span>{insight.suggestedAction.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
