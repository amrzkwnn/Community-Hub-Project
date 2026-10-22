'use client';

import React, { useEffect } from 'react';
import { Lock, X, MapPin, Download, ShieldCheck } from 'lucide-react';

interface PhotoLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
  filename?: string;
  geotag?: string;
}

export default function PhotoLightboxModal({
  imageUrl,
  onClose,
  filename = 'secure_attachment.jpg',
  geotag = '3.1792° N, 101.5034° E (Elmina West)',
}: PhotoLightboxModalProps) {
  // Lock background scroll and listen for Escape key
  useEffect(() => {
    if (!imageUrl) return;

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
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Secure Attachment Lightbox"
    >
      <div 
        className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {filename}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  E2EE Encrypted
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#00468f]" />
                <span>Geotagged: {geotag}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Download original file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Close photo preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="flex-1 min-h-[300px] flex items-center justify-center py-4 overflow-hidden relative">
          <img
            src={imageUrl}
            alt={filename}
            className="max-h-[68vh] max-w-full object-contain rounded-2xl shadow-xl border border-slate-800"
          />
        </div>

        {/* Footer advisory */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <span>
            Access strictly restricted to authenticated participants of this verified channel.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
