'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { performGlobalSearch } from '@/lib/utils/searchEngine';
import { SearchResultItem, SearchResultModule } from '@/types';
import { 
  Search, 
  X, 
  Loader2, 
  Lock, 
  MessageSquare, 
  AlertTriangle, 
  Repeat, 
  Wrench, 
  CornerDownLeft, 
  MapPin, 
  Clock, 
  ExternalLink 
} from 'lucide-react';

export default function GlobalSearch() {
  const { 
    posts, 
    comments, 
    incidents, 
    exchangeItems, 
    services, 
    currentUser,
    navigateToItem,
    activeTab
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeqRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Group results by module
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultModule, SearchResultItem[]> = {
      feed: [],
      comments: [],
      incidents: [],
      exchange: [],
      services: [],
      requests: [],
    };

    for (const r of results) {
      if (groups[r.module]) {
        groups[r.module].push(r);
      }
    }
    return groups;
  }, [results]);

  // Flattened results for keyboard navigation index calculation
  const flatResults = useMemo(() => {
    const list: SearchResultItem[] = [];
    const order: SearchResultModule[] = ['feed', 'comments', 'incidents', 'exchange', 'services', 'requests'];
    for (const mod of order) {
      if (groupedResults[mod]?.length) {
        list.push(...groupedResults[mod]);
      }
    }
    return list;
  }, [groupedResults]);

  // Execute search with sequence tracking to prevent stale results
  const executeSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage(null);
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    setIsSearching(true);
    setErrorMessage(null);

    try {
      const hits = performGlobalSearch(trimmed, {
        posts,
        comments,
        incidents,
        exchangeItems,
        services,
        currentUser,
      });

      if (currentSeq === searchSeqRef.current) {
        setResults(hits);
        setIsSearching(false);
        setIsOpen(true);
        setFocusedIndex(-1);
      }
    } catch (_err: unknown) {
      if (currentSeq === searchSeqRef.current) {
        setIsSearching(false);
        setErrorMessage('Unable to process search at this time.');
      }
    }
  }, [posts, comments, incidents, exchangeItems, services, currentUser]);

  // Handle input change with 200ms debounce
  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      searchSeqRef.current++;
      setResults([]);
      setIsOpen(false);
      setIsSearching(false);
      setFocusedIndex(-1);
      setErrorMessage(null);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
    }, 200);
  };

  // Immediate Enter key trigger
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen && searchQuery.trim().length > 0 && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      setFocusedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (focusedIndex >= 0 && flatResults[focusedIndex]) {
        handleSelectResult(flatResults[focusedIndex]);
      } else {
        executeSearch(searchQuery);
      }
    }
  };

  // Handle result selection
  const handleSelectResult = (result: SearchResultItem) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    searchSeqRef.current++;
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchQuery('');
    setResults([]);
    setIsSearching(false);
    setErrorMessage(null);
    inputRef.current?.blur();

    switch (result.module) {
      case 'feed':
        navigateToItem({
          tab: 'feed',
          itemId: result.id,
          itemType: 'post',
        });
        break;
      case 'comments':
        navigateToItem({
          tab: 'feed',
          itemId: result.id,
          parentId: result.parentPostId,
          itemType: 'comment',
        });
        break;
      case 'incidents':
        navigateToItem({
          tab: 'resilience',
          itemId: result.id,
          itemType: 'incident',
        });
        break;
      case 'exchange':
        navigateToItem({
          tab: 'exchange',
          itemId: result.id,
          itemType: 'exchange',
        });
        break;
      case 'services':
        navigateToItem({
          tab: 'services',
          subTab: 'services',
          itemId: result.id,
          itemType: 'service',
        });
        break;
      case 'requests':
        navigateToItem({
          tab: 'services',
          subTab: 'requests',
          itemId: result.id,
          itemType: 'service',
        });
        break;
    }
  };

  // Clear query
  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    searchSeqRef.current++;
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
    setIsSearching(false);
    setFocusedIndex(-1);
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  // Dismiss dropdown and cancel pending search when switching sections
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    searchSeqRef.current++;
    const timer = setTimeout(() => {
      setIsOpen(false);
      setFocusedIndex(-1);
      setIsSearching(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Dismiss dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      searchSeqRef.current++;
    };
  }, []);

  const getModuleIcon = (mod: SearchResultModule) => {
    switch (mod) {
      case 'feed':
        return <MessageSquare className="w-3.5 h-3.5 text-[#9E1315]" />;
      case 'comments':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'incidents':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'exchange':
        return <Repeat className="w-3.5 h-3.5 text-purple-600" />;
      case 'services':
        return <Wrench className="w-3.5 h-3.5 text-teal-600" />;
      case 'requests':
        return <Wrench className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px] pointer-events-none">
          search
        </span>
        <input 
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="global-search-results-panel"
          aria-autocomplete="list"
          aria-label="Global search across Elmina community hub"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search Elmina posts, amenities, municipal notices..."
          className="w-full h-9 pl-10 pr-9 rounded-lg bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 text-[13px] placeholder:text-slate-400 border border-slate-200/80 dark:border-slate-800 focus:border-slate-300 dark:focus:border-slate-700 focus:outline-none transition-all shadow-2xs"
        />

        {/* Clear (×) or Loading Indicator */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-[#9E1315] animate-spin" />
          ) : searchQuery.length > 0 ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown Results Panel */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div 
          id="global-search-results-panel"
          role="listbox"
          className="absolute top-full left-0 right-0 sm:left-auto sm:right-auto sm:w-[540px] max-w-[calc(100vw-2rem)] mt-2 z-50 bg-white/98 dark:bg-[#15181C]/98 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Sub-header Bar */}
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium">
              {isSearching ? (
                <span>Searching across modules...</span>
              ) : results.length > 0 ? (
                <span>
                  Found <strong className="text-slate-900 dark:text-slate-100 font-semibold">{results.length}</strong> matching records for &quot;{searchQuery}&quot;
                </span>
              ) : (
                <span>Search results</span>
              )}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↑↓</span> to navigate
              <span className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↵</span> to select
              <span className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Esc</span> to close
            </span>
          </div>

          {/* Results Scroll Area */}
          <div className="max-h-[60vh] sm:max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {errorMessage ? (
              <div className="p-6 text-center text-rose-600 text-[13px]">
                {errorMessage}
              </div>
            ) : isSearching && results.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#9E1315]" />
                <span className="text-xs">Searching Elmina database...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No results found for &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Try checking your spelling or search by general categories such as <span className="font-semibold text-slate-700 dark:text-slate-300">flood</span>, <span className="font-semibold text-slate-700 dark:text-slate-300">plumbing</span>, <span className="font-semibold text-slate-700 dark:text-slate-300">sofa</span>, or <span className="font-semibold text-slate-700 dark:text-slate-300">Central Park</span>.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Community Feed Posts */}
                {groupedResults.feed.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-[#9E1315]" />
                      <span>Community Feed Posts ({groupedResults.feed.length})</span>
                    </div>
                    {groupedResults.feed.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isFocused}
                          onClick={() => handleSelectResult(item)}
                          className={`w-full p-2.5 rounded-xl text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                            isFocused
                              ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeColor}`}>
                              {item.categoryOrType}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.snippet}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-500">{item.authorOrLocation}</span>
                            <span>•</span>
                            <span>{item.precinct}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Community Comments */}
                {groupedResults.comments.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-blue-600" />
                      <span>Comments &amp; Discussion Replies ({groupedResults.comments.length})</span>
                    </div>
                    {groupedResults.comments.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isFocused}
                          onClick={() => handleSelectResult(item)}
                          className={`w-full p-2.5 rounded-xl text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                            isFocused
                              ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                              Comment
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed italic">
                            &quot;{item.snippet}&quot;
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-500">{item.authorOrLocation}</span>
                            {item.precinct && (
                              <>
                                <span>•</span>
                                <span>{item.precinct}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Resilience Incidents */}
                {groupedResults.incidents.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Resilience Map Incidents ({groupedResults.incidents.length})</span>
                    </div>
                    {groupedResults.incidents.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isFocused}
                          onClick={() => handleSelectResult(item)}
                          className={`w-full p-2.5 rounded-xl text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                            isFocused
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeColor}`}>
                              {item.categoryOrType}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.snippet}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.authorOrLocation}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Circular Exchange */}
                {groupedResults.exchange.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Repeat className="w-3 h-3 text-purple-600" />
                      <span>Exchange ({groupedResults.exchange.length})</span>
                    </div>
                    {groupedResults.exchange.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isFocused}
                          onClick={() => handleSelectResult(item)}
                          className={`w-full p-2.5 rounded-xl text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                            isFocused
                              ? 'bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeColor}`}>
                              {item.moduleLabel}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.snippet}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-500">{item.categoryOrType}</span>
                            <span>•</span>
                            <span>{item.precinct}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. Local Services (Offerings) */}
                {groupedResults.services.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-teal-600" />
                      <span>Local Services &amp; Offerings ({groupedResults.services.length})</span>
                    </div>
                    {groupedResults.services.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isFocused}
                          onClick={() => handleSelectResult(item)}
                          className={`w-full p-2.5 rounded-xl text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                            isFocused
                              ? 'bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 bg-teal-50 text-teal-700 border-teal-200">
                              Service Offering
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.snippet}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-500">{item.authorOrLocation}</span>
                            <span>•</span>
                            <span>{item.categoryOrType}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. Local Services (Help Requests) */}
                {groupedResults.requests.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-amber-600" />
                      <span>Requests for Help &amp; Mutual Aid ({groupedResults.requests.length})</span>
                    </div>
                    {groupedResults.requests.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      const isFocused = flatIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isFocused}
                          onClick={() => handleSelectResult(item)}
                          className={`w-full p-2.5 rounded-xl text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                            isFocused
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 bg-amber-50 text-amber-800 border-amber-200">
                              Help Request
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.snippet}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-500">{item.authorOrLocation}</span>
                            <span>•</span>
                            <span>{item.categoryOrType}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Privacy Protection Banner Footer */}
          <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#9E1315]" />
              <span className="text-[10.5px]">Authorized data only • Private chats, phone numbers &amp; unit addresses excluded</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">City of Elmina Hub</span>
          </div>
        </div>
      )}
    </div>
  );
}
