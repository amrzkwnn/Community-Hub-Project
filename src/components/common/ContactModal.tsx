'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  X, 
  Phone, 
  ShieldAlert, 
  Building2, 
  Flame, 
  Ambulance, 
  Copy, 
  Check, 
  Clock, 
  MapPin,
  ExternalLink
} from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { language, t } = useApp();
  const isMalay = language === 'bm' || language === 'ms-MY';

  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (num: string) => {
    try {
      navigator.clipboard.writeText(num.replace(/\s+/g, ''));
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#15181C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/80 flex items-center justify-center shadow-2xs">
              <Phone className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="contact-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isMalay ? 'Hubungi Kami' : 'Contact Us'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isMalay 
                  ? 'Direktori Perbandaran City of Elmina & Bantuan Keselamatan 24/7' 
                  : 'City of Elmina Township Directory & 24/7 Security Assistance'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close contact modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          
          {/* Priority Emergency & Security Card: Elmina Auxiliary Police */}
          <div className="rounded-xl border-2 border-rose-200/90 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9E1315] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Polis Bantuan Elmina' : 'Elmina Auxiliary Police'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9E1315] text-white">
                      24/7 RAPID RESPONSE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {isMalay 
                      ? 'Rondaan keselamatan berpusat, bilik kawalan & bantuan segera di kawasan perbandaran' 
                      : 'Dedicated perimeter patrols, central control room & immediate on-site response'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Primary Hotline */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {isMalay ? 'Talian Utama (24 Jam)' : 'Primary Hotline (24/7)'}
                  </span>
                  <span className="text-sm font-bold font-mono text-[#9E1315] dark:text-rose-400">
                    03-7845 2222
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy('03-7845 2222')}
                    title="Copy number"
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  >
                    {copiedNumber === '03-7845 2222' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="tel:0378452222"
                    className="px-2.5 py-1 rounded-md bg-[#9E1315] hover:bg-[#841012] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{isMalay ? 'Panggil' : 'Call'}</span>
                  </a>
                </div>
              </div>

              {/* Secondary Control Room */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {isMalay ? 'Bilik Kawalan Alternatif' : 'Alternative Control Room'}
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                    03-7839 8888
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy('03-7839 8888')}
                    title="Copy number"
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  >
                    {copiedNumber === '03-7839 8888' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="tel:0378398888"
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{isMalay ? 'Panggil' : 'Call'}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Township Management Office (JMB / Sime Darby Property) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {isMalay ? 'Pejabat Pengurusan Perbandaran (JMB / RA)' : 'Elmina Township Management Office (JMB / RA)'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mon – Fri: 8:30 AM – 5:30 PM | Sat: 8:30 AM – 1:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isMalay
                ? 'Untuk pertanyaan yuran penyelenggaraan, permit ubah suai rumah, tempahan fasiliti komunal, dan pengesahan penduduk.'
                : 'For maintenance billing inquiries, renovation permits, communal clubhouse bookings, and resident account verification.'}
            </p>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {isMalay ? 'Talian Pengurusan Pejabat' : 'Management Office Line'}
                </span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  03-7832 1100
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopy('03-7832 1100')}
                  title="Copy number"
                  className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  {copiedNumber === '03-7832 1100' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href="tel:0378321100"
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{isMalay ? 'Panggil' : 'Call'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* National & Municipal Emergency Services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* National Emergency MERS 999 */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Ambulance className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    MERS 999
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {isMalay ? 'Kecemasan Kebangsaan' : 'National Emergency Dispatch'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  999
                </span>
                <a
                  href="tel:999"
                  className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{isMalay ? 'Kecemasan 999' : 'Call 999'}</span>
                </a>
              </div>
            </div>

            {/* Bomba Kota Damansara */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Bomba Kota Damansara
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {isMalay ? 'Bomba & Penyelamat' : 'Fire & Rescue Station'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  03-6140 7444
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy('03-6140 7444')}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    title="Copy number"
                  >
                    {copiedNumber === '03-6140 7444' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href="tel:0361407444"
                    className="px-2 py-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{isMalay ? 'Panggil' : 'Call'}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#9E1315]" />
            <span>Bandar Elmina, 40160 Shah Alam, Selangor</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            {isMalay ? 'Tutup' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
