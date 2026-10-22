'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Bell, 
  BellOff, 
  Shield, 
  ShieldCheck, 
  Globe, 
  UserX, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Home,
  Check,
  ChevronRight,
  ArrowLeft,
  UserCheck,
  Sliders,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { UIScalePreset } from '@/types';

export type SettingsSection = 'appearance' | 'notifications' | 'privacy' | 'language' | 'account';

export default function SettingsView() {
  const { 
    theme, 
    resolvedTheme, 
    setTheme, 
    uiScale,
    setUIScale,
    notificationSettings, 
    updateNotificationSettings, 
    blockedUserIds, 
    unblockUser,
    language,
    setLanguage,
    currentUser,
    availableProfiles,
    t
  } = useApp();

  const isMalay = language === 'bm' || language === 'ms-MY';

  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize from hash if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as SettingsSection;
      if (['appearance', 'notifications', 'privacy', 'language', 'account'].includes(hash)) {
        setActiveSection(hash);
        setMobileView('detail');
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSection(section);
    setMobileView('detail');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${section}`);
    }
  };

  const handleBackToMenu = () => {
    setMobileView('menu');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', ' ');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    showToast(`Interface appearance updated to ${newTheme.toUpperCase()} mode.`);
  };

  const handleUIScaleChange = (newScale: UIScalePreset) => {
    setUIScale(newScale);
    const label = newScale === 'compact' ? 'Compact — 90%' : newScale === 'large' ? 'Large — 110%' : 'Default — 100%';
    showToast(`UI Scale set to ${label}.`);
  };

  const handleLanguageChange = (newLang: 'en' | 'bm' | 'ms-MY') => {
    setLanguage(newLang);
    showToast(newLang === 'en' ? 'Language set to English.' : 'Bahasa ditetapkan kepada Bahasa Melayu.');
  };

  const navItems: { 
    id: SettingsSection; 
    label: string; 
    description: string;
    icon: React.ReactNode; 
    badge?: string | number;
  }[] = [
    { 
      id: 'appearance', 
      label: isMalay ? 'Rupa & Tema' : 'Appearance & Theme', 
      description: isMalay ? 'Tema antara muka, kanvas siang, dan mod kontras tinggi' : 'Interface themes, daylight canvas, and high-contrast modes',
      icon: <Sun className="w-4 h-4" />,
      badge: theme === 'system' ? (isMalay ? 'Sistem' : 'System') : theme === 'dark' ? (isMalay ? 'Gelap' : 'Dark') : (isMalay ? 'Cerah' : 'Light')
    },
    { 
      id: 'notifications', 
      label: isMalay ? 'Pemberitahuan' : 'Notifications', 
      description: isMalay ? 'Amaran sivik, tindakan insiden, dan lencana mesej' : 'Civic alerts, incident dispatches, and message badges',
      icon: <Bell className="w-4 h-4" />,
      badge: notificationSettings.muteAll ? (isMalay ? 'Disenyapkan' : 'Muted') : (isMalay ? 'Aktif' : 'Active')
    },
    { 
      id: 'privacy', 
      label: isMalay ? 'Privasi & Sekatan' : 'Privacy & Block List', 
      description: isMalay ? 'Rekod tanpa maklumat peribadi dan peraturan hubungan' : 'Zero-knowledge masked records and mediated contact rules',
      icon: <Shield className="w-4 h-4" />,
      badge: blockedUserIds.length > 0 ? `${blockedUserIds.length} ${isMalay ? 'disekat' : 'blocked'}` : undefined
    },
    { 
      id: 'language', 
      label: isMalay ? 'Bahasa & Penyetempatan' : 'Language', 
      description: isMalay ? 'Penyetempatan gesaan sistem dan panduan perbandaran' : 'System prompt localization and municipal guidelines',
      icon: <Globe className="w-4 h-4" />,
      badge: isMalay ? 'BM' : 'EN'
    },
    { 
      id: 'account', 
      label: isMalay ? 'Akaun & Pengesahan' : 'Account & Verification', 
      description: isMalay ? 'Rekod kediaman sivik disahkan dan tadbir urus PDPA' : 'Verified civic residence record and PDPA governance',
      icon: <Lock className="w-4 h-4" />,
      badge: isMalay ? 'Disahkan' : 'Verified'
    },
  ];

  const currentNav = navItems.find((item) => item.id === activeSection) || navItems[0];

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#F8F9FA] dark:bg-[#0F1113]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== TOP OPERATIONAL HEADER ==================== */}
      <header className="shrink-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Settings &amp; Preferences
          </h1>
        </div>
      </header>

      {/* ==================== MAIN LAYOUT ==================== */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        {/* ==================== DESKTOP STABLE CATEGORY NAVIGATION RAIL ==================== */}
        <aside 
          aria-label="Settings Categories" 
          className="hidden lg:flex w-72 shrink-0 flex-col p-6 border-r border-slate-200 dark:border-slate-800 h-full overflow-y-auto space-y-1"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-3">
            Configuration Sections
          </div>

          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 shadow-2xs border-l-4 border-[#ba1b1d]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`shrink-0 ${isActive ? 'text-[#ba1b1d] dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.icon}
                  </span>
                  <div className="truncate">
                    <div className="truncate">{item.label}</div>
                  </div>
                </div>
                {item.badge !== undefined ? (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isActive 
                      ? 'bg-[#ba1b1d] text-white' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'text-[#ba1b1d] dark:text-rose-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'}`} />
                )}
              </button>
            );
          })}

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 px-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[11px]">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Verified Account</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {currentUser.fullName} • {currentUser.townshipPrecinct}
              </p>
            </div>
          </div>
        </aside>

        {/* ==================== MOBILE CATEGORY SELECTION MENU ==================== */}
        {/* Shown on small/tablet viewports when user has not drilled into a category */}
        <div className={`lg:hidden flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-3 ${mobileView === 'menu' ? 'block' : 'hidden'}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
            Select Configuration Section
          </div>

          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSection(item.id)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left cursor-pointer active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>
          ))}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs mt-6">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verified Civic Account</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              {currentUser.fullName} • {currentUser.townshipPrecinct} • {currentUser.unitNumber || 'Verified Property'}
            </p>
          </div>
        </div>

        {/* ==================== DEDICATED SECTION CONTENT PANEL ==================== */}
        {/* Shown in desktop content area, and in mobile detail view */}
        <main 
          className={`flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 pb-20 lg:pb-12 ${
            mobileView === 'detail' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Mobile Back Button (Top of Detail View) */}
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ba1b1d] dark:text-rose-400 hover:text-[#841012] cursor-pointer py-1 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </button>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currentNav.label}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: APPEARANCE & THEME ONLY                                        */}
          {/* ========================================================================= */}
          {activeSection === 'appearance' && (
            <section 
              id="section-appearance" 
              aria-label="Appearance & Theme"
              className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sun className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                    <span>Interface Appearance &amp; Mode</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Select your preferred visual style or allow the hub to match your device system setting automatically.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold self-start shrink-0">
                  Active: {resolvedTheme.toUpperCase()} ({theme === 'system' ? 'System' : 'Manual'})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Light Theme Card */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all cursor-pointer relative group focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                    theme === 'light'
                      ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {theme === 'light' && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Sun className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Light Mode</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Crisp daylight canvas (#F8F9FA) with high-contrast text and Sime Darby crimson accents.
                  </p>
                </button>

                {/* Dark Theme Card */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all cursor-pointer relative group focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                    theme === 'dark'
                      ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {theme === 'dark' && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Moon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Dark Mode</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Reduced-glare deep graphite (#0F1113 / #15181C) engineered for comfortable evening browsing.
                  </p>
                </button>

                {/* System Default Theme Card */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('system')}
                  className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all cursor-pointer relative group focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                    theme === 'system'
                      ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {theme === 'system' && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">System Default</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Dynamically mirrors your operating system or browser display mode automatically.
                  </p>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Theme changes take effect instantly across all township modules without requiring a page refresh.</span>
              </div>

              {/* ===================================================================== */}
              {/* UI SCALE CONFIGURATION SECTION (Compact 90%, Default 100%, Large 110%) */}
              {/* ===================================================================== */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                      <span>UI Scale</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                      Adjust the size of interface elements while keeping layouts readable and consistent.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold self-start shrink-0">
                    Active: {uiScale === 'compact' ? 'Compact — 90%' : uiScale === 'large' ? 'Large — 110%' : 'Default — 100%'}
                  </span>
                </div>

                {/* Discrete 3-Preset Selectable Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup" aria-label="UI Scale Presets">
                  
                  {/* Preset 1: Compact - 90% */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={uiScale === 'compact'}
                    onClick={() => handleUIScaleChange('compact')}
                    className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all cursor-pointer relative group focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                      uiScale === 'compact'
                        ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {uiScale === 'compact' && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center text-[10px] shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Minimize2 className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Compact</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold">
                        90%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Condensed density with tighter spacing. Fits more data and feeds on screen at once.
                    </p>
                  </button>

                  {/* Preset 2: Default - 100% */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={uiScale === 'default'}
                    onClick={() => handleUIScaleChange('default')}
                    className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all cursor-pointer relative group focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                      uiScale === 'default'
                        ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {uiScale === 'default' && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center text-[10px] shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Default</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                        100%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Standard balanced sizing calibrated for optimal readability across standard displays.
                    </p>
                  </button>

                  {/* Preset 3: Large - 110% */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={uiScale === 'large'}
                    onClick={() => handleUIScaleChange('large')}
                    className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all cursor-pointer relative group focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                      uiScale === 'large'
                        ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {uiScale === 'large' && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center text-[10px] shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Large</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                        110%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Enhanced legibility with enlarged controls and text for relaxed, effortless reading.
                    </p>
                  </button>
                </div>

                {/* Live Interactive Scale Preview Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Live Scale Preview
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Applied: {uiScale === 'compact' ? '90% (Compact)' : uiScale === 'large' ? '110% (Large)' : '100% (Default)'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-white dark:bg-[#15181C] border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#ba1b1d]/10 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
                        SD
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          City of Elmina Community
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          UI scale updates instantly across navigation, forms, cards and dialogs
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-bold">
                        Live Preview
                      </span>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="px-3 py-1.5 rounded-lg bg-[#ba1b1d] text-white text-xs font-semibold shadow-2xs pointer-events-none"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>UI scale preferences are saved to your profile and persist across browser sessions. Maps, images and vector geometries are preserved.</span>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: NOTIFICATIONS ONLY                                             */}
          {/* ========================================================================= */}
          {activeSection === 'notifications' && (
            <section 
              id="section-notifications" 
              aria-label="Notification Channels & Alerts"
              className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                    <span>Notification Channels &amp; Alerts</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Configure which alerts trigger dispatches in your top header badge, banner advisories, and toast notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateNotificationSettings({ muteAll: !notificationSettings.muteAll });
                    showToast(notificationSettings.muteAll ? 'Notifications unmuted.' : 'All notifications muted.');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer self-start shrink-0 ${
                    notificationSettings.muteAll
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-[#ba1b1d] dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {notificationSettings.muteAll ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>{notificationSettings.muteAll ? 'Muted (Click to Unmute)' : 'Mute All'}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Incident Alerts */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Verified Resilience Incident &amp; Hazard Alerts</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Immediate alerts when Auxiliary Police or JMB verifies flooding, road washouts, or wildlife hazards.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notificationSettings.incidentAlerts && !notificationSettings.muteAll}
                      disabled={notificationSettings.muteAll}
                      onChange={(e) => updateNotificationSettings({ incidentAlerts: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                  </label>
                </div>

                {/* Direct Messages */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Private Property Messages &amp; Inquiry Requests
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Notifications when a verified neighbor requests contact regarding parcel deliveries or maintenance.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notificationSettings.directMessages && !notificationSettings.muteAll}
                      disabled={notificationSettings.muteAll}
                      onChange={(e) => updateNotificationSettings({ directMessages: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                  </label>
                </div>

                {/* Community Feed */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Community Announcements &amp; Discussion Replies
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Updates on official township circulars, town hall schedules, and replies to your feed dispatches.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notificationSettings.communityPosts && !notificationSettings.muteAll}
                      disabled={notificationSettings.muteAll}
                      onChange={(e) => updateNotificationSettings({ communityPosts: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                  </label>
                </div>

                {/* Circular Exchange */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Exchange &amp; Local Services Updates
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Notifications when an item you listed is reserved by a neighbor or when local handymen respond.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notificationSettings.circularExchange && !notificationSettings.muteAll}
                      disabled={notificationSettings.muteAll}
                      onChange={(e) => updateNotificationSettings({ circularExchange: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: PRIVACY & BLOCKED USERS ONLY                                   */}
          {/* ========================================================================= */}
          {activeSection === 'privacy' && (
            <section 
              id="section-privacy" 
              aria-label="Mediated Privacy & Blocked Resident List"
              className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                    <span>Mediated Privacy &amp; Blocked Resident List</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Blocked accounts cannot send you direct property message requests or initiate private conversations.
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start shrink-0">
                  {blockedUserIds.length} Blocked {blockedUserIds.length === 1 ? 'Resident' : 'Residents'}
                </span>
              </div>

              {/* Zero-Knowledge Contact Shield Notice */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Zero-Knowledge Masked Identifiers Active</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  Under Elmina Hub Privacy Architecture, your exact home address and contact number are never exposed to other residents without your deliberate consent.
                </p>
              </div>

              {blockedUserIds.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Blocked Neighbors</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Your communication channels with verified township residents are open.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {blockedUserIds.map((id) => {
                    const profile = availableProfiles.find((p) => p.id === id);
                    const name = profile ? (profile.displayName || profile.fullName) : `Resident (${id})`;
                    const precinct = profile?.townshipPrecinct || 'City of Elmina';

                    return (
                      <div 
                        key={id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                            <UserX className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{precinct} • Mediated Block Active</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            unblockUser(id);
                            showToast(`Unblocked ${name}.`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Unblock
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: LANGUAGE PREFERENCE ONLY                                       */}
          {/* ========================================================================= */}
          {activeSection === 'language' && (
            <section 
              id="section-language" 
              aria-label="Language & Localization"
              className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                    <span>Language &amp; Localization</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Choose your preferred display language for system prompts, municipal guidelines, and buttons.
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start shrink-0">
                  Current: {isMalay ? 'Bahasa Melayu' : 'English (Malaysia)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`p-4 rounded-xl border-2 flex items-center justify-between text-left transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                    !isMalay
                      ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">English (Malaysia)</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Default municipal language</p>
                  </div>
                  {!isMalay && <Check className="w-4 h-4 text-[#ba1b1d] dark:text-rose-400 stroke-[3]" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleLanguageChange('ms-MY')}
                  className={`p-4 rounded-xl border-2 flex items-center justify-between text-left transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#ba1b1d] ${
                    isMalay
                      ? 'border-[#ba1b1d] bg-rose-50/40 dark:bg-rose-950/20 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Bahasa Melayu</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Bahasa Kebangsaan (ms-MY)</p>
                  </div>
                  {isMalay && <Check className="w-4 h-4 text-[#ba1b1d] dark:text-rose-400 stroke-[3]" />}
                </button>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: ACCOUNT & VERIFICATION ONLY                                    */}
          {/* ========================================================================= */}
          {activeSection === 'account' && (
            <section 
              id="section-account" 
              aria-label="Official Record & Residence Summary"
              className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                    <span>Resident Civic Verification Status</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Official verified residence record in Bandar Elmina under Joint Management Body (JMB) governance.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 dark:border-emerald-800 self-start shrink-0">
                  VERIFIED RESIDENT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Full Legal Name:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 block">{currentUser.fullName}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Township Precinct:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 block">{currentUser.townshipPrecinct}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Registered Unit:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.unitNumber || 'Verified Property'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                Official property details are protected under the Malaysian Personal Data Protection Act (PDPA 2010). Only authorized JMB officers may update registered unit records or assign township administrative rights.
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
