'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, BookOpen, X, CheckCircle2, AlertTriangle, PhoneCall } from 'lucide-react';

interface BylawsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BylawsModal({ isOpen, onClose }: BylawsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bylaws-title"
    >
      <div 
        className="bg-white dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#ba1b1d] dark:text-[#ffb4ab] border border-rose-200 dark:border-rose-900/60 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="bylaws-title" className="text-base font-bold text-slate-900 dark:text-white">
                Sime Darby Property Community Charter
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure Resident Messaging &amp; Conduct Rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close bylaws modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-50 dark:bg-[#1E2226] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Section 1: Mediated Neighbor Inquiries</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Direct communication between residents is privacy-shielded by default. Registered street addresses and personal telephone numbers are strictly concealed behind cryptographic precinct pseudonyms (e.g., #EW-9821).
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#1E2226] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#ba1b1d]" />
              <span>Section 2: Gatekeeper Mutual Consent</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Residents reserve full authority to Accept or Decline contact requests. No uninvited message threads can be forced into an inbox without the resident&apos;s explicit acceptance.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#1E2226] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Section 3: Anti-Harassment &amp; Commercial Solicitation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Unsolicited commercial advertisements, money-lending, or abusive language will trigger an immediate permanent block and referral to the Elmina JMB Committee and Auxiliary Police dispatch.
            </p>
          </div>

          <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-rose-900 dark:text-rose-200">
            <div>
              <div className="font-bold flex items-center gap-1.5 text-xs text-[#ba1b1d] dark:text-[#ffb4ab]">
                <PhoneCall className="w-4 h-4" />
                <span>Auxiliary Police 24/7 Hotline</span>
              </div>
              <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                For urgent security emergencies or unauthorized trespass: 03-7845 2222
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
