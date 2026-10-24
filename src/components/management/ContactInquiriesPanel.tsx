'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Inbox, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Mail, 
  Phone, 
  Copy, 
  Check, 
  FileEdit,
  Save,
  X
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

export interface ContactInquiryRecord {
  id: string;
  referenceId: string;
  fullName: string;
  email: string;
  phone?: string;
  category: 'general' | 'maintenance' | 'security' | 'billing';
  message: string;
  status: 'new' | 'in_review' | 'resolved';
  createdAt: string;
  updatedAt: string;
  userId?: string;
  adminNotes?: string;
}

export default function ContactInquiriesPanel() {
  const { language, currentUser } = useApp();
  const isMalay = language === 'bm' || language === 'ms-MY';

  const [inquiries, setInquiries] = useState<ContactInquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_review' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryRecord | null>(null);

  // Status updating state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const loadInquiries = useCallback(async () => {
    try {
      const res = await fetch('/api/contact', {
        headers: {
          'x-user-id': currentUser?.id || 'demo-management',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load inquiries (${res.status})`);
      }

      const data = (await res.json()) as { 
        success: boolean; 
        inquiries?: ContactInquiryRecord[]; 
        error?: string 
      };

      if (data.success && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
      } else {
        throw new Error(data.error || 'Invalid API response format');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch inquiries.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const res = await fetch('/api/contact', {
          headers: {
            'x-user-id': currentUser?.id || 'demo-management',
          },
        });
        if (!res.ok) throw new Error(`Failed to load inquiries (${res.status})`);
        const data = (await res.json()) as { 
          success: boolean; 
          inquiries?: ContactInquiryRecord[]; 
          error?: string 
        };
        if (isMounted) {
          if (data.success && Array.isArray(data.inquiries)) {
            setInquiries(data.inquiries);
          } else {
            setError(data.error || 'Invalid API response format');
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Could not fetch inquiries.';
          setError(msg);
          setLoading(false);
        }
      }
    };

    void fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    await loadInquiries();
  };

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleUpdateStatus = async (
    referenceId: string, 
    newStatus: ContactInquiryRecord['status'], 
    newNotes?: string
  ) => {
    setUpdatingId(referenceId);
    try {
      const res = await fetch('/api/contact', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'demo-management',
        },
        body: JSON.stringify({
          referenceId,
          status: newStatus,
          adminNotes: newNotes !== undefined ? newNotes : (selectedInquiry?.adminNotes || ''),
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        inquiry?: ContactInquiryRecord;
        error?: string;
      };

      if (data.success && data.inquiry) {
        const updated = data.inquiry;
        setInquiries((prev) =>
          prev.map((item) => (item.referenceId === referenceId ? updated : item))
        );
        if (selectedInquiry?.referenceId === referenceId) {
          setSelectedInquiry(updated);
        }
      } else {
        alert(data.error || 'Failed to update status.');
      }
    } catch {
      alert('Network error while updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // Status filter
      if (statusFilter !== 'all' && inq.status !== statusFilter) return false;
      // Category filter
      if (categoryFilter !== 'all' && inq.category !== categoryFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          inq.referenceId.toLowerCase().includes(query) ||
          inq.fullName.toLowerCase().includes(query) ||
          inq.email.toLowerCase().includes(query) ||
          inq.message.toLowerCase().includes(query) ||
          (inq.phone && inq.phone.includes(query));
        if (!matches) return false;
      }
      return true;
    });
  }, [inquiries, statusFilter, categoryFilter, searchQuery]);

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'maintenance':
        return isMalay ? 'Penyelenggaraan & Fasiliti' : 'Maintenance & Facilities';
      case 'security':
        return isMalay ? 'Keselamatan & Kawalan' : 'Safety & Security';
      case 'billing':
        return isMalay ? 'Bil & Akaun' : 'Billing & Account';
      default:
        return isMalay ? 'Pertanyaan Umum' : 'General Inquiry';
    }
  };

  const statusBadge = (status: ContactInquiryRecord['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            <span>{isMalay ? 'Baru' : 'New'}</span>
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            <Clock className="w-3 h-3" />
            <span>{isMalay ? 'Dalam Semakan' : 'In Review'}</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            <span>{isMalay ? 'Selesai' : 'Resolved'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner / Stats */}
      <div className="bg-white dark:bg-[#15181C] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-[#D9480F] dark:text-orange-400 border border-orange-200/80 dark:border-orange-900/60 flex items-center justify-center">
                <Inbox className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isMalay ? 'Peti Masuk Pertanyaan Penduduk' : 'Resident Inquiries & Assistance Desk'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-11">
              {isMalay
                ? 'Semua mesej dan pertanyaan rasmi yang dihantar melalui borang Hubungi Kami direkodkan secara kekal di sini.'
                : 'All official messages and inquiries submitted via the public Contact Us portal are durably recorded here for management staff.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleRefresh()}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{isMalay ? 'Muat Semula' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMalay ? 'Cari rujukan, nama, emel, atau mesej...' : 'Search by reference ID, sender, email, or keywords...'}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D9480F]/40"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'new' | 'in_review' | 'resolved')}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D9480F]/40 cursor-pointer"
            >
              <option value="all">{isMalay ? 'Semua Status' : 'All Statuses'}</option>
              <option value="new">{isMalay ? 'Baru' : 'New'}</option>
              <option value="in_review">{isMalay ? 'Dalam Semakan' : 'In Review'}</option>
              <option value="resolved">{isMalay ? 'Selesai' : 'Resolved'}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D9480F]/40 cursor-pointer"
            >
              <option value="all">{isMalay ? 'Semua Kategori' : 'All Categories'}</option>
              <option value="general">{isMalay ? 'Pertanyaan Umum' : 'General'}</option>
              <option value="maintenance">{isMalay ? 'Penyelenggaraan & Fasiliti' : 'Maintenance'}</option>
              <option value="security">{isMalay ? 'Keselamatan & Kawalan' : 'Security'}</option>
              <option value="billing">{isMalay ? 'Bil & Akaun' : 'Billing'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table / List View */}
      <div className="bg-white dark:bg-[#15181C] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading && inquiries.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#D9480F] mb-2" />
            <p>{isMalay ? 'Memuatkan pertanyaan penduduk...' : 'Retrieving inquiries from secure persistence...'}</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Inbox className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {isMalay ? 'Tiada pertanyaan dijumpai' : 'No inquiries match your criteria'}
            </p>
            <p className="mt-1 text-slate-400">
              {isMalay ? 'Cuba ubah carian atau penapis status.' : 'Try adjusting your search query or category filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{isMalay ? 'ID Rujukan' : 'Reference ID'}</th>
                  <th className="px-5 py-3.5">{isMalay ? 'Pengirim' : 'Sender'}</th>
                  <th className="px-5 py-3.5">{isMalay ? 'Kategori' : 'Category'}</th>
                  <th className="px-5 py-3.5">{isMalay ? 'Mesej' : 'Message Snippet'}</th>
                  <th className="px-5 py-3.5">{isMalay ? 'Tarikh' : 'Submitted'}</th>
                  <th className="px-5 py-3.5">{isMalay ? 'Status' : 'Status'}</th>
                  <th className="px-5 py-3.5 text-right">{isMalay ? 'Tindakan' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInquiries.map((inq) => (
                  <tr 
                    key={inq.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Reference ID */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {inq.referenceId}
                        </span>
                        <button
                          onClick={() => handleCopy(inq.referenceId, inq.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Copy reference ID"
                        >
                          {copiedId === inq.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {inq.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{inq.email}</span>
                      </div>
                      {inq.phone && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{inq.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {categoryLabel(inq.category)}
                      </span>
                    </td>

                    {/* Message Preview */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="truncate text-slate-600 dark:text-slate-300">
                        {inq.message}
                      </p>
                      {inq.adminNotes && (
                        <p className="text-[10px] text-[#D9480F] dark:text-orange-400 italic mt-0.5 truncate">
                          Note: {inq.adminNotes}
                        </p>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      <div>{new Date(inq.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(inq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {statusBadge(inq.status)}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setEditNotes(inq.adminNotes || '');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer text-[11px]"
                      >
                        {isMalay ? 'Semak' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInquiry(null);
          }}
        >
          <div className="bg-white dark:bg-[#15181C] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-orange-50 dark:bg-orange-950/60 text-[#D9480F] dark:text-orange-400 px-2.5 py-0.5 rounded-lg border border-orange-200 dark:border-orange-900/50">
                  {selectedInquiry.referenceId}
                </span>
                {statusBadge(selectedInquiry.status)}
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">{isMalay ? 'Pengirim' : 'Sender'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedInquiry.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">{isMalay ? 'Emel' : 'Email'}</span>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-[#D9480F] hover:underline font-medium">
                    {selectedInquiry.email}
                  </a>
                </div>
                {selectedInquiry.phone && (
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">{isMalay ? 'Telefon' : 'Phone'}</span>
                    <a href={`tel:${selectedInquiry.phone}`} className="text-slate-800 dark:text-slate-200 hover:underline">
                      {selectedInquiry.phone}
                    </a>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">{isMalay ? 'Kategori' : 'Category'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {categoryLabel(selectedInquiry.category)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isMalay ? 'Mesej Pertanyaan' : 'Submitted Message'}
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Management internal notes */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileEdit className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isMalay ? 'Nota Pengurusan & Tindakan' : 'Internal Management Notes'}</span>
                  </label>
                </div>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={isMalay ? 'Tambah catatan tindakan pengurusan...' : 'Add internal notes or follow-up status...'}
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D9480F]/40"
                />
              </div>

              {/* Status Actions */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {isMalay ? 'Kemaskini status:' : 'Set Status:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={updatingId === selectedInquiry.referenceId}
                    onClick={() => handleUpdateStatus(selectedInquiry.referenceId, 'in_review', editNotes)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedInquiry.status === 'in_review'
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 hover:bg-sky-100'
                    }`}
                  >
                    {isMalay ? 'Dalam Semakan' : 'In Review'}
                  </button>

                  <button
                    disabled={updatingId === selectedInquiry.referenceId}
                    onClick={() => handleUpdateStatus(selectedInquiry.referenceId, 'resolved', editNotes)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedInquiry.status === 'resolved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {isMalay ? 'Selesai' : 'Resolved'}
                  </button>

                  <button
                    disabled={updatingId === selectedInquiry.referenceId}
                    onClick={() => handleUpdateStatus(selectedInquiry.referenceId, selectedInquiry.status, editNotes)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isMalay ? 'Simpan Nota' : 'Save Notes'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
