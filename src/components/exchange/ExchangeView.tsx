'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { CircularExchangeItem, ExchangeCategory, ExchangeType, ItemCondition } from '@/types';
import { 
  Repeat, 
  Plus, 
  Search, 
  MapPin, 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  MessageCircle, 
  PackageCheck, 
  Image as ImageIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Star, 
  Lock, 
  RotateCcw, 
  Heart, 
  Trash2, 
  Eye, 
  CheckCircle2,
  Armchair,
  Tv,
  UtensilsCrossed,
  Shirt,
  BookOpen,
  Baby,
  Bike,
  Package,
  Sparkles,
  Wand2,
  Lightbulb,
  Loader2
} from 'lucide-react';
import ImageUploadArea from '@/components/common/ImageUploadArea';
import SuccessToast from '@/components/common/SuccessToast';
import TimeAgo from '@/components/common/TimeAgo';
import { useScrollHeader } from '@/lib/hooks/useScrollHeader';
import { fromDatabaseUserId } from '@/lib/utils/idMapping';

export default function ExchangeView() {
  const { 
    exchangeItems, 
    createExchangeItem, 
    reserveExchangeItem, 
    completeExchangeItem,
    deleteExchangeItem,
    getOrCreateConversation,
    startConversation,
    navigateToItem,
    setActiveTab,
    language,
    t, 
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'Free' | 'Exchange'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<CircularExchangeItem | null>(null);
  const [displayedDrawerItem, setDisplayedDrawerItem] = useState<CircularExchangeItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [drawerSessionId, setDrawerSessionId] = useState(0);
  const drawerCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTriggerElementRef = useRef<HTMLElement | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
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

  // Create Listing Form State
  const [newType, setNewType] = useState<ExchangeType>('giveaway');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ExchangeCategory>('furniture');
  const [newCondition, setNewCondition] = useState<ItemCondition>('like_new');
  const [newSeekingItem, setNewSeekingItem] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrecinct, setNewPrecinct] = useState('Elmina Valley 3');
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);

  // AI Listing Assistant State
  const [assistLoading, setAssistLoading] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<{
    type: 'title' | 'category' | 'description';
    text: string;
    category?: ExchangeCategory;
  } | null>(null);

  const handleRunAiAssist = async (action: 'suggest_category' | 'suggest_title' | 'improve_description') => {
    setAssistLoading(action);
    setActiveSuggestion(null);

    try {
      const res = await fetch('/api/ai/exchange-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action,
          title: newTitle,
          description: newDesc,
          category: newCategory,
          listingType: newType,
        }),
      });

      if (!res.ok) {
        throw new Error('AI Assist request failed');
      }

      const data = await res.json();
      if (action === 'suggest_category' && data.suggestedCategory) {
        setActiveSuggestion({
          type: 'category',
          text: data.suggestion,
          category: data.suggestedCategory,
        });
      } else if (action === 'suggest_title' && data.suggestion) {
        setActiveSuggestion({
          type: 'title',
          text: data.suggestion,
        });
      } else if (action === 'improve_description' && data.suggestion) {
        setActiveSuggestion({
          type: 'description',
          text: data.suggestion,
        });
      }
    } catch (err) {
      console.warn('AI Assist error, falling back locally:', err);
      // Local fallback
      if (action === 'suggest_category') {
        const text = `${newTitle} ${newDesc}`.toLowerCase();
        let cat: ExchangeCategory = 'others';
        if (/chair|kerusi|table|meja|desk|sofa|bookshelf|furniture|perabot/i.test(text)) cat = 'furniture';
        else if (/baby|toddler|stroller|crib|kereta sorong/i.test(text)) cat = 'baby_kids';
        else if (/plant|pokok|bunga|garden/i.test(text)) cat = 'plants_garden';
        else if (/book|buku|study/i.test(text)) cat = 'books_study';
        else if (/bicycle|basikal|sports/i.test(text)) cat = 'sports_leisure';
        else if (/fridge|oven|kettle|blender|microwave/i.test(text)) cat = 'appliances';
        setActiveSuggestion({ type: 'category', text: cat, category: cat });
      } else if (action === 'suggest_title') {
        const title = newDesc ? newDesc.split(/[.\n]/)[0].slice(0, 45) : 'Preloved Household Item';
        setActiveSuggestion({ type: 'title', text: title });
      } else {
        const refined = newDesc ? `${newDesc.trim()} Convenient porch handover or self-pickup in Elmina precinct.` : 'Preloved item in good functional condition. Free for neighbours in Elmina. Self-pickup preferred.';
        setActiveSuggestion({ type: 'description', text: refined });
      }
    } finally {
      setAssistLoading(null);
    }
  };

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    if (activeSuggestion.type === 'title') {
      setNewTitle(activeSuggestion.text);
    } else if (activeSuggestion.type === 'category' && activeSuggestion.category) {
      setNewCategory(activeSuggestion.category);
    } else if (activeSuggestion.type === 'description') {
      setNewDesc(activeSuggestion.text);
    }
    setActiveSuggestion(null);
  };

  // Open Drawer with smooth horizontal slide from right (translateX 100% -> 0)
  const handleOpenDrawer = useCallback((item: CircularExchangeItem, triggerEl?: HTMLElement | null) => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
      drawerCloseTimeoutRef.current = null;
    }

    if (triggerEl) {
      lastTriggerElementRef.current = triggerEl;
    } else if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      lastTriggerElementRef.current = document.activeElement;
    }

    setDisplayedDrawerItem(item);
    setSelectedDrawerItem(item);
    setActivePhotoIndex(0);
    setIsDrawerClosing(false);
    setIsDrawerOpen(true);
    setDrawerSessionId((prev) => prev + 1);
  }, []);

  // Close Drawer with reverse horizontal slide to right (translateX 0 -> 100%)
  const handleCloseDrawer = useCallback((immediate = false) => {
    if (immediate) {
      if (drawerCloseTimeoutRef.current) {
        clearTimeout(drawerCloseTimeoutRef.current);
        drawerCloseTimeoutRef.current = null;
      }
      setIsDrawerOpen(false);
      setIsDrawerClosing(false);
      setDisplayedDrawerItem(null);
      setSelectedDrawerItem(null);
      lastTriggerElementRef.current?.focus();
      return;
    }

    if (!displayedDrawerItem || isDrawerClosing) return;

    setIsDrawerOpen(false);
    setIsDrawerClosing(true);

    drawerCloseTimeoutRef.current = setTimeout(() => {
      setDisplayedDrawerItem(null);
      setSelectedDrawerItem(null);
      setIsDrawerClosing(false);
      lastTriggerElementRef.current?.focus();
      drawerCloseTimeoutRef.current = null;
    }, 210);
  }, [displayedDrawerItem, isDrawerClosing]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (drawerCloseTimeoutRef.current) {
        clearTimeout(drawerCloseTimeoutRef.current);
      }
    };
  }, []);

  // Lock background scroll when modal or drawer is open
  useEffect(() => {
    const isOpen = isCreateOpen || !!displayedDrawerItem;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateOpen) setIsCreateOpen(false);
        if (displayedDrawerItem) handleCloseDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateOpen, displayedDrawerItem, handleCloseDrawer]);

  // Reset Filters
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTypeFilter('all');
    setSelectedCategory('all');
    setSelectedCondition('all');
    setSelectedAvailability('all');
  }, []);

  // Deep Navigation Listener for Global Search
  useEffect(() => {
    if (!navigationTarget || navigationTarget.tab !== 'exchange') return;
    let timer: NodeJS.Timeout | null = null;
    if (navigationTarget.itemId) {
      const item = exchangeItems.find((i) => i.id === navigationTarget.itemId);
      if (item) {
        timer = setTimeout(() => {
          handleResetFilters();
          handleOpenDrawer(item);
          clearNavigationTarget();
        }, 0);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [navigationTarget, exchangeItems, clearNavigationTarget, handleResetFilters, handleOpenDrawer]);

  // Filter Items
  const filteredItems = exchangeItems.filter((item) => {
    // Mode Filter (Free / Giveaway vs Exchange)
    if (selectedTypeFilter === 'Free') {
      if (item.listingType !== 'giveaway') return false;
    } else if (selectedTypeFilter === 'Exchange') {
      if (item.listingType !== 'exchange') return false;
    }

    // Category Filter: Treat 'all' / 'All' (or empty/undefined/whitespace) as special unrestricted filter
    const isAllCategory = !selectedCategory || !selectedCategory.trim() || selectedCategory.toLowerCase().trim() === 'all';
    if (!isAllCategory) {
      const catMap: Record<string, string[]> = {
        'furniture': ['furniture'],
        'electronics': ['electronics', 'appliances'],
        'home & kitchen': ['appliances', 'home_decor', 'plants_garden'],
        'clothing': ['clothing', 'fashion'],
        'books': ['books_study', 'books'],
        'baby items': ['baby_kids'],
        'sports & outdoor': ['sports_leisure'],
        'other': ['others', 'other'],
      };
      const normalizedSelected = selectedCategory.toLowerCase().trim();
      const allowedCategories = catMap[normalizedSelected] || [normalizedSelected];
      const itemCat = (item.category || '').toLowerCase().trim();
      if (!allowedCategories.includes(itemCat)) return false;
    }

    // Condition Filter
    if (selectedCondition !== 'all') {
      const condMap: Record<string, ItemCondition[]> = {
        'New': ['brand_new'],
        'Like New': ['like_new'],
        'Good': ['good'],
        'Fair': ['fair'],
      };
      const allowed = condMap[selectedCondition] || [];
      if (!allowed.includes(item.condition)) return false;
    }

    // Availability Filter
    if (selectedAvailability !== 'all') {
      if (selectedAvailability === 'Available Now' && item.status !== 'available') return false;
      if (selectedAvailability === 'Reserved' && item.status !== 'reserved') return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchPrecinct = item.precinct.toLowerCase().includes(q);
      const matchAuthor = item.authorName.toLowerCase().includes(q);
      const matchSeeking = (item.seekingItem || '').toLowerCase().includes(q);
      return matchTitle || matchDesc || matchPrecinct || matchAuthor || matchSeeking;
    }

    return true;
  });

  // Create Listing Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsSubmitting(true);
    const primaryImg = newImageUrls[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800';

    try {
      await createExchangeItem({
        listingType: newType,
        category: newCategory,
        title: newTitle.trim(),
        description: newDesc.trim(),
        condition: newCondition,
        imageUrl: primaryImg,
        imageUrls: newImageUrls.length > 0 ? newImageUrls : [primaryImg],
        precinct: newPrecinct,
        seekingItem: newType === 'exchange' ? newSeekingItem.trim() || 'Open to community trades' : 'Free neighbourhood gift • Porch pickup',
      });

      // Execute Section 14.A minimization choreography
      setIsMinimizing(true);
      setTimeout(() => {
        setIsCreateOpen(false);
        setIsMinimizing(false);
        setIsSubmitting(false);

        // Reset form
        setNewTitle('');
        setNewDesc('');
        setNewSeekingItem('');
        setNewImageUrls([]);
        setNewType('giveaway');

        // Show Success Toast
        setSuccessToast({
          open: true,
          heading: 'Listing Published Successfully',
          body: 'Your item has been broadcast to verified Elmina neighbours.',
        });
      }, 300);
    } catch (err) {
      console.error('Failed to create exchange listing:', err);
      setIsSubmitting(false);
      setIsMinimizing(false);
    }
  };

  // Contact Owner via Secure Messages with contextual editable draft
  const handleContactOwner = (item: CircularExchangeItem) => {
    const targetAuthorId = fromDatabaseUserId(item.authorId);
    if (item.authorId === currentUser.id || targetAuthorId === currentUser.id) {
      setSuccessToast({
        open: true,
        heading: 'Notice',
        body: 'You cannot send an inquiry for your own listing.',
      });
      return;
    }

    if (item.status === 'available') {
      reserveExchangeItem(item.id);
    }

    const isFree = item.listingType === 'giveaway';
    let draft = '';
    if (language === 'bm' || (language as string) === 'ms-MY') {
      draft = isFree
        ? `Hai, saya berminat dengan barang pemberian percuma '${item.title}'. Adakah ia masih boleh diambil?`
        : `Hai, saya berminat dengan barang anda '${item.title}'. Adakah ia masih ada?`;
    } else {
      draft = isFree
        ? `Hi, I'm interested in your giveaway '${item.title}'. Is it still available for collection?`
        : `Hi, I'm interested in your listing '${item.title}'. Is it still available?`;
    }

    const convId = getOrCreateConversation(
      targetAuthorId,
      `Exchange Inquiry: ${item.title}`,
      'exchange'
    );

    if (!convId) {
      setSuccessToast({
        open: true,
        heading: 'Unable to Message',
        body: 'Cannot open conversation with this listing owner.',
      });
      return;
    }

    handleCloseDrawer(true);
    navigateToItem({
      tab: 'messages',
      conversationId: convId,
      recipientId: targetAuthorId,
      draftMessage: draft,
      contextTitle: item.title,
      contextType: 'exchange',
      contextId: item.id,
    });
  };

  // Helper Labels & Icons
  const getConditionBadge = (cond: ItemCondition) => {
    switch (cond) {
      case 'brand_new': return 'New';
      case 'like_new': return 'Like New';
      case 'good': return 'Good';
      default: return 'Fair';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'furniture': return <Armchair className="w-3.5 h-3.5 text-slate-400" />;
      case 'appliances':
      case 'electronics': return <Tv className="w-3.5 h-3.5 text-slate-400" />;
      case 'baby_kids': return <Baby className="w-3.5 h-3.5 text-slate-400" />;
      case 'books_study': return <BookOpen className="w-3.5 h-3.5 text-slate-400" />;
      case 'clothing': return <Shirt className="w-3.5 h-3.5 text-slate-400" />;
      case 'sports_leisure': return <Bike className="w-3.5 h-3.5 text-slate-400" />;
      case 'home_decor':
      case 'plants_garden': return <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />;
      default: return <Package className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'furniture': return 'Furniture';
      case 'appliances': return 'Home & Kitchen';
      case 'baby_kids': return 'Baby Items';
      case 'books_study': return 'Books';
      case 'clothing': return 'Clothing';
      case 'sports_leisure': return 'Sports & Outdoor';
      case 'plants_garden': return 'Plants & Garden';
      default: return 'General Goods';
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#F8F9FA] dark:bg-[#0F1113] relative">
      {/* ========================================================================= */}
      {/* MOBILE PHONE SECTION: Google Stitch Mobile Exchange                       */}
      {/* ========================================================================= */}
      <div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {/* Mobile Header: Title & Create CTA */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Exchange
          </h1>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>+ Create Listing</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center w-full">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lawn mowers, planters, baby cots..."
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

        {/* Category Pills Scroller */}
        <div className="py-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 -mx-4 px-4 select-none">
          <button
            type="button"
            onClick={() => { setSelectedCategory('all'); setSelectedTypeFilter('all'); }}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-transform ${
              selectedCategory === 'all' && selectedTypeFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All ({exchangeItems.length})
          </button>
          <button
            type="button"
            onClick={() => { setSelectedCategory(selectedCategory === 'home & kitchen' ? 'all' : 'home & kitchen'); }}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'home & kitchen'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-[#9E1315]">yard</span>
            Tools & Garden
          </button>
          <button
            type="button"
            onClick={() => { setSelectedCategory(selectedCategory === 'furniture' ? 'all' : 'furniture'); }}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'furniture'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-[#9E1315]">chair</span>
            Furniture
          </button>
          <button
            type="button"
            onClick={() => { setSelectedCategory(selectedCategory === 'baby items' ? 'all' : 'baby items'); }}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all ${
              selectedCategory === 'baby items'
                ? 'bg-[#9E1315] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-[#9E1315]">child_friendly</span>
            Baby & Kids
          </button>
          <button
            type="button"
            onClick={() => { setSelectedTypeFilter(selectedTypeFilter === 'Free' ? 'all' : 'Free'); }}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all ${
              selectedTypeFilter === 'Free'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-emerald-600">volunteer_activism</span>
            Free Items
          </button>
        </div>

        {/* Results Count & Sort Indicator */}
        <div className="py-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filteredItems.length} neighbor listings in Elmina</span>
          <span className="text-[#9E1315] font-semibold flex items-center gap-0.5">
            Latest
          </span>
        </div>

        {/* 2-Column Responsive Card Grid */}
        <div className="grid grid-cols-2 gap-2.5 pb-20">
          {filteredItems.map((item) => {
            const isFree = item.listingType === 'giveaway';
            const images = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl || ''];
            const displayImg = images[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800';

            return (
              <div 
                key={item.id}
                className="flex flex-col bg-white dark:bg-[#15181C] rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 justify-between active:scale-[0.99] transition-transform"
              >
                <div className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  <img
                    src={displayImg}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800';
                    }}
                  />
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                    isFree ? 'bg-emerald-600 text-white' : 'bg-[#9E1315] text-white'
                  }`}>
                    {isFree ? 'FREE' : 'EXCHANGE'}
                  </span>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono">
                    <TimeAgo date={item.createdAt} />
                  </span>
                </div>

                <div className="p-2.5 flex flex-col flex-1 justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                      {item.title}
                    </h2>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mt-1">
                      <span className="material-symbols-outlined text-xs text-[#9E1315]">location_on</span>
                      <span className="text-[10px] truncate">{item.precinct || 'Elmina West'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.seekingItem || getConditionBadge(item.condition)}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        handleOpenDrawer(item, e.currentTarget);
                      }}
                      className="flex-1 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-[11px] font-semibold flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContactOwner(item)}
                      aria-label="Contact neighbor"
                      className="h-7 w-7 rounded-lg bg-[#9E1315] hover:bg-[#841012] text-white flex items-center justify-center active:scale-95 transition-transform shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">chat</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
          {/* Header Title Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Exchange
              </h1>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>+ Create Listing</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            {/* Top Row: Search + Mode Toggle */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search items by keyword, category, or precinct"
                  placeholder="Search items, homeware, baby gear, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#9E1315] transition-all"
                />
              </div>

              {/* Mode Toggles */}
              <div role="group" aria-label="Filter by listing type" className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 self-start md:self-auto shrink-0 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                <button
                  type="button"
                  aria-pressed={selectedTypeFilter === 'all'}
                  onClick={() => setSelectedTypeFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedTypeFilter === 'all'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  aria-pressed={selectedTypeFilter === 'Free'}
                  onClick={() => setSelectedTypeFilter('Free')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedTypeFilter === 'Free'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true"></span>
                  <span>Free (Gift)</span>
                </button>
                <button
                  type="button"
                  aria-pressed={selectedTypeFilter === 'Exchange'}
                  onClick={() => setSelectedTypeFilter('Exchange')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedTypeFilter === 'Exchange'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
                  <span>Exchange (Barter)</span>
                </button>
              </div>
            </div>

            {/* Category Pill Scroller */}
            <div role="group" aria-label="Filter by item category" className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                'All',
                'Furniture',
                'Electronics',
                'Home & Kitchen',
                'Clothing',
                'Books',
                'Baby Items',
                'Sports & Outdoor',
                'Other',
              ].map((cat) => {
                const isSelected =
                  cat.toLowerCase() === 'all'
                    ? !selectedCategory || selectedCategory.toLowerCase() === 'all'
                    : selectedCategory.toLowerCase() === cat.toLowerCase();

                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(cat.toLowerCase() === 'all' ? 'all' : cat)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Secondary Condition & Availability Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  aria-label="Filter by condition"
                  className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <option value="all">Condition: All</option>
                  <option value="New">Condition: New</option>
                  <option value="Like New">Condition: Like New</option>
                  <option value="Good">Condition: Good</option>
                  <option value="Fair">Condition: Fair</option>
                </select>

                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  aria-label="Filter by availability"
                  className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <option value="all">Availability: All</option>
                  <option value="Available Now">Available Now</option>
                  <option value="Reserved">Reserved</option>
                </select>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Filters</span>
                </button>
              </div>

              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Showing {filteredItems.length} neighbourhood items
              </span>
            </div>
          </div>
        </div>
      </header>
      </div>

      {/* Main Content Scroll Container */}
      <div 
        ref={scrollContainerRef}
        id="exchange-scroll-container" 
        onScroll={handleScroll} 
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ overflowAnchor: 'none' }}
      >

      {/* Item Listing Area */}
      <div className="px-4 sm:px-6 py-5">
        <div className="w-full max-w-6xl mx-auto">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <PackageCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching items found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try relaxing your search terms or clearing filters to see items available across other precincts.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-[#9E1315] text-white text-xs font-bold hover:bg-[#841012] cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const isFree = item.listingType === 'giveaway';
              const isOwner = item.authorId === currentUser.id;
              const images = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl || ''];
              const displayImg = images[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800';

              return (
                <article
                  key={item.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    handleOpenDrawer(item, e.currentTarget);
                  }}
                  className="group flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all overflow-hidden cursor-pointer"
                >
                  <div>
                    {/* Photo Container */}
                    <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={displayImg}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={(e) => {
                          handleOpenDrawer(item, e.currentTarget);
                        }}
                        loading="lazy"
                      />

                      {/* Top-Left Badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5 items-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1 ${
                          isFree
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {isFree ? (
                            <>
                              <Heart className="w-3 h-3 fill-current" />
                              <span>Free (Gift)</span>
                            </>
                          ) : (
                            <>
                              <Repeat className="w-3 h-3" />
                              <span>Exchange</span>
                            </>
                          )}
                        </span>
                        <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-900/80 backdrop-blur-xs text-white">
                          {getConditionBadge(item.condition)}
                        </span>
                      </div>

                      {/* Top-Right Availability Badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {images.length > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>{images.length}</span>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs flex items-center gap-1 ${
                          item.status === 'available'
                            ? 'bg-emerald-600'
                            : item.status === 'reserved'
                            ? 'bg-slate-700'
                            : 'bg-slate-500'
                        }`}>
                          {item.status === 'available' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                          <span>
                            {item.status === 'available' ? 'Available' : item.status === 'reserved' ? 'Reserved' : 'Completed'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(item.category)}
                          <span>{getCategoryTitle(item.category)}</span>
                        </span>
                        <span>{item.precinct}</span>
                      </div>

                      <h3 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(item, e.currentTarget);
                        }}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#9E1315] dark:group-hover:text-rose-400 transition-colors leading-snug line-clamp-1 cursor-pointer"
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Seeking preference or Gift note */}
                      <div className={`mt-1 p-2 rounded-xl text-xs flex items-start gap-1.5 ${
                        isFree
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                      }`}>
                        {isFree ? (
                          <Heart className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Repeat className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <span className="line-clamp-1 font-semibold text-[11px]">
                          {item.seekingItem || (isFree ? 'Free neighbourhood gift • Porch pickup' : 'Open to community barter')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer / Owner Profile / Action */}
                  <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {item.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.authorName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {item.precinct}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOwner && item.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => completeExchangeItem(item.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 dark:bg-slate-800 dark:hover:bg-emerald-950 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          handleOpenDrawer(item, e.currentTarget);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                      >
                        View Item
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
  </div>

      {/* ==================== SLIDE-OVER DRAWER: ITEM DETAIL ==================== */}
      {displayedDrawerItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className={`fixed inset-0 bg-black/60 backdrop-blur-xs exchange-drawer-backdrop ${
                isDrawerClosing ? 'exchange-drawer-backdrop-closing' : ''
              }`}
              onClick={() => handleCloseDrawer()}
            />

            <aside
              key={`${displayedDrawerItem.id}-${drawerSessionId}`}
              aria-label="Item Details Dossier"
              className={`relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full min-h-0 overflow-hidden z-10 border-l border-slate-200 dark:border-slate-800 exchange-drawer-panel ${
                isDrawerClosing ? 'exchange-drawer-panel-closing' : 'exchange-drawer-panel-open'
              }`}
            >
            {/* Drawer Header */}
            <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400">Item Detail</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {displayedDrawerItem.id.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCloseDrawer()}
                aria-label="Close item details"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-5 text-xs sm:text-sm">
              {/* Media Preview & Thumbnails */}
              {(() => {
                const images = displayedDrawerItem.imageUrls && displayedDrawerItem.imageUrls.length > 0
                  ? displayedDrawerItem.imageUrls
                  : [displayedDrawerItem.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'];
                const currentImg = images[activePhotoIndex] || images[0];

                return (
                  <div className="flex flex-col gap-2">
                    <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <img
                        src={currentImg}
                        alt={displayedDrawerItem.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Photo {activePhotoIndex + 1} of {images.length}</span>
                      </div>
                    </div>

                    {images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIndex(idx)}
                            aria-label={`View photo ${idx + 1} of ${images.length}`}
                            className={`h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 transition-all cursor-pointer ${
                              activePhotoIndex === idx
                                ? 'border-[#9E1315] ring-2 ring-[#9E1315]/20'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Badges & Title */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                    displayedDrawerItem.listingType === 'giveaway'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {displayedDrawerItem.listingType === 'giveaway' ? 'Free (Gift)' : 'Exchange'}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {getConditionBadge(displayedDrawerItem.condition)} Condition
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {getCategoryTitle(displayedDrawerItem.category)}
                  </span>
                  <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {displayedDrawerItem.status === 'available' ? 'Available Now' : displayedDrawerItem.status === 'reserved' ? 'Reserved' : 'Completed'}
                  </span>
                </div>

                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                  {displayedDrawerItem.title}
                </h2>
              </div>

              {/* Terms / Exchange Preference Box */}
              <div className={`p-4 rounded-2xl flex flex-col gap-1.5 border ${
                displayedDrawerItem.listingType === 'giveaway'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  {displayedDrawerItem.listingType === 'giveaway' ? (
                    <>
                      <Heart className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Gift & Handover Guidelines</span>
                    </>
                  ) : (
                    <>
                      <Repeat className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Exchange Preference</span>
                    </>
                  )}
                </div>
                <p className="text-xs leading-relaxed">
                  {displayedDrawerItem.seekingItem || 'No specific barter preference requested. Contact neighbor for handover.'}
                </p>
              </div>

              {/* About this item */}
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">About this item</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {displayedDrawerItem.description}
                </p>
              </div>

              {/* Handover & Logistics Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Elmina Porch Pickup Guidelines
                </span>
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-[#9E1315] dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {displayedDrawerItem.precinct}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Exact porch address released automatically upon mutual agreement in Secure Messages.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs pt-1 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Preferred collection: Weekday evenings after 6:30 PM, or weekends.</span>
                </div>
              </div>

              {/* Verified Owner Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold flex items-center justify-center text-sm shrink-0">
                    {displayedDrawerItem.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {displayedDrawerItem.authorName}
                      </span>
                      {displayedDrawerItem.authorVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800" title="Registered account">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {displayedDrawerItem.precinct} • Verified Resident
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        4.9 (24 reuses)
                      </span>
                      <span>•</span>
                      <span>Replies in ~1 hr</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {displayedDrawerItem.authorId === currentUser.id ? (
                <div className="flex items-center gap-2">
                  {displayedDrawerItem.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        completeExchangeItem(displayedDrawerItem.id);
                        handleCloseDrawer();
                      }}
                      className="flex-1 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Mark as Completed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      deleteExchangeItem(displayedDrawerItem.id);
                      handleCloseDrawer();
                    }}
                    className="h-10 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleContactOwner(displayedDrawerItem)}
                  disabled={displayedDrawerItem.status === 'completed'}
                  className={`w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    displayedDrawerItem.status === 'completed'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-[#9E1315] hover:bg-[#841012] text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {displayedDrawerItem.status === 'available'
                      ? 'Reserve & Message Owner via Secure Messages'
                      : displayedDrawerItem.status === 'reserved'
                      ? 'Message Owner via Secure Messages'
                      : 'Item Claimed'}
                  </span>
                </button>
              )}

              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>End-to-End Encrypted. Your private phone number is never exposed.</span>
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ==================== MODAL: CREATE LISTING ==================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCreateOpen(false)}
          />

          <div
            className={`relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col min-h-0 overflow-hidden transition-all ${
              isMinimizing ? 'modal-minimize-out' : 'animate-in fade-in zoom-in-95 duration-200'
            }`}
          >
            {/* Pinned Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Create Exchange Listing
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share or barter responsibly within the City of Elmina.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close create listing dialog"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Form with Internally Scrollable Fields and Pinned Actions */}
            <form onSubmit={handleCreateSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                {/* Listing Type Toggle Buttons */}
                <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Listing Type
                </label>
                <div role="group" aria-label="Select listing type" className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={newType === 'giveaway'}
                    onClick={() => setNewType('giveaway')}
                    className={`p-3 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer border ${
                      newType === 'giveaway'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-950 dark:text-emerald-100 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Heart className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <div className="text-left">
                      <div className="font-bold text-xs">Free (Gift)</div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Pay-it-forward to neighbours
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-pressed={newType === 'exchange'}
                    onClick={() => setNewType('exchange')}
                    className={`p-3 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer border ${
                      newType === 'exchange'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-950 dark:text-amber-100 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Repeat className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
                    <div className="text-left">
                      <div className="font-bold text-xs">Exchange (Barter)</div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Trade for wishlist items
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Listing Title */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Listing Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Home Office Desk or Stroller"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                />
              </div>

              {/* Category & Condition Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ExchangeCategory)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="furniture">Furniture</option>
                    <option value="appliances">Home & Kitchen</option>
                    <option value="baby_kids">Baby Items</option>
                    <option value="books_study">Books & Study</option>
                    <option value="sports_leisure">Sports & Outdoor</option>
                    <option value="clothing">Clothing</option>
                    <option value="plants_garden">Plants & Garden</option>
                    <option value="others">Other Items</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as ItemCondition)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                  >
                    <option value="like_new">Like New (barely used)</option>
                    <option value="brand_new">Brand New (in packaging)</option>
                    <option value="good">Good (normal wear, fully functional)</option>
                    <option value="fair">Fair (functional, cosmetic marks)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Exchange Wishlist */}
              {newType === 'exchange' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    What would you like in return?
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Garden plants, sourdough loaf, or coffee beans"
                    value={newSeekingItem}
                    onChange={(e) => setNewSeekingItem(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 text-slate-900 dark:text-slate-100 border border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Precinct Location */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Precinct Location</label>
                <select
                  value={newPrecinct}
                  onChange={(e) => setNewPrecinct(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315]"
                >
                  <option value="Elmina Valley 1">Elmina Valley 1</option>
                  <option value="Elmina Valley 2">Elmina Valley 2</option>
                  <option value="Elmina Valley 3">Elmina Valley 3</option>
                  <option value="Elmina Valley 4">Elmina Valley 4</option>
                  <option value="Elmina Valley 5">Elmina Valley 5</option>
                  <option value="Elmina Green 1">Elmina Green 1</option>
                  <option value="Elmina Green 3">Elmina Green 3</option>
                  <option value="Elmina Green 4">Elmina Green 4</option>
                  <option value="Ilham Residence">Ilham Residence</option>
                  <option value="Elmina Ridge">Elmina Ridge</option>
                  <option value="Elmina West">Elmina West</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Pickup Guidelines
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe dimensions, functionality, reason for passing it on, and convenient pickup windows..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#9E1315] resize-none"
                />
              </div>

              {/* AI Listing Assistant Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-indigo-950/30 border border-amber-500/20 dark:border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>AI Listing Assistant</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Privacy-conscious • Gemini powered
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    disabled={assistLoading !== null}
                    onClick={() => handleRunAiAssist('suggest_title')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs text-[11px] disabled:opacity-50"
                  >
                    {assistLoading === 'suggest_title' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    ) : (
                      <Wand2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>Suggest Title</span>
                  </button>

                  <button
                    type="button"
                    disabled={assistLoading !== null}
                    onClick={() => handleRunAiAssist('suggest_category')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs text-[11px] disabled:opacity-50"
                  >
                    {assistLoading === 'suggest_category' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    ) : (
                      <Lightbulb className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>Detect Category</span>
                  </button>

                  <button
                    type="button"
                    disabled={assistLoading !== null}
                    onClick={() => handleRunAiAssist('improve_description')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs text-[11px] disabled:opacity-50"
                  >
                    {assistLoading === 'improve_description' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>Improve Description</span>
                  </button>
                </div>

                {activeSuggestion && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                        Suggested {activeSuggestion.type}:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveSuggestion(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={handleApplySuggestion}
                          className="text-[10.5px] font-bold bg-[#9E1315] hover:bg-[#841012] text-white px-2.5 py-1 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Apply Suggestion</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {activeSuggestion.text}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Tip: You can review and edit this suggestion before publishing.
                    </p>
                  </div>
                )}
              </div>

              {/* Photos Dropzone */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Item Photos (Attach up to 5)
                </label>
                <ImageUploadArea
                  bucket="community-media"
                  folder="exchange"
                  multiple={true}
                  maxFiles={5}
                  currentUrls={newImageUrls}
                  onUploadComplete={(urls) => setNewImageUrls(urls)}
                  onRemove={(idx) => setNewImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                  helperText="Upload photos (JPEG, PNG, WebP up to 10MB each) showing item condition and all angles"
                />
              </div>

              {/* Verified Precinct Notice */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 flex items-center gap-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Your listing will automatically show your verified precinct: <strong className="text-slate-800 dark:text-slate-100">{newPrecinct}</strong>. Full street address remains hidden.
                </span>
              </div>

              </div>

              {/* Pinned Modal Footer */}
              <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Listing'}
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
