'use client';

import React, { useRef } from 'react';

interface SectionTransitionProps {
  activeTab: string;
  children: React.ReactNode;
}

const TAB_ORDER: string[] = [
  'home',
  'feed',
  'resilience',
  'exchange',
  'services',
  'messages',
  'notifications',
  'profile',
  'settings',
  'management',
  'kiosk',
];

/**
 * SectionTransition
 * 
 * Provides smooth, subtle horizontal slide + opacity transitions (210ms, natural easing)
 * between application sections without animating the application shell or causing layout shifts.
 * 
 * - Deterministic, synchronous direction calculation during render avoids double-render flickers.
 * - Keyed by activeTab for clean, immediate DOM lifecycle.
 * - Immediately interactive on frame 0 with zero queued animation delays.
 * - Fully respects prefers-reduced-motion via CSS rules.
 */
export default function SectionTransition({ activeTab, children }: SectionTransitionProps) {
  const prevTabRef = useRef<string>(activeTab);
  const directionRef = useRef<'section-slide-forward' | 'section-slide-backward'>('section-slide-forward');

  // Synchronously compute transition direction during render
  if (prevTabRef.current !== activeTab) {
    const prevIdx = TAB_ORDER.indexOf(prevTabRef.current);
    const currIdx = TAB_ORDER.indexOf(activeTab);

    if (currIdx >= 0 && prevIdx >= 0) {
      directionRef.current = currIdx >= prevIdx ? 'section-slide-forward' : 'section-slide-backward';
    } else {
      directionRef.current = 'section-slide-forward';
    }

    prevTabRef.current = activeTab;
  }

  return (
    <div
      key={activeTab}
      data-testid={`section-${activeTab}`}
      className={`w-full h-full flex flex-col min-h-0 overflow-hidden ${directionRef.current}`}
    >
      {children}
    </div>
  );
}
