'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context/AppContext';
import AuthModal from '@/components/auth/AuthModal';
import NotificationCenter from '@/components/common/NotificationCenter';
import ProfileModal from '@/components/common/ProfileModal';
import ContactModal from '@/components/common/ContactModal';
import Link from 'next/link';
import { 
  ChevronDown,
  LogIn,
  LogOut,
  User,
  Settings,
  Phone,
  PanelLeft,
  PanelLeftClose,
  ArrowLeft
} from 'lucide-react';

import GlobalSearch from '@/components/navigation/GlobalSearch';
import { INITIAL_PROFILES } from '@/lib/data/mockData';

export default function Header() {
  const { 
    currentUser, 
    supabaseUser,
    isDemoMode,
    availableProfiles, 
    switchProfile, 
    signOut,
    isAuthModalOpen,
    setIsAuthModalOpen,
    setIsProfileModalOpen,
    t, 
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileNavOpen,
    toggleMobileNav
  } = useApp();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const getMobileSectionLabel = (tab: string) => {
    switch (tab) {
      case 'home': return 'Home';
      case 'feed': return 'Feed';
      case 'resilience': return 'Map';
      case 'exchange': return 'Exchange';
      case 'services': return 'Services';
      case 'messages': return 'Messages';
      case 'settings': return 'Settings';
      case 'management': return 'Console';
      default: return 'Home';
    }
  };

  // Close role dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (roleMenuRef.current) {
        if (roleMenuRef.current.contains(target)) return;
        if (event.composedPath && event.composedPath().includes(roleMenuRef.current)) return;
        setRoleMenuOpen(false);
      }
    };
    if (roleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleMenuOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleMenuOpen(false);
      }
    };
    if (roleMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [roleMenuOpen]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'management':
        return { label: t('roleManagement'), bg: 'bg-rose-100 text-[#9E1315] border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' };
      case 'security':
        return { label: t('roleSecurity'), bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' };
      case 'moderator':
        return { label: t('roleModerator'), bg: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' };
      default:
        return { label: t('roleResident'), bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  // Canonical demo accounts available for development/testing
  const demoProfiles = availableProfiles.filter(
    (p) => INITIAL_PROFILES.some((init) => init.id === p.id) || p.id.startsWith('user-') || p.id.startsWith('demo-')
  );
  const profilesToRender = demoProfiles.length > 0 ? demoProfiles : availableProfiles;

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 w-full overflow-visible pointer-events-none transition-all">
        {/* ========================================================================= */}
        {/* 1. DEDICATED PROGRESSIVE FADING BACKDROP BLUR & GLASS LAYER (Background)  */}
        {/* ========================================================================= */}
        <div 
          aria-hidden="true" 
          className="absolute inset-x-0 top-0 h-[88px] pointer-events-none select-none z-0 overflow-hidden"
        >
          {/* Primary Top Blur Layer: Strongest backdrop blur (~18px) with subtle frosted glass gradient tint */}
          <div 
            className="absolute inset-0 backdrop-blur-[18px] bg-white/80 bg-gradient-to-b from-white/80 via-white/35 to-transparent dark:from-[#15181C]/80 dark:via-[#15181C]/35 dark:to-transparent"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0) 100%)',
            }}
          />
          {/* Mid Transition Layer: Medium backdrop blur (backdrop-blur-md ~12px) */}
          <div 
            className="absolute inset-0 backdrop-blur-md"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0) 100%)',
            }}
          />
          {/* Bottom Feather Layer: Subtle light blur (~4px) smoothly dissolving to zero */}
          <div 
            className="absolute inset-0 backdrop-blur-xs"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0) 100%)',
            }}
          />
        </div>

        {/* ========================================================================= */}
        {/* 2. SHARP FOREGROUND NAVIGATION CONTROLS (Zero blur, 100% interactive)      */}
        {/* ========================================================================= */}
        <div className="relative z-10 px-4 lg:px-6 h-16 flex items-center justify-between gap-3 lg:gap-4 pointer-events-auto">
          
          {/* MOBILE PHONE HEADER (< lg) - Exact Google Stitch Design */}
          <div className="flex lg:hidden items-center justify-between w-full">
            <div className="flex lg:hidden items-center gap-2.5">
              <button
                type="button"
                onClick={toggleMobileNav}
                aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileNavOpen}
                className="w-10 h-10 flex items-center justify-center text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <div 
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-2 ml-0.5 cursor-pointer select-none"
              >
                <img
                  src="/nadikomuniti/01_branding/logo-header-horizontal.webp"
                  alt="NadiKomuniti — Connect & Relax"
                  className="h-7 w-auto object-contain max-w-[130px]"
                />
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-l border-slate-300 dark:border-slate-700 pl-2">
                  {getMobileSectionLabel(activeTab)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                aria-label="Global Search"
                className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">search</span>
              </button>

              <a
                href="tel:0378452222"
                aria-label="Emergency Hotline 03-7845 2222"
                className="h-8 px-2.5 flex items-center gap-1 bg-[#9E1315] hover:bg-[#841012] text-white rounded-lg font-semibold text-xs shadow-xs active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-sm animate-pulse">e911_emergency</span>
                <span className="font-bold text-[11px]">SOS</span>
              </a>

              <NotificationCenter />

              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-label="Account and Profile Menu"
                aria-expanded={roleMenuOpen}
                className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 cursor-pointer ml-1 shrink-0 p-0 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#9E1315]"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>

          {/* DESKTOP HEADER (>= lg) - 100% Preserved Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
                aria-expanded={!isSidebarCollapsed}
                title={isSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isSidebarCollapsed ? (
                  <PanelLeft className="w-4.5 h-4.5" />
                ) : (
                  <PanelLeftClose className="w-4.5 h-4.5" />
                )}
              </button>
              {isSidebarCollapsed && (
                <>
                  <div 
                    onClick={() => setActiveTab('home')}
                    className="flex items-center gap-2 cursor-pointer select-none group"
                    title="NadiKomuniti — Connect & Relax"
                  >
                    <img
                      src="/nadikomuniti/01_branding/logo-header-horizontal.webp"
                      alt="NadiKomuniti — Connect & Relax"
                      className="h-8 w-auto object-contain max-w-[150px] group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Accessible Back to Landing Page control when sidebar is collapsed */}
                  <Link
                    href="/welcome"
                    aria-label="Back to Landing Page"
                    title="Back to Landing Page"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium shadow-2xs transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E1315]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="hidden xl:inline text-[12px]">Back to Landing</span>
                  </Link>
                </>
              )}
            </div>

            <div className="flex-1 max-w-lg min-w-0">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                aria-haspopup="dialog"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#9E1315] hover:bg-[#841012] text-white text-xs font-semibold shadow-xs hover:shadow hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                title="Township Directory & Rapid Response Contacts"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t('contactUs') || 'Contact Us'}</span>
              </button>

              <NotificationCenter />

              {isDemoMode && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Demo Mode
                </span>
              )}

              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2.5 pr-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
                  title={`Profile: ${currentUser.displayName || currentUser.fullName} (${currentUser.role})`}
                  aria-label="Profile Menu"
                  aria-expanded={roleMenuOpen}
                >
                  <div className="text-right hidden md:block">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.fullName}
                    </span>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      <span className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-semibold ${roleInfo.bg}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>

                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />

                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${roleMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Shared Persona Switcher & Auth Dropdown Menu (Accessible on Mobile and Desktop) */}
        {roleMenuOpen && (
          <>
            {/* Backdrop overlay to close when tapped outside on any device */}
            <div 
              className="fixed inset-0 z-40 bg-black/25 lg:bg-transparent pointer-events-auto"
              onClick={() => setRoleMenuOpen(false)}
              aria-hidden="true"
            />

            <div 
              ref={roleMenuRef}
              className="fixed right-3 sm:right-6 top-16 w-[calc(100vw-24px)] max-w-[340px] bg-white dark:bg-[#15181C] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-3 z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              aria-label="Profile and demo account options"
            >
              {/* Current Active Account Header Banner */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-2">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.fullName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#9E1315]/20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {currentUser.displayName || currentUser.fullName}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${roleInfo.bg}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                    {currentUser.townshipPrecinct || 'Bandar Elmina'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setRoleMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-[#9E1315] dark:text-rose-300 rounded-xl font-bold text-xs border border-rose-200/80 dark:border-rose-900/60 transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#9E1315] dark:text-rose-300" />
                  <span>{t('btnEdit') ? `${t('btnEdit')} Profil` : 'Edit Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setRoleMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>{t('navSettings') || 'Settings'}</span>
                </button>
              </div>

              <div className="px-1 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{t('btnSwitchRole') || 'Switch Test Account / Role'}</span>
                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Live Persona</span>
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                {profilesToRender.map((p) => {
                  const isSelected = p.id === currentUser.id;
                  const badge = getRoleBadge(p.role);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        switchProfile(p.id);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 font-bold border border-rose-200 dark:border-rose-900/60 text-slate-900 dark:text-slate-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-transparent'
                      }`}
                      aria-selected={isSelected}
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={p.fullName}
                          className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div className="truncate">
                          <span className="text-xs text-slate-900 dark:text-slate-100 block truncate font-semibold">
                            {p.displayName || p.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            {p.townshipPrecinct}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#9E1315] dark:bg-rose-400 shrink-0" title="Active Account" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Authentication Action at bottom of Profile Dropdown (Requirement Part 13) */}
              <hr className="my-2 border-slate-100 dark:border-slate-800" />

              {supabaseUser ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setRoleMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setRoleMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#9E1315] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Mobile Search Overlay when search button tapped */}
        {isMobileSearchOpen && (
          <div className="lg:hidden relative z-20 px-4 py-2.5 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 pointer-events-auto flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
            <div className="flex-1 min-w-0">
              <GlobalSearch />
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              aria-label="Close search"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}
      </header>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      <ProfileModal />
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </>
  );
}
