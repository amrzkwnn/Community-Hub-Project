'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Home as HomeIcon,
  Compass, 
  MapPin, 
  Repeat, 
  Wrench, 
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

export default function BottomNav() {
  const { activeTab, setActiveTab, t, currentUser } = useApp();

  const isStaff = currentUser.role === 'management' || currentUser.role === 'security' || currentUser.role === 'moderator';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-1.5 py-1 shadow-lg">
      <div className="grid grid-cols-6 gap-0.5 items-center max-w-md mx-auto text-[9.5px]">
        {/* 0. Home Tab */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'text-[#9E1315] dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HomeIcon className="w-4.5 h-4.5 mb-0.5" />
          <span className="truncate">{t('navHome') || 'Home'}</span>
        </button>

        {/* 1. Feed Tab */}
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'feed'
              ? 'text-[#9E1315] dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Compass className="w-4.5 h-4.5 mb-0.5" />
          <span className="truncate">{t('navFeed').split(' ')[0]}</span>
        </button>

        {/* 2. Resilience Map Tab */}
        <button
          onClick={() => setActiveTab('resilience')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'resilience'
              ? 'text-[#9E1315] dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <MapPin className="w-4.5 h-4.5 mb-0.5 text-rose-600 dark:text-rose-400" />
          <span className="truncate">{t('navResilience').split(' ')[0]}</span>
        </button>

        {/* 3. Circular Exchange Tab */}
        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'exchange'
              ? 'text-[#9E1315] dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Repeat className="w-4.5 h-4.5 mb-0.5" />
          <span className="truncate">{t('navExchange').split(' ')[0]}</span>
        </button>

        {/* 4. Local Services Tab */}
        <button
          onClick={() => setActiveTab('services')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'text-[#9E1315] dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4.5 h-4.5 mb-0.5" />
          <span className="truncate">{t('navServices').split(' ')[0]}</span>
        </button>

        {/* 5. Messages or Konsol */}
        {isStaff ? (
          <button
            onClick={() => setActiveTab('management')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'management'
                ? 'text-[#9E1315] dark:text-rose-300 font-bold bg-rose-100 dark:bg-rose-950/70'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldAlert className="w-4.5 h-4.5 mb-0.5 text-[#9E1315] dark:text-rose-400" />
            <span className="truncate">Konsol</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'text-[#9E1315] dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4.5 h-4.5 mb-0.5" />
            <span className="truncate">{t('navMessages').split(' ')[0]}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
