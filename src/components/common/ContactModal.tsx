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
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { language, currentUser } = useApp();
  const isMalay = language === 'bm' || language === 'ms-MY';

  // Directory copied state
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(() => currentUser?.fullName || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(() => currentUser?.phone || '');
  const [category, setCategory] = useState<'general' | 'maintenance' | 'security' | 'billing'>('general');
  const [message, setMessage] = useState('');

  // Validation & Submission States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReferenceId, setSubmittedReferenceId] = useState<string | null>(null);
  const [copiedRefId, setCopiedRefId] = useState(false);

  // Keyboard Escape listener & focus management
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

  const handleCopyRefId = (refId: string) => {
    try {
      navigator.clipboard.writeText(refId);
      setCopiedRefId(true);
      setTimeout(() => setCopiedRefId(false), 2000);
    } catch {
      // Fallback
    }
  };

  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.fullName = isMalay ? 'Sila masukkan nama penuh anda.' : 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.fullName = isMalay ? 'Nama mestilah sekurang-kurangnya 2 aksara.' : 'Name must be at least 2 characters.';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail) {
      errors.email = isMalay ? 'Alamat emel diperlukan.' : 'Email address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = isMalay ? 'Sila masukkan alamat emel yang sah.' : 'Please enter a valid email address.';
    }

    if (phone.trim()) {
      const phoneRegex = /^[0-9+() -]{7,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        errors.phone = isMalay ? 'Format nombor telefon tidak sah.' : 'Please enter a valid phone number.';
      }
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      errors.message = isMalay ? 'Sila masukkan mesej pertanyaan anda.' : 'Message content is required.';
    } else if (trimmedMessage.length < 10) {
      errors.message = isMalay ? 'Mesej mestilah sekurang-kurangnya 10 aksara.' : 'Message must be at least 10 characters long.';
    } else if (trimmedMessage.length > 2000) {
      errors.message = isMalay ? 'Mesej tidak boleh melebihi 2,000 aksara.' : 'Message cannot exceed 2,000 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);

    if (!validateClient()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        category,
        message: message.trim(),
        userId: currentUser?.id || undefined,
      };

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        setSubmitError(
          data.error || 
          (isMalay 
            ? 'Penghantaran gagal. Sila semak semula maklumat anda.' 
            : 'Submission failed. Please check your inputs and try again.')
        );
        return;
      }

      // Genuine persistence confirmed
      setSubmittedReferenceId(data.referenceId);
      // Reset form fields
      setFullName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCategory('general');
      setFieldErrors({});
    } catch {
      setSubmitError(
        isMalay
          ? 'Ralat sambungan. Sila semak sambungan internet anda dan cuba lagi.'
          : 'Network error. Please verify your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedReferenceId(null);
    setSubmitError(null);
    setFieldErrors({});
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhone(currentUser.phone || '');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-[#111418] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Compact Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-[#D9480F] dark:text-orange-400 border border-orange-200/80 dark:border-orange-900/60 flex items-center justify-center">
              <Phone className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="contact-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isMalay ? 'Hubungi Kami' : 'Contact Us'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isMalay ? 'Bantuan Perbandaran NadiKomuniti' : 'NadiKomuniti Township Assistance'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={isMalay ? 'Tutup modal' : 'Close contact modal'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body: Two-Column Desktop / Stacked Mobile */}
        <div className="overflow-y-auto max-h-[calc(92vh-125px)] p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* ======================================================== */}
            {/* LEFT COLUMN: Contact Directory                           */}
            {/* ======================================================== */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {isMalay ? 'Direktori Perhubungan' : 'Contact Directory'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMalay
                    ? 'Talian kecemasan 24/7 dan pejabat pentadbiran rasmi Elmina.'
                    : '24/7 hotlines and official administrative desks for Elmina.'}
                </p>
              </div>

              {/* Auxiliary Police (Emergency & Rapid Response) */}
              <div className="rounded-2xl border-2 border-rose-200/90 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#9E1315] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {isMalay ? 'Polis Bantuan Elmina' : 'Elmina Auxiliary Police'}
                      </h4>
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#9E1315] text-white">
                        24/7
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {isMalay 
                        ? 'Rondaan perimeter, bilik kawalan berpusat & tindak balas pantas'
                        : 'Dedicated perimeter patrols, central control room & immediate response'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Primary Hotline */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {isMalay ? 'Talian Utama (24 Jam)' : 'Primary Hotline (24/7)'}
                      </span>
                      <span className="text-xs font-bold font-mono text-[#9E1315] dark:text-rose-400">
                        03-7845 2222
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy('03-7845 2222')}
                        aria-label="Copy primary hotline number"
                        title={isMalay ? 'Salin nombor' : 'Copy number'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      >
                        {copiedNumber === '03-7845 2222' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href="tel:0378452222"
                        aria-label="Call Elmina Auxiliary Police Primary Hotline"
                        className="px-2.5 py-1 rounded-lg bg-[#9E1315] hover:bg-[#841012] text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{isMalay ? 'Hubungi' : 'Call'}</span>
                      </a>
                    </div>
                  </div>

                  {/* Alternative Control Room */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {isMalay ? 'Bilik Kawalan Alternatif' : 'Alternative Control Room'}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                        03-7839 8888
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy('03-7839 8888')}
                        aria-label="Copy alternative control room number"
                        title={isMalay ? 'Salin nombor' : 'Copy number'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      >
                        {copiedNumber === '03-7839 8888' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href="tel:0378398888"
                        aria-label="Call Alternative Control Room"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{isMalay ? 'Hubungi' : 'Call'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Township Management Office (JMB / RA) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Pejabat Pengurusan Perbandaran' : 'Township Management Office'}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Mon–Fri: 8:30 AM–5:30 PM | Sat: 8:30 AM–1:00 PM</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {isMalay ? 'Talian Pejabat JMB' : 'Management Office Line'}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                      03-7832 1100
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy('03-7832 1100')}
                      aria-label="Copy township management number"
                      title={isMalay ? 'Salin nombor' : 'Copy number'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                      {copiedNumber === '03-7832 1100' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href="tel:0378321100"
                      aria-label="Call Township Management Office"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{isMalay ? 'Hubungi' : 'Call'}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* National Emergency & Bomba */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* MERS 999 */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Ambulance className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        MERS 999
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        {isMalay ? 'Kecemasan Negara' : 'National Dispatch'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">999</span>
                    <a
                      href="tel:999"
                      aria-label="Call MERS 999"
                      className="px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold"
                    >
                      {isMalay ? 'Panggil' : 'Call'}
                    </a>
                  </div>
                </div>

                {/* Bomba Kota Damansara */}
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        Bomba Damansara
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        {isMalay ? 'Bomba & Penyelamat' : 'Fire & Rescue'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">03-6140 7444</span>
                    <a
                      href="tel:0361407444"
                      aria-label="Call Bomba Kota Damansara"
                      className="px-2 py-0.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold"
                    >
                      {isMalay ? 'Panggil' : 'Call'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Emergency Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 dark:text-amber-300 leading-snug">
                  {isMalay
                    ? 'Borang mesej ini adalah untuk pertanyaan umum dan tidak dipantau sebagai bilik kecemasan 24/7. Untuk sebarang situasi kecemasan atau ancaman keselamatan segera, hubungi Polis Bantuan atau MERS 999 serta-merta.'
                    : 'The contact form is for general inquiries only and is not monitored as a 24/7 emergency dispatch service. For life-threatening emergencies or urgent security response, dial MERS 999 or call Auxiliary Police immediately.'}
                </p>
              </div>

            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: Send Us a Message Form                     */}
            {/* ======================================================== */}
            <div className="md:col-span-7 bg-slate-50/50 dark:bg-slate-900/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800">
              
              {/* SUCCESS CONFIRMATION VIEW */}
              {submittedReferenceId ? (
                <div className="py-6 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mx-auto flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {isMalay ? 'Mesej Berjaya Diterima' : 'Message Durably Received'}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      {isMalay
                        ? 'Pertanyaan anda telah direkodkan ke peti masuk pihak Pengurusan Perbandaran NadiKomuniti. Pegawai bertugas akan menyemak dan memberi maklum balas melalui emel.'
                        : 'Your inquiry has been successfully registered with NadiKomuniti Township Management. An officer will review your request and get in touch with you via email.'}
                    </p>
                  </div>

                  {/* Reference ID Card */}
                  <div className="p-3.5 max-w-sm mx-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isMalay ? 'ID Rujukan Pertanyaan' : 'Inquiry Reference ID'}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-base font-extrabold text-[#D9480F] dark:text-orange-400">
                        {submittedReferenceId}
                      </span>
                      <button
                        onClick={() => handleCopyRefId(submittedReferenceId)}
                        aria-label="Copy Reference ID"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={isMalay ? 'Salin ID Rujukan' : 'Copy Reference ID'}
                      >
                        {copiedRefId ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {isMalay ? 'Simpan nombor rujukan ini untuk semakan kelak.' : 'Keep this reference ID for tracking and follow-up.'}
                    </span>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      onClick={handleResetForm}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isMalay ? 'Hantar Pertanyaan Lain' : 'Send Another Message'}
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      {isMalay ? 'Tutup' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : (
                /* INQUIRY FORM VIEW */
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {isMalay ? 'Hantar Mesej Kepada Kami' : 'Send Us a Message'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isMalay
                        ? 'Ajukan sebarang pertanyaan perbandaran terus ke pejabat pengurusan.'
                        : 'Submit inquiries or feedback directly to the township management desk.'}
                    </p>
                  </div>

                  {/* Submission Error Banner */}
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Row 1: Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Name */}
                    <div>
                      <label 
                        htmlFor="contact-fullName" 
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        {isMalay ? 'Nama Penuh' : 'Full Name'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="contact-fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (fieldErrors.fullName) {
                            setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                          }
                        }}
                        placeholder={isMalay ? 'cth., Khairul Anuar' : 'e.g., Khairul Anuar'}
                        className={`w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border ${
                          fieldErrors.fullName 
                            ? 'border-rose-500 focus:ring-rose-500/30' 
                            : 'border-slate-200 dark:border-slate-800 focus:ring-[#D9480F]/30'
                        } text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2`}
                      />
                      {fieldErrors.fullName && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                          {fieldErrors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label 
                        htmlFor="contact-email" 
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        {isMalay ? 'Alamat Emel' : 'Email Address'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) {
                            setFieldErrors((prev) => ({ ...prev, email: '' }));
                          }
                        }}
                        placeholder={isMalay ? 'nama@contoh.com' : 'name@example.com'}
                        className={`w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border ${
                          fieldErrors.email 
                            ? 'border-rose-500 focus:ring-rose-500/30' 
                            : 'border-slate-200 dark:border-slate-800 focus:ring-[#D9480F]/30'
                        } text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2`}
                      />
                      {fieldErrors.email && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Phone & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone Number (Optional) */}
                    <div>
                      <label 
                        htmlFor="contact-phone" 
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        {isMalay ? 'Nombor Telefon (Pilihan)' : 'Phone Number (Optional)'}
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (fieldErrors.phone) {
                            setFieldErrors((prev) => ({ ...prev, phone: '' }));
                          }
                        }}
                        placeholder="+60 12-345 6789"
                        className={`w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border ${
                          fieldErrors.phone 
                            ? 'border-rose-500 focus:ring-rose-500/30' 
                            : 'border-slate-200 dark:border-slate-800 focus:ring-[#D9480F]/30'
                        } text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2`}
                      />
                      {fieldErrors.phone && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Inquiry Category */}
                    <div>
                      <label 
                        htmlFor="contact-category" 
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        {isMalay ? 'Kategori Pertanyaan' : 'Inquiry Category'}
                      </label>
                      <select
                        id="contact-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as 'general' | 'maintenance' | 'security' | 'billing')}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D9480F]/30 cursor-pointer"
                      >
                        <option value="general">
                          {isMalay ? 'Pertanyaan Umum' : 'General Inquiry'}
                        </option>
                        <option value="maintenance">
                          {isMalay ? 'Penyelenggaraan & Fasiliti' : 'Maintenance & Facilities'}
                        </option>
                        <option value="security">
                          {isMalay ? 'Keselamatan & Kawalan' : 'Safety & Security'}
                        </option>
                        <option value="billing">
                          {isMalay ? 'Bil & Akaun Pengurusan' : 'Billing & Account'}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Message Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label 
                        htmlFor="contact-message" 
                        className="text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        {isMalay ? 'Mesej' : 'Message'} <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {message.length} / 2000
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (fieldErrors.message) {
                          setFieldErrors((prev) => ({ ...prev, message: '' }));
                        }
                      }}
                      placeholder={
                        isMalay 
                          ? 'Bagaimanakah pihak pengurusan boleh membantu anda? Sila nyatakan butiran berkaitan...' 
                          : 'How can township management assist you today? Please provide relevant details...'
                      }
                      className={`w-full p-3 rounded-xl text-xs bg-white dark:bg-slate-900 border ${
                        fieldErrors.message 
                          ? 'border-rose-500 focus:ring-rose-500/30' 
                          : 'border-slate-200 dark:border-slate-800 focus:ring-[#D9480F]/30'
                      } text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 resize-y`}
                    />
                    {fieldErrors.message && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                        {fieldErrors.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Action */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isMalay ? 'Batal' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D9480F] hover:bg-[#C23E0A] text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{isMalay ? 'Menghantar Pertanyaan...' : 'Sending Inquiry...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{isMalay ? 'Hantar Mesej' : 'Send Message'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-[#D9480F]" />
            <span>Bandar Elmina, 40160 Shah Alam, Selangor</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-xs"
          >
            {isMalay ? 'Tutup' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
