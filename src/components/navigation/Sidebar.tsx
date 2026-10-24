'use client';

import React, { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/context/AppContext';
import { FEATURES } from '@/config/features';
import { X, ArrowLeft } from 'lucide-react';

const subscribeReducedMotion = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
};

const getReducedMotionSnapshot = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getReducedMotionServerSnapshot = () => false;

export default function Sidebar() {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    isAuthorizedForManagement,
    setIsProfileModalOpen,
    uiScale,
    language,
    t,
    isSidebarCollapsed,
    isMobileNavOpen,
    setIsMobileNavOpen
  } = useApp();

  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Single shared sliding highlight/pill state
  const [indicator, setIndicator] = useState<{
    top: number;
    height: number;
    visible: boolean;
    animate: boolean;
  }>({
    top: 0,
    height: 40,
    visible: false,
    animate: false,
  });

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const hasMountedRef = useRef(false);

  // Recalculate single shared sliding pill position based on active item
  const updateIndicator = useCallback((shouldAnimate = true) => {
    const nav = navRef.current;
    const activeEl = itemRefs.current[activeTab];

    if (!nav || !activeEl) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    const top = itemRect.top - navRect.top;
    const height = itemRect.height;

    setIndicator({
      top,
      height,
      visible: true,
      animate: shouldAnimate,
    });

    // Ensure selected item remains visible if sidebar scrolls on smaller screens
    try {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch {}
  }, [activeTab]);

  // Synchronize on activeTab change, UI scale change, or authorization change
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      // On initial mount, position indicator without slide transition
      updateIndicator(false);
      // Enable transitions after initial paint
      const t = setTimeout(() => {
        setIndicator((prev) => ({ ...prev, animate: true }));
      }, 50);
      return () => clearTimeout(t);
    } else {
      updateIndicator(true);
    }
  }, [activeTab, uiScale, isAuthorizedForManagement, updateIndicator]);

  // Recalculate indicator when sidebar expands
  useEffect(() => {
    if (!isSidebarCollapsed) {
      const timer = setTimeout(() => {
        updateIndicator(false);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isSidebarCollapsed, updateIndicator]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => updateIndicator(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileNavOpen, setIsMobileNavOpen]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileNavOpen]);

  const getInitials = (name: string) => {
    if (!name) return 'AZ';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleNavClick = (tab: string, isMobile = false) => {
    setActiveTab(tab);
    if (isMobile) {
      setIsMobileNavOpen(false);
    }
  };

  return (
    <>
      {/* =========================================================================
          1. DESKTOP COLLAPSIBLE SIDEBAR RAIL
          Animates width (280ms) and translates inner contents to prevent clipping
          ========================================================================= */}
      <aside 
        aria-label="Main Navigation"
        aria-hidden={isSidebarCollapsed}
        className={`hidden lg:block shrink-0 h-full select-none z-30 transition-[width] ease-in-out ${
          isSidebarCollapsed 
            ? 'w-0 border-r-0 overflow-hidden pointer-events-none' 
            : 'w-60 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#15181C] overflow-hidden'
        }`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : '280ms',
        }}
      >
        <div 
          className={`w-60 h-full flex flex-col justify-between overflow-y-auto bg-white dark:bg-[#15181C] transition-transform ease-in-out ${
            isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
          }`}
          style={{
            transitionDuration: prefersReducedMotion ? '0ms' : '280ms',
          }}
        >
          <div className="flex flex-col">
            {/* Brand Header */}
            <div 
              onClick={() => setActiveTab('home')}
              className="h-16 px-4 flex items-center border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#15181C] cursor-pointer group"
              title="NadiKomuniti — Connect & Relax"
            >
              <img
                src="/nadikomuniti/01_branding/logo-header-horizontal.webp"
                alt="NadiKomuniti — Connect & Relax"
                className="h-8 w-auto object-contain max-w-[190px] group-hover:scale-[1.02] transition-transform"
              />
            </div>

            {/* Navigation Links with Single Shared Sliding Active Indicator */}
            <nav 
              ref={navRef}
              aria-label="Primary"
              className="relative px-3 py-4 space-y-1"
            >
              {/* Shared Sliding Active Indicator Pill */}
              <div
                aria-hidden="true"
                data-testid="nav-active-indicator"
                className="absolute left-3 right-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border-l-[3px] border-[#9E1315] pointer-events-none z-0"
                style={{
                  top: 0,
                  transform: `translate3d(0, ${indicator.top}px, 0)`,
                  height: `${indicator.height}px`,
                  opacity: indicator.visible ? 1 : 0,
                  transition:
                    !indicator.animate || prefersReducedMotion
                      ? 'none'
                      : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), height 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease',
                }}
              />

              {/* 0. Home */}
              <button
                ref={(el) => { itemRefs.current['home'] = el; }}
                type="button"
                aria-current={activeTab === 'home' ? 'page' : undefined}
                onClick={() => handleNavClick('home')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'home'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] nav-icon-home ${activeTab === 'home' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    home
                  </span>
                  <span className="text-[13px] tracking-tight">
                    {t('navHome')}
                  </span>
                </div>
              </button>

              {/* 1. Community Feed */}
              <button
                ref={(el) => { itemRefs.current['feed'] = el; }}
                type="button"
                aria-current={activeTab === 'feed' ? 'page' : undefined}
                onClick={() => handleNavClick('feed')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'feed'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-5 h-5 nav-icon-feed">
                    <span className={`material-symbols-outlined text-[19px] ${activeTab === 'feed' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                      forum
                    </span>
                    <span className="badge-dot-1 absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#9E1315]" />
                    <span className="badge-dot-2 absolute -bottom-0.5 -left-0.5 w-1 h-1 rounded-full bg-amber-500/80" />
                  </div>
                  <span className="text-[13px] tracking-tight">
                    {t('navFeed')}
                  </span>
                </div>
              </button>

              {/* 2. Resilience Map */}
              <button
                ref={(el) => { itemRefs.current['resilience'] = el; }}
                type="button"
                aria-current={activeTab === 'resilience' ? 'page' : undefined}
                onClick={() => handleNavClick('resilience')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'resilience'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] nav-icon-map ${activeTab === 'resilience' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    map
                  </span>
                  <span className="text-[13px] tracking-tight">{t('navResilience')}</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              </button>

              {/* 3. Circular Exchange */}
              <button
                ref={(el) => { itemRefs.current['exchange'] = el; }}
                type="button"
                aria-current={activeTab === 'exchange' ? 'page' : undefined}
                onClick={() => handleNavClick('exchange')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'exchange'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] nav-icon-exchange ${activeTab === 'exchange' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    swap_horiz
                  </span>
                  {language === 'en' ? (
                    <span className="text-[13px] tracking-tight">Exchange</span>
                  ) : (
                    <span className="text-[13px] tracking-tight">{t('navExchange')}</span>
                  )}
                </div>
              </button>

              {/* 4. Local Services */}
              <button
                ref={(el) => { itemRefs.current['services'] = el; }}
                type="button"
                aria-current={activeTab === 'services' ? 'page' : undefined}
                onClick={() => handleNavClick('services')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'services'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] nav-icon-services ${activeTab === 'services' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    handyman
                  </span>
                  <span className="text-[13px] tracking-tight">{t('navServices')}</span>
                </div>
              </button>

              {/* 5. Secure Messages */}
              <button
                ref={(el) => { itemRefs.current['messages'] = el; }}
                type="button"
                aria-current={activeTab === 'messages' ? 'page' : undefined}
                onClick={() => handleNavClick('messages')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'messages'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] nav-icon-messages ${activeTab === 'messages' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    chat_bubble
                  </span>
                  <span className="text-[13px] tracking-tight">{t('navMessages')}</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                  2
                </span>
              </button>

              {/* Management Console (JMB) for authorized officers */}
              {isAuthorizedForManagement && (
                <button
                  ref={(el) => { itemRefs.current['management'] = el; }}
                  type="button"
                  aria-current={activeTab === 'management' ? 'page' : undefined}
                  onClick={() => handleNavClick('management')}
                  className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                    activeTab === 'management'
                      ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[19px] nav-icon-management ${activeTab === 'management' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                      admin_panel_settings
                    </span>
                    <span className="text-[13px] tracking-tight">{t('navManagement')}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-300 font-semibold text-[10px]">
                    STAFF
                  </span>
                </button>
              )}

              {/* Settings & Theme */}
              <button
                ref={(el) => { itemRefs.current['settings'] = el; }}
                type="button"
                aria-current={activeTab === 'settings' ? 'page' : undefined}
                onClick={() => handleNavClick('settings')}
                className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'settings'
                    ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] nav-icon-settings ${activeTab === 'settings' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    settings
                  </span>
                  <span className="text-[13px] tracking-tight">{t('navSettings')}</span>
                </div>
              </button>

              {/* Kiosk Mode (Phase-gated feature flag) */}
              {FEATURES.ENABLE_KIOSK_MODE && (
                <button
                  ref={(el) => { itemRefs.current['kiosk'] = el; }}
                  type="button"
                  aria-current={activeTab === 'kiosk' ? 'page' : undefined}
                  onClick={() => handleNavClick('kiosk')}
                  className={`w-full relative z-10 nav-link flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                    activeTab === 'kiosk'
                      ? 'text-[#9E1315] dark:text-rose-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[19px] ${activeTab === 'kiosk' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                      tablet
                    </span>
                    <span className="text-[13px] tracking-tight">Kiosk Mode</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Desktop Footer Area with Back to Landing Page & Profile Summary */}
          <div className="flex flex-col shrink-0 mt-auto">
            {/* Back to Landing Page Link */}
            <div className="px-3 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <Link
                href="/welcome"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E1315]"
                title="Back to Landing Page"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                <span className="text-[13px] font-medium tracking-tight">
                  Back to Landing Page
                </span>
              </Link>
            </div>

            {/* Bottom Profile Summary Card */}
            <div className="p-3 mx-3 mb-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity group"
              title="Click to view/edit profile"
            >
              <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 text-[#9E1315] dark:text-rose-300 flex items-center justify-center text-xs font-semibold shrink-0 avatar-hover-ring group-hover:scale-105 transition-transform">
                {getInitials(currentUser.displayName || currentUser.fullName)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-[#9E1315] dark:group-hover:text-rose-400 transition-colors">
                  {currentUser.displayName || currentUser.fullName}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 truncate">
                    {currentUser.townshipPrecinct || 'Elmina West'}
                  </span>
                  <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ● Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

      {/* =========================================================================
          2. MOBILE OFF-CANVAS NAVIGATION DRAWER
          Provides responsive sliding navigation drawer on smaller viewports
          ========================================================================= */}
      {/* Backdrop */}
      <div 
        aria-hidden="true"
        onClick={() => setIsMobileNavOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          isMobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : '280ms',
        }}
      />

      {/* Drawer */}
      <aside
        aria-label="Mobile Navigation Drawer"
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-[#15181C] border-r border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto select-none transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : '280ms',
        }}
      >
        <div className="flex flex-col">
          {/* Mobile Drawer Brand Header & Close Button */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div 
              onClick={() => handleNavClick('home', true)}
              className="flex items-center cursor-pointer group"
              title="NadiKomuniti — Connect & Relax"
            >
              <img
                src="/nadikomuniti/01_branding/logo-header-horizontal.webp"
                alt="NadiKomuniti — Connect & Relax"
                className="h-7 w-auto object-contain max-w-[170px]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links in Mobile Drawer */}
          <nav aria-label="Mobile Primary" className="px-3 py-4 space-y-1">
            {/* Home */}
            <button
              type="button"
              aria-current={activeTab === 'home' ? 'page' : undefined}
              onClick={() => handleNavClick('home', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'home'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'home' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  home
                </span>
                <span className="text-[13px]">{t('navHome')}</span>
              </div>
            </button>

            {/* Feed */}
            <button
              type="button"
              aria-current={activeTab === 'feed' ? 'page' : undefined}
              onClick={() => handleNavClick('feed', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'feed'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'feed' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  forum
                </span>
                <span className="text-[13px]">{t('navFeed')}</span>
              </div>
            </button>

            {/* Resilience Map */}
            <button
              type="button"
              aria-current={activeTab === 'resilience' ? 'page' : undefined}
              onClick={() => handleNavClick('resilience', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'resilience'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'resilience' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  map
                </span>
                <span className="text-[13px]">{t('navResilience')}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            </button>

            {/* Circular Exchange */}
            <button
              type="button"
              aria-current={activeTab === 'exchange' ? 'page' : undefined}
              onClick={() => handleNavClick('exchange', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'exchange'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'exchange' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  swap_horiz
                </span>
                <span className="text-[13px]">{language === 'en' ? 'Exchange' : t('navExchange')}</span>
              </div>
            </button>

            {/* Local Services */}
            <button
              type="button"
              aria-current={activeTab === 'services' ? 'page' : undefined}
              onClick={() => handleNavClick('services', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'services'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'services' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  handyman
                </span>
                <span className="text-[13px]">{t('navServices')}</span>
              </div>
            </button>

            {/* Secure Messages */}
            <button
              type="button"
              aria-current={activeTab === 'messages' ? 'page' : undefined}
              onClick={() => handleNavClick('messages', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'messages'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'messages' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  chat_bubble
                </span>
                <span className="text-[13px]">{t('navMessages')}</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                2
              </span>
            </button>

            {/* Management Console (if authorized) */}
            {isAuthorizedForManagement && (
              <button
                type="button"
                aria-current={activeTab === 'management' ? 'page' : undefined}
                onClick={() => handleNavClick('management', true)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === 'management'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] ${activeTab === 'management' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                    admin_panel_settings
                  </span>
                  <span className="text-[13px]">{t('navManagement')}</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-300 font-semibold text-[10px]">
                  STAFF
                </span>
              </button>
            )}

            {/* Settings */}
            <button
              type="button"
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              onClick={() => handleNavClick('settings', true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                activeTab === 'settings'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 font-semibold border-l-[3px] border-[#9E1315]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[19px] ${activeTab === 'settings' ? 'text-[#9E1315] dark:text-rose-300' : 'text-slate-400'}`}>
                  settings
                </span>
                <span className="text-[13px]">{t('navSettings')}</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Mobile Drawer Footer Area with Back to Landing Page & Profile Summary */}
        <div className="flex flex-col shrink-0 mt-auto">
          {/* Back to Landing Page Link in Mobile Drawer */}
          <div className="px-3 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <Link
              href="/welcome"
              onClick={() => setIsMobileNavOpen(false)}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E1315]"
              title="Back to Landing Page"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <span className="text-[13px] font-medium">
                Back to Landing Page
              </span>
            </Link>
          </div>

          {/* Mobile Profile Card */}
          <div className="p-3 mx-3 mb-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
          <div 
            onClick={() => {
              setIsProfileModalOpen(true);
              setIsMobileNavOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to view/edit profile"
          >
            <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 text-[#9E1315] dark:text-rose-300 flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(currentUser.displayName || currentUser.fullName)}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">
                {currentUser.displayName || currentUser.fullName}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 truncate">
                  {currentUser.townshipPrecinct || 'Elmina West'}
                </span>
                <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ● Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
