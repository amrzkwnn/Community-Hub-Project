'use client';

import React, { useEffect, useState } from 'react';

interface SuccessToastProps {
  open: boolean;
  heading: string;
  body: string;
  onClose: () => void;
  autoDismissMs?: number;
}

export default function SuccessToast({
  open,
  heading,
  body,
  onClose,
  autoDismissMs = 4200,
}: SuccessToastProps) {
  const [progressWidth, setProgressWidth] = useState(100);

  useEffect(() => {
    if (!open) {
      setProgressWidth(100);
      return;
    }

    // Trigger animation from 100% to 0%
    const animTimer = setTimeout(() => {
      setProgressWidth(0);
    }, 50);

    const closeTimer = setTimeout(() => {
      onClose();
    }, autoDismissMs);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(closeTimer);
    };
  }, [open, autoDismissMs, onClose]);

  if (!open) return null;

  return (
    <aside
      aria-label="Success Notification"
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-4 overflow-hidden toast-spring-pop select-none"
    >
      <div className="flex items-start gap-3.5 relative">
        {/* Animated Sparkle Accents */}
        <div className="sparkle-burst absolute -top-1.5 -left-1 text-amber-400 text-[13px] select-none pointer-events-none">
          ✦
        </div>
        <div
          className="sparkle-burst absolute top-6 -left-2 text-rose-400 text-[11px] select-none pointer-events-none"
          style={{ animationDelay: '350ms' }}
        >
          ★
        </div>

        {/* Animated SVG Thumbs-up Badge (Section 14.A: rise + bounce + 8deg settle) */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-50 via-rose-100 to-amber-50 dark:from-rose-950/40 dark:via-rose-900/40 dark:to-amber-950/30 border border-rose-200/90 dark:border-rose-900/60 text-[#9E1315] dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
          <svg
            className="w-6 h-6 thumbs-up-svg text-[#9E1315] dark:text-rose-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32 0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2zM1 9h4v12H1z" />
          </svg>
        </div>

        <div className="flex-1 pr-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {heading}
            </span>
            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Live
            </span>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
            {body}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close notification"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 cursor-pointer"
        >
          <span className="text-[14px] leading-none font-bold">✕</span>
        </button>
      </div>

      {/* Progress auto-dismiss hairline indicator */}
      <div className="mt-3.5 h-0.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#9E1315] dark:bg-rose-500 transition-all ease-linear"
          style={{
            width: `${progressWidth}%`,
            transitionDuration: `${autoDismissMs}ms`,
          }}
        />
      </div>
    </aside>
  );
}
