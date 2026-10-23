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
  Maximize2,
  PhoneCall,
  FileText,
  LogOut,
  SlidersHorizontal,
  EyeOff,
  MessageSquare,
  ArrowLeftRight,
  Clock,
  AlertCircle,
  FileCheck,
  Building,
  RefreshCw
} from 'lucide-react';
import { UIScalePreset, ResidenceType, AddressVerificationStatus } from '@/types';
import { toDatabaseUserId } from '@/lib/utils/idMapping';

export type SettingsSection = 'appearance' | 'notifications' | 'privacy' | 'language' | 'account' | 'residential_address';

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
    addressRegistrations,
    submitAddressRegistration,
    t
  } = useApp();

  const isMalay = language === 'bm' || language === 'ms-MY';

  const userRegistration = (addressRegistrations || []).find(
    (r) => r.userId === currentUser.id || toDatabaseUserId(r.userId) === toDatabaseUserId(currentUser.id)
  );

  const addressStatus: AddressVerificationStatus = userRegistration?.status || (currentUser.unitNumber && currentUser.verificationStatus === 'verified' ? 'verified' : 'unsubmitted');

  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Address Registration Form State
  const [precinctInput, setPrecinctInput] = useState(userRegistration?.precinct || currentUser.townshipPrecinct || 'Elmina Green 3');
  const [unitNumberInput, setUnitNumberInput] = useState(userRegistration?.unitNumber || currentUser.unitNumber || '');
  const [streetNameInput, setStreetNameInput] = useState(userRegistration?.streetName || '');
  const [residenceTypeInput, setResidenceTypeInput] = useState<ResidenceType>(userRegistration?.residenceType || 'owner');
  const [proofDocName, setProofDocName] = useState(userRegistration?.proofDocumentName || 'SP_Agreement_EG3.pdf');
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  // Keep form fields synced if user registration changes (e.g. switching persona)
  useEffect(() => {
    if (userRegistration) {
      setPrecinctInput(userRegistration.precinct);
      setUnitNumberInput(userRegistration.unitNumber);
      setStreetNameInput(userRegistration.streetName || '');
      setResidenceTypeInput(userRegistration.residenceType);
      setProofDocName(userRegistration.proofDocumentName || 'SP_Agreement_EG3.pdf');
    } else {
      setPrecinctInput(currentUser.townshipPrecinct || 'Elmina Green 3');
      setUnitNumberInput(currentUser.unitNumber || '');
      setStreetNameInput('');
      setResidenceTypeInput('owner');
      setProofDocName('SP_Agreement_EG3.pdf');
    }
    setAddressError(null);
    setAddressSuccess(null);
  }, [userRegistration, currentUser]);

  // Initialize from hash if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as SettingsSection;
      if (['appearance', 'notifications', 'privacy', 'language', 'account', 'residential_address'].includes(hash)) {
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

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    setAddressSuccess(null);

    if (!unitNumberInput.trim()) {
      setAddressError('Please provide your residential unit number (e.g. No. 24, Jalan EG 3/4).');
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const res = await submitAddressRegistration({
        precinct: precinctInput,
        unitNumber: unitNumberInput.trim(),
        streetName: streetNameInput.trim() || undefined,
        residenceType: residenceTypeInput,
        proofDocumentName: proofDocName,
      });

      if (!res.success) {
        setAddressError(res.error || 'Failed to submit address registration.');
      } else {
        setAddressSuccess('Residential address registered and submitted for JMB verification!');
        showToast('Address submitted. Awaiting JMB Approval.');
      }
    } catch {
      setAddressError('An unexpected error occurred while registering address.');
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const residentAddressBadge = 
    addressStatus === 'verified' 
      ? (isMalay ? 'Disahkan' : 'Verified')
      : addressStatus === 'pending'
        ? (isMalay ? 'Menunggu' : 'Pending')
        : addressStatus === 'rejected'
          ? (isMalay ? 'Tindakan' : 'Action Req')
          : (isMalay ? 'Daftar' : 'Unregistered');

  const navItems: { 
    id: SettingsSection; 
    label: string; 
    description: string;
    icon: React.ReactNode; 
    badge?: string | number;
  }[] = [
    { 
      id: 'residential_address', 
      label: isMalay ? 'Alamat Kediaman' : 'Residential Address', 
      description: isMalay ? 'Pendaftaran unit & pengesahan status JMB' : 'Unit registration & official JMB verification status',
      icon: <Home className="w-4 h-4" />,
      badge: residentAddressBadge
    },
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

      {/* ==================== TOP OPERATIONAL HEADER (Desktop Only) ==================== */}
      <header className="hidden md:block shrink-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md px-4 sm:px-8 py-4">
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

        {/* ==================== MOBILE STITCH SETTINGS MENU ==================== */}
        {/* Exact match to Google Stitch Mobile Setting reference screen */}
        <div className={`lg:hidden flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 pb-28 ${mobileView === 'menu' ? 'block' : 'hidden'}`}>
          {/* Header Section */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {isMalay ? 'Tetapan' : 'Settings'}
            </h1>
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#ba1b1d] dark:text-[#ffb4ab]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>

          {/* Profile Card (Touch-friendly & verified badge) */}
          <div 
            onClick={() => handleSelectSection('account')}
            className="bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-13 h-13 rounded-full bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab] flex items-center justify-center font-bold text-base shadow-xs">
                  {(currentUser.fullName || 'AZ').slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 bg-[#ba1b1d] text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.fullName || 'Amir Zakaria'}
                  </span>
                </div>
                <span className="text-[11px] text-[#ba1b1d] dark:text-[#ffb4ab] font-semibold">
                  {isMalay ? 'Penduduk Disahkan' : 'Verified Resident'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.townshipPrecinct || 'Elmina West EV3-04-12'}
                </span>
              </div>
            </div>
            <div className="flex items-center text-slate-400 pl-2">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>

          {/* Residential Address Mobile Card */}
          <div 
            onClick={() => handleSelectSection('residential_address')}
            className="bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {isMalay ? 'Alamat Kediaman' : 'Residential Address'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    addressStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : addressStatus === 'pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : addressStatus === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {residentAddressBadge}
                  </span>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {userRegistration?.unitNumber || currentUser.unitNumber || (isMalay ? 'Belum Didaftar' : 'Not Registered')}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  {userRegistration?.precinct || currentUser.townshipPrecinct || 'Bandar Elmina'}
                </span>
              </div>
            </div>
            <div className="flex items-center text-slate-400 pl-2">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>

          {/* Appearance Group */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              {isMalay ? 'Rupa & Tema' : 'Appearance'}
            </span>
            <div className="bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
              {/* Theme Switcher */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Sun className="w-4 h-4 text-[#ba1b1d] dark:text-[#ffb4ab]" />
                  <span className="text-xs font-bold">{isMalay ? 'Tema Antara Muka' : 'Interface Theme'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1 font-semibold cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1 font-semibold cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('system')}
                    className={`py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1 font-semibold cursor-pointer ${
                      theme === 'system'
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" /> System
                  </button>
                </div>
              </div>

              {/* UI Scale Selector */}
              <div className="flex flex-col space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Sliders className="w-4 h-4 text-[#ba1b1d] dark:text-[#ffb4ab]" />
                    <span className="text-xs font-bold">UI Scale</span>
                  </div>
                  <span className="text-[11px] text-[#ba1b1d] dark:text-[#ffb4ab] font-bold">
                    {uiScale === 'compact' ? 'Compact · 90%' : uiScale === 'large' ? 'Large · 110%' : 'Default · 100%'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleUIScaleChange('compact')}
                    className={`py-1.5 rounded-lg text-center text-xs transition-all font-semibold cursor-pointer ${
                      uiScale === 'compact'
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Compact (90%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUIScaleChange('default')}
                    className={`py-1.5 rounded-lg text-center text-xs transition-all font-semibold cursor-pointer ${
                      uiScale === 'default'
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Default (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUIScaleChange('large')}
                    className={`py-1.5 rounded-lg text-center text-xs transition-all font-semibold cursor-pointer ${
                      uiScale === 'large'
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Large (110%)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Group */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              {isMalay ? 'Keutamaan' : 'Preferences'}
            </span>
            <div className="bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {/* Language Row */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Bahasa' : 'Language'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      English &amp; Bahasa Melayu
                    </span>
                  </div>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      !isMalay
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('bm')}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isMalay
                        ? 'bg-white dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    BM
                  </button>
                </div>
              </div>

              {/* Township Alerts Toggle */}
              <div className="p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-[#15181C]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-[#ba1b1d] dark:text-[#ffb4ab]">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Amaran Perbandaran' : 'Township Alerts'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Critical safety &amp; water notices
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.incidentAlerts}
                    onChange={() => updateNotificationSettings({ incidentAlerts: !notificationSettings.incidentAlerts })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                </label>
              </div>

              {/* Chat Messages Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Mesej Sembang' : 'Chat Messages'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Direct resident communications
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.directMessages}
                    onChange={() => updateNotificationSettings({ directMessages: !notificationSettings.directMessages })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                </label>
              </div>

              {/* Exchange Replies Toggle */}
              <div className="p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-[#15181C]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Balasan Pertukaran' : 'Exchange Replies'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Marketplace &amp; borrow requests
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.circularExchange}
                    onChange={() => updateNotificationSettings({ circularExchange: !notificationSettings.circularExchange })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Security Group */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              {isMalay ? 'Privasi & Keselamatan' : 'Privacy & Security'}
            </span>
            <div className="bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {/* Masked Address Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Alamat Bertopeng' : 'Masked Street Address'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Show only sector in public posts
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ba1b1d]"></div>
                </label>
              </div>

              {/* Blocked Residents Link */}
              <div 
                onClick={() => handleSelectSection('privacy')}
                className="p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-[#15181C]/50 active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Penduduk Disekat' : 'Blocked Residents'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {blockedUserIds.length} {isMalay ? 'akaun dihadkan' : 'restricted accounts'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Gatehouse Intercom Access Link */}
              <div 
                onClick={() => showToast('Gatehouse VoIP bypass configured.')}
                className="p-3.5 flex items-center justify-between active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Gatehouse Intercom Access
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      VoIP bypass &amp; QR guard passes
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Township & Support Group */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              {isMalay ? 'Perbandaran & Sokongan' : 'Township & Support'}
            </span>
            <div className="bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {/* Auxiliary Police Desk Hotline (Branded highlight) */}
              <a 
                href="tel:0378452222"
                className="p-3.5 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20 active:bg-rose-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ba1b1d] text-white flex items-center justify-center shadow-xs">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#ba1b1d] dark:text-[#ffb4ab]">
                        {isMalay ? 'Meja Polis Bantuan' : 'Auxiliary Police Desk'}
                      </span>
                      <span className="bg-[#ba1b1d] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                        24/7
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      Direct Hotline · 03-7845 2222
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-[#ba1b1d] dark:text-[#ffb4ab] shadow-xs">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </a>

              {/* Civic Conduct & Help Link */}
              <div 
                onClick={() => handleSelectSection('account')}
                className="p-3.5 flex items-center justify-between active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Syarat Tatakelakuan Sivik' : 'Terms of Civic Conduct & Help'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Township guidelines &amp; FAQ
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Action & Version Area */}
          <div className="pt-2 flex flex-col space-y-3">
            {/* Log Out Button */}
            <button
              type="button"
              onClick={() => showToast('Logged out of resident session.')}
              className="w-full h-11 bg-slate-100 dark:bg-[#1E2226] text-[#ba1b1d] dark:text-[#ffb4ab] rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.98] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isMalay ? 'Log Keluar' : 'Log Out'}</span>
            </button>

            {/* Version & Civic Footer */}
            <div className="flex flex-col items-center justify-center text-center space-y-0.5 pb-4">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ba1b1d]"></span>
                <span className="text-[11px] font-bold tracking-wider uppercase">
                  TESDH Civic OS · v4.12.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Heritage Township Managed Network
              </span>
            </div>
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

          {/* ========================================================================= */}
          {/* SECTION 6: RESIDENTIAL ADDRESS & JMB VERIFICATION                         */}
          {/* ========================================================================= */}
          {activeSection === 'residential_address' && (
            <section 
              id="section-residential-address" 
              aria-label="Residential Address Registration & JMB Verification"
              className="bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200 motion-reduce:animate-none"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Home className="w-5 h-5 text-[#ba1b1d] dark:text-rose-400" />
                    <span>Residential Address &amp; JMB Verification</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Register and manage your residential address in Bandar Elmina under Joint Management Body (JMB) governance.
                  </p>
                </div>

                {/* Status Badges */}
                <div className="self-start shrink-0">
                  {addressStatus === 'verified' && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>VERIFIED RESIDENTIAL ADDRESS</span>
                    </span>
                  )}
                  {addressStatus === 'pending' && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                      <span>PENDING JMB APPROVAL</span>
                    </span>
                  )}
                  {addressStatus === 'rejected' && (
                    <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[11px] border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-2xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>APPLICATION REJECTED</span>
                    </span>
                  )}
                  {addressStatus === 'revoked' && (
                    <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>VERIFICATION REVOKED</span>
                    </span>
                  )}
                  {addressStatus === 'unsubmitted' && (
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>NOT REGISTERED</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Status Explanation Banners */}
              {addressStatus === 'verified' && (
                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold text-sm text-emerald-950 dark:text-emerald-100 block">
                      Residential Address Verified &amp; Protected
                    </strong>
                    <p className="leading-relaxed">
                      Your residential address has been verified by the Joint Management Body (JMB) Secretariat. 
                      In compliance with township security bylaws, verified addresses are locked against direct alteration to prevent unauthorized representation and address enumeration.
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold pt-1">
                      Verified by: {userRegistration?.reviewedByName || 'JMB Secretariat'} • Status: Active Civic Registration
                    </p>
                  </div>
                </div>
              )}

              {addressStatus === 'pending' && (
                <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold text-sm text-amber-950 dark:text-amber-100 block">
                      Application Pending JMB Review
                    </strong>
                    <p className="leading-relaxed">
                      Your address registration has been submitted and is currently queued for verification by the JMB Secretariat. 
                      Verification typically takes 1 business day. Once approved, your property will become eligible for secure, privacy-shielded neighborhood messaging.
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold pt-1">
                      Submitted on: {userRegistration?.createdAt ? new Date(userRegistration.createdAt).toLocaleString() : 'Recent'} • Review status: Pending
                    </p>
                  </div>
                </div>
              )}

              {addressStatus === 'rejected' && (
                <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <strong className="font-bold text-sm text-rose-950 dark:text-rose-100 block">
                      Application Not Approved — Correction Required
                    </strong>
                    <div className="p-2.5 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 font-medium">
                      <span className="font-bold block mb-0.5">JMB Secretariat Feedback:</span>
                      &quot;{userRegistration?.rejectionReason || 'Submitted documentation was unclear or did not match municipal assessment records.'}&quot;
                    </div>
                    <p className="leading-relaxed text-[11px]">
                      You may correct your unit number, phase, or proof of residence document below and click <strong>Resubmit for Review</strong>.
                    </p>
                  </div>
                </div>
              )}

              {addressStatus === 'revoked' && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold text-sm block">Address Verification Revoked</strong>
                    <p className="leading-relaxed">
                      Reason: &quot;{userRegistration?.rejectionReason || 'Address revoked by JMB administration.'}&quot;
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Please register a new valid address with supporting tenancy or ownership documentation.
                    </p>
                  </div>
                </div>
              )}

              {/* Current Address Details Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Registered Unit Record
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {userRegistration?.residenceType === 'tenant' ? 'Tenancy Record' : userRegistration?.residenceType === 'household_member' ? 'Household Member' : 'Homeowner / Title Record'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Unit Address:</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                      <Home className="w-3.5 h-3.5 text-[#ba1b1d] dark:text-rose-400 shrink-0" />
                      {userRegistration?.unitNumber || currentUser.unitNumber || 'Not Registered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Township Precinct:</span>
                    <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                      {userRegistration?.precinct || currentUser.townshipPrecinct || 'Bandar Elmina'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Supporting Document:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {userRegistration?.proofDocumentName || 'No document on file'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Alerts */}
              {addressError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-900 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addressError}</span>
                </div>
              )}

              {addressSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2 border border-emerald-200 dark:border-emerald-900 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{addressSuccess}</span>
                </div>
              )}

              {/* Registration Form / Locked Mode */}
              {addressStatus === 'verified' ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Address Modifications Locked by JMB</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Because this residential address has been verified with official property records, direct changes are restricted. 
                    This ensures only authenticated owners and verified tenants represent properties within the City of Elmina community network.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => showToast('Relocation inquiry sent to JMB Secretariat office.')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Request Address Relocation via JMB
                    </button>
                    <a
                      href="tel:0378452222"
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-[#ba1b1d] dark:text-rose-300 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Contact JMB Secretariat (03-7845 2222)</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* Editable Registration or Resubmission Form */
                <form onSubmit={handleSubmitAddress} className="space-y-5 pt-2">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#ba1b1d] dark:text-rose-400" />
                      <span>
                        {addressStatus === 'rejected'
                          ? 'Resubmit Corrected Address Application'
                          : addressStatus === 'pending'
                            ? 'Update Pending Address Application'
                            : 'Submit Residential Address for JMB Approval'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Provide your Elmina residential unit details and proof document for administrative verification.
                    </p>
                  </div>

                  {/* Precinct & Residence Type Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Precinct Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Township Precinct <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={precinctInput}
                        onChange={(e) => setPrecinctInput(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ba1b1d] focus:outline-hidden"
                      >
                        <option value="Elmina Green 1">Elmina Green 1</option>
                        <option value="Elmina Green 3">Elmina Green 3</option>
                        <option value="Elmina East (EE2)">Elmina East (EE2)</option>
                        <option value="Elmina West (EV1)">Elmina West (EV1)</option>
                        <option value="Ilham Residence">Ilham Residence</option>
                        <option value="City of Elmina Central">City of Elmina Central</option>
                      </select>
                    </div>

                    {/* Residence Type Radio Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Residency Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setResidenceTypeInput('owner')}
                          className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                            residenceTypeInput === 'owner'
                              ? 'border-[#ba1b1d] bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 shadow-2xs'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Homeowner
                        </button>
                        <button
                          type="button"
                          onClick={() => setResidenceTypeInput('tenant')}
                          className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                            residenceTypeInput === 'tenant'
                              ? 'border-[#ba1b1d] bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 shadow-2xs'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Tenant
                        </button>
                        <button
                          type="button"
                          onClick={() => setResidenceTypeInput('household_member')}
                          className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                            residenceTypeInput === 'household_member'
                              ? 'border-[#ba1b1d] bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] dark:text-rose-400 shadow-2xs'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Relative
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unit Number & Street Name Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Residential Unit Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. No. 24, Jalan EG 3/4"
                        value={unitNumberInput}
                        onChange={(e) => setUnitNumberInput(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ba1b1d] focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Official unit or house number matching your municipal title.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Street Name / Road Section
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jalan EG 3/4"
                        value={streetNameInput}
                        onChange={(e) => setStreetNameInput(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ba1b1d] focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Street name helps disambiguate shared precinct blocks.</p>
                    </div>
                  </div>

                  {/* Proof Document Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Proof of Residence Document <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <select
                          value={proofDocName}
                          onChange={(e) => setProofDocName(e.target.value)}
                          className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ba1b1d] focus:outline-hidden"
                        >
                          <option value="SP_Agreement_Elmina.pdf">Sale &amp; Purchase (S&amp;P) Agreement</option>
                          <option value="Tenancy_Agreement_2026.pdf">Valid Tenancy Agreement</option>
                          <option value="MBSA_Cukai_Taksiran_2026.pdf">MBSA Assessment Tax (Cukai Pintu)</option>
                          <option value="Utility_Bill_TNB_Water.pdf">TNB / Air Selangor Utility Bill</option>
                          <option value="Resident_Family_Affidavit.pdf">Household Deputation / Letter</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium">{proofDocName}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      PDPA Privacy: All document metadata is strictly encrypted and accessible only to authorized JMB officers for vetting.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={isSubmittingAddress}
                      className="bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingAddress ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : addressStatus === 'rejected' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Resubmit Application</span>
                        </>
                      ) : addressStatus === 'pending' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Update Pending Submission</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Submit for JMB Approval</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
