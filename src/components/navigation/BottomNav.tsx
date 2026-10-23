'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'feed', label: 'Feed', icon: 'newspaper' },
    { id: 'resilience', label: 'Map', icon: 'explore' },
    { id: 'exchange', label: 'Exchange', icon: 'swap_horiz' },
    { id: 'messages', label: 'Messages', icon: 'chat_bubble' },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'home') {
      setActiveTab('home');
    } else {
      setActiveTab(id);
    }
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 pb-safe bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
    >
      <div className="flex justify-around items-center h-16 px-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-path={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 transition-colors active:scale-95 cursor-pointer ${
                isActive 
                  ? 'text-[#9E1315] dark:text-rose-400 font-semibold' 
                  : 'text-slate-500 dark:text-slate-400 font-normal hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'scale-105' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[11px] leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
