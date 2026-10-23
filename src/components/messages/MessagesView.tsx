'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { Conversation, Message, PropertyMessageRequest, UserProfile } from '@/types';
import PropertySearchModal from '@/components/messages/PropertySearchModal';
import KeyAuditModal from '@/components/messages/KeyAuditModal';
import PhotoLightboxModal from '@/components/messages/PhotoLightboxModal';
import BylawsModal from '@/components/messages/BylawsModal';
import { 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Lock, 
  User, 
  Building2, 
  ShieldAlert, 
  Sparkles,
  Info,
  Search,
  EyeOff,
  Check,
  CheckCheck,
  XCircle,
  Ban,
  MailCheck,
  AlertTriangle,
  Paperclip,
  Image as ImageIcon,
  X,
  Loader2,
  ChevronLeft,
  ChevronDown,
  PhoneCall,
  MapPin,
  FileText,
  Download,
  Flag,
  BellOff,
  Home,
  CheckCircle2,
  Share2,
  ExternalLink,
  ArrowLeftRight,
  Wrench,
  Shield,
  Edit3,
  SlidersHorizontal
} from 'lucide-react';
import TimeAgo from '@/components/common/TimeAgo';
import { uploadMedia } from '@/lib/storage/uploadMedia';
import { toDatabaseUserId, fromDatabaseUserId } from '@/lib/utils/idMapping';

