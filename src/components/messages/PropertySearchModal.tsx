'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Search, 
  Home, 
  Send, 
  Lock, 
  ShieldCheck, 
  X, 
  AlertCircle, 
  Check, 
  EyeOff, 
  UserCheck 
} from 'lucide-react';

interface PropertySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertySearchModal({ isOpen, onClose }: PropertySearchModalProps) {
  const { 
    searchProperties, 
    sendPropertyMessageRequest, 
    currentUser,
    t 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ targetId: string; precinct: string; maskedProperty: string; residenceType?: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<{ targetId: string; precinct: string; maskedProperty: string; residenceType?: string } | null>(null);

  // Form fields
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [senderDisplayName, setSenderDisplayName] = useState(currentUser.displayName);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Background scroll lock & Escape key listener
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (searchQuery.trim().length < 2) {
      setErrorMessage('Please enter at least 2 search characters (e.g. "EG 3" or "No. 24").');
      return;
    }

    setLoading(true);
    try {
      const results = await searchProperties(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setErrorMessage('No verified residences match this search query in City of Elmina.');
      }
    } catch {
      setErrorMessage('Error performing address search.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProperty = (prop: { targetId: string; precinct: string; maskedProperty: string; residenceType?: string }) => {
    setSelectedProperty(prop);
    const typeLabel = prop.residenceType === 'tenant' ? ' (Tenant)' : prop.residenceType === 'household_member' ? ' (Household)' : '';
    setSubject(`Neighbour Inquiry: ${prop.maskedProperty}${typeLabel}`);
    setErrorMessage(null);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    if (!subject.trim() || !initialMessage.trim()) {
      setErrorMessage('Please complete both the subject and introductory message.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await sendPropertyMessageRequest({
      recipientId: selectedProperty.targetId,
      propertyAddress: selectedProperty.maskedProperty,
      subject: subject.trim(),
      initialMessage: initialMessage.trim(),
      isAnonymous,
      senderDisplayName: isAnonymous ? undefined : senderDisplayName,
    });

    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to send message request.');
    } else {
      onClose();
      setSelectedProperty(null);
      setSearchQuery('');
      setSearchResults([]);
      setInitialMessage('');
      setSuccessMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#15181C] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#ba1b1d] dark:text-rose-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Find Residence &amp; Send Private Request
              </h3>
              <span className="text-[11px] text-slate-400">City of Elmina • Privacy-Shielded Protocol</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Shield Banner */}
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-100 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Identity &amp; Contact Number Privacy Protected</strong>
            <span className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
              Real phone numbers and personal emails are never exposed. The recipient resident must accept your request before a direct conversation channel unlocks.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-900 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Step 1: Search Form */}
        {!selectedProperty ? (
          <div className="space-y-4 mt-4 overflow-y-auto">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by unit number or street name (e.g. 'EG 3/4', 'Denai 2')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Results */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.length > 0 && (
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Search Results ({searchResults.length})
                </span>
              )}
              {searchResults.map((res) => {
                const resType = res.residenceType || 'owner';
                const roleBadge = 
                  resType === 'tenant'
                    ? { label: 'Tenant', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' }
                    : resType === 'household_member'
                      ? { label: 'Household', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' }
                      : { label: 'Owner', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };

                return (
                  <div
                    key={`${res.targetId}-${resType}`}
                    className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50/50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-[#ba1b1d] flex items-center justify-center shrink-0">
                        <Home className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {res.maskedProperty}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {res.precinct} • Verified Resident Contact
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectProperty(res)}
                      className="bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Select
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Step 2: Compose Message Request Form */
          <form onSubmit={handleSendRequest} className="space-y-3.5 mt-4 overflow-y-auto">
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-between text-xs border border-slate-200/80 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Recipient:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedProperty.maskedProperty} ({selectedProperty.precinct})
                  {selectedProperty.residenceType && (
                    <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedProperty.residenceType === 'tenant' ? 'Tenant' : selectedProperty.residenceType === 'household_member' ? 'Household' : 'Homeowner'}
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="text-[11px] font-bold text-[#ba1b1d] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discussion Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Perimeter Gate Light / Overhanging Trees / Pet Care"
                className="w-full text-xs border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Introductory Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Explain your purpose politely to your neighbour..."
                className="w-full text-xs border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315] resize-none"
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-amber-700 focus:ring-amber-600 accent-[#ba1b1d]"
                />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
                  <span>Send Request Anonymously (Elmina Neighbour)</span>
                </span>
              </label>
              <p className="text-[10px] text-amber-800 dark:text-amber-300 mt-1 pl-5 leading-relaxed">
                Recipient will not see your display name, only the label &quot;Elmina Neighbour (Anonymous)&quot;.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
