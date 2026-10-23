'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { LocalService, ServiceCategory } from '@/types';
import { 
  Wrench, 
  Plus, 
  Search, 
  ShieldCheck, 
  MessageCircle, 
  HeartHandshake, 
  Baby, 
  GraduationCap, 
  Scissors, 
  Laptop, 
  Truck, 
  Sparkles, 
  Clock, 
  Star, 
  Lock, 
  Trash2, 
  X
} from 'lucide-react';
import ImageUploadArea from '@/components/common/ImageUploadArea';
import SuccessToast from '@/components/common/SuccessToast';
import { useScrollHeader } from '@/lib/hooks/useScrollHeader';
import { fromDatabaseUserId } from '@/lib/utils/idMapping';

export default function ServicesView() {
  const { 
    services, 
    createService, 
    deleteService, 
    getOrCreateConversation,
    startConversation, 
    navigateToItem,
    setActiveTab, 
    language,
    currentUser,
    navigationTarget,
    clearNavigationTarget
  } = useApp();

  const { 
    handleScroll, 
    headerWrapperRef, 
    headerInnerRef, 
    scrollContainerRef, 
    headerWrapperStyle, 
    headerInnerStyle 
  } = useScrollHeader({ collapseDistance: 200, topThreshold: 5 });

  // Tab State: 'services' (Find Services) or 'requests' (Requests for Help)
  const [activeTab, setActiveTabState] = useState<'services' | 'requests'>('services');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPrecinct, setSelectedPrecinct] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCompensation, setSelectedCompensation] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'newest'>('nearest');

  // Modal States
  const [isOfferServiceOpen, setIsOfferServiceOpen] = useState(false);
  const [isRequestHelpOpen, setIsRequestHelpOpen] = useState(false);
  const [detailService, setDetailService] = useState<LocalService | null>(null);
  const [displayedDetailService, setDisplayedDetailService] = useState<LocalService | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState(0);
  const detailCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetailTriggerRef = useRef<HTMLElement | null>(null);
  const [contactService, setContactService] = useState<LocalService | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [shareWhatsapp, setShareWhatsapp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimizing, setIsMinimizing] = useState(false);

  // Success Toast State
  const [successToast, setSuccessToast] = useState<{
    open: boolean;
    heading: string;
    body: string;
  }>({
    open: false,
    heading: '',
    body: '',
  });

  // Offer Service Form State
  const [offerTitle, setOfferTitle] = useState('');
  const [offerCategory, setOfferCategory] = useState<ServiceCategory>('home_services');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerPrecinct, setOfferPrecinct] = useState('Elmina Valley 2');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerAvailability, setOfferAvailability] = useState('');
  const [offerImages, setOfferImages] = useState<string[]>([]);

  // Request Help Form State
  const [requestTitle, setRequestTitle] = useState('');
  const [requestCategory, setRequestCategory] = useState<ServiceCategory>('home_services');
  const [requestPrecinct, setRequestPrecinct] = useState('Elmina Valley 3');
  const [requestDesc, setRequestDesc] = useState('');
  const [requestTiming, setRequestTiming] = useState('This Weekend (Flexible)');
  const [requestCompensation, setRequestCompensation] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<'normal' | 'urgent'>('normal');
  const [requestImages, setRequestImages] = useState<string[]>([]);

  // Open Detail Window with smooth fade-in (opacity 0 -> 1, subtle translateY 8px -> 0)
  const handleOpenDetail = useCallback((serv: LocalService, triggerEl?: HTMLElement | null) => {
    if (detailCloseTimeoutRef.current) {
      clearTimeout(detailCloseTimeoutRef.current);
      detailCloseTimeoutRef.current = null;
    }

    if (triggerEl) {
      lastDetailTriggerRef.current = triggerEl;
    } else if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      lastDetailTriggerRef.current = document.activeElement;
    }

    setDisplayedDetailService(serv);
    setDetailService(serv);
    setIsDetailClosing(false);
    setIsDetailOpen(true);
    setDetailSessionId((prev) => prev + 1);
  }, []);

  // Close Detail Window with smooth fade-out (opacity 1 -> 0, subtle translateY 0 -> 8px)
  const handleCloseDetail = useCallback((immediate = false) => {
    if (immediate) {
      if (detailCloseTimeoutRef.current) {
        clearTimeout(detailCloseTimeoutRef.current);
        detailCloseTimeoutRef.current = null;
      }
      setIsDetailOpen(false);
      setIsDetailClosing(false);
      setDisplayedDetailService(null);
      setDetailService(null);
      lastDetailTriggerRef.current?.focus();
      return;
    }

    if (!displayedDetailService || isDetailClosing) return;

    setIsDetailOpen(false);
    setIsDetailClosing(true);

    detailCloseTimeoutRef.current = setTimeout(() => {
      setDisplayedDetailService(null);
      setDetailService(null);
      setIsDetailClosing(false);
      lastDetailTriggerRef.current?.focus();
      detailCloseTimeoutRef.current = null;
    }, 170); // 170ms smooth exit
  }, [displayedDetailService, isDetailClosing]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (detailCloseTimeoutRef.current) {
        clearTimeout(detailCloseTimeoutRef.current);
      }
    };
  }, []);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isOfferServiceOpen || isRequestHelpOpen || !!displayedDetailService || !!contactService;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOfferServiceOpen) setIsOfferServiceOpen(false);
        if (isRequestHelpOpen) setIsRequestHelpOpen(false);
        if (displayedDetailService) handleCloseDetail();
        if (contactService) setContactService(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOfferServiceOpen, isRequestHelpOpen, displayedDetailService, contactService, handleCloseDetail]);

  // Deep Navigation Listener for Global Search
  useEffect(() => {
    if (!navigationTarget || navigationTarget.tab !== 'services') return;
    let timer: NodeJS.Timeout | null = null;
    timer = setTimeout(() => {
      if (navigationTarget.subTab) {
        setActiveTabState(navigationTarget.subTab);
      }
      if (navigationTarget.itemId) {
        const serv = services.find((s) => s.id === navigationTarget.itemId);
        if (serv) {
          setSearchQuery('');
          setSelectedCategory('all');
          setSelectedPrecinct('all');
          setSelectedPricing('all');
          setSelectedStatus('all');
          setSelectedCompensation('all');
          handleOpenDetail(serv);
          clearNavigationTarget();
        }
      }
    }, 0);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [navigationTarget, services, clearNavigationTarget]);

  // Filtering Logic
  const offeringServices = services.filter((s) => s.type === 'offering');
  const requestingServices = services.filter((s) => s.type === 'requesting');

  const filteredServices = services.filter((serv) => {
    // Tab constraint
    if (activeTab === 'services' && serv.type !== 'offering') return false;
    if (activeTab === 'requests' && serv.type !== 'requesting') return false;

    // Category filter
    if (selectedCategory !== 'all' && serv.category !== selectedCategory) return false;

    // Precinct filter
    if (selectedPrecinct !== 'all' && !serv.precinct.toLowerCase().includes(selectedPrecinct.toLowerCase())) {
      return false;
    }

    // Pricing filter for Services
    if (activeTab === 'services' && selectedPricing !== 'all') {
      const priceStr = (serv.priceEstimate || '').toLowerCase();
      if (selectedPricing === 'free' && !priceStr.includes('free') && !priceStr.includes('percuma')) return false;
      if (selectedPricing === 'under50') {
        const matches = priceStr.match(/\d+/g);
        if (matches && parseInt(matches[0], 10) > 50) return false;
      }
    }

    // Status filter for Requests
    if (activeTab === 'requests' && selectedStatus !== 'all') {
      const servStatus = serv.status || 'open';
      if (selectedStatus === 'urgent' && serv.urgency !== 'urgent') return false;
      if (selectedStatus !== 'urgent' && servStatus !== selectedStatus) return false;
    }

    // Compensation filter for Requests
    if (activeTab === 'requests' && selectedCompensation !== 'all') {
      const compStr = (serv.compensationPreference || '').toLowerCase();
      if (selectedCompensation === 'token' && !compStr.includes('rm') && !compStr.includes('token') && !compStr.includes('fee')) return false;
      if (selectedCompensation === 'barter' && !compStr.includes('teh') && !compStr.includes('food') && !compStr.includes('barter')) return false;
      if (selectedCompensation === 'volunteer' && !compStr.includes('volunteer') && !compStr.includes('goodwill')) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = serv.title.toLowerCase().includes(q);
      const matchDesc = serv.description.toLowerCase().includes(q);
      const matchAuthor = serv.authorName.toLowerCase().includes(q);
      const matchPrecinct = serv.precinct.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAuthor || matchPrecinct;
    }

    return true;
  });

  // Handlers for Creating Offer Service
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim() || !offerDesc.trim()) return;

    setIsSubmitting(true);
    try {
      await createService({
        type: 'offering',
        category: offerCategory,
        title: offerTitle.trim(),
        description: offerDesc.trim(),
        priceEstimate: offerPrice.trim() || 'Free / Community Barter',
        availability: offerAvailability.trim() || 'Flexible',
        precinct: offerPrecinct,
        imageUrl: offerImages[0] || undefined,
        imageUrls: offerImages.length > 0 ? offerImages : undefined,
      });

      // Execute Section 14.A minimization choreography
      setIsMinimizing(true);
      setTimeout(() => {
        setIsOfferServiceOpen(false);
        setIsMinimizing(false);
        setIsSubmitting(false);

        // Reset inputs
        setOfferTitle('');
        setOfferDesc('');
        setOfferPrice('');
        setOfferAvailability('');
        setOfferImages([]);

        // Show Success Toast
        setSuccessToast({
          open: true,
          heading: 'Service Published Successfully',
          body: 'Your skill listing is now live in the City of Elmina community index.',
        });
      }, 300);
    } catch (err) {
      console.error('Failed to create service offering:', err);
      setIsSubmitting(false);
      setIsMinimizing(false);
    }
  };

  // Handlers for Creating Request Help
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim() || !requestDesc.trim()) return;

    setIsSubmitting(true);
    try {
      await createService({
        type: 'requesting',
        category: requestCategory,
        title: requestTitle.trim(),
        description: requestDesc.trim(),
        precinct: requestPrecinct,
        urgency: requestUrgency,
        compensationPreference: requestCompensation.trim() || 'Volunteer Goodwill',
        requestedDate: requestTiming,
        imageUrl: requestImages[0] || undefined,
        imageUrls: requestImages.length > 0 ? requestImages : undefined,
      });

      // Execute Section 14.A minimization choreography
      setIsMinimizing(true);
      setTimeout(() => {
        setIsRequestHelpOpen(false);
        setIsMinimizing(false);
        setIsSubmitting(false);

        // Reset inputs
        setRequestTitle('');
        setRequestDesc('');
        setRequestCompensation('');
        setRequestImages([]);
        setRequestUrgency('normal');

        // Show Success Toast
        setSuccessToast({
          open: true,
          heading: 'Help Request Posted Successfully',
          body: 'Nearby Elmina neighbours in your precinct have been alerted via the TESDH community mutual-aid dispatch.',
        });
      }, 300);
    } catch (err) {
      console.error('Failed to create help request:', err);
      setIsSubmitting(false);
      setIsMinimizing(false);
    }
  };

  // Handlers for Contacting Provider / Offering Help with contextual editable draft
  const handleOpenContact = (serv: LocalService) => {
    const targetAuthorId = fromDatabaseUserId(serv.authorId);
    if (serv.authorId === currentUser.id || targetAuthorId === currentUser.id) {
      setSuccessToast({
        open: true,
        heading: 'Notice',
        body: 'You cannot message yourself for your own listing.',
      });
      return;
    }

    let draft = '';
    const isBM = language === 'bm' || (language as string) === 'ms-MY';
    if (serv.type === 'offering') {
      draft = isBM
        ? `Hai, saya melihat perkhidmatan ${serv.title} anda di NADI Community Hub. Bolehkah anda kongsikan butiran lanjut mengenai ketersediaan?`
        : `Hi, I saw your ${serv.title} service on NADI Community Hub. Could you share more details about availability?`;
    } else {
      draft = isBM
        ? `Hai, saya melihat permintaan bantuan anda untuk '${serv.title}'. Saya berminat untuk membantu. Bolehkah anda kongsikan butiran lanjut?`
        : `Hi, I saw your request for help with '${serv.title}'. I'm interested in helping. Could you share more details?`;
    }

    const convId = getOrCreateConversation(
      targetAuthorId,
      serv.type === 'offering' ? `Service Inquiry: ${serv.title}` : `Mutual Aid Offer: ${serv.title}`,
      'service'
    );

    if (!convId) {
      setSuccessToast({
        open: true,
        heading: 'Unable to Message',
        body: 'Cannot open conversation with this resident.',
      });
      return;
    }

    if (detailService) setDetailService(null);
    if (contactService) setContactService(null);

    navigateToItem({
      tab: 'messages',
      conversationId: convId,
      recipientId: targetAuthorId,
      draftMessage: draft,
      contextTitle: serv.title,
      contextType: serv.type === 'offering' ? 'service' : 'request',
      contextId: serv.id,
    });
  };

  const handleSendContactMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactService) return;

    const targetAuthorId = fromDatabaseUserId(contactService.authorId);
    if (contactService.authorId === currentUser.id || targetAuthorId === currentUser.id) {
      setSuccessToast({
        open: true,
        heading: 'Notice',
        body: 'You cannot message yourself for your own listing.',
      });
      return;
    }

    const bodyWithPhone = shareWhatsapp && currentUser.phone
      ? `${contactMessage.trim()}\n\n[WhatsApp Contact Shared]: ${currentUser.phone}`
      : contactMessage.trim();

    const convId = getOrCreateConversation(
      targetAuthorId,
      contactService.type === 'offering' ? `Service Inquiry: ${contactService.title}` : `Mutual Aid Offer: ${contactService.title}`,
      'service'
    );

    if (!convId) {
      setSuccessToast({
        open: true,
        heading: 'Unable to Message',
        body: 'Cannot open conversation with this resident.',
      });
      return;
    }

    setContactService(null);
    setDetailService(null);

    navigateToItem({
      tab: 'messages',
      conversationId: convId,
      recipientId: targetAuthorId,
      draftMessage: bodyWithPhone,
      contextTitle: contactService.title,
      contextType: contactService.type === 'offering' ? 'service' : 'request',
      contextId: contactService.id,
    });
  };

  // Category Icon helper
  const getCategoryIcon = (cat: ServiceCategory) => {
    switch (cat) {
      case 'home_services': return <Wrench className="w-4 h-4 text-[#9E1315]" />;
      case 'tutoring': return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case 'gardening': return <Scissors className="w-4 h-4 text-emerald-600" />;
      case 'cleaning': return <Sparkles className="w-4 h-4 text-cyan-600" />;
      case 'moving': return <Truck className="w-4 h-4 text-amber-600" />;
      case 'tech_help': return <Laptop className="w-4 h-4 text-purple-600" />;
      case 'childcare': return <Baby className="w-4 h-4 text-pink-600" />;
      default: return <Wrench className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryLabel = (cat: ServiceCategory) => {
    switch (cat) {
      case 'home_services': return 'Home Repairs';
      case 'tutoring': return 'Tutoring & Education';
      case 'gardening': return 'Gardening & Lawn';
      case 'cleaning': return 'Cleaning & Wash';
      case 'moving': return 'Heavy Lifting & Moving';
      case 'tech_help': return 'Smart Home & Tech';
      case 'childcare': return 'Babysitting & Childcare';
      default: return 'Errands & General';
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#F8F9FA] dark:bg-[#0F1113] relative">
      {/* ========================================================================= */}
      {/* MOBILE PHONE SECTION: Google Stitch Mobile Local Service                  */}
      {/* ========================================================================= */}
      <div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {/* Header Title & Context Action Button */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Local Services
          </h1>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'services') {
                setIsOfferServiceOpen(true);
              } else {
                setIsRequestHelpOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{activeTab === 'services' ? '+ Offer Service' : '+ Request Help'}</span>
          </button>
        </div>

        {/* Segmented Control Switcher */}
        <div className="p-1 bg-slate-200/80 dark:bg-slate-800 rounded-full flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTabState('services')}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs text-center transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-white dark:bg-slate-900 text-[#9E1315] dark:text-rose-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Find Services ({services.filter((s) => s.type === 'offering').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTabState('requests')}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs text-center transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-[#9E1315] dark:text-rose-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Community Requests ({services.filter((s) => s.type === 'requesting').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handyman, gardening, tutor..."
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal Scroll) */}
        <div className="py-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 -mx-4 px-4 select-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-transform ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'home_services' ? 'all' : 'home_services')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'home_services'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Home Repair
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'tech_help' ? 'all' : 'tech_help')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'tech_help'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Electrical
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'gardening' ? 'all' : 'gardening')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'gardening'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Gardening
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'childcare' ? 'all' : 'childcare')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'childcare'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Pet Care
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'tutoring' ? 'all' : 'tutoring')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'tutoring'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Tutoring
          </button>
        </div>

        {/* Results Count */}
        <div className="py-1 text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredServices.length} resident services in Elmina Valley, Gardens &amp; Central
        </div>

        {/* Primary Services Cards Feed */}
        <div className="space-y-3 pb-20">
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No services found matching this category.
            </div>
          ) : (
            filteredServices.map((serv) => (
              <article
                key={serv.id}
                className="bg-white dark:bg-[#15181C] rounded-xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-inner">
                        {serv.imageUrl ? (
                          <img src={serv.imageUrl} alt={serv.authorName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{serv.authorName.charAt(0)}</span>
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 bg-[#9E1315] text-white rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[10px]">verified</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{serv.authorName}</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-[#9E1315] dark:text-rose-400 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                          Resident
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-xs text-[#9E1315]">near_me</span>
                        {serv.precinct}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-[#9E1315] dark:text-rose-400 leading-tight">
                      {serv.priceEstimate || 'Free / Barter'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {serv.availability || 'Available today'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                    {serv.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {serv.description}
                  </p>
                </div>

                {/* Trust Bar & Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">4.9</span>
                    <span className="text-[11px] text-slate-400">(24 reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenDetail(serv, e.currentTarget)}
                      className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold active:scale-95 transition-transform"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenContact(serv)}
                      className="h-8 px-3 rounded-lg bg-[#9E1315] hover:bg-[#841012] text-white text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-xs">chat_bubble</span>
                      Book / Message
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP / TABLET SECTION (>= 768px): Preserved 100% Unchanged            */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Synchronized Collapsing Header Outer Wrapper */}
      <div 
        ref={headerWrapperRef}
        style={headerWrapperStyle}
        className="header-collapse-wrapper shrink-0 w-full overflow-hidden transition-none"
      >
        <header 
          ref={headerInnerRef}
          style={headerInnerStyle}
          className="header-collapse-inner w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md px-4 sm:px-6 py-4 shadow-xs motion-reduce:transition-none"
        >
          <div className="w-full max-w-6xl mx-auto space-y-3">
          {/* Header Section with Contextual Primary Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Local Services &amp; Mutual Aid
              </h1>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'services') {
                    setIsOfferServiceOpen(true);
                  } else {
                    setIsRequestHelpOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{activeTab === 'services' ? '+ Offer a Service' : '+ Post a Request'}</span>
              </button>
            </div>
          </div>

          {/* Primary Segmented View Switcher */}
          <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border border-slate-200/60 dark:border-slate-700/60">
            <div role="tablist" aria-label="Services and mutual aid navigation" className="flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'services'}
                onClick={() => setActiveTabState('services')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'services'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4 text-[#9E1315] dark:text-rose-400" aria-hidden="true" />
                <span>Find Services</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                  {offeringServices.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'requests'}
                onClick={() => setActiveTabState('requests')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <HeartHandshake className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Requests for Help</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-semibold text-[11px]">
                  {requestingServices.length} Needs
                </span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-medium px-3">
              <Lock className="w-3.5 h-3.5 text-[#9E1315] dark:text-rose-400" aria-hidden="true" />
              <span>Zero-Knowledge Masked Addresses Enabled</span>
            </div>
          </div>

          {/* Search & Multi-Tier Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  aria-label={activeTab === 'services' ? 'Search local services in Elmina' : 'Search mutual aid requests in Elmina'}
                  placeholder={
                    activeTab === 'services'
                      ? 'Search services, skills, or maintenance in Elmina...'
                      : 'Search mutual-aid requests, IKEA assembly, jump starts...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#9E1315] transition-all"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {/* Precinct Select */}
                <select
                  value={selectedPrecinct}
                  onChange={(e) => setSelectedPrecinct(e.target.value)}
                  aria-label="Filter by precinct"
                  className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] cursor-pointer"
                >
                  <option value="all">All Precincts</option>
                  <option value="Valley">Elmina Valley 1-5</option>
                  <option value="Gardens">Elmina Gardens 1-4</option>
                  <option value="Ilham">Ilham Residence</option>
                  <option value="Ridge">Elmina Ridge</option>
                  <option value="Central">Elmina Central</option>
                </select>

                {/* Tab-Specific Secondary Filter */}
                {activeTab === 'services' ? (
                  <select
                    value={selectedPricing}
                    onChange={(e) => setSelectedPricing(e.target.value)}
                    aria-label="Filter by pricing"
                    className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] cursor-pointer"
                  >
                    <option value="all">Any Pricing</option>
                    <option value="free">Free / Community Advice</option>
                    <option value="under50">Under RM 50</option>
                  </select>
                ) : (
                  <>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      aria-label="Filter by request status"
                      className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open Needs</option>
                      <option value="urgent">Urgent Priority</option>
                      <option value="in_progress">In Progress</option>
                      <option value="fulfilled">Fulfilled</option>
                    </select>

                    <select
                      value={selectedCompensation}
                      onChange={(e) => setSelectedCompensation(e.target.value)}
                      aria-label="Filter by compensation preference"
                      className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] cursor-pointer"
                    >
                      <option value="all">All Compensation</option>
                      <option value="token">Neighbor Token / Fee</option>
                      <option value="barter">Food &amp; Hospitality</option>
                      <option value="volunteer">Volunteer Goodwill</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Category Pill Horizontal Scroller */}
            <div role="group" aria-label="Filter by service category" className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'home_services', label: 'Home Repairs' },
                { id: 'tutoring', label: 'Tutoring & Education' },
                { id: 'gardening', label: 'Gardening & Lawn' },
                { id: 'cleaning', label: 'Cleaning & Wash' },
                { id: 'moving', label: 'Heavy Lifting & Moving' },
                { id: 'tech_help', label: 'Smart Home & Tech' },
                { id: 'childcare', label: 'Babysitting & Childcare' },
                { id: 'other', label: 'Errands & Urgent' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Active Summary Status */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Showing {filteredServices.length} {activeTab === 'services' ? 'resident services' : 'mutual-aid needs'} in Elmina Valley, Gardens &amp; Central
              </span>
              <div className="flex items-center gap-1.5">
                <span>Sort:</span>
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'nearest' ? 'newest' : 'nearest')}
                  className="font-bold text-[#9E1315] dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {sortBy === 'nearest' ? 'Nearest First' : 'Newest First'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      </div>

      {/* Main Content Scroll Container */}
      <div 
        ref={scrollContainerRef}
        id="services-scroll-container" 
        onScroll={handleScroll} 
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ overflowAnchor: 'none' }}
      >

      {/* Feeds Area */}
      <div className="px-4 sm:px-6 py-5">
        <div className="w-full max-w-6xl mx-auto space-y-4">
          {/* ==================== TAB 1: FIND SERVICES ==================== */}
          {activeTab === 'services' && (
        <div className="space-y-4">
          {filteredServices.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
              <Wrench className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No services match your filters</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Offer your unique skills to fellow neighbours and strengthen our Bandar Elmina network!
              </p>
              <button
                onClick={() => setIsOfferServiceOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-[#9E1315] text-white text-xs font-bold shadow-sm hover:bg-[#841012] cursor-pointer"
              >
                + Offer a Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((serv) => {
                const isAuthor = serv.authorId === currentUser.id;

                return (
                  <article
                    key={serv.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      handleOpenDetail(serv, e.currentTarget);
                    }}
                    className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {getCategoryIcon(serv.category)}
                          <span>{getCategoryLabel(serv.category)}</span>
                        </span>
                        <span className="text-base font-bold text-[#9E1315] dark:text-rose-400">
                          {serv.priceEstimate || 'Free / Barter'}
                        </span>
                      </div>

                      {serv.imageUrl && (
                        <div 
                          className="rounded-xl overflow-hidden h-36 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 relative group/img cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(serv, e.currentTarget);
                          }}
                        >
                          <img
                            src={serv.imageUrl}
                            alt={serv.title}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div>
                        <h3 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(serv, e.currentTarget);
                          }}
                          className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#9E1315] dark:group-hover:text-rose-400 transition-colors leading-snug cursor-pointer"
                        >
                          {serv.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {serv.description}
                        </p>
                      </div>

                      {/* Provider Credential Box */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {serv.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {serv.authorName}
                              </span>
                              {serv.authorVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {serv.precinct}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{serv.rating || '4.9'}</span>
                            <span className="text-slate-400 font-normal">({serv.reviewCount || 24})</span>
                          </div>
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold mt-0.5">
                            {serv.availability || 'Available Today'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={(e) => handleOpenDetail(serv, e.currentTarget)}
                        className="flex-1 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        View Details
                      </button>

                      {isAuthor ? (
                        <button
                          onClick={() => deleteService(serv.id)}
                          className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Delete My Service Listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenContact(serv)}
                          className="w-9 h-9 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white flex items-center justify-center transition-all cursor-pointer"
                          title="Message Provider"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: REQUESTS FOR HELP ==================== */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Civic Mutual-Aid Trust Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                  Civic Mutual-Aid Network
                </h2>
                <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed mt-0.5">
                  Zero-commission neighbor-to-neighbor assistance. House numbers remain cryptographically private until both parties accept an offer.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsRequestHelpOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post a Request</span>
            </button>
          </div>

          {filteredServices.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
              <HeartHandshake className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No assistance requests found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Need a tool, heavy lifting help, or a quick car boost? Ask your friendly Elmina neighbours!
              </p>
              <button
                onClick={() => setIsRequestHelpOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-[#9E1315] text-white text-xs font-bold shadow-sm hover:bg-[#841012] cursor-pointer"
              >
                Post a Request for Help
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((serv) => {
                const isAuthor = serv.authorId === currentUser.id;
                const status = serv.status || 'open';
                const isUrgent = serv.urgency === 'urgent';

                return (
                  <article
                    key={serv.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      handleOpenDetail(serv, e.currentTarget);
                    }}
                    className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all space-y-4 cursor-pointer ${
                      status === 'fulfilled' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {serv.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                              {serv.authorName}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                              {serv.precinct}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {serv.requestedDate || 'Required this week'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isUrgent && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[11px] font-bold animate-pulse">
                            Urgent
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          status === 'open'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : status === 'in_progress'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {status === 'open' ? 'Open' : status === 'in_progress' ? 'In Progress' : 'Fulfilled'}
                        </span>
                        {serv.compensationPreference && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
                            {serv.compensationPreference}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(serv, e.currentTarget);
                        }}
                        className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#9E1315] dark:group-hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        {serv.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {serv.description}
                      </p>
                    </div>

                    {/* Attached Photo Thumbnail */}
                    {serv.imageUrl && (
                      <div 
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(serv, e.currentTarget);
                        }}
                      >
                        <img
                          src={serv.imageUrl}
                          alt={serv.title}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            Attached Photo Reference
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {serv.category === 'moving' ? 'Heavy lift specification' : 'Provided work context'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{serv.requestedDate || 'Flexible schedule'}</span>
                      </div>

                      {isAuthor ? (
                        <button
                          onClick={() => deleteService(serv.id)}
                          className="h-8 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Close Request</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleOpenDetail(serv, e.currentTarget)}
                            className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenContact(serv)}
                            disabled={status === 'fulfilled'}
                            className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                              status === 'fulfilled'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-[#9E1315] hover:bg-[#841012] text-white'
                            }`}
                          >
                            <HeartHandshake className="w-4 h-4" />
                            <span>Offer Help</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  </div>
  </div>

      {/* ==================== MODAL 1: OFFER A SERVICE ==================== */}
      {isOfferServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOfferServiceOpen(false)}
          />

          <div
            className={`relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col min-h-0 overflow-hidden transition-all ${
              isMinimizing ? 'modal-minimize-out' : 'animate-in fade-in zoom-in-95 duration-200'
            }`}
          >
            {/* Pinned Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#9E1315] text-white flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Offer a Service to Neighbours
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOfferServiceOpen(false)}
                aria-label="Close offer service dialog"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Form with Internally Scrollable Body and Pinned Footer */}
            <form onSubmit={handleOfferSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grass Trimming, Aircon Servicing, Home Tutoring..."
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={offerCategory}
                    onChange={(e) => setOfferCategory(e.target.value as ServiceCategory)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="home_services">Home Repairs</option>
                    <option value="gardening">Gardening & Lawn</option>
                    <option value="tutoring">Tutoring & Education</option>
                    <option value="tech_help">Smart Home & Tech</option>
                    <option value="childcare">Babysitting & Childcare</option>
                    <option value="cleaning">Cleaning & Wash</option>
                    <option value="moving">Heavy Lifting & Moving</option>
                    <option value="other">Other Skills</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rate / Pricing Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RM 50/hr or Free Advice"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Precinct Location</label>
                  <select
                    value={offerPrecinct}
                    onChange={(e) => setOfferPrecinct(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="Elmina Valley 1">Elmina Valley 1</option>
                    <option value="Elmina Valley 2">Elmina Valley 2</option>
                    <option value="Elmina Valley 3">Elmina Valley 3</option>
                    <option value="Elmina Valley 4">Elmina Valley 4</option>
                    <option value="Elmina Valley 5">Elmina Valley 5</option>
                    <option value="Elmina Gardens 1">Elmina Gardens 1</option>
                    <option value="Elmina Gardens 2">Elmina Gardens 2</option>
                    <option value="Ilham Residence">Ilham Residence</option>
                    <option value="Elmina Ridge">Elmina Ridge</option>
                    <option value="Entire Bandar Elmina">Entire Bandar Elmina</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Availability Window</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekday evenings, Sat & Sun"
                    value={offerAvailability}
                    onChange={(e) => setOfferAvailability(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description & Scope of Work</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline your experience, equipment used, and service boundaries within Elmina..."
                  value={offerDesc}
                  onChange={(e) => setOfferDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Photos & Portfolio (Attach Multiple)
                </label>
                <ImageUploadArea
                  bucket="community-media"
                  folder="services"
                  multiple={true}
                  maxFiles={5}
                  currentUrls={offerImages}
                  onUploadComplete={(urls) => setOfferImages(urls)}
                  onRemove={(idx) => setOfferImages((prev) => prev.filter((_, i) => i !== idx))}
                  helperText="Upload photos (JPEG, PNG, WebP up to 10MB each) showing past work or equipment"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 flex items-start gap-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#9E1315] dark:text-rose-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Resident Trust Policy:</strong> Only verified homeowners or tenants with registered TESDH accounts can list services in the Elmina directory.
                </p>
              </div>

              </div>

              {/* Pinned Modal Footer */}
              <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOfferServiceOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Service Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: REQUEST HELP ==================== */}
      {isRequestHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsRequestHelpOpen(false)}
          />

          <div
            className={`relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col min-h-0 overflow-hidden transition-all ${
              isMinimizing ? 'modal-minimize-out' : 'animate-in fade-in zoom-in-95 duration-200'
            }`}
          >
            {/* Pinned Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Post a Request for Help
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestHelpOpen(false)}
                aria-label="Close request help dialog"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Form with Internally Scrollable Body and Pinned Footer */}
            <form onSubmit={handleRequestSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  What do you need assistance with?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Need ladder to clean gutter, Help moving heavy sofa..."
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={requestCategory}
                    onChange={(e) => setRequestCategory(e.target.value as ServiceCategory)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="moving">Heavy Lifting & Moving</option>
                    <option value="home_services">Home Repairs</option>
                    <option value="gardening">Gardening & Lawn</option>
                    <option value="tutoring">Tutoring & Study</option>
                    <option value="tech_help">Tech & Wi-Fi</option>
                    <option value="other">Errands & Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Precinct Location</label>
                  <select
                    value={requestPrecinct}
                    onChange={(e) => setRequestPrecinct(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="Elmina Valley 1">Elmina Valley 1</option>
                    <option value="Elmina Valley 2">Elmina Valley 2</option>
                    <option value="Elmina Valley 3">Elmina Valley 3</option>
                    <option value="Elmina Valley 4">Elmina Valley 4</option>
                    <option value="Elmina Valley 5">Elmina Valley 5</option>
                    <option value="Elmina Gardens 1">Elmina Gardens 1</option>
                    <option value="Elmina Gardens 2">Elmina Gardens 2</option>
                    <option value="Ilham Residence">Ilham Residence</option>
                    <option value="Elmina Ridge">Elmina Ridge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide helpful details (measurements, timing constraints, what tools are provided)..."
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Timing</label>
                  <select
                    value={requestTiming}
                    onChange={(e) => setRequestTiming(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="Urgent (Within 2-4 hours)">Urgent (Within 2-4 hours)</option>
                    <option value="Today Afternoon / Evening">Today Afternoon / Evening</option>
                    <option value="This Weekend (Flexible)">This Weekend (Flexible)</option>
                    <option value="Next Week">Next Week</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Neighbor Token / Compensation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RM 50 Token or Teh Tarik & Curry Puffs"
                    value={requestCompensation}
                    onChange={(e) => setRequestCompensation(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priority Level</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestUrgency('normal')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      requestUrgency === 'normal'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Standard Community Need
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestUrgency('urgent')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      requestUrgency === 'urgent'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ⚡ Urgent Priority
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attached Photos (Optional)
                </label>
                <ImageUploadArea
                  bucket="community-media"
                  folder="requests"
                  multiple={true}
                  maxFiles={3}
                  currentUrls={requestImages}
                  onUploadComplete={(urls) => setRequestImages(urls)}
                  onRemove={(idx) => setRequestImages((prev) => prev.filter((_, i) => i !== idx))}
                  helperText="Upload photos showing the item, furniture, or situation needing assistance"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 flex items-start gap-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <Lock className="w-4 h-4 text-[#9E1315] dark:text-rose-400 shrink-0 mt-0.5" />
                <p>
                  <strong>ZK Privacy Active:</strong> Your exact street address and unit number are obscured on the community feed. Details are only disclosed to the specific neighbour whose offer you accept.
                </p>
              </div>
            </div>

            {/* Pinned Bottom Footer */}
            <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRequestHelpOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Help Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* ==================== MODAL 3: SERVICE DETAIL DOSSIER ==================== */}
      {displayedDetailService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className={`fixed inset-0 bg-black/60 backdrop-blur-xs services-window-backdrop ${
                isDetailClosing ? 'services-window-backdrop-closing' : ''
              }`}
              onClick={() => handleCloseDetail()}
            />

            <div 
              key={`${displayedDetailService.id}-${detailSessionId}`}
              aria-label="Service Details Dossier"
              role="dialog"
              aria-modal="true"
              className={`relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col min-h-0 overflow-hidden services-window-panel ${
                isDetailClosing ? 'services-window-panel-closing' : 'services-window-panel-open'
              }`}
            >
              {/* Pinned Header */}
              <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {getCategoryLabel(displayedDetailService.category)}
                  {displayedDetailService.type === 'requesting' ? ' • Mutual Aid Request' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => handleCloseDetail()}
                  aria-label="Close service details dialog"
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Internally Scrollable Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                    {displayedDetailService.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[#9E1315] dark:text-rose-400 text-lg font-bold">
                    {displayedDetailService.type === 'requesting'
                      ? displayedDetailService.compensationPreference || 'Community Mutual Aid (Non-profit)'
                      : displayedDetailService.priceEstimate || 'Free Advice / Community Exchange'}
                  </div>
                </div>

                {/* Photo if present */}
                {displayedDetailService.imageUrl && (
                  <div className="rounded-2xl overflow-hidden h-52 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 relative">
                    <img
                      src={displayedDetailService.imageUrl}
                      alt={displayedDetailService.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Provider / Requester Credential Block */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold flex items-center justify-center text-sm">
                      {displayedDetailService.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {displayedDetailService.authorName}
                        </span>
                        {displayedDetailService.authorVerified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {displayedDetailService.precinct} • Verified Resident
                      </div>
                      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-xs mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{displayedDetailService.rating || '4.9'} ({displayedDetailService.reviewCount || 24} resident reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* About This Service / Request */}
                <div className="space-y-2 text-xs sm:text-sm">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    {displayedDetailService.type === 'requesting' ? 'Request Details & Context' : 'About This Service'}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {displayedDetailService.description}
                  </p>
                  <ul className="text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-5 pt-1 text-xs">
                    <li>Prompt neighborhood communication via Secure Messages</li>
                    <li>Equipment & tools prepared and sanitized for resident safety</li>
                    <li>On-site serving exclusively within verified Elmina boundaries</li>
                  </ul>
                </div>

                {/* Recent Neighbour Endorsements */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Neighbour Endorsements
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Resident Neighbour</span>
                      <span className="text-[11px] text-slate-400">Verified Review</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      &ldquo;Prompt response and high-quality assistance. Highly recommend to anyone living in the township!&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Pinned Bottom Actions */}
              <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleCloseDetail()}
                  className="h-10 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-all cursor-pointer text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseDetail(true);
                    handleOpenContact(displayedDetailService);
                  }}
                  className="h-10 px-5 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer text-xs"
                >
                  {displayedDetailService.type === 'requesting' ? (
                    <>
                      <HeartHandshake className="w-4 h-4" />
                      <span>Offer Help via Secure Messages</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Send Inquiry via TESDH</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ==================== MODAL 4: CONTACT / OFFER HELP ==================== */}
      {contactService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setContactService(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col min-h-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Pinned Header */}
            <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#9E1315] dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {contactService.type === 'offering' ? 'Inquire with Provider' : 'Offer Neighbourly Assistance'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setContactService(null)}
                aria-label="Close message provider dialog"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSendContactMessage} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 space-y-1 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {contactService.authorName} ({contactService.precinct})
                  </div>
                  <div className="text-[#9E1315] dark:text-rose-400 truncate font-semibold">
                    Regarding: {contactService.title}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your message to neighbor
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Introduce yourself, discuss timing, and arrange details securely..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="share-phone-check"
                    checked={shareWhatsapp}
                    onChange={(e) => setShareWhatsapp(e.target.checked)}
                    className="rounded text-[#9E1315] focus:ring-[#9E1315] border-slate-300"
                  />
                  <label htmlFor="share-phone-check" className="text-slate-600 dark:text-slate-400 cursor-pointer text-xs">
                    Include my verified contact number if offer is accepted
                  </label>
                </div>
              </div>

              {/* Pinned Bottom Actions */}
              <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setContactService(null)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-bold shadow-sm transition-all cursor-pointer"
                >
                  Send Private Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      <SuccessToast
        open={successToast.open}
        heading={successToast.heading}
        body={successToast.body}
        onClose={() => setSuccessToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
