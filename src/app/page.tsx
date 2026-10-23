'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import Header from '@/components/navigation/Header';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import HomeView from '@/components/home/HomeView';
import FeedView from '@/components/feed/FeedView';
import ResilienceView from '@/components/resilience/ResilienceView';
import ExchangeView from '@/components/exchange/ExchangeView';
import ServicesView from '@/components/services/ServicesView';
import MessagesView from '@/components/messages/MessagesView';
import ManagementView from '@/components/management/ManagementView';
import KioskView from '@/components/kiosk/KioskView';
import SettingsView from '@/components/settings/SettingsView';
import FloatingAiAssistant from '@/components/ai/FloatingAiAssistant';
import SectionTransition from '@/components/navigation/SectionTransition';
import AuthView from '@/components/auth/AuthView';
import { FEATURES } from '@/config/features';

export default function Home() {
  const { activeTab, setActiveTab, isAuthenticated } = useApp();

  // Authentication Required for Real Community Access (Requirement Part 12)
  if (!isAuthenticated) {
    return <AuthView />;
  }

  // If kiosk mode is active, verify feature flag. Safely redirect to Home if disabled.
  if (activeTab === 'kiosk') {
    if (!FEATURES.ENABLE_KIOSK_MODE) {
      if (typeof window !== 'undefined') {
        setTimeout(() => setActiveTab('home'), 0);
      }
      return null;
    }
    return <KioskView />;
  }

  // If activeTab was somehow set to legacy 'ai-assistant', gracefully switch to home
  if (activeTab === 'ai-assistant') {
    if (typeof window !== 'undefined') {
      setTimeout(() => setActiveTab('home'), 0);
    }
  }

  return (
    <div className="h-screen h-[100dvh] w-full flex overflow-hidden bg-[#F8F9FA] dark:bg-[#0F1113] relative">
      {/* Desktop Left Sidebar Rail - fixed width, h-full, stable navigation */}
      <Sidebar />

      {/* Main View Shell: Header + Content Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header */}
        <Header />

        {/* Viewport Area */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <main className={`w-full h-full pb-16 lg:pb-0 flex flex-col min-h-0 overflow-hidden ${activeTab === 'home' ? '' : 'pt-16'}`}>
            <SectionTransition activeTab={activeTab === 'ai-assistant' ? 'home' : activeTab}>
              {activeTab === 'home' && <HomeView />}
              {activeTab === 'feed' && <FeedView />}
              {activeTab === 'resilience' && <ResilienceView />}
              {activeTab === 'exchange' && <ExchangeView />}
              {activeTab === 'services' && <ServicesView />}
              {activeTab === 'messages' && <MessagesView />}
              {activeTab === 'management' && <ManagementView />}
              {activeTab === 'settings' && <SettingsView />}
            </SectionTransition>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Modern Floating AI Assistant (Persistent launcher & morphing overlay) */}
      <FloatingAiAssistant />
    </div>
  );
}
