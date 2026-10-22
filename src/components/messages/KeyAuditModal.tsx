'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, Lock, Key, X, CheckCircle2, Server, Cpu } from 'lucide-react';

interface KeyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyAuditModal({ isOpen, onClose }: KeyAuditModalProps) {
  // Lock background scrolling and support Escape key
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
      aria-labelledby="key-audit-title"
    >
      <div 
        className="bg-white dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="key-audit-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cryptographic Key Audit</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                  Verified
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Municipal E2EE Protocol v3.2 Governance Node
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close key audit modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {/* Protocol specs */}
          <div className="bg-slate-50 dark:bg-[#1E2226] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="w-4 h-4 text-[#ba1b1d]" />
                Township Gateway Node
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                #SEL-ELM-04 (Elmina West)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-4 h-4 text-[#00468f] dark:text-[#aac7ff]" />
                Cipher Suite
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                AES-256-GCM / Curve25519
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-emerald-600" />
                Session Ratchet Status
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active (Ephemeral Handshake)
              </span>
            </div>
          </div>

          {/* Key Fingerprints */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-[#ba1b1d]" />
              <span>Public Identity Key Fingerprint</span>
            </label>
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed border border-slate-800 select-all">
              SHA256:7b9e:4f2a:88d1:c019:e45b:9231:fa44:09ce:61bc:77ef:54d8:1201:89ab:cd43:f4a1
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Compare this fingerprint with your neighbour during in-person verification to guarantee zero man-in-the-middle tampering.
            </p>
          </div>

          {/* Privacy Guarantee Statement */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero Centralized Cleartext Retention</span>
            </div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
              In compliance with the Sime Darby Property Resident Safeguard Charter, raw phone numbers and unmasked deed addresses are never stored in message headers or transmitted to third-party CDNs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