export default function MessagesView() {
  const { 
    conversations, 
    messages, 
    messageRequests,
    availableProfiles: profiles,
    sendMessage, 
    startConversation, 
    acceptMessageRequest,
    rejectMessageRequest,
    blockPropertySender,
    sendPropertyMessageRequest,
    currentUser, 
    navigationTarget,
    clearNavigationTarget,
    t 
  } = useApp();

  // Listing / Service Context state for inquiries
  const [listingContext, setListingContext] = useState<{
    title: string;
    type?: string;
    id?: string;
  } | null>(null);

  // Modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isKeyAuditModalOpen, setIsKeyAuditModalOpen] = useState(false);
  const [isBylawsModalOpen, setIsBylawsModalOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ url: string; filename?: string; geotag?: string } | null>(null);

  // Tabs & Views state
  const [sidebarTab, setSidebarTab] = useState<'conversations' | 'requests'>('conversations');
  const [mobileCategory, setMobileCategory] = useState<'all' | 'exchange' | 'services' | 'guardhouse' | 'requests'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileActiveThreadOpen, setMobileActiveThreadOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [identityDropdownOpen, setIdentityDropdownOpen] = useState(false);
  const [isAnonymousReply, setIsAnonymousReply] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const currentDbUserId = toDatabaseUserId(currentUser.id);
  const currentPersonaId = fromDatabaseUserId(currentUser.id);

  // Determine whether an identifier belongs to the current active user
  const isCurrentResident = useCallback((id?: string | null) => {
    if (!id) return false;
    if (id === currentUser.id) return true;
    if (id === currentDbUserId) return true;
    if (id === currentPersonaId) return true;
    if (fromDatabaseUserId(id) === currentPersonaId) return true;
    if (toDatabaseUserId(id) === currentDbUserId) return true;
    return false;
  }, [currentUser.id, currentDbUserId, currentPersonaId]);

  const isUserParticipant = useCallback((p1: string, p2: string) => {
    return isCurrentResident(p1) || isCurrentResident(p2);
  }, [isCurrentResident]);

  // Filter conversations where current user is a participant (supports persona IDs and Supabase UUIDs)
  const userConversations = conversations.filter(
    (c) => isUserParticipant(c.participantOneId, c.participantTwoId)
  );

  // Filter incoming property requests for this user
  const incomingRequests = messageRequests.filter(
    (r) => r.status === 'pending' && isCurrentResident(r.recipientId)
  );

  const [activeConversationId, setActiveConversationId] = useState<string>(
    navigationTarget?.conversationId || ''
  );

  const hasAutoSelectedRef = useRef(false);

  // Auto-select first conversation ONCE on initial desktop load if no specific conversation is set
  useEffect(() => {
    if (hasAutoSelectedRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      if (!activeConversationId && userConversations.length > 0) {
        setActiveConversationId(userConversations[0].id);
        hasAutoSelectedRef.current = true;
      }
    }
  }, [activeConversationId, userConversations]);

  const prevUserIdRef = useRef(currentUser.id);

  // Invalidate conversation context and reset message composer ONLY when currentUser changes
  useEffect(() => {
    if (prevUserIdRef.current !== currentUser.id) {
      prevUserIdRef.current = currentUser.id;
      hasAutoSelectedRef.current = false;
      setActiveConversationId('');
      setMobileActiveThreadOpen(false);
      setIsDossierOpen(false);
      setMessageInput('');
      setListingContext(null);
      setAttachedFile(null);
      setAttachmentPreview(null);
      setAttachmentError(null);
      setLightboxData(null);
      setIsSearchModalOpen(false);
      setIsKeyAuditModalOpen(false);
      setIsBylawsModalOpen(false);
    }
  }, [currentUser.id]);

  // Deep-link / Quick-Chat navigationTarget listener
  useEffect(() => {
    if (!navigationTarget || navigationTarget.tab !== 'messages') return;

    let targetConvId = navigationTarget.conversationId;

    if (!targetConvId && navigationTarget.recipientId) {
      const match = conversations.find(
        (c) =>
          (c.participantOneId === currentUser.id && c.participantTwoId === navigationTarget.recipientId) ||
          (c.participantTwoId === currentUser.id && c.participantOneId === navigationTarget.recipientId)
      );
      if (match) {
        targetConvId = match.id;
      }
    }

    if (targetConvId) {
      setActiveConversationId(targetConvId);
      setMobileActiveThreadOpen(true);
    }

    if (navigationTarget.draftMessage) {
      setMessageInput(navigationTarget.draftMessage);
    }

    if (navigationTarget.contextTitle) {
      setListingContext({
        title: navigationTarget.contextTitle,
        type: navigationTarget.contextType,
        id: navigationTarget.contextId,
      });
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 150);

    clearNavigationTarget();
  }, [navigationTarget, conversations, currentUser.id, clearNavigationTarget]);

  // URL query hydration on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const convId = params.get('conversationId');
    const recipientId = params.get('recipientId');

    if (convId) {
      const exists = conversations.some((c) => c.id === convId);
      if (exists) {
        setActiveConversationId(convId);
        setMobileActiveThreadOpen(true);
      }
    } else if (recipientId) {
      const match = conversations.find(
        (c) =>
          (c.participantOneId === currentUser.id && c.participantTwoId === recipientId) ||
          (c.participantTwoId === currentUser.id && c.participantOneId === recipientId)
      );
      if (match) {
        setActiveConversationId(match.id);
        setMobileActiveThreadOpen(true);
      }
    }
  }, [conversations, currentUser.id]);

  // Active conversation & messages: resolve specific conversation when activeConversationId is provided
  const activeConv = activeConversationId
    ? (userConversations.find((c) => c.id === activeConversationId) ||
       conversations.find((c) => c.id === activeConversationId) ||
       null)
    : (userConversations[0] || null);
  const activeMessages = activeConv ? messages.filter((m) => m.conversationId === activeConv.id) : [];

  // Messaging composer state
  const [messageInput, setMessageInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Auto-scrolling & New Messages tracking
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Quick Inline Address Request state
  const [quickPrecinct, setQuickPrecinct] = useState('Elmina West (EV1)');
  const [quickStreet, setQuickStreet] = useState('');
  const [quickUnit, setQuickUnit] = useState('');
  const [quickSubject, setQuickSubject] = useState('');
  const [isSendingQuickRequest, setIsSendingQuickRequest] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const getRecipientName = useCallback((conv: Conversation) => {
    const isP1Current = isCurrentResident(conv.participantOneId);
    const targetName = isP1Current ? conv.participantTwoName : conv.participantOneName;
    const targetId = isP1Current ? conv.participantTwoId : conv.participantOneId;

    if (targetName && targetName.trim().length > 0 && targetName !== 'Resident Neighbour') {
      return targetName;
    }

    const prof = profiles.find((p: UserProfile) => p.id === targetId || toDatabaseUserId(p.id) === targetId || p.id === fromDatabaseUserId(targetId));
    if (prof) {
      return prof.displayName || prof.fullName;
    }

    return targetName || 'Resident Neighbour';
  }, [isCurrentResident, profiles]);

  const getMaskedId = (conv: Conversation) => {
    if (conv.id === 'conv-harith') return '#EW-9821';
    if (conv.id === 'conv-guardhouse') return '#GH-04';
    if (conv.id === 'conv-nurul-izzati') return '#ER-3104';
    if (conv.id === 'conv-anonymous-neighbour') return '#EV2-ANON';
    return `#${conv.id.slice(-6).toUpperCase()}`;
  };

  const getPrecinctZone = useCallback((conv: Conversation) => {
    const isP1Current = isCurrentResident(conv.participantOneId);
    const targetId = isP1Current ? conv.participantTwoId : conv.participantOneId;
    const prof = profiles.find((p: UserProfile) => p.id === targetId || toDatabaseUserId(p.id) === targetId || p.id === fromDatabaseUserId(targetId));
    if (prof && prof.townshipPrecinct) {
      return prof.townshipPrecinct;
    }
    if (conv.id === 'conv-harith') return 'Elmina West (EV1)';
    if (conv.id === 'conv-guardhouse') return 'Ilham Residence Perimeter';
    if (conv.id === 'conv-nurul-izzati') return 'Elmina Ridge';
    if (conv.id === 'conv-anonymous-neighbour') return 'Elmina Valley 2';
    return 'City of Elmina';
  }, [isCurrentResident, profiles]);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // When active conversation changes, scroll to bottom
  useEffect(() => {
    scrollToBottom('auto');
  }, [activeConv?.id, scrollToBottom]);

  // Handle timeline scroll to detect if user has scrolled away from bottom
  const handleTimelineScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    setShowScrollBottomBtn(!isAtBottom);
  };

  // Filtered lists
  const filteredConversations = userConversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const recipient = getRecipientName(c).toLowerCase();
    const sub = (c.subject || '').toLowerCase();
    const last = (c.lastMessage || '').toLowerCase();
    const masked = getMaskedId(c).toLowerCase();
    return recipient.includes(q) || sub.includes(q) || last.includes(q) || masked.includes(q);
  });

  const filteredRequests = incomingRequests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.propertyAddress.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.initialMessage.toLowerCase().includes(q) ||
      (r.senderDisplayName || '').toLowerCase().includes(q)
    );
  });

  // Photo Attachment Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAttachmentError('Unsupported format. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('Image file exceeds the 10MB limit.');
      return;
    }

    setAttachedFile(file);
    const localUrl = URL.createObjectURL(file);
    setAttachmentPreview(localUrl);
  };

  const handleRemoveAttachment = () => {
    if (attachmentPreview && attachmentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setAttachedFile(null);
    setAttachmentPreview(null);
    setAttachmentError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Quick notice phrase insertion
  const insertQuickPhrase = (phrase: string) => {
    setMessageInput((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !attachedFile) || !activeConv) return;

    if (activeConv.status && activeConv.status !== 'accepted') {
      showToast('Conversation has not yet been accepted by the resident.');
      return;
    }

    let uploadedImageUrl: string | undefined = undefined;

    if (attachedFile) {
      setIsUploadingAttachment(true);
      setAttachmentError(null);
      const uploadRes = await uploadMedia(
        attachedFile, 
        'secure-message-attachments', 
        'messages', 
        activeConv.id
      );

      if (!uploadRes.success || !uploadRes.url) {
        setAttachmentError(uploadRes.error || 'Failed to securely upload attachment.');
        setIsUploadingAttachment(false);
        return;
      }
      uploadedImageUrl = uploadRes.url;
    }

    await sendMessage(
      activeConv.id, 
      messageInput.trim() || 'Attached secure photo', 
      isAnonymousReply, 
      uploadedImageUrl
    );

    setMessageInput('');
    setListingContext(null);
    handleRemoveAttachment();
    setIsUploadingAttachment(false);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  // Keyboard navigation: Enter sends, Shift+Enter new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick Street Address Inward Request submission
  const handleSendQuickRequest = async () => {
    if (!quickStreet.trim() || !quickUnit.trim()) {
      showToast('Please enter both street name and unit/house number.');
      return;
    }

    setIsSendingQuickRequest(true);
    const fullAddress = `No. ${quickUnit.trim()}, ${quickStreet.trim()}, ${quickPrecinct}`;
    
    // Choose recipient: Capt Azman or neighbour
    const recipientId = 'user-nurul'; // target resident
    const res = await sendPropertyMessageRequest({
      propertyAddress: fullAddress,
      recipientId,
      subject: quickSubject.trim() || 'Resident Property Inquiry',
      initialMessage: `Greetings neighbour, this is an automated mediated inquiry for ${fullAddress} regarding boundary maintenance.`,
      isAnonymous: isAnonymousReply,
    });

    setIsSendingQuickRequest(false);
    if (res.success) {
      showToast(`Inward request dispatched to ${fullAddress}.`);
      setQuickStreet('');
      setQuickUnit('');
      setQuickSubject('');
    } else {
      showToast(res.error || 'Failed to dispatch request.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-slate-50/50 dark:bg-[#0F1113]">
      {/* 1. TOP METADATA BAR (Desktop only) */}
      <div className="hidden md:flex shrink-0 px-4 py-2 sm:px-6 bg-white dark:bg-[#15181C] border-b border-slate-200/80 dark:border-slate-800 items-center justify-end gap-2 shadow-2xs z-20">
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Request Resident Contact</span>
        </button>

          <button
            onClick={() => setIsKeyAuditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#ba1b1d]" />
            <span>Key Audit</span>
          </button>

          <button
            onClick={() => setIsDossierOpen(!isDossierOpen)}
            className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isDossierOpen
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-[#ba1b1d]'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title="Toggle Resident Safety Dossier & Lookup"
            aria-label="Toggle Resident Safety Dossier"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

      {/* 2. MAIN APPLICATION WORKSPACE (Desktop only: md and above) */}
      <div className="hidden md:flex flex-1 min-h-0 flex-row overflow-hidden relative">
        {/* PANE 1: DIRECTORY & PENDING REQUESTS SIDEBAR */}
        <section 
          className={`w-full md:w-80 lg:w-[340px] xl:w-[380px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15181C] flex flex-col min-h-0 overflow-hidden ${
            mobileActiveThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Live Filter */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 space-y-3 shrink-0 bg-white dark:bg-[#15181C]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Messages
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#410002] dark:bg-[#ba1b1d]/30 dark:text-[#ffb4ab] text-[11px] font-bold">
                  {userConversations.length}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[#00468f] dark:text-[#aac7ff] text-xs font-semibold" title="Messages are end-to-end encrypted with zero centralized log storage">
                <Lock className="w-3.5 h-3.5" />
                <span>Encrypted</span>
              </span>
            </div>

            {/* Filter Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pseudonym, precinct, gate..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1E2226] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200/80 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#ba1b1d]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-[#1E2226]">
              <button
                type="button"
                onClick={() => setSidebarTab('conversations')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sidebarTab === 'conversations'
                    ? 'bg-white dark:bg-[#15181C] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Conversations</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ba1b1d] inline-block"></span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarTab('requests')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sidebarTab === 'requests'
                    ? 'bg-white dark:bg-[#15181C] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Requests</span>
                {incomingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#feb31d]/25 text-[#7f5600] dark:bg-[#feb31d]/20 dark:text-[#ffba3f] text-[10px] font-black animate-pulse">
                    {incomingRequests.length} New
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Independently Scrollable Conversations / Requests List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
            {sidebarTab === 'conversations' ? (
              filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-semibold">No active conversations match.</p>
                  <p className="text-[11px] mt-1">
                    Click &quot;Request Resident Contact&quot; to initiate a private connection.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConv?.id;
                  const recipient = getRecipientName(conv);
                  const initials = recipient.slice(0, 2).toUpperCase();
                  const maskedId = getMaskedId(conv);
                  const precinct = getPrecinctZone(conv);

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setMobileActiveThreadOpen(true);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 relative ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-[#1E2226] border-l-4 border-[#ba1b1d] pl-2.5 shadow-2xs'
                          : 'hover:bg-slate-50 dark:hover:bg-[#1A1D20] bg-transparent'
                      }`}
                    >
                      {/* Avatar with Verified check badge */}
                      <div className="relative w-9 h-9 rounded-full bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {initials}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#15181C] flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </span>
                      </div>

                      {/* Content metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {recipient}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                              {maskedId}
                            </span>
                          </div>
                          {conv.lastMessageTime && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                              <TimeAgo date={conv.lastMessageTime} addSuffix={false} />
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-semibold text-[#00468f] dark:text-[#aac7ff] truncate mb-0.5">
                          {precinct}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {conv.lastMessage || 'Encrypted conversation initiated...'}
                        </p>

                        {/* If conversation has media attachment */}
                        {conv.id === 'conv-harith' && (
                          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            <span className="inline-flex items-center gap-1 text-[#00468f] dark:text-[#aac7ff]">
                              <ImageIcon className="w-3 h-3" />
                              <span>Drainage Attachment</span>
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#ba1b1d]"></span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              /* Pending Requests Tab */
              filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <MailCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-semibold">No pending contact requests.</p>
                  <p className="text-[11px] mt-1">
                    When neighbours send a message request to your address, it will appear here for your approval.
                  </p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-3.5 bg-white dark:bg-[#1E2226] rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#d7e3ff] dark:bg-[#00468f]/30 text-[#00468f] dark:text-[#aac7ff] font-semibold text-[10px]">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Owner • {req.propertyAddress.split(',')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        <TimeAgo date={req.createdAt} />
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {req.isAnonymous ? 'Masked Resident' : (req.senderDisplayName || 'Elmina Resident')}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {req.isAnonymous ? 'EV3-XX-12' : '#EW-REQ'}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#ba1b1d] dark:text-[#ffb4ab] mt-0.5">
                        Topic: {req.subject}
                      </p>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#15181C] p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 leading-relaxed italic">
                      &quot;{req.initialMessage}&quot;
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={async () => {
                          const convId = await acceptMessageRequest(req.id);
                          if (convId) {
                            setActiveConversationId(convId);
                            setMobileActiveThreadOpen(true);
                          }
                          setSidebarTab('conversations');
                          showToast('Contact request accepted. Secure channel initiated.');
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept &amp; Chat</span>
                      </button>

                      <button
                        onClick={async () => {
                          await rejectMessageRequest(req.id);
                          showToast('Contact request declined.');
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* Municipal Compliance Footnote */}
          <div className="p-2.5 bg-slate-50 dark:bg-[#121417] text-center border-t border-slate-200 dark:border-slate-800 shrink-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Identity tokens are governed by Sime Darby Property Community Charter. Zero phone numbers exposed.
            </p>
          </div>
        </section>

        {/* PANE 2: CENTRAL ACTIVE CONVERSATION VIEWPORT */}
        <main 
          className={`flex-1 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-[#15181C] ${
            !mobileActiveThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* Conversation Thread Header */}
              <header className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#15181C] shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Recipient Persona Identity */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Mobile Back to Inbox Action */}
                    <button
                      type="button"
                      onClick={() => setMobileActiveThreadOpen(false)}
                      className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label="Back to inbox"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                      {getRecipientName(activeConv).slice(0, 2).toUpperCase()}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#15181C] flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {getRecipientName(activeConv)}
                        </h2>
                        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[10px] font-semibold" title="Registered account">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="truncate">{getPrecinctZone(activeConv)}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                          {getMaskedId(activeConv)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identity Selector & Thread Utilities */}
                  <div className="flex items-center gap-2">
                    {/* Identity Toggle Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIdentityDropdownOpen(!identityDropdownOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[#00468f] dark:text-[#aac7ff]" />
                        <span className="hidden sm:inline">Sending as:</span>
                        <strong className="text-[#ba1b1d] dark:text-[#ffb4ab] truncate max-w-[110px]">
                          {isAnonymousReply ? 'Anonymous' : (currentUser.displayName || 'Amir Z.')}
                        </strong>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      {identityDropdownOpen && (
                        <div 
                          className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-[#1E2226] shadow-xl p-1.5 z-40 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setIsAnonymousReply(false);
                              setIdentityDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                              !isAnonymousReply ? 'bg-rose-50 dark:bg-rose-950/40 text-[#ba1b1d] font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4 text-[#00468f] shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold">{currentUser.fullName || 'Amir Zakaria'}</div>
                              <div className="text-[10px] text-slate-500">Verified Resident • Elmina West</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAnonymousReply(true);
                              setIdentityDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                              isAnonymousReply ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold">Anonymous Resident</div>
                              <div className="text-[10px] text-slate-500">Masks full name &amp; street address</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Thread Action Icons */}
                    <button
                      onClick={() => showToast('Conversation notifications muted.')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Mute Thread"
                    >
                      <BellOff className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => showToast('Transcript encrypted and queued for export.')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Export Transcript"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Flag this conversation for review by Township Code of Conduct Committee?')) {
                          showToast('Incident report submitted to Elmina Auxiliary Police desk.');
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Report Incident / Code of Conduct"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Privacy Advisory Banner */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#1E2226] border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-3.5 h-3.5 text-[#00468f] dark:text-[#aac7ff] shrink-0" />
                    <span className="truncate">
                      <strong>Privacy Guaranteed:</strong> Full street address &amp; mobile numbers are cryptographically concealed.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsBylawsModalOpen(true)}
                    className="text-[#ba1b1d] dark:text-[#ffb4ab] font-bold hover:underline shrink-0 text-xs cursor-pointer"
                  >
                    View Bylaws
                  </button>
                </div>
              </header>

              {/* Message Timeline Area with Independent Scrolling */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleTimelineScroll}
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-[#0F1113]"
              >
                {/* Date Separator */}
                <div className="flex items-center justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-slate-200/80 dark:bg-[#1E2226] text-slate-600 dark:text-slate-400 text-[10px] font-bold tracking-wider uppercase">
                    Today, 18 October 2026
                  </span>
                </div>

                {/* Mutual Handshake Verified Pill */}
                <div className="max-w-md mx-auto p-3 rounded-2xl bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 text-[#00468f] dark:text-[#aac7ff] text-xs font-bold mb-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Resident Mutual Handshake Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Contact request approved by {getRecipientName(activeConv)}. Key exchange completed via Elmina West Edge Sentinel.
                  </p>
                </div>

                {/* Message Bubbles */}
                {activeMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const senderInitials = (msg.senderName || 'AZ').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 max-w-xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-2xs ${
                        isMe 
                          ? 'bg-slate-200 dark:bg-slate-800 text-[#ba1b1d] dark:text-[#ffb4ab]' 
                          : 'bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab]'
                      }`}>
                        {senderInitials}
                      </div>

                      {/* Bubble & Metadata */}
                      <div className={`flex flex-col gap-1 min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                          {msg.isAnonymous ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900/60 text-[10px]">
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>{isMe ? 'You (Anonymous)' : 'Anonymous Resident'}</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {isMe ? 'You (Amir Z.)' : msg.senderName}
                            </span>
                          )}
                          <span>•</span>
                          <TimeAgo date={msg.createdAt} />
                        </div>

                        {/* Speech Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                            isMe
                              ? 'bg-[#ba1b1d] text-white rounded-tr-xs'
                              : 'bg-white dark:bg-[#1E2226] text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          <p>{msg.content}</p>

                          {/* Media Attachment Preview Card */}
                          {msg.imageUrl && (
                            <div className="mt-2.5 rounded-xl overflow-hidden bg-slate-900 text-white shadow-md p-2 flex flex-col gap-2 border border-slate-800">
                              <div 
                                onClick={() => setLightboxData({
                                  url: msg.imageUrl || '',
                                  filename: 'backlane_drainage_culvert.jpg',
                                  geotag: '3.1792° N, 101.5034° E [Elmina West]'
                                })}
                                className="relative h-44 rounded-lg overflow-hidden group cursor-pointer"
                                title="Click to enlarge"
                              >
                                <img
                                  src={msg.imageUrl}
                                  alt="Secure attachment"
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-2.5">
                                  <div>
                                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>backlane_drainage_culvert.jpg</span>
                                    </div>
                                    <div className="text-[10px] text-slate-300 mt-0.5">
                                      2.4 MB • High Resolution • Geotagged [3.1792° N, 101.5034° E]
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Attachment Action CTAs */}
                              <div className="flex items-center justify-between pt-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setLightboxData({
                                    url: msg.imageUrl || '',
                                    filename: 'backlane_drainage_culvert.jpg',
                                    geotag: '3.1792° N, 101.5034° E [Elmina West]'
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                                >
                                  <span>Enlarge View</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => showToast('Attachment forwarded to Sime Darby Township Ops with geotag coordinates.')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ba1b1d] hover:bg-[#94000c] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                                >
                                  <span>Forward to Ops Report</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Outgoing Message Status Checkmarks */}
                        {isMe && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1 mt-0.5">
                            <CheckCheck className="w-3.5 h-3.5 text-[#00468f] dark:text-[#aac7ff]" />
                            <span>Delivered • Read</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Floating "New Messages" Scroll Down Action */}
              {showScrollBottomBtn && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-24 right-8 z-30 bg-slate-900/90 text-white hover:bg-black px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-1.5 animate-bounce transition-all cursor-pointer"
                >
                  <span>New messages</span>
                  <span>↓</span>
                </button>
              )}

              {/* RICH COMPOSER FOOTER (Pinned at bottom) */}
              <footer className="p-3 bg-white dark:bg-[#15181C] border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 shrink-0">
                {/* Suggested Quick Phrases Notice Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                    Quick Notice:
                  </span>
                  <button
                    type="button"
                    onClick={() => insertQuickPhrase('Boundary drainage checked. Looks clear on my side!')}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Boundary Drainage Check
                  </button>
                  <button
                    type="button"
                    onClick={() => insertQuickPhrase('Parcel held at guardhouse. Can I collect for you?')}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Parcel Collection Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => insertQuickPhrase('Noted with thanks. Logged to Sime Darby Ops.')}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Logged to Ops
                  </button>
                  <button
                    type="button"
                    onClick={() => insertQuickPhrase('Kindly keep pets indoors during landscape maintenance.')}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2226] dark:hover:bg-[#282C31] text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Pet &amp; Noise Advisory
                  </button>
                </div>

                {/* Contextual Listing / Service Preview Banner */}
                {listingContext && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        {listingContext.type === 'service' ? (
                          <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ArrowLeftRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          {listingContext.type === 'service' ? 'Local Services Inquiry' : 'Exchange Listing Inquiry'}
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {listingContext.title}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setListingContext(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                      title="Dismiss context"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attachment Preview Card */}
                {attachmentPreview && (
                  <div className="p-2.5 bg-slate-50 dark:bg-[#1E2226] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0 relative">
                        <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-[#ba1b1d]" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {attachedFile?.name || 'Attached Photo'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {attachedFile ? `${(attachedFile.size / 1024 / 1024).toFixed(2)} MB • ` : ''}
                          Private attachment (visible only to participants)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      disabled={isUploadingAttachment}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attachment Error Notice */}
                {attachmentError && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{attachmentError}</span>
                  </div>
                )}

                {/* Textarea Input Card */}
                <div className="bg-slate-50 dark:bg-[#1E2226] rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={activeConv.status && activeConv.status !== 'accepted'}
                    placeholder={
                      activeConv.status && activeConv.status !== 'accepted'
                        ? 'Conversation not yet accepted by resident...'
                        : `Write a secure message to ${getRecipientName(activeConv)}... (Shift+Enter for line break)`
                    }
                    className="w-full bg-transparent resize-none p-1 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden"
                  />

                  {/* Composer Action Toolbar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                    {/* Left Actions: Attachments & Geotag */}
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={isUploadingAttachment || (activeConv.status && activeConv.status !== 'accepted')}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        title="Attach Image or Evidence (JPEG, PNG, WebP up to 10MB)"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={isUploadingAttachment || (activeConv.status && activeConv.status !== 'accepted')}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        title="Attach Document or Municipal Deed"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => insertQuickPhrase('[Location: Central Park Storm Drain #EV1-3]')}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Pin Point from Resilience Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>

                      <span className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></span>

                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#00468f] dark:text-[#aac7ff]" />
                        <span>E2EE 256-bit</span>
                      </span>
                    </div>

                    {/* Right: Persona indicator & Send Button */}
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block text-[11px] text-slate-400">
                        Replying as:{' '}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {isAnonymousReply ? 'Anonymous Resident' : (currentUser.displayName || 'Amir Z.')}
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={
                          (!messageInput.trim() && !attachedFile) ||
                          isUploadingAttachment ||
                          (activeConv.status && activeConv.status !== 'accepted')
                        }
                        className="px-4 py-2 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        {isUploadingAttachment ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Encrypting...</span>
                          </>
                        ) : (
                          <>
                            <span>Send</span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Select a conversation from the directory
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Or click &quot;Request Resident Contact&quot; to reach an adjoining homeowner securely.
              </p>
            </div>
          )}
        </main>

        {/* PANE 3: CONTEXTUAL RESIDENT SAFETY DOSSIER & LOOKUP (Collapsible on Desktop / Drawer on Mobile) */}
        {isDossierOpen && activeConv && (
          <aside className="w-full sm:w-80 xl:w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15181C] flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 z-30 shadow-xl md:shadow-none animate-in slide-in-from-right duration-200 absolute md:relative right-0 top-0 bottom-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00468f] dark:text-[#aac7ff]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Resident Safety Profile
                </h3>
              </div>
              <button
                onClick={() => setIsDossierOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1E2226] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {getRecipientName(activeConv)}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {getMaskedId(activeConv)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#d7e3ff] text-[#00468f] dark:bg-[#00468f]/25 dark:text-[#aac7ff] text-[10px] font-bold">
                  Sime Darby Verified
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This channel is audited under the <em>Elmina Municipal Resident Safeguard Protocol</em>. Personal identity tokens, mobile numbers, and unit deeds remain protected behind precinct tokens.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#15181C] border border-slate-200/60 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Community Rating</div>
                  <div className="text-xs font-bold text-[#b45309] dark:text-[#fde047] mt-0.5">
                    ★ 4.98 / 5.0
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#15181C] border border-slate-200/60 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Mutual Endorsements</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    24 Neighbours
                  </div>
                </div>
              </div>

              {/* Hotline Banner */}
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#ba1b1d] dark:text-[#ffb4ab] flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                    <span>Auxiliary Police 24/7 Desk</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Gate emergency: 03-7845 2222
                  </div>
                </div>
                <a
                  href="tel:0378452222"
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-[#ba1b1d] dark:text-[#ffb4ab] text-xs font-bold border border-rose-200 dark:border-rose-900 shadow-2xs shrink-0"
                >
                  Dial
                </a>
              </div>
            </div>

            {/* Quick Street Address Lookup Widget */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E2226] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5">
                <Home className="w-4 h-4 text-[#ba1b1d]" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Contact Neighbor by Street Address
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Need to coordinate on boundary fencing, drainage, or overhanging trees? Request contact without knowing their phone number.
              </p>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Precinct
                  </label>
                  <select
                    value={quickPrecinct}
                    onChange={(e) => setQuickPrecinct(e.target.value)}
                    className="w-full mt-1 h-8 px-2 rounded-xl bg-slate-50 dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option>Elmina West (EV1)</option>
                    <option>Elmina Valley 2 (EV2)</option>
                    <option>Elmina Valley 3 (EV3)</option>
                    <option>Ilham Residence</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Street Name
                    </label>
                    <input
                      type="text"
                      placeholder="Jalan EV1/3..."
                      value={quickStreet}
                      onChange={(e) => setQuickStreet(e.target.value)}
                      className="w-full mt-1 h-8 px-2.5 rounded-xl bg-slate-50 dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unit / House No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12"
                      value={quickUnit}
                      onChange={(e) => setQuickUnit(e.target.value)}
                      className="w-full mt-1 h-8 px-2.5 rounded-xl bg-slate-50 dark:bg-[#15181C] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSendingQuickRequest}
                  onClick={handleSendQuickRequest}
                  className="w-full py-2 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSendingQuickRequest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transmitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Inward Request</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 3. MOBILE STITCH MESSAGES WORKSPACE (Mobile Phone Viewport <= 767px) */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col overflow-hidden relative bg-slate-50 dark:bg-[#0F1113]">
        {!mobileActiveThreadOpen ? (
          /* Mobile Messages Inbox (Pane 1 Stitch view) */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Header & Search */}
            <div className="px-4 pt-3 pb-2 flex flex-col gap-2 bg-white dark:bg-[#15181C] border-b border-slate-200/80 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Messages
                </h1>
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  aria-label="Filter or request message options"
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition-transform cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search neighbors, listings, or gate slips..."
                  className="w-full h-10 pl-9 pr-8 bg-slate-100 dark:bg-[#1E2226] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-hidden focus:bg-white dark:focus:bg-[#15181C] focus:ring-1 focus:ring-[#ba1b1d] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills (Horizontal Scroll) */}
            <div className="w-full overflow-x-auto no-scrollbar px-4 py-2 flex items-center gap-2 select-none shrink-0 bg-white dark:bg-[#15181C] border-b border-slate-200/60 dark:border-slate-800/60">
              <button
                onClick={() => setMobileCategory('all')}
                className={`whitespace-nowrap h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mobileCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Messages</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  mobileCategory === 'all'
                    ? 'bg-[#ba1b1d] text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {userConversations.length}
                </span>
              </button>

              <button
                onClick={() => setMobileCategory('exchange')}
                className={`whitespace-nowrap h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mobileCategory === 'exchange'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Exchange</span>
              </button>

              <button
                onClick={() => setMobileCategory('services')}
                className={`whitespace-nowrap h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mobileCategory === 'services'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Services</span>
              </button>

              <button
                onClick={() => setMobileCategory('guardhouse')}
                className={`whitespace-nowrap h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mobileCategory === 'guardhouse'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#ba1b1d] dark:text-[#ffb4ab]" />
                <span>Guardhouse</span>
              </button>

              {incomingRequests.length > 0 && (
                <button
                  onClick={() => setMobileCategory('requests')}
                  className={`whitespace-nowrap h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    mobileCategory === 'requests'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Requests</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#ba1b1d] text-white text-[10px] font-bold">
                    {incomingRequests.length}
                  </span>
                </button>
              )}
            </div>

            {/* Security Advisory Micro-Strip */}
            <div className="px-4 py-2 shrink-0">
              <div className="bg-slate-100/90 dark:bg-[#1E2226] rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[#ba1b1d] dark:text-[#ffb4ab] shrink-0" />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    All resident communications are end-to-end township verified.
                  </span>
                </div>
                <span className="text-[10px] text-[#ba1b1d] dark:text-[#ffb4ab] font-bold whitespace-nowrap">
                  ID: SEC-04
                </span>
              </div>
            </div>

            {/* Conversation Feed List */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-1 space-y-2 pb-28">
              {mobileCategory === 'requests' ? (
                filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <MailCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold">No pending contact requests.</p>
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className="p-3.5 bg-white dark:bg-[#15181C] rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#d7e3ff] dark:bg-[#00468f]/30 text-[#00468f] dark:text-[#aac7ff] font-semibold text-[10px]">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Owner • {req.propertyAddress.split(',')[0]}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          <TimeAgo date={req.createdAt} />
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {req.isAnonymous ? 'Masked Resident' : (req.senderDisplayName || 'Elmina Resident')}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {req.isAnonymous ? 'EV3-XX-12' : '#EW-REQ'}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-[#ba1b1d] dark:text-[#ffb4ab] mt-0.5">
                          Topic: {req.subject}
                        </p>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#1E2226] p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 leading-relaxed italic">
                        &quot;{req.initialMessage}&quot;
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={async () => {
                            const convId = await acceptMessageRequest(req.id);
                            if (convId) {
                              setActiveConversationId(convId);
                              setMobileActiveThreadOpen(true);
                            }
                            setMobileCategory('all');
                            showToast('Contact request accepted. Secure channel initiated.');
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept &amp; Chat</span>
                        </button>

                        <button
                          onClick={async () => {
                            await rejectMessageRequest(req.id);
                            showToast('Contact request declined.');
                          }}
                          className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                (() => {
                  const mobileFilteredConvs = filteredConversations.filter((c) => {
                    if (mobileCategory === 'all') return true;
                    if (mobileCategory === 'guardhouse') {
                      return c.id.includes('guard') || c.participantTwoName.toLowerCase().includes('guard') || c.participantOneName.toLowerCase().includes('guard');
                    }
                    if (mobileCategory === 'exchange') {
                      return c.id === 'conv-harith' || (c.subject || '').toLowerCase().includes('exchange') || (c.subject || '').toLowerCase().includes('bike') || (c.subject || '').toLowerCase().includes('swap') || (c.subject || '').toLowerCase().includes('cutting');
                    }
                    if (mobileCategory === 'services') {
                      return c.id === 'conv-nurul-izzati' || (c.subject || '').toLowerCase().includes('service') || (c.subject || '').toLowerCase().includes('electrician') || (c.subject || '').toLowerCase().includes('check') || (c.subject || '').toLowerCase().includes('inspection');
                    }
                    return true;
                  });

                  if (mobileFilteredConvs.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center text-center px-4 py-8">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 text-slate-400">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">No conversations found</h3>
                        <p className="text-[11px] text-slate-500 max-w-xs">
                          Check your search query or tap &quot;New Chat&quot; below to start a private connection.
                        </p>
                      </div>
                    );
                  }

                  return mobileFilteredConvs.map((conv) => {
                    const recipient = getRecipientName(conv);
                    const initials = recipient.slice(0, 2).toUpperCase();
                    const isGuard = conv.id.includes('guard') || recipient.toLowerCase().includes('guard');
                    const isHarith = conv.id === 'conv-harith';
                    const isRazif = conv.id === 'conv-nurul-izzati';
                    const roleLabel = isGuard ? 'Official' : isHarith ? 'Author' : isRazif ? 'Electrician' : 'Resident';
                    const subjectTitle = isGuard ? 'Visitor Registration • Main Gate B' : isHarith ? 'Lakeside Bicycle Group' : isRazif ? 'EV Inverter Check • Active Job' : (conv.subject || 'Township Resident Network');

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setActiveConversationId(conv.id);
                          setMobileActiveThreadOpen(true);
                        }}
                        className="w-full p-3.5 bg-white dark:bg-[#15181C] rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-[#1E2226] border border-slate-200/80 dark:border-slate-800 transition-all active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                              isGuard
                                ? 'bg-[#ba1b1d] text-white'
                                : 'bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab]'
                            }`}>
                              {isGuard ? <Shield className="w-5 h-5" /> : initials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          </div>

                          {/* Metadata */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {recipient}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                                  {roleLabel}
                                </span>
                              </div>
                              {conv.lastMessageTime && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                                  <TimeAgo date={conv.lastMessageTime} addSuffix={false} />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                              {isHarith ? (
                                <ArrowLeftRight className="w-3 h-3 text-amber-600 shrink-0" />
                              ) : isRazif ? (
                                <Wrench className="w-3 h-3 text-blue-600 shrink-0" />
                              ) : isGuard ? (
                                <Shield className="w-3 h-3 text-[#ba1b1d] shrink-0" />
                              ) : (
                                <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                {subjectTitle}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                                {conv.lastMessage || 'Encrypted conversation initiated...'}
                              </p>
                              {isHarith ? (
                                <span className="w-4 h-4 rounded-full bg-[#ba1b1d] text-white text-[10px] flex items-center justify-center shrink-0 font-bold shadow-xs">
                                  2
                                </span>
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}

              {/* Guard Intercom Direct Quick Dial Card */}
              <div className="p-3 bg-slate-100/90 dark:bg-[#1E2226] rounded-xl flex items-center justify-between gap-3 shadow-2xs border border-slate-200/60 dark:border-slate-800 mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-[#ba1b1d] dark:text-[#ffb4ab] shrink-0">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      Guard Intercom Direct
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Press for instant boom gate clearance voice line
                    </div>
                  </div>
                </div>
                <a
                  href="tel:0378452222"
                  className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 text-[#ba1b1d] dark:text-[#ffb4ab] border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-transform shrink-0"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>
            </div>

            {/* Floating Compose Button Trigger */}
            <div className="fixed bottom-24 left-4 z-40">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                aria-label="Compose New Message"
                className="h-11 px-4 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-[0_4px_16px_rgba(40,48,68,0.25)] flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-amber-400 dark:text-[#ba1b1d]" />
                <span className="text-xs font-bold">New Chat</span>
              </button>
            </div>
          </div>
        ) : (
          /* Mobile Active Conversation Thread View (Pane 2 Mobile View) */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#15181C]">
            {activeConv && (
              <>
                {/* Mobile Thread Header */}
                <header className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#15181C] shrink-0 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileActiveThreadOpen(false)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label="Back to messages"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="relative w-8 h-8 rounded-full bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab] flex items-center justify-center font-bold text-xs shrink-0">
                      {getRecipientName(activeConv).slice(0, 2).toUpperCase()}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white dark:bg-[#15181C] flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#00468f] dark:text-[#aac7ff]" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {getRecipientName(activeConv)}
                        </h2>
                        <span className="px-1.5 py-0.2 rounded bg-[#d7e3ff] text-[#00468f] dark:bg-[#00468f]/25 dark:text-[#aac7ff] text-[9px] font-semibold shrink-0">
                          Verified
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {getPrecinctZone(activeConv)} • {getMaskedId(activeConv)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAnonymousReply(!isAnonymousReply)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                        isAnonymousReply
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isAnonymousReply ? <EyeOff className="w-3 h-3 text-amber-600" /> : <User className="w-3 h-3 text-slate-500" />}
                      <span>{isAnonymousReply ? 'Anon' : 'Identified'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDossierOpen(!isDossierOpen)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      aria-label="Toggle Dossier"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* Mobile Messages Timeline */}
                <div 
                  ref={messagesContainerRef}
                  onScroll={handleTimelineScroll}
                  className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50 dark:bg-[#0F1113]"
                >
                  {/* Verified Pill */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[#00468f] dark:text-[#aac7ff] text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Resident Mutual Handshake Verified</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Encrypted connection with {getRecipientName(activeConv)}. Zero phone numbers exposed.
                    </p>
                  </div>

                  {activeMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const senderInitials = (msg.senderName || 'AZ').slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 max-w-[88%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-1 shadow-2xs ${
                          isMe 
                            ? 'bg-slate-200 dark:bg-slate-800 text-[#ba1b1d] dark:text-[#ffb4ab]' 
                            : 'bg-[#ffdad6] dark:bg-[#ba1b1d]/30 text-[#410002] dark:text-[#ffb4ab]'
                        }`}>
                          {senderInitials}
                        </div>

                        <div className={`flex flex-col gap-0.5 min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-400">
                            {msg.isAnonymous ? (
                              <span className="font-bold text-amber-700 dark:text-amber-400">Anonymous</span>
                            ) : (
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {isMe ? 'You' : msg.senderName}
                              </span>
                            )}
                            <span>•</span>
                            <TimeAgo date={msg.createdAt} />
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isMe
                                ? 'bg-[#ba1b1d] text-white rounded-tr-xs'
                                : 'bg-white dark:bg-[#1E2226] text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-800'
                            }`}
                          >
                            <p>{msg.content}</p>

                            {msg.imageUrl && (
                              <div 
                                onClick={() => setLightboxData({
                                  url: msg.imageUrl || '',
                                  filename: 'attachment.jpg',
                                  geotag: 'Elmina West'
                                })}
                                className="mt-2 rounded-lg overflow-hidden cursor-pointer"
                              >
                                <img
                                  src={msg.imageUrl}
                                  alt="Attachment"
                                  className="w-full max-h-40 object-cover"
                                />
                              </div>
                            )}
                          </div>

                          {isMe && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1 mt-0.5">
                              <CheckCheck className="w-3 h-3 text-[#00468f] dark:text-[#aac7ff]" />
                              <span>Delivered</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Mobile Sticky Composer Footer */}
                <footer className="p-2.5 bg-white dark:bg-[#15181C] border-t border-slate-200/80 dark:border-slate-800 space-y-2 shrink-0">
                  {/* Quick Notice chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => insertQuickPhrase('Boundary drainage checked. Looks clear on my side!')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1E2226] text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Drainage Check
                    </button>
                    <button
                      type="button"
                      onClick={() => insertQuickPhrase('Parcel held at guardhouse. Can I collect for you?')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1E2226] text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Parcel Notice
                    </button>
                    <button
                      type="button"
                      onClick={() => insertQuickPhrase('Noted with thanks. Logged to Sime Darby Ops.')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1E2226] text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Logged to Ops
                    </button>
                  </div>

                  {/* Contextual Listing / Service Preview Banner */}
                  {listingContext && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {listingContext.type === 'service' ? (
                          <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                            {listingContext.type === 'service' ? 'Service Inquiry' : 'Exchange Inquiry'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate block">
                            {listingContext.title}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setListingContext(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Attachment Preview if any */}
                  {attachmentPreview && (
                    <div className="p-2 bg-slate-50 dark:bg-[#1E2226] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={attachmentPreview} alt="Preview" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                          {attachedFile?.name || 'Attached Photo'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Textarea + Send row */}
                  <div className="flex items-end gap-1.5 bg-slate-50 dark:bg-[#1E2226] rounded-xl p-1.5 border border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="Attach photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <textarea
                      rows={1}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={`Message ${getRecipientName(activeConv)}...`}
                      className="flex-1 bg-transparent resize-none p-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden max-h-20"
                    />

                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={(!messageInput.trim() && !attachedFile) || isUploadingAttachment}
                      className="p-2 rounded-lg bg-[#ba1b1d] hover:bg-[#94000c] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white transition-all active:scale-95 cursor-pointer"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. MODALS & OVERLAYS */}
      {/* Property Search & Request Modal */}
      <PropertySearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      {/* Key Audit Modal */}
      <KeyAuditModal
        isOpen={isKeyAuditModalOpen}
        onClose={() => setIsKeyAuditModalOpen(false)}
      />

      {/* Photo Lightbox Modal */}
      <PhotoLightboxModal
        imageUrl={lightboxData?.url || null}
        filename={lightboxData?.filename}
        geotag={lightboxData?.geotag}
        onClose={() => setLightboxData(null)}
      />

      {/* Community Bylaws Modal */}
      <BylawsModal
        isOpen={isBylawsModalOpen}
        onClose={() => setIsBylawsModalOpen(false)}
      />

      {/* Temporary Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
}
