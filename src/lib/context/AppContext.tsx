'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserProfile, 
  CommunityPost, 
  PostReply,
  LocalService, 
  CircularExchangeItem, 
  ResilienceIncident, 
  Conversation, 
  Message, 
  ModerationReport, 
  AuditLog,
  PropertyMessageRequest,
  CommunityNotification,
  UserRole,
  PostCategory,
  IncidentStatus,
  IncidentSeverity,
  IncidentType,
  ServiceCategory,
  ServiceType,
  ExchangeCategory,
  ExchangeType,
  ItemCondition,
  ModerationReason,
  ThemeMode,
  UIScalePreset,
  NotificationPreferences,
  NavigationTarget,
  AiModerationItem,
  AiModerationStatus,
  FalsePositiveStats,
  UnifiedModerationCase,
  AnalyticsDataset,
  OperationalAlert,
  AiManagementInsight,
  ManagementReport,
  ManagementReportType,
  ManagementAiChatMessage,
} from '@/types';
import { FEATURES } from '@/config/features';
import { 
  INITIAL_PROFILES, 
  INITIAL_POSTS, 
  INITIAL_COMMENTS,
  INITIAL_RESILIENCE_INCIDENTS, 
  INITIAL_EXCHANGE_ITEMS, 
  INITIAL_SERVICES, 
  INITIAL_CONVERSATIONS, 
  INITIAL_MESSAGES, 
  INITIAL_MODERATION_REPORTS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_MESSAGE_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AI_MODERATION_ITEMS,
  INITIAL_FALSE_POSITIVE_STATS,
} from '@/lib/data/mockData';
import { translations, Language } from '@/lib/i18n/translations';
import { createClient } from '@/lib/supabase/client';
import { validateElminaCoordinates } from '@/lib/utils/elminaBoundary';
import { fromDatabaseUserId } from '@/lib/utils/idMapping';
import type { User } from '@supabase/supabase-js';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.bm) => string;
  isLiveSupabase: boolean;
  schemaReady: boolean;
  schemaErrorMessage: string | null;
  
  // Auth state & User Profile
  supabaseUser: User | null;
  currentUser: UserProfile;
  availableProfiles: UserProfile[];
  isAuthenticated: boolean;
  isDemoMode: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (data: { email: string; password: string; fullName?: string; precinct?: string; unitNumber?: string }) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  tryDemo: () => void;
  switchProfile: (profileId: string) => void;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  updateProfile: (updates: { displayName?: string; phone?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  changeUserRole: (targetUserId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  updateUserAccountStatus: (targetUserId: string, status: 'active' | 'suspended', reason?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Theme & Appearance
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  uiScale: UIScalePreset;
  setUIScale: (scale: UIScalePreset) => void;

  // Notification Preferences
  notificationSettings: NotificationPreferences;
  updateNotificationSettings: (settings: Partial<NotificationPreferences>) => void;

  // Mediated Privacy & Blocking
  blockedUserIds: string[];
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;

  // Navigation & Access Control
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  isAuthorizedForManagement: boolean;
  navigationTarget: NavigationTarget | null;
  navigateToItem: (target: {
    tab: string;
    subTab?: 'services' | 'requests';
    itemId?: string;
    parentId?: string;
    itemType?: 'post' | 'comment' | 'incident' | 'exchange' | 'service';
    action?: 'report_incident';
    conversationId?: string;
    recipientId?: string;
    draftMessage?: string;
    contextTitle?: string;
    contextType?: 'exchange' | 'service' | 'request' | 'general';
    contextId?: string;
    prefill?: {
      category?: IncidentType;
      title?: string;
      description?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
    };
  }) => void;
  clearNavigationTarget: () => void;
  
  // Event RSVP tracking
  rsvpEvents: string[];
  toggleRsvpEvent: (eventId: string, eventTitle?: string) => boolean;
  
  // Community Feed & Persistent Comments
  posts: CommunityPost[];
  comments: { [postId: string]: PostReply[] };
  getPostComments: (postId: string) => PostReply[];
  createPost: (data: { 
    category: PostCategory; 
    title: string; 
    content: string; 
    imageUrl?: string; 
    isAnonymous?: boolean;
    eventDate?: string;
    eventEndDate?: string;
    eventTime?: string;
    eventVenue?: string;
  }) => Promise<void>;
  deletePost: (postId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  togglePinPost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  updatePost: (postId: string, updates: Partial<CommunityPost>) => Promise<{ success: boolean; error?: string }>;
  upvotePost: (postId: string) => void;
  addReply: (postId: string, content: string) => Promise<void>;
  deleteReply: (commentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Incident Map & Resilience
  incidents: ResilienceIncident[];
  reportIncident: (data: {
    incidentType: IncidentType;
    title: string;
    description: string;
    locationName: string;
    latitude: number;
    longitude: number;
    severity: IncidentSeverity;
    imageUrl?: string;
    isAnonymous?: boolean;
  }) => Promise<{ isDuplicate: boolean; duplicateOf?: ResilienceIncident; error?: string; incident?: ResilienceIncident }>;
  updateIncidentStatus: (
    incidentId: string, 
    status: IncidentStatus, 
    note: string, 
    assignedTeam?: string
  ) => Promise<void>;
  verifyIncident: (incidentId: string, notes: string) => Promise<{ success: boolean; error?: string }>;
  approveIncident: (incidentId: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  mergeIncidents: (canonicalId: string, duplicateIds: string[], reason?: string) => Promise<{ success: boolean; error?: string }>;
  rejectIncident: (incidentId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  archiveIncident: (incidentId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Circular Exchange & Local Services
  exchangeItems: CircularExchangeItem[];
  services: LocalService[];
  createExchangeItem: (data: {
    listingType: ExchangeType;
    category: ExchangeCategory;
    title: string;
    description: string;
    condition: ItemCondition;
    imageUrl?: string;
    imageUrls?: string[];
    precinct: string;
    seekingItem?: string;
  }) => Promise<void>;
  reserveExchangeItem: (itemId: string) => Promise<void>;
  completeExchangeItem: (itemId: string) => Promise<void>;
  createService: (data: {
    type: ServiceType;
    category: ServiceCategory;
    title: string;
    description: string;
    priceEstimate?: string;
    imageUrl?: string;
    imageUrls?: string[];
    precinct: string;
    status?: 'active' | 'closed' | 'flagged' | 'open' | 'in_progress' | 'fulfilled';
    urgency?: 'normal' | 'urgent';
    compensationPreference?: string;
    requestedDate?: string;
    availability?: string;
  }) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
  deleteExchangeItem: (itemId: string) => Promise<void>;
  
  // Private Property Messaging
  conversations: Conversation[];
  messages: Message[];
  messageRequests: PropertyMessageRequest[];
  sendMessage: (conversationId: string, content: string, isAnonymous?: boolean, imageUrl?: string) => void;
  getOrCreateConversation: (
    recipientId: string, 
    subject?: string, 
    contextType?: 'service' | 'exchange' | 'management_inquiry' | 'general' | 'property_messaging'
  ) => string | null;
  startConversation: (
    recipientId: string, 
    subject: string, 
    initialMessage: string, 
    contextType?: 'service' | 'exchange' | 'management_inquiry' | 'general' | 'property_messaging'
  ) => string;
  searchProperties: (query: string) => Promise<{ targetId: string; precinct: string; maskedProperty: string }[]>;
  sendPropertyMessageRequest: (data: {
    recipientId: string;
    propertyAddress: string;
    subject: string;
    initialMessage: string;
    isAnonymous: boolean;
    senderDisplayName?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  acceptMessageRequest: (requestId: string) => Promise<string | null>;
  rejectMessageRequest: (requestId: string) => Promise<void>;
  blockPropertySender: (requestId: string) => Promise<void>;
  
  // Community Notification Centre
  notifications: CommunityNotification[];
  unreadNotificationCount: number;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (open: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notif: Omit<CommunityNotification, 'id' | 'createdAt' | 'isRead'>) => void;
  
  // Management & Moderation
  moderationReports: ModerationReport[];
  auditLogs: AuditLog[];
  unifiedCases: UnifiedModerationCase[];
  moderationHealth: any;
  submitModerationReport: (data: {
    targetType: 'post' | 'comment' | 'reply' | 'service' | 'exchange' | 'incident' | 'user';
    targetId: string;
    targetTitle?: string;
    targetContent?: string;
    reason: ModerationReason;
    details?: string;
  }) => Promise<{ success: boolean; isDuplicate?: boolean; error?: string }>;
  resolveModerationReport: (reportId: string, action: 'actioned' | 'dismissed', note: string) => Promise<{ success: boolean; error?: string }>;
  executeCaseAction: (caseId: string, action: 'dismissed' | 'kept' | 'removed' | 'under_review' | 'further_review', note?: string) => Promise<{ success: boolean; error?: string }>;
  refreshModerationCases: () => Promise<void>;
  retryModerationJob: (jobId?: string, retryAllFailed?: boolean) => Promise<{ success: boolean; error?: string }>;
  verifyResidentAccount: (userId: string, approve: boolean) => Promise<void>;
  refreshSupabaseData: () => Promise<void>;
  
  // Phase 3: AI Moderation
  aiModerationQueue: AiModerationItem[];
  falsePositiveStats: FalsePositiveStats[];
  resolveAiModeration: (itemId: string, decision: 'dismissed' | 'kept' | 'removed' | 'further_review', note?: string) => Promise<{ success: boolean; error?: string }>;
  moderateContent: (contentType: 'post' | 'reply' | 'exchange' | 'service', contentId: string, title: string, text: string) => Promise<AiModerationItem | null>;

  // Phase 4: AI Management Intelligence & Analytics
  managementAnalytics: AnalyticsDataset | null;
  operationalAlerts: OperationalAlert[];
  aiInsights: AiManagementInsight[];
  isAiInsightsLoading: boolean;
  isAnalyticsLoading: boolean;
  managementPeriod: '7d' | '30d' | '90d' | 'custom';
  setManagementPeriod: (period: '7d' | '30d' | '90d' | 'custom') => void;
  fetchManagementAnalytics: (period?: '7d' | '30d' | '90d' | 'custom') => Promise<AnalyticsDataset | null>;
  fetchAiInsights: (forceRefresh?: boolean) => Promise<AiManagementInsight[]>;
  askManagementAi: (query: string, history?: any[]) => Promise<ManagementAiChatMessage | null>;
  generateOperationalReport: (type: ManagementReportType) => Promise<ManagementReport | null>;
  acknowledgeOperationalAlert: (alertId: string) => void;
  activeManagementFilter: { targetTab: string; filterKey?: string; filterValue?: string } | null;
  setActiveManagementFilter: (filter: { targetTab: string; filterKey?: string; filterValue?: string } | null) => void;
  navigateToManagementTab: (tab: string, filter?: { filterKey?: string; filterValue?: string }) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tesdh-language') as Language | null;
        if (saved && (saved === 'en' || saved === 'bm' || saved === 'ms-MY')) {
          return saved;
        }
      } catch {}
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('tesdh-language', lang);
    } catch {}
  }, []);

  const t = useCallback((key: keyof typeof translations.en): string => {
    const langKey = language === 'ms-MY' ? 'ms-MY' : language;
    return (
      translations[langKey]?.[key] ||
      translations['ms-MY']?.[key] ||
      translations.bm?.[key] ||
      translations.en[key] ||
      key
    );
  }, [language]);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Restore sidebar collapsed preference on client mount (hydration-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('tesdh-sidebar-collapsed');
      if (saved !== null) {
        setIsSidebarCollapsedState(saved === 'true');
      }
    } catch {}
  }, []);

  const setIsSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem('tesdh-sidebar-collapsed', String(collapsed));
    } catch {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tesdh-sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleMobileNav = useCallback(() => {
    setIsMobileNavOpen((prev) => !prev);
  }, []);

  // Global Event RSVP tracking state (persisted across sessions)
  const [rsvpEvents, setRsvpEvents] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tesdh-rsvp-events');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const toggleRsvpEvent = useCallback((eventId: string, eventTitle?: string): boolean => {
    let isNowRsvpd = false;
    setRsvpEvents((prev) => {
      const exists = prev.includes(eventId);
      isNowRsvpd = !exists;
      const next = exists ? prev.filter((id) => id !== eventId) : [...prev, eventId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('tesdh-rsvp-events', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    return isNowRsvpd;
  }, []);
  
  // Theme state with hydration-safe initial values ('system' default for deterministic SSR/client markup)
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(false);

  // Synchronize persisted theme preferences and OS media queries strictly on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem('tesdh-theme') as ThemeMode | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch {}

    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemPrefersDark(mql.matches);
      const handler = (e: MediaQueryListEvent) => {
        setSystemPrefersDark(e.matches);
      };
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('tesdh-theme', newTheme);
    } catch {}
  }, []);

  // Synchronize documentElement class and style with resolvedTheme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (resolvedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }
  }, [resolvedTheme]);

  // UI Scale state with hydration-safe deterministic initial state
  const [uiScale, setUIScaleState] = useState<UIScalePreset>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedScale = localStorage.getItem('tesdh-ui-scale') as UIScalePreset | null;
      if (savedScale && ['compact', 'default', 'large'].includes(savedScale)) {
        setUIScaleState(savedScale);
      }
    } catch {}
  }, []);

  const setUIScale = useCallback((newScale: UIScalePreset) => {
    setUIScaleState(newScale);
    try {
      localStorage.setItem('tesdh-ui-scale', newScale);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-scale', newScale);
    }
  }, []);

  // Synchronize documentElement attribute data-ui-scale
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-scale', uiScale);
    }
  }, [uiScale]);

  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem('tesdh-notif-prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      muteAll: false,
      incidentAlerts: true,
      communityPosts: true,
      directMessages: true,
      circularExchange: true,
    };
  });

  const updateNotificationSettings = useCallback((updates: Partial<NotificationPreferences>) => {
    setNotificationSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('tesdh-notif-prefs', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Mediated privacy: blocked users list
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tesdh-blocked-users');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['user-devi'];
  });

  const blockUser = useCallback((userId: string) => {
    setBlockedUserIds((prev) => {
      if (prev.includes(userId)) return prev;
      const next = [...prev, userId];
      try {
        localStorage.setItem('tesdh-blocked-users', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const unblockUser = useCallback((userId: string) => {
    setBlockedUserIds((prev) => {
      const next = prev.filter((id) => id !== userId);
      try {
        localStorage.setItem('tesdh-blocked-users', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const DEMO_MODE_CACHE_KEY = 'tesdh-demo-mode-active';
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('tesdh-demo-mode-active') === 'true';
      } catch {}
    }
    return false;
  });
  const isAuthenticated = Boolean(supabaseUser) || isDemoMode;
  const [schemaReady, setSchemaReady] = useState<boolean>(false);
  const [schemaErrorMessage, setSchemaErrorMessage] = useState<string | null>(null);

  // Persistent local cache keys for reliable offline/demo session persistence
  const POSTS_CACHE_KEY = 'tesdh-persisted-posts';
  const COMMENTS_CACHE_KEY = 'tesdh-persisted-comments';
  const INCIDENTS_CACHE_KEY = 'tesdh-persisted-incidents';
  const EXCHANGE_CACHE_KEY = 'tesdh-persisted-exchange';
  const SERVICES_CACHE_KEY = 'tesdh-persisted-services';
  const CONVERSATIONS_CACHE_KEY = 'tesdh-persisted-conversations';
  const MESSAGES_CACHE_KEY = 'tesdh-persisted-messages';
  const MESSAGE_REQUESTS_CACHE_KEY = 'tesdh-persisted-message-requests';
  const PROFILES_CACHE_KEY = 'tesdh-persisted-profiles';
  const ACTIVE_PROFILE_CACHE_KEY = 'tesdh-active-profile-id';

  function getPersistedCache<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(fallback) && Array.isArray(parsed) && parsed.length > 0) {
          return parsed as T;
        }
        if (!Array.isArray(fallback) && typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
          return parsed as T;
        }
      }
    } catch {}
    return fallback;
  }

  const [profiles, setProfiles] = useState<UserProfile[]>(() =>
    getPersistedCache<UserProfile[]>(PROFILES_CACHE_KEY, INITIAL_PROFILES)
  );
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_PROFILES[0]);
  const isSwitchingProfileRef = useRef(false);

  // Restore persisted demo account on client mount (only if no active Supabase user session)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem(ACTIVE_PROFILE_CACHE_KEY);
        if (savedId) {
          const match = INITIAL_PROFILES.find((p) => p.id === savedId) || profiles.find((p) => p.id === savedId);
          if (match) {
            setCurrentUser(match);
          }
        }
      } catch {}
    }
  }, []);
  
  const [posts, setPosts] = useState<CommunityPost[]>(() =>
    getPersistedCache<CommunityPost[]>(POSTS_CACHE_KEY, INITIAL_POSTS)
  );
  
  // Map comments by postId
  const [comments, setComments] = useState<{ [postId: string]: PostReply[] }>(() => {
    const initialMap: { [postId: string]: PostReply[] } = {};
    INITIAL_COMMENTS.forEach((reply) => {
      if (!initialMap[reply.postId]) initialMap[reply.postId] = [];
      initialMap[reply.postId].push(reply);
    });
    return getPersistedCache<{ [postId: string]: PostReply[] }>(COMMENTS_CACHE_KEY, initialMap);
  });

  const [incidents, setIncidents] = useState<ResilienceIncident[]>(() =>
    getPersistedCache<ResilienceIncident[]>(INCIDENTS_CACHE_KEY, INITIAL_RESILIENCE_INCIDENTS)
  );
  const [exchangeItems, setExchangeItems] = useState<CircularExchangeItem[]>(() =>
    getPersistedCache<CircularExchangeItem[]>(EXCHANGE_CACHE_KEY, INITIAL_EXCHANGE_ITEMS)
  );
  const [services, setServices] = useState<LocalService[]>(() =>
    getPersistedCache<LocalService[]>(SERVICES_CACHE_KEY, INITIAL_SERVICES)
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    getPersistedCache<Conversation[]>(CONVERSATIONS_CACHE_KEY, INITIAL_CONVERSATIONS)
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    getPersistedCache<Message[]>(MESSAGES_CACHE_KEY, INITIAL_MESSAGES)
  );
  const [messageRequests, setMessageRequests] = useState<PropertyMessageRequest[]>(() =>
    getPersistedCache<PropertyMessageRequest[]>(MESSAGE_REQUESTS_CACHE_KEY, INITIAL_MESSAGE_REQUESTS)
  );
  const [notifications, setNotifications] = useState<CommunityNotification[]>(INITIAL_NOTIFICATIONS);
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>(INITIAL_MODERATION_REPORTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [aiModerationQueue, setAiModerationQueue] = useState<AiModerationItem[]>(INITIAL_AI_MODERATION_ITEMS);
  const [falsePositiveStats, setFalsePositiveStats] = useState<FalsePositiveStats[]>(INITIAL_FALSE_POSITIVE_STATS);
  const [unifiedCases, setUnifiedCases] = useState<UnifiedModerationCase[]>([]);
  const [moderationHealth, setModerationHealth] = useState<any>(null);

  const supabase = createClient();
  const isAuthorizedForManagement = currentUser.role === 'management';

  // Audit logging utility
  const logAudit = useCallback((
    action: string, 
    targetType: string, 
    targetId: string, 
    details?: Record<string, unknown>
  ) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [currentUser]);
  // Notifications utility
  const addNotification = useCallback((notif: Omit<CommunityNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotif: CommunityNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget | null>(null);

  // Safe navigation with access control
  const handleSetActiveTab = useCallback((tab: string) => {
    // When user manually switches sections, clear any transient search-navigation target
    setNavigationTarget(null);

    if (tab === 'management' && currentUser.role !== 'management') {
      addNotification({
        recipientId: currentUser.id,
        type: 'official_announcement',
        title: 'Access Denied',
        content: 'Township Management Console is restricted to registered JMB management officers.',
        priority: 'urgent',
      });
      return;
    }
    if (tab === 'kiosk' && !FEATURES.ENABLE_KIOSK_MODE) {
      addNotification({
        recipientId: currentUser.id,
        type: 'official_announcement',
        title: 'Kiosk Mode Unavailable',
        content: 'Kiosk mode is temporarily disabled for this development phase.',
        priority: 'urgent',
      });
      setActiveTab('home');
      return;
    }
    setActiveTab(tab);

    // Synchronize URL query parameter for browser history
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        url.searchParams.delete('id');
        url.searchParams.delete('subTab');
        window.history.replaceState(null, '', url.pathname + url.search);
      } catch {}
    }
  }, [currentUser.role, currentUser.id, addNotification]);

  const navigateToItem = useCallback((target: {
    tab: string;
    subTab?: 'services' | 'requests';
    itemId?: string;
    parentId?: string;
    itemType?: 'post' | 'comment' | 'incident' | 'exchange' | 'service';
    action?: 'report_incident';
    conversationId?: string;
    recipientId?: string;
    draftMessage?: string;
    contextTitle?: string;
    contextType?: 'exchange' | 'service' | 'request' | 'general';
    contextId?: string;
    prefill?: {
      category?: IncidentType;
      title?: string;
      description?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
    };
  }) => {
    if (target.tab === 'management' && currentUser.role !== 'management') {
      addNotification({
        recipientId: currentUser.id,
        type: 'official_announcement',
        title: 'Access Denied',
        content: 'Township Management Console is restricted to registered JMB management officers.',
        priority: 'urgent',
      });
      return;
    }
    if (target.tab === 'kiosk' && !FEATURES.ENABLE_KIOSK_MODE) {
      addNotification({
        recipientId: currentUser.id,
        type: 'official_announcement',
        title: 'Kiosk Mode Unavailable',
        content: 'Kiosk mode is temporarily disabled for this development phase.',
        priority: 'urgent',
      });
      setActiveTab('home');
      return;
    }

    setActiveTab(target.tab);
    setNavigationTarget({
      ...target,
      timestamp: Date.now(),
    });

    // Update browser URL query params for stable deep linking
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', target.tab);
        if (target.itemId) url.searchParams.set('id', target.itemId);
        else url.searchParams.delete('id');
        if (target.subTab) url.searchParams.set('subTab', target.subTab);
        else url.searchParams.delete('subTab');
        if (target.conversationId) url.searchParams.set('conversationId', target.conversationId);
        else url.searchParams.delete('conversationId');
        if (target.recipientId) url.searchParams.set('recipientId', target.recipientId);
        else url.searchParams.delete('recipientId');
        window.history.pushState(null, '', url.pathname + url.search);
      } catch {}
    }
  }, [currentUser.role, currentUser.id, addNotification]);

  const clearNavigationTarget = useCallback(() => {
    setNavigationTarget(null);
  }, []);

  // Parse deep link parameters on initial client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const idParam = params.get('id');
      const subTabParam = params.get('subTab') as 'services' | 'requests' | null;

      if (tabParam && ['home', 'feed', 'resilience', 'exchange', 'services', 'messages', 'management', 'settings'].includes(tabParam)) {
        queueMicrotask(() => {
          navigateToItem({
            tab: tabParam,
            itemId: idParam || undefined,
            subTab: subTabParam || undefined,
          });
        });
      }
    } catch {}
  }, [navigateToItem]);

  // Refresh live data from Supabase
  const refreshSupabaseData = useCallback(async () => {
    try {
      // 1. Query public profiles view (safely readable by all authenticated and anonymous clients)
      const { data: profilesData, error: profilesError } = await supabase
        .from('public_profiles')
        .select('*');

      if (profilesError) {
        if (profilesError.code === 'PGRST205' || profilesError.message.includes('schema cache')) {
          setSchemaReady(false);
          setSchemaErrorMessage(
            'Supabase database is connected, but schema tables have not been created yet.'
          );
        } else {
          setSchemaErrorMessage(profilesError.message);
        }
        return;
      }

      setSchemaReady(true);
      setSchemaErrorMessage(null);

      if (profilesData && profilesData.length > 0) {
        const mappedProfiles: UserProfile[] = profilesData.map((p) => ({
          id: p.id,
          fullName: p.full_name,
          displayName: p.display_name || p.full_name?.split(' ')[0] || 'Resident',
          role: p.role,
          townshipPrecinct: p.township_precinct,
          unitNumber: p.unit_number,
          verificationStatus: p.verification_status === 'rejected' ? 'rejected' : 'verified',
          avatarUrl: p.avatar_url,
          createdAt: p.created_at,
        }));

        // Merge remote profiles with INITIAL_PROFILES so canonical demo accounts are never wiped out
        setProfiles((prev) => {
          const merged = [...INITIAL_PROFILES];
          for (const sp of mappedProfiles) {
            const idx = merged.findIndex((p) => p.id === sp.id);
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                ...sp,
                displayName: sp.displayName || merged[idx].displayName,
                avatarUrl: sp.avatarUrl || merged[idx].avatarUrl,
                unitNumber: sp.unitNumber || merged[idx].unitNumber,
              };
            } else {
              merged.push(sp);
            }
          }
          try {
            localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }

      // 2. Query community posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*, author:public_profiles(full_name, township_precinct, role, avatar_url, verification_status)')
        .order('created_at', { ascending: false });

      if (!postsError && postsData && postsData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedPosts: CommunityPost[] = postsData.map((p: any) => ({
          id: p.id,
          authorId: p.author_id,
          authorName: p.is_anonymous ? t('anonymousNeighbour') : (p.author?.full_name || 'Resident'),
          authorPrecinct: p.author?.township_precinct || 'Bandar Elmina',
          authorRole: p.author?.role || 'resident',
          authorAvatar: p.is_anonymous ? undefined : p.author?.avatar_url,
          authorVerified: p.author?.verification_status === 'verified',
          category: p.category,
          title: p.title,
          content: p.content,
          imageUrl: p.image_url,
          isPinned: Boolean(p.is_pinned),
          isAnonymous: Boolean(p.is_anonymous),
          upvotesCount: p.upvotes_count || 0,
          repliesCount: 0,
          status: p.status || 'active',
          createdAt: p.created_at,
          updatedAt: p.updated_at || p.created_at,
        }));
        setPosts(mappedPosts);
        try {
          localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(mappedPosts));
        } catch {}
      }

      // 3. Query comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, author:public_profiles(full_name, township_precinct, role, avatar_url, verification_status)')
        .order('created_at', { ascending: true });

      if (!commentsError && commentsData) {
        const mappedMap: { [postId: string]: PostReply[] } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        commentsData.forEach((c: any) => {
          const reply: PostReply = {
            id: c.id,
            postId: c.post_id,
            authorId: c.author_id,
            authorName: c.author?.full_name || 'Resident',
            authorPrecinct: c.author?.township_precinct || 'Bandar Elmina',
            authorRole: c.author?.role || 'resident',
            authorAvatar: c.author?.avatar_url,
            authorVerified: c.author?.verification_status === 'verified',
            content: c.content,
            isOfficialResponse: Boolean(c.is_official_response),
            createdAt: c.created_at,
            updatedAt: c.created_at,
          };
          if (!mappedMap[reply.postId]) mappedMap[reply.postId] = [];
          mappedMap[reply.postId].push(reply);
        });
        if (commentsData.length > 0) {
          setComments(mappedMap);
          try {
            localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(mappedMap));
          } catch {}
        }
      }

      // 4. Query community reports / resilience incidents
      const { data: reportsData, error: reportsError } = await supabase
        .from('community_reports')
        .select('*, reporter:public_profiles(full_name, township_precinct, role)')
        .order('created_at', { ascending: false });

      if (!reportsError && reportsData && reportsData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedReports: ResilienceIncident[] = reportsData.map((r: any) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reporterName: r.is_anonymous ? 'Anonymous Neighbour' : (r.reporter?.full_name || 'Resident'),
          reporterPrecinct: r.reporter?.township_precinct || 'Bandar Elmina',
          incidentType: r.report_type || 'flood',
          title: r.title,
          description: r.description,
          locationName: r.location_name,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          severity: r.severity || 'medium',
          status: r.status || 'pending',
          isVerified: r.status === 'under_review' || r.status === 'dispatched' || r.status === 'resolved',
          isAnonymous: Boolean(r.is_anonymous),
          assignedTeam: r.assigned_team,
          managementNotes: r.management_notes,
          updates: [
            {
              id: `upd-${r.id}`,
              incidentId: r.id,
              authorName: r.is_anonymous ? 'Anonymous Neighbour' : (r.reporter?.full_name || 'Resident'),
              authorRole: 'resident',
              statusFrom: undefined,
              statusTo: r.status,
              note: r.description,
              createdAt: r.created_at,
            },
          ],
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
        }));
        setIncidents(mappedReports);
        try {
          localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(mappedReports));
        } catch {}
      }

      // 5. Query circular exchange listings
      const { data: exchangeData, error: exchangeError } = await supabase
        .from('exchange_listings')
        .select('*, author:public_profiles!exchange_listings_author_id_fkey(full_name, township_precinct, verification_status)')
        .order('created_at', { ascending: false });

      if (!exchangeError && exchangeData && exchangeData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedExchange: CircularExchangeItem[] = exchangeData.map((e: any) => ({
          id: e.id,
          authorId: fromDatabaseUserId(e.author_id),
          authorName: e.author?.full_name || 'Resident',
          authorPrecinct: e.author?.township_precinct || e.precinct,
          authorVerified: e.author?.verification_status === 'verified',
          listingType: e.listing_type || 'giveaway',
          category: e.category || 'others',
          title: e.title,
          description: e.description,
          condition: e.condition || 'good',
          imageUrl: e.image_url,
          imageUrls: e.image_url ? [e.image_url] : [],
          precinct: e.precinct,
          status: e.status || 'available',
          reservedById: e.reserved_by_id,
          createdAt: e.created_at,
        }));
        setExchangeItems(mappedExchange);
        try {
          localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify(mappedExchange));
        } catch {}
      }

      // 6. Query local services
      const { data: servicesData, error: servicesError } = await supabase
        .from('service_listings')
        .select('*, author:public_profiles(full_name, township_precinct, verification_status)')
        .order('created_at', { ascending: false });

      if (!servicesError && servicesData && servicesData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedServices: LocalService[] = servicesData.map((s: any) => ({
          id: s.id,
          authorId: fromDatabaseUserId(s.author_id),
          authorName: s.author?.full_name || 'Resident',
          authorPrecinct: s.author?.township_precinct || s.precinct,
          authorVerified: s.author?.verification_status === 'verified',
          type: s.type || 'offering',
          category: s.category || 'home_services',
          title: s.title,
          description: s.description,
          priceEstimate: s.price_estimate,
          precinct: s.precinct,
          status: s.status || 'active',
          createdAt: s.created_at,
        }));
        setServices(mappedServices);
        try {
          localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(mappedServices));
        } catch {}
      }

      // 7. Synchronize unified database state across all connected devices via /api/sync
      try {
        const apiRes = await fetch('/api/sync', {
          headers: { 'x-tesdh-session': currentUser.id },
        });
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson?.success && apiJson?.data) {
            const { incidents: sInc, posts: sPosts, comments: sComm, exchange: sEx, services: sServ, conversations: sConv, messages: sMsg, messageRequests: sMsgReq } = apiJson.data;
            if (sInc && sInc.length > 0) {
              setIncidents(sInc);
              try { localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(sInc)); } catch {}
            }
            if (sPosts && sPosts.length > 0) {
              setPosts(sPosts);
              try { localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(sPosts)); } catch {}
            }
            if (sComm && Object.keys(sComm).length > 0) {
              setComments(sComm);
              try { localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(sComm)); } catch {}
            }
            if (sEx && sEx.length > 0) {
              setExchangeItems(sEx);
              try { localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify(sEx)); } catch {}
            }
            if (sServ && sServ.length > 0) {
              setServices(sServ);
              try { localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(sServ)); } catch {}
            }
            if (sConv && sConv.length > 0) {
              setConversations((prev) => {
                const map = new Map<string, Conversation>();
                prev.forEach((c) => map.set(c.id, c));
                sConv.forEach((c: Conversation) => map.set(c.id, c));
                const merged = Array.from(map.values());
                try { localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(merged)); } catch {}
                return merged;
              });
            }
            if (sMsg && sMsg.length > 0) {
              setMessages((prev) => {
                const map = new Map<string, Message>();
                prev.forEach((m) => map.set(m.id, m));
                sMsg.forEach((m: Message) => map.set(m.id, m));
                const merged = Array.from(map.values());
                try { localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(merged)); } catch {}
                return merged;
              });
            }
            if (sMsgReq && sMsgReq.length > 0) {
              setMessageRequests((prev) => {
                const map = new Map<string, PropertyMessageRequest>();
                prev.forEach((r) => map.set(r.id, r));
                sMsgReq.forEach((r: PropertyMessageRequest) => map.set(r.id, r));
                const merged = Array.from(map.values());
                try { localStorage.setItem(MESSAGE_REQUESTS_CACHE_KEY, JSON.stringify(merged)); } catch {}
                return merged;
              });
            }
          }
        }
      } catch (apiErr) {
        // Fallback to local cache if offline
      }
    } catch (err: unknown) {
      setSchemaErrorMessage(err instanceof Error ? err.message : 'Error syncing Supabase.');
    }
  }, [supabase, t]);

  // Init auth and Realtime Sync
  useEffect(() => {
    async function initAuth() {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setSupabaseUser(data.user);
        const meta = data.user.user_metadata || {};
        const userProfile: UserProfile = {
          id: data.user.id,
          fullName: meta.full_name || 'Verified Resident',
          displayName: meta.display_name || meta.full_name?.split(' ')[0] || 'Resident',
          role: meta.role || 'resident',
          townshipPrecinct: meta.township_precinct || 'Bandar Elmina',
          unitNumber: meta.unit_number,
          phone: meta.phone,
          verificationStatus: 'verified', // Registered account basic status
          createdAt: data.user.created_at,
        };
        setCurrentUser(userProfile);
      }
      refreshSupabaseData();
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && session.user) {
          setSupabaseUser(session.user);
          const meta = session.user.user_metadata || {};
          const userProfile: UserProfile = {
            id: session.user.id,
            fullName: meta.full_name || 'Verified Resident',
            displayName: meta.display_name || meta.full_name?.split(' ')[0] || 'Resident',
            role: meta.role || 'resident',
            townshipPrecinct: meta.township_precinct || 'Bandar Elmina',
            unitNumber: meta.unit_number,
            phone: meta.phone,
            verificationStatus: 'verified', // Registered account basic status
            createdAt: session.user.created_at,
          };
          setCurrentUser(userProfile);
        } else {
          setSupabaseUser(null);
        }
      }
    );

    // Supabase Realtime synchronization channel (Postgres Changes + Multi-device Broadcast)
    const realtimeChannel = supabase
      .channel('tesdh-live-sync')
      .on('broadcast', { event: 'tesdh-sync' }, (event) => {
        console.log('[Realtime] Live cross-device sync event received:', event);
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_reports' }, () => {
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_listings' }, () => {
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_listings' }, () => {
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        refreshSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        refreshSupabaseData();
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(realtimeChannel);
    };
  }, [supabase, refreshSupabaseData]);

  // Profile switching for demo accounts
  const switchProfile = async (profileId: string) => {
    if (isSwitchingProfileRef.current) return;
    isSwitchingProfileRef.current = true;

    try {
      const selected = profiles.find((p) => p.id === profileId) || INITIAL_PROFILES.find((p) => p.id === profileId);
      if (!selected) {
        console.warn(`[switchProfile] Target demo profile "${profileId}" was not found.`);
        addNotification({
          recipientId: currentUser.id,
          type: 'official_announcement',
          title: t('switchProfileError') || 'Account Switch Failed',
          content: `Selected demo account "${profileId}" could not be found.`,
          priority: 'urgent',
        });
        return;
      }

      // If an authenticated Supabase user session exists, cleanly sign out to prevent credential/session leakage
      if (supabaseUser) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('Error signing out Supabase user session during demo switch:', e);
        }
        setSupabaseUser(null);
      }

      // Update current user
      setCurrentUser(selected);

      // Persist active demo profile in localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ACTIVE_PROFILE_CACHE_KEY, selected.id);
        } catch {}
      }

      // Invalidate management console view if switching to a non-management persona
      if (selected.role !== 'management' && activeTab === 'management') {
        handleSetActiveTab('home');
      }

      // Clear search navigation targets
      setNavigationTarget(null);

      // Refresh data and permissions for the newly active persona
      try {
        await refreshSupabaseData();
      } catch (e) {
        console.warn('[switchProfile] Refresh warning:', e);
      }

      // Log audit trail
      logAudit('DEMO_ACCOUNT_SWITCH', 'profiles', selected.id, {
        fromId: currentUser.id,
        fromRole: currentUser.role,
        toId: selected.id,
        toRole: selected.role,
      });
    } finally {
      isSwitchingProfileRef.current = false;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        setSupabaseUser(data.user);
        setIsDemoMode(false);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(DEMO_MODE_CACHE_KEY);
          } catch {}
        }
        await refreshSupabaseData();
        return { success: true };
      }
      return { success: false, error: 'Sign in failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred during sign in.' };
    }
  };

  const signUpWithEmail = async (data: {
    email: string;
    password: string;
    fullName?: string;
    precinct?: string;
    unitNumber?: string;
  }) => {
    try {
      const derivedName = data.fullName?.trim() || data.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: derivedName,
            township_precinct: data.precinct || 'Bandar Elmina',
            unit_number: data.unitNumber || null,
            role: 'resident',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const precinct = data.precinct || 'Elmina Valley 1 (EV1)';
      const unitNumber = data.unitNumber?.trim() || null;
      const effectiveUser = authData.session?.user || authData.user;

      const userProfile: UserProfile = {
        id: effectiveUser?.id || `user-${Date.now()}`,
        fullName: derivedName,
        displayName: derivedName.split(' ')[0],
        role: 'resident',
        townshipPrecinct: precinct,
        unitNumber: unitNumber || undefined,
        verificationStatus: 'verified',
        createdAt: effectiveUser?.created_at || new Date().toISOString(),
      };

      // Check if session was returned directly (e.g. email confirmation disabled / direct registration)
      if (authData.session && authData.user) {
        setSupabaseUser(authData.user);
        setIsDemoMode(false);
        setCurrentUser(userProfile);
        setProfiles((prev) => {
          const updated = [...prev.filter((p) => p.id !== userProfile.id), userProfile];
          try { localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });

        if (unitNumber) {
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tesdh-session': authData.user.id },
            body: JSON.stringify({
              action: 'REGISTER_PROPERTY_ADDRESS',
              payload: {
                userId: authData.user.id,
                unitNumber,
                precinct,
                fullName: derivedName,
              },
            }),
          }).catch(() => {});
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(DEMO_MODE_CACHE_KEY);
          } catch {}
        }
        await refreshSupabaseData();
        return { success: true, requiresEmailConfirmation: false };
      }

      // If user is created, attempt immediate sign-in with password (instant access)
      if (authData.user) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (signInData?.session && signInData?.user) {
          setSupabaseUser(signInData.user);
          setIsDemoMode(false);
          const authedProfile: UserProfile = { ...userProfile, id: signInData.user.id };
          setCurrentUser(authedProfile);
          setProfiles((prev) => {
            const updated = [...prev.filter((p) => p.id !== authedProfile.id), authedProfile];
            try { localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(updated)); } catch {}
            return updated;
          });

          if (unitNumber) {
            fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-tesdh-session': signInData.user.id },
              body: JSON.stringify({
                action: 'REGISTER_PROPERTY_ADDRESS',
                payload: {
                  userId: signInData.user.id,
                  unitNumber,
                  precinct,
                  fullName: derivedName,
                },
              }),
            }).catch(() => {});
          }

          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(DEMO_MODE_CACHE_KEY);
            } catch {}
          }
          await refreshSupabaseData();
          return { success: true, requiresEmailConfirmation: false };
        }

        // If Supabase rejected signIn due to email confirmation setting still active on hosted server
        if (signInError && signInError.message.toLowerCase().includes('email not confirmed')) {
          return { 
            success: false, 
            error: 'Account registered! However, email confirmation is currently active in your Supabase project settings. Please turn OFF "Confirm Email" in Supabase Dashboard -> Authentication -> Providers -> Email to allow direct instant login.' 
          };
        }
      }

      return { success: true, requiresEmailConfirmation: false };
    } catch (err: any) {
      return { success: false, error: err.message || 'Sign up failed.' };
    }
  };

  const tryDemo = () => {
    setIsDemoMode(true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DEMO_MODE_CACHE_KEY, 'true');
        localStorage.setItem(ACTIVE_PROFILE_CACHE_KEY, INITIAL_PROFILES[0].id);
      } catch {}
    }
    setCurrentUser(INITIAL_PROFILES[0]);
    setActiveTab('home');
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setSupabaseUser(null);
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ACTIVE_PROFILE_CACHE_KEY);
        localStorage.removeItem(DEMO_MODE_CACHE_KEY);
      } catch {}
    }
    setCurrentUser(INITIAL_PROFILES[0]);
    setConversations([]);
    setMessages([]);
    setNavigationTarget(null);
    setActiveTab('home');
  };

  // Profile Editing (Residents can only edit nickname, phone, avatar)
  const updateProfile = async (updates: { displayName?: string; phone?: string; avatarUrl?: string }) => {
    const validatedNickname = updates.displayName ? updates.displayName.trim().slice(0, 30) : currentUser.displayName;
    const validatedPhone = updates.phone ? updates.phone.trim() : currentUser.phone;

    if (validatedNickname.length < 2) {
      return { success: false, error: 'Display name / nickname must be at least 2 characters long.' };
    }

    const updatedUser: UserProfile = {
      ...currentUser,
      displayName: validatedNickname,
      phone: validatedPhone,
      avatarUrl: updates.avatarUrl || currentUser.avatarUrl,
    };

    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map((p) => (p.id === currentUser.id ? updatedUser : p)));

    if (schemaReady && supabaseUser) {
      await supabase
        .from('profiles')
        .update({
          display_name: validatedNickname,
          phone: validatedPhone,
          avatar_url: updates.avatarUrl || currentUser.avatarUrl,
        })
        .eq('id', currentUser.id);
    }

    logAudit('UPDATE_PROFILE', 'profiles', currentUser.id, {
      updatedFields: Object.keys(updates),
    });

    return { success: true };
  };

  // Change user role (Management only)
  const changeUserRole = async (targetUserId: string, newRole: UserRole) => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management staff are authorized to change user roles.' };
    }

    // Protection: Prevent demoting or removing the last remaining Management account
    if (newRole !== 'management') {
      const remainingManagement = profiles.filter((p) => p.role === 'management' && p.id !== targetUserId);
      if (remainingManagement.length === 0) {
        return { success: false, error: 'Security Protection: Cannot demote the last remaining Management account.' };
      }
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === targetUserId ? { ...p, role: newRole } : p))
    );

    if (currentUser.id === targetUserId) {
      setCurrentUser((prev) => ({ ...prev, role: newRole }));
    }

    if (schemaReady) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
    }

    logAudit('CHANGE_USER_ROLE', 'profiles', targetUserId, { newRole });
    return { success: true };
  };

  // Update resident account status (Active / Suspended) (Management only)
  const updateUserAccountStatus = async (targetUserId: string, status: 'active' | 'suspended', reason?: string) => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management staff are authorized to update account status.' };
    }

    if (status === 'suspended') {
      const target = profiles.find((p) => p.id === targetUserId);
      if (target?.role === 'management') {
        const remainingManagement = profiles.filter((p) => p.role === 'management' && p.id !== targetUserId && p.status !== 'suspended');
        if (remainingManagement.length === 0) {
          return { success: false, error: 'Security Protection: Cannot suspend the last active Management account.' };
        }
      }
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === targetUserId ? { ...p, status, restrictionReason: reason } : p))
    );

    if (currentUser.id === targetUserId) {
      setCurrentUser((prev) => ({ ...prev, status, restrictionReason: reason }));
    }

    logAudit('UPDATE_ACCOUNT_STATUS', 'profiles', targetUserId, { status, reason: reason || 'N/A' });
    return { success: true };
  };

  // Comments
  const getPostComments = (postId: string) => comments[postId] || [];

  const addReply = async (postId: string, content: string) => {
    if (!content.trim()) return;

    const isOfficial = currentUser.role === 'management' || currentUser.role === 'security';
    const newReply: PostReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      postId,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorPrecinct: currentUser.townshipPrecinct,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatarUrl,
      authorVerified: currentUser.verificationStatus === 'verified',
      content: content.trim(),
      isOfficialResponse: isOfficial,
      createdAt: new Date().toISOString(),
    };

    let savedReply = newReply;
    try {
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_COMMENT',
          payload: {
            postId,
            content: content.trim(),
            isOfficialResponse: isOfficial,
          },
          user: currentUser,
        }),
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson?.success && syncJson?.data) {
          savedReply = { ...newReply, ...syncJson.data };
        }
      }
    } catch (syncErr) {
      console.warn('[Sync] /api/sync ADD_COMMENT fallback:', syncErr);
    }

    // Update comments with persistence
    setComments((prev) => {
      const existing = prev[postId] || [];
      const next = {
        ...prev,
        [postId]: [...existing.filter((r) => r.id !== savedReply.id), savedReply],
      };
      try {
        localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setPosts((prev) => {
      const next = prev.map((post) =>
        post.id === postId ? { ...post, repliesCount: (post.repliesCount || 0) + 1 } : post
      );
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Emits notification to post author
    const post = posts.find((p) => p.id === postId);
    if (post && post.authorId !== currentUser.id) {
      addNotification({
        recipientId: post.authorId,
        senderId: currentUser.id,
        type: isOfficial ? 'official_announcement' : 'message_reply',
        title: isOfficial ? 'Official Response Received' : 'New Comment on Your Post',
        content: `${currentUser.displayName}: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
        priority: isOfficial ? 'urgent' : 'normal',
        targetTab: 'feed',
        targetId: postId,
      });
    }

    logAudit('POST_COMMENT', 'comments', newReply.id, { postId, isOfficial });
    moderateContent('reply', newReply.id, '', content.trim()).catch(() => {});
  };

  // Delete Comment (Owner or Management)
  const deleteReply = async (
    commentId: string, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    let targetPostId: string | null = null;
    let targetReply: PostReply | null = null;

    for (const [postId, replyList] of Object.entries(comments)) {
      const match = replyList.find((r) => r.id === commentId);
      if (match) {
        targetPostId = postId;
        targetReply = match;
        break;
      }
    }

    if (!targetReply || !targetPostId) {
      return { success: false, error: 'Comment not found.' };
    }

    const isOwner = targetReply.authorId === currentUser.id;
    const isManagement = currentUser.role === 'management';

    if (!isOwner && !isManagement) {
      return {
        success: false,
        error: 'Access denied: Only the author or township management can delete this comment.',
      };
    }

    const moderationReason = reason || (isManagement && !isOwner ? 'Removed by Management Moderation' : 'Deleted by author');

    // Remove from comments list immediately
    setComments((prev) => {
      const next = {
        ...prev,
        [targetPostId!]: (prev[targetPostId!] || []).filter((r) => r.id !== commentId),
      };
      try {
        localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Decrement parent post repliesCount
    setPosts((prev) => {
      const next = prev.map((p) =>
        p.id === targetPostId
          ? { ...p, repliesCount: Math.max(0, (p.repliesCount || 1) - 1) }
          : p
      );
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Supabase sync
    if (schemaReady && supabaseUser) {
      try {
        await supabase.from('comments').delete().eq('id', commentId);
      } catch (err) {
        console.error('Error syncing comment deletion to Supabase:', err);
      }
    }

    // Audit log
    const auditAction = isManagement && !isOwner ? 'MODERATE_DELETE_COMMENT' : 'DELETE_OWN_COMMENT';
    logAudit(auditAction, 'comments', commentId, {
      postId: targetPostId,
      authorId: targetReply.authorId,
      reason: moderationReason,
      isManagement,
    });

    return { success: true };
  };

  // Community Feed Actions
  const createPost = async (data: { 
    category: PostCategory; 
    title: string; 
    content: string; 
    imageUrl?: string; 
    isAnonymous?: boolean;
    eventDate?: string;
    eventEndDate?: string;
    eventTime?: string;
    eventVenue?: string;
  }) => {
    const isAnonymous = Boolean(data.isAnonymous && data.category === 'complaint');

    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorName: isAnonymous ? t('anonymousNeighbour') : (currentUser.displayName || currentUser.fullName),
      authorPrecinct: currentUser.townshipPrecinct,
      authorRole: currentUser.role,
      authorAvatar: isAnonymous ? undefined : currentUser.avatarUrl,
      authorVerified: currentUser.verificationStatus === 'verified',
      category: data.category,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      isPinned: data.category === 'announcement' || data.category === 'security_alert',
      isAnonymous,
      upvotesCount: 0,
      upvotedByCurrentUser: false,
      repliesCount: 0,
      status: 'active',
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventDate: data.eventDate,
      eventEndDate: data.eventEndDate,
      eventTime: data.eventTime,
      eventVenue: data.eventVenue,
    };

    let savedPost = newPost;
    try {
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_POST',
          payload: {
            ...data,
            isAnonymous,
          },
          user: currentUser,
        }),
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson?.success && syncJson?.data) {
          savedPost = {
            ...newPost,
            ...syncJson.data,
            authorName: newPost.authorName,
            authorPrecinct: newPost.authorPrecinct,
            authorRole: newPost.authorRole,
            authorAvatar: newPost.authorAvatar,
            authorVerified: newPost.authorVerified,
            eventDate: data.eventDate,
            eventEndDate: data.eventEndDate,
            eventTime: data.eventTime,
            eventVenue: data.eventVenue,
          };
        }
      }
    } catch (syncErr) {
      console.warn('[Sync] /api/sync CREATE_POST fallback:', syncErr);
    }

    setPosts((prev) => {
      const next = [savedPost, ...prev.filter((p) => p.id !== savedPost.id)];
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('CREATE_POST', 'community_posts', savedPost.id, { 
      category: data.category, 
      isAnonymous 
    });

    moderateContent('post', savedPost.id, data.title, data.content).catch(() => {});
  };

  // Delete Post (Owner or Management)
  const deletePost = async (
    postId: string, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { success: false, error: 'Post not found.' };
    }

    const isOwner = post.authorId === currentUser.id;
    const isManagement = currentUser.role === 'management';

    if (!isOwner && !isManagement) {
      return {
        success: false,
        error: 'Access denied: Only the author or township management can delete this post.',
      };
    }

    const moderationReason = reason || (isManagement && !isOwner ? 'Removed by Management Moderation' : 'Deleted by author');

    // Remove from active public feed immediately
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== postId);
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Handle replies consistently (clean up comment map for this post)
    setComments((prev) => {
      const next = { ...prev };
      delete next[postId];
      try {
        localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Sync to Supabase via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_POST',
          payload: { postId },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync DELETE_POST fallback:', syncErr);
    }

    // Audit log
    const auditAction = isManagement && !isOwner ? 'MODERATE_DELETE_POST' : 'DELETE_OWN_POST';
    logAudit(auditAction, 'community_posts', postId, {
      postTitle: post.title,
      authorId: post.authorId,
      reason: moderationReason,
      isManagement,
    });

    return { success: true };
  };

  // Toggle Pin Post / Notice (Management only)
  const togglePinPost = async (postId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management can pin or unpin notices.' };
    }

    let isNowPinned = false;
    setPosts((prev) => {
      const next = prev.map((p) => {
        if (p.id === postId) {
          isNowPinned = !p.isPinned;
          return { ...p, isPinned: !p.isPinned };
        }
        return p;
      });
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('TOGGLE_PIN_POST', 'community_posts', postId, { isPinned: isNowPinned });
    return { success: true };
  };

  // Update Post / Notice / Event Details (Owner or Management)
  const updatePost = async (
    postId: string, 
    updates: Partial<CommunityPost>
  ): Promise<{ success: boolean; error?: string }> => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return { success: false, error: 'Post not found.' };

    const isOwner = post.authorId === currentUser.id;
    const isManagement = currentUser.role === 'management';

    if (!isOwner && !isManagement) {
      return { success: false, error: 'Access denied: Only author or management can edit this content.' };
    }

    setPosts((prev) => {
      const next = prev.map((p) => {
        if (p.id === postId) {
          return { ...p, ...updates, updatedAt: new Date().toISOString(), isEdited: true };
        }
        return p;
      });
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('UPDATE_POST', 'community_posts', postId, { updates });
    return { success: true };
  };

  const upvotePost = async (postId: string) => {
    let nextCount = 0;
    setPosts((prev) => {
      const next = prev.map((post) => {
        if (post.id === postId) {
          const currentlyUpvoted = post.upvotedByCurrentUser;
          nextCount = currentlyUpvoted ? Math.max(0, post.upvotesCount - 1) : post.upvotesCount + 1;
          return {
            ...post,
            upvotesCount: nextCount,
            upvotedByCurrentUser: !currentlyUpvoted,
          };
        }
        return post;
      });
      try {
        localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Sync upvote via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPVOTE_POST',
          payload: { postId },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync UPVOTE_POST fallback:', syncErr);
    }
  };

  // Helper to map IncidentType to Supabase report_type constraint
  const mapToSupabaseReportType = (type: string): string => {
    switch (type) {
      case 'flash_flood':
      case 'flood':
        return 'flood';
      case 'blocked_drain':
        return 'blocked_drain';
      case 'fallen_tree':
        return 'fallen_tree';
      case 'pothole':
        return 'pothole';
      case 'street_light':
        return 'street_light';
      case 'water_disruption':
        return 'water_disruption';
      case 'misconduct':
        return 'misconduct';
      case 'spam':
        return 'spam';
      default:
        return 'other';
    }
  };

  // Resilience Incident Reporting with Elmina Boundary Check
  const reportIncident = async (data: {
    incidentType: IncidentType;
    title: string;
    description: string;
    locationName: string;
    latitude: number;
    longitude: number;
    severity: IncidentSeverity;
    imageUrl?: string;
    isAnonymous?: boolean;
  }): Promise<{ isDuplicate: boolean; duplicateOf?: ResilienceIncident; error?: string; incident?: ResilienceIncident }> => {
    // 1. Strict Boundary Validation
    const validation = validateElminaCoordinates(data.latitude, data.longitude);
    if (!validation.isValid) {
      return { isDuplicate: false, error: validation.message };
    }

    // 2. Duplicate Detection
    const duplicateCandidate = incidents.find((inc) => {
      if (inc.status === 'resolved' || inc.isArchived) return false;
      const latDiff = Math.abs(inc.latitude - data.latitude);
      const lngDiff = Math.abs(inc.longitude - data.longitude);
      const isNearby = latDiff < 0.003 && lngDiff < 0.003;
      const sameType = inc.incidentType === data.incidentType;
      return isNearby && sameType;
    });
    const isDuplicate = Boolean(duplicateCandidate);
    const duplicateOf = duplicateCandidate;

    const newIncident: ResilienceIncident = {
      id: `inc-${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: data.isAnonymous ? t('anonymousNeighbour') : currentUser.fullName,
      reporterPrecinct: currentUser.townshipPrecinct,
      incidentType: data.incidentType,
      title: data.title,
      description: data.description,
      locationName: data.locationName || validation.nearestPrecinct || 'Bandar Elmina Area',
      latitude: data.latitude,
      longitude: data.longitude,
      severity: data.severity,
      status: 'pending',
      isVerified: false,
      imageUrl: data.imageUrl,
      isAnonymous: Boolean(data.isAnonymous),
      updates: [
        {
          id: `upd-${Date.now()}`,
          incidentId: `inc-${Date.now()}`,
          authorName: data.isAnonymous ? t('anonymousNeighbour') : currentUser.fullName,
          authorRole: currentUser.role,
          statusFrom: undefined,
          statusTo: 'pending',
          note: 'Incident report submitted for Management review and approval.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let savedIncident = newIncident;
    try {
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action: 'REPORT_INCIDENT',
          payload: {
            ...data,
            locationName: newIncident.locationName,
            isAnonymous: Boolean(data.isAnonymous),
          },
          user: currentUser,
        }),
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson?.success && syncJson?.data) {
          savedIncident = {
            ...newIncident,
            ...syncJson.data,
            updates: newIncident.updates,
          };
        }
      }
    } catch (syncErr) {
      console.warn('[Sync] /api/sync REPORT_INCIDENT fallback:', syncErr);
    }

    setIncidents((prev) => {
      const next = [savedIncident, ...prev.filter((i) => i.id !== savedIncident.id)];
      try {
        localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('REPORT_INCIDENT', 'community_reports', savedIncident.id, {
      type: data.incidentType,
      severity: data.severity,
      isDuplicate,
      status: 'pending',
    });

    return { isDuplicate, duplicateOf, incident: savedIncident };
  };

  // Incident Verification & Approval (Strictly Management Role)
  const verifyIncident = async (incidentId: string, notes: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management staff are authorized to verify incidents.' };
    }

    const verifiedAt = new Date().toISOString();
    setIncidents((prev) => {
      const next = prev.map((inc) => {
        if (inc.id === incidentId) {
          const updateRecord = {
            id: `upd-${Date.now()}`,
            incidentId,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            statusFrom: inc.status,
            statusTo: 'under_review' as IncidentStatus,
            note: `Incident verified & approved by JMB Management Office: ${notes}`,
            createdAt: verifiedAt,
          };

          return {
            ...inc,
            status: 'under_review' as IncidentStatus,
            isVerified: true,
            verifiedBy: currentUser.id,
            verifiedByName: currentUser.fullName,
            verifiedAt,
            verificationNotes: notes,
            updates: [updateRecord, ...inc.updates],
            updatedAt: verifiedAt,
          };
        }
        return inc;
      });
      try {
        localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    const targetIncident = incidents.find((i) => i.id === incidentId);
    if (targetIncident) {
      addNotification({
        recipientId: 'all',
        senderId: currentUser.id,
        type: 'verified_incident_alert',
        title: `ALERT: VERIFIED INCIDENT - ${targetIncident.title}`,
        content: `Location: ${targetIncident.locationName} (${targetIncident.severity.toUpperCase()}). Verification note: ${notes}`,
        priority: 'critical',
        targetTab: 'resilience',
        targetId: incidentId,
      });
    }

    // Sync to Supabase via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action: 'APPROVE_INCIDENT',
          payload: { incidentId, notes, verifiedBy: currentUser.fullName },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync APPROVE_INCIDENT fallback:', syncErr);
    }

    logAudit('APPROVE_INCIDENT', 'community_reports', incidentId, {
      verifiedBy: currentUser.fullName,
      notes,
    });

    return { success: true };
  };

  const approveIncident = async (incidentId: string, notes?: string): Promise<{ success: boolean; error?: string }> => {
    return verifyIncident(incidentId, notes || 'Approved for public visibility and dispatch by Township Management.');
  };

  const rejectIncident = async (incidentId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management staff can reject incidents.' };
    }

    setIncidents((prev) => {
      const next = prev.map((inc) => (inc.id === incidentId ? { ...inc, status: 'rejected' as IncidentStatus, isVerified: false, managementNotes: `Rejected by Management: ${reason}` } : inc));
      try {
        localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action: 'REJECT_INCIDENT',
          payload: { incidentId, reason },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync REJECT_INCIDENT fallback:', syncErr);
    }

    logAudit('REJECT_INCIDENT', 'community_reports', incidentId, { reason });
    return { success: true };
  };

  // AI-Assisted Duplicate Incident Merging (Part 6)
  const mergeIncidents = async (
    canonicalId: string, 
    duplicateIds: string[], 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management staff are authorized to merge incident reports.' };
    }

    const mergeReason = reason || 'Consolidated duplicate hazard report';
    const now = new Date().toISOString();

    setIncidents((prev) => {
      const next = prev.map((inc) => {
        if (duplicateIds.includes(inc.id)) {
          return {
            ...inc,
            status: 'resolved' as IncidentStatus,
            parentIncidentId: canonicalId,
            isMerged: true,
            duplicateReason: mergeReason,
            mergedAt: now,
            mergedBy: currentUser.fullName,
            updatedAt: now,
          };
        }
        if (inc.id === canonicalId) {
          return {
            ...inc,
            mergedIncidentIds: Array.from(new Set([...(inc.mergedIncidentIds || []), ...duplicateIds])),
            managementNotes: `[Consolidated ${duplicateIds.length} duplicate report(s)] ${mergeReason}`,
            updatedAt: now,
          };
        }
        return inc;
      });
      try {
        localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MERGE_INCIDENTS',
          payload: { canonicalId, duplicateIds, reason: mergeReason },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync MERGE_INCIDENTS fallback:', syncErr);
    }

    logAudit('MERGE_INCIDENTS', 'community_reports', canonicalId, {
      duplicateIds,
      reason: mergeReason,
    });

    return { success: true };
  };

  // Archive Resolved Incident (Management Only, Soft Deletion with Audit Trail)
  const archiveIncident = async (incidentId: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Role Enforcement: Only management users can archive resolved incidents
    if (currentUser.role !== 'management') {
      return { 
        success: false, 
        error: 'Access denied: Only authorized township management officers may archive resolved incidents.' 
      };
    }

    const target = incidents.find((i) => i.id === incidentId);
    if (!target) {
      return { success: false, error: 'Incident record not found.' };
    }

    // 2. Status Enforcement: Only resolved incidents can be archived
    if (target.status !== 'resolved') {
      return {
        success: false,
        error: 'Validation failed: Only resolved incidents can be archived from active maps and public feeds.',
      };
    }

    const nowIso = new Date().toISOString();
    const updateRecord = {
      id: `upd-${Date.now()}`,
      incidentId,
      authorName: currentUser.fullName,
      authorRole: currentUser.role,
      statusFrom: target.status,
      statusTo: target.status,
      note: 'Incident archived from active maps and public incident feeds by Township Management.',
      createdAt: nowIso,
    };

    // Soft archive: Never permanently delete incident records. Preserve full history.
    setIncidents((prev) => {
      const next = prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              isArchived: true,
              archivedAt: nowIso,
              archivedBy: currentUser.id,
              archivedByName: currentUser.fullName,
              updates: [updateRecord, ...inc.updates],
              updatedAt: nowIso,
            }
          : inc
      );
      try {
        localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Sync to Supabase via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_INCIDENT',
          payload: { incidentId, notes: 'Archived by management' },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync archiveIncident fallback:', syncErr);
    }

    // Audit logging
    logAudit('ARCHIVE_RESOLVED_INCIDENT', 'community_reports', incidentId, {
      incidentTitle: target.title,
      archivedBy: currentUser.fullName,
      archivedAt: nowIso,
    });

    return { success: true };
  };

  const updateIncidentStatus = async (
    incidentId: string, 
    status: IncidentStatus, 
    note: string, 
    assignedTeam?: string
  ) => {
    const timestamp = new Date().toISOString();

    // Sync to Supabase via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_INCIDENT_STATUS',
          payload: { incidentId, status, note, assignedTeam },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync updateIncidentStatus fallback:', syncErr);
    }

    setIncidents((prev) => {
      const next = prev.map((inc) => {
        if (inc.id === incidentId) {
          const updateRecord = {
            id: `upd-${Date.now()}`,
            incidentId,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            statusFrom: inc.status,
            statusTo: status,
            note,
            createdAt: timestamp,
          };

          return {
            ...inc,
            status,
            assignedTeam: assignedTeam || inc.assignedTeam,
            managementNotes: note,
            resolvedAt: status === 'resolved' ? timestamp : inc.resolvedAt,
            updates: [updateRecord, ...inc.updates],
            updatedAt: timestamp,
          };
        }
        return inc;
      });
      try {
        localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('UPDATE_INCIDENT_STATUS', 'community_reports', incidentId, {
      newStatus: status,
      note,
      assignedTeam,
    });
  };

  // Circular Exchange Items
  const createExchangeItem = async (data: {
    listingType: ExchangeType;
    category: ExchangeCategory;
    title: string;
    description: string;
    condition: ItemCondition;
    imageUrl?: string;
    imageUrls?: string[];
    precinct: string;
    seekingItem?: string;
  }) => {
    const resolvedImageUrls = data.imageUrls && data.imageUrls.length > 0 
      ? data.imageUrls 
      : (data.imageUrl ? [data.imageUrl] : []);
    const primaryImage = resolvedImageUrls[0] || data.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80';

    const newItem: CircularExchangeItem = {
      id: `exch-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorPrecinct: data.precinct || currentUser.townshipPrecinct,
      authorVerified: currentUser.verificationStatus === 'verified',
      listingType: data.listingType,
      category: data.category,
      title: data.title,
      description: data.description,
      condition: data.condition,
      imageUrl: primaryImage,
      imageUrls: resolvedImageUrls,
      precinct: data.precinct || currentUser.townshipPrecinct,
      seekingItem: data.seekingItem,
      status: 'available',
      createdAt: new Date().toISOString(),
    };

    let savedItem = newItem;
    try {
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_EXCHANGE',
          payload: {
            ...data,
            imageUrl: primaryImage,
            imageUrls: resolvedImageUrls,
          },
          user: currentUser,
        }),
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson?.success && syncJson?.data) {
          savedItem = {
            ...newItem,
            ...syncJson.data,
            authorName: newItem.authorName,
            authorPrecinct: newItem.authorPrecinct,
            authorVerified: newItem.authorVerified,
          };
        }
      }
    } catch (syncErr) {
      console.warn('[Sync] /api/sync CREATE_EXCHANGE fallback:', syncErr);
    }

    setExchangeItems((prev) => {
      const next = [savedItem, ...prev.filter((i) => i.id !== savedItem.id)];
      try {
        localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('CREATE_EXCHANGE_ITEM', 'exchange_listings', savedItem.id, {
      type: data.listingType,
      category: data.category,
      photoCount: resolvedImageUrls.length,
    });

    moderateContent('exchange', savedItem.id, data.title, data.description).catch(() => {});
  };

  const reserveExchangeItem = async (itemId: string) => {
    // Sync to Supabase via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESERVE_EXCHANGE',
          payload: { itemId, reservedById: currentUser.id },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync RESERVE_EXCHANGE fallback:', syncErr);
    }

    setExchangeItems((prev) => {
      const next = prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            status: 'reserved' as const,
            reservedById: currentUser.id,
            reservedByName: currentUser.displayName,
          };
        }
        return item;
      });
      try {
        localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('RESERVE_EXCHANGE_ITEM', 'exchange_listings', itemId, {
      reservedBy: currentUser.id,
    });
  };

  const completeExchangeItem = async (itemId: string) => {
    if (schemaReady && supabaseUser) {
      try {
        await supabase.from('exchange_listings').update({
          status: 'completed',
        }).eq('id', itemId);
      } catch (err) {
        console.error('Error completing exchange item in Supabase:', err);
      }
    }

    setExchangeItems((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, status: 'completed' as const } : item));
      try {
        localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('COMPLETE_EXCHANGE_ITEM', 'exchange_listings', itemId);
  };

  const deleteExchangeItem = async (itemId: string) => {
    if (schemaReady && supabaseUser) {
      try {
        await supabase.from('exchange_listings').delete().eq('id', itemId);
      } catch (err) {
        console.error('Error deleting exchange item from Supabase:', err);
      }
    }

    setExchangeItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      try {
        localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('DELETE_EXCHANGE_ITEM', 'exchange_listings', itemId);
  };

  // Local Services
  const createService = async (data: {
    type: ServiceType;
    category: ServiceCategory;
    title: string;
    description: string;
    priceEstimate?: string;
    imageUrl?: string;
    imageUrls?: string[];
    precinct: string;
    status?: 'active' | 'closed' | 'flagged' | 'open' | 'in_progress' | 'fulfilled';
    urgency?: 'normal' | 'urgent';
    compensationPreference?: string;
    requestedDate?: string;
    availability?: string;
  }) => {
    const primaryImage = data.imageUrls?.[0] || data.imageUrl;
    const resolvedImageUrls = data.imageUrls && data.imageUrls.length > 0
      ? data.imageUrls
      : primaryImage
      ? [primaryImage]
      : [];

    const newService: LocalService = {
      id: `serv-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.displayName || currentUser.fullName,
      authorPrecinct: data.precinct || currentUser.townshipPrecinct,
      authorVerified: currentUser.verificationStatus === 'verified',
      type: data.type,
      category: data.category,
      title: data.title,
      description: data.description,
      priceEstimate: data.priceEstimate,
      imageUrl: primaryImage,
      imageUrls: resolvedImageUrls,
      precinct: data.precinct || currentUser.townshipPrecinct,
      status: data.status || (data.type === 'requesting' ? 'open' : 'active'),
      urgency: data.urgency,
      compensationPreference: data.compensationPreference,
      requestedDate: data.requestedDate,
      availability: data.availability,
      createdAt: new Date().toISOString(),
    };

    let savedService = newService;
    try {
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SERVICE',
          payload: {
            ...data,
            imageUrl: primaryImage,
            imageUrls: resolvedImageUrls,
          },
          user: currentUser,
        }),
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson?.success && syncJson?.data) {
          savedService = {
            ...newService,
            ...syncJson.data,
            authorName: newService.authorName,
            authorPrecinct: newService.authorPrecinct,
            authorVerified: newService.authorVerified,
          };
        }
      }
    } catch (syncErr) {
      console.warn('[Sync] /api/sync CREATE_SERVICE fallback:', syncErr);
    }

    setServices((prev) => {
      const next = [savedService, ...prev.filter((s) => s.id !== savedService.id)];
      try {
        localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('CREATE_SERVICE', 'service_listings', savedService.id, {
      type: data.type,
      category: data.category,
      hasPhoto: Boolean(primaryImage),
    });

    moderateContent('service', savedService.id, data.title, data.description).catch(() => {});
  };

  const deleteService = async (serviceId: string) => {
    // Sync to Supabase via /api/sync
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_SERVICE',
          payload: { serviceId },
          user: currentUser,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync] /api/sync DELETE_SERVICE fallback:', syncErr);
    }

    setServices((prev) => {
      const next = prev.filter((s) => s.id !== serviceId);
      try {
        localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logAudit('DELETE_SERVICE', 'service_listings', serviceId);
  };

  // Private Property Messaging & Privacy Shield
  const searchProperties = async (query: string) => {
    const clean = query.trim().toLowerCase();
    if (clean.length < 2) return [];

    // 1. Query remote registered properties from /api/sync
    let remoteMatches: Array<{ targetId: string; precinct: string; maskedProperty: string }> = [];
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action: 'SEARCH_PROPERTIES',
          payload: { query: clean },
          user: currentUser,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success) {
          const list = Array.isArray(json?.data?.results)
            ? json.data.results
            : Array.isArray(json?.data)
              ? json.data
              : [];
          if (list.length > 0) {
            remoteMatches = list;
          }
        }
      }
    } catch (e) {
      console.warn('[searchProperties] Remote lookup fallback:', e);
    }

    // 2. Normalization helper: strips common punctuation, normalizes street and unit abbreviations
    const norm = (str: string) =>
      str
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\b(no|nomor|unit|jln|jalan|lorong)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizedQuery = norm(clean);
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);

    // 3. Search local profiles
    const localMatches = profiles
      .filter((p) => p.id !== currentUser.id)
      .filter((p) => {
        const unit = p.unitNumber ? norm(p.unitNumber) : '';
        const precinct = norm(p.townshipPrecinct || '');
        const combined = `${unit} ${precinct}`;

        if (combined.includes(normalizedQuery) || (unit && unit.includes(normalizedQuery))) {
          return true;
        }
        return queryTokens.length > 0 && queryTokens.every((token) => combined.includes(token));
      })
      .map((p) => ({
        targetId: p.id,
        precinct: p.townshipPrecinct,
        maskedProperty: p.unitNumber || `Residence ${p.townshipPrecinct}`,
      }));

    // 4. Merge remote and local matches without duplicates
    const combined = [...remoteMatches];
    localMatches.forEach((lm) => {
      if (!combined.some((c) => c.targetId === lm.targetId)) {
        combined.push(lm);
      }
    });

    return combined.slice(0, 8);
  };

  const sendPropertyMessageRequest = async (data: {
    recipientId: string;
    propertyAddress: string;
    subject: string;
    initialMessage: string;
    isAnonymous: boolean;
    senderDisplayName?: string;
  }) => {
    // Check daily rate limits (max 5 requests per day)
    const today = new Date().toDateString();
    const todayRequests = messageRequests.filter(
      (r) => r.senderId === currentUser.id && new Date(r.createdAt).toDateString() === today
    );

    if (todayRequests.length >= 5) {
      return { 
        success: false, 
        error: 'Daily limit reached. You are only allowed to send up to 5 private message requests per day.' 
      };
    }

    // Check if recipient has blocked this sender or has pending
    const existing = messageRequests.find(
      (r) => r.senderId === currentUser.id && r.recipientId === data.recipientId && r.status === 'pending'
    );
    if (existing) {
      return { success: false, error: 'Your message request to this residence is still pending resident approval.' };
    }

    const newRequest: PropertyMessageRequest = {
      id: `req-${Date.now()}`,
      senderId: currentUser.id,
      recipientId: data.recipientId,
      propertyAddress: data.propertyAddress,
      subject: data.subject,
      initialMessage: data.initialMessage,
      isAnonymous: data.isAnonymous,
      senderDisplayName: data.isAnonymous ? 'Elmina Neighbour (Anonymous)' : (data.senderDisplayName || currentUser.displayName),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setMessageRequests((prev) => {
      const updated = [newRequest, ...prev];
      try { localStorage.setItem(MESSAGE_REQUESTS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Send notification to recipient
    addNotification({
      recipientId: data.recipientId,
      senderId: currentUser.id,
      type: 'message_request',
      title: 'New Private Message Request',
      content: `Request from ${newRequest.senderDisplayName} for ${data.propertyAddress}: "${data.subject}"`,
      priority: 'normal',
      targetTab: 'messages',
      targetId: newRequest.id,
    });

    logAudit('SEND_MESSAGE_REQUEST', 'property_message_requests', newRequest.id, {
      propertyAddress: data.propertyAddress,
      isAnonymous: data.isAnonymous,
    });

    // Sync message request to database & shared state
    fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tesdh-session': currentUser.id,
      },
      body: JSON.stringify({
        action: 'SEND_MESSAGE_REQUEST',
        payload: { request: newRequest },
        user: currentUser,
      }),
    }).catch((err) => console.warn('[Sync] /api/sync SEND_MESSAGE_REQUEST fallback:', err));

    return { success: true };
  };

  const acceptMessageRequest = async (requestId: string): Promise<string | null> => {
    let resolvedConvId: string | null = null;
    let resolvedConv: Conversation | null = null;
    let resolvedMsg: Message | null = null;

    try {
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action: 'ACCEPT_MESSAGE_REQUEST',
          payload: { requestId },
          user: currentUser,
        }),
      });

      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson?.success && syncJson?.data?.conversationId) {
          resolvedConvId = syncJson.data.conversationId;
          resolvedConv = syncJson.data.conversation;
          resolvedMsg = syncJson.data.initialMessage;
        }
      }
    } catch (syncErr) {
      console.warn('[Sync] /api/sync ACCEPT_MESSAGE_REQUEST fallback:', syncErr);
    }

    const req = messageRequests.find((r) => r.id === requestId);
    if (!req && !resolvedConvId) return null;

    const convId = resolvedConvId || `conv-${Date.now()}`;
    const newConv: Conversation = resolvedConv || {
      id: convId,
      participantOneId: req!.senderId,
      participantOneName: req!.senderDisplayName || 'Resident Neighbour',
      participantTwoId: currentUser.id,
      participantTwoName: currentUser.displayName,
      subject: req!.subject,
      contextType: 'property_messaging',
      status: 'accepted',
      lastMessage: req!.initialMessage,
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };

    // Add initial message
    const initialMsg: Message = resolvedMsg || {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderId: req!.senderId,
      senderName: req!.senderDisplayName || 'Neighbour',
      isAnonymous: req!.isAnonymous,
      content: req!.initialMessage,
      createdAt: req!.createdAt,
    };

    setMessageRequests((prev) => {
      const updated = prev.map((r) => (r.id === requestId ? { ...r, status: 'accepted' as const, conversationId: convId } : r));
      try { localStorage.setItem(MESSAGE_REQUESTS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setConversations((prev) => {
      const updated = [newConv, ...prev.filter((c) => c.id !== newConv.id)];
      try { localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setMessages((prev) => {
      const updated = [...prev.filter((m) => m.id !== initialMsg.id), initialMsg];
      try { localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    navigateToItem({ tab: 'messages', conversationId: convId });

    // Notify sender that request was accepted
    if (req) {
      addNotification({
        recipientId: req.senderId,
        senderId: currentUser.id,
        type: 'message_reply',
        title: 'Message Request Accepted',
        content: `The resident at ${req.propertyAddress} has accepted your conversation request. You can now exchange messages securely.`,
        priority: 'normal',
        targetTab: 'messages',
        targetId: convId,
      });
    }

    logAudit('ACCEPT_MESSAGE_REQUEST', 'property_message_requests', requestId, { conversationId: convId });
    return convId;
  };

  const rejectMessageRequest = async (requestId: string) => {
    setMessageRequests((prev) => {
      const updated = prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' as const } : r));
      try { localStorage.setItem(MESSAGE_REQUESTS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tesdh-session': currentUser.id,
      },
      body: JSON.stringify({
        action: 'REJECT_MESSAGE_REQUEST',
        payload: { requestId },
        user: currentUser,
      }),
    }).catch(() => {});
    logAudit('REJECT_MESSAGE_REQUEST', 'property_message_requests', requestId);
  };

  const blockPropertySender = async (requestId: string) => {
    setMessageRequests((prev) => {
      const updated = prev.map((r) => (r.id === requestId ? { ...r, status: 'blocked' as const } : r));
      try { localStorage.setItem(MESSAGE_REQUESTS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    logAudit('BLOCK_PROPERTY_SENDER', 'property_message_requests', requestId);
  };

  const sendMessage = (conversationId: string, content: string, isAnonymous = false, imageUrl?: string) => {
    if (!conversationId) return;

    const senderDisplayName = isAnonymous 
      ? 'Elmina Neighbour (Anonymous)' 
      : currentUser.displayName;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: senderDisplayName,
      senderAvatar: isAnonymous ? undefined : currentUser.avatarUrl,
      isAnonymous,
      content: content || '',
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updated = [...prev.filter((m) => m.id !== newMsg.id), newMsg];
      try { localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId
          ? { 
              ...c, 
              lastMessage: content || (imageUrl ? '📷 Photo attached' : ''), 
              lastMessageTime: new Date().toISOString() 
            }
          : c
      );
      try { localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Notify other participant if conversation exists
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      const recipientId = conv.participantOneId === currentUser.id ? conv.participantTwoId : conv.participantOneId;
      addNotification({
        recipientId,
        senderId: currentUser.id,
        type: 'message_reply',
        title: `New Message from ${senderDisplayName}`,
        content: content ? content.slice(0, 80) : 'Sent a secure photo attachment.',
        priority: 'normal',
        targetTab: 'messages',
        targetId: conversationId,
      });
    }

    // Sync message across devices via /api/sync
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tesdh-session': currentUser.id },
      body: JSON.stringify({
        action: 'SEND_MESSAGE',
        payload: { conversationId, content, isAnonymous, imageUrl },
        user: currentUser,
      }),
    }).catch((err) => console.warn('[Sync] /api/sync SEND_MESSAGE fallback:', err));
  };

  const getOrCreateConversation = useCallback((
    recipientId: string, 
    subject?: string, 
    contextType?: 'service' | 'exchange' | 'management_inquiry' | 'general' | 'property_messaging'
  ): string | null => {
    const targetPersonaId = fromDatabaseUserId(recipientId);
    
    // Check self-messaging: resident cannot message themselves
    if (recipientId === currentUser.id || targetPersonaId === currentUser.id) {
      return null;
    }

    // Check blocked status
    if (currentUser.blockedUserIds && (currentUser.blockedUserIds.includes(recipientId) || currentUser.blockedUserIds.includes(targetPersonaId))) {
      return null;
    }

    const recipient = profiles.find((p) => p.id === recipientId || p.id === targetPersonaId) || 
      INITIAL_PROFILES.find((p) => p.id === targetPersonaId) || {
        id: targetPersonaId,
        displayName: 'Resident',
        fullName: 'Resident',
      };

    const existing = conversations.find(
      (c) => 
        (c.participantOneId === currentUser.id && (c.participantTwoId === recipientId || c.participantTwoId === targetPersonaId)) ||
        ((c.participantOneId === recipientId || c.participantOneId === targetPersonaId) && c.participantTwoId === currentUser.id)
    );

    if (existing) {
      return existing.id;
    }

    const newConvId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      participantOneId: currentUser.id,
      participantOneName: currentUser.displayName,
      participantTwoId: recipient.id,
      participantTwoName: recipient.displayName || recipient.fullName || 'Resident',
      subject: subject || 'Direct Message',
      contextType: contextType || 'general',
      status: 'accepted',
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };

    setConversations((prev) => [newConv, ...prev]);

    // Sync new conversation across devices via /api/sync with authenticated session
    fetch('/api/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tesdh-session': currentUser.id,
      },
      body: JSON.stringify({
        action: 'START_CONVERSATION',
        payload: { conversation: newConv },
        user: currentUser,
      }),
    }).catch((err) => console.warn('[Sync] /api/sync START_CONVERSATION fallback:', err));

    return newConvId;
  }, [currentUser, profiles, conversations]);

  const startConversation = (
    recipientId: string, 
    subject: string, 
    initialMessage: string, 
    contextType?: 'service' | 'exchange' | 'management_inquiry' | 'general' | 'property_messaging'
  ): string => {
    const targetPersonaId = fromDatabaseUserId(recipientId);
    if (recipientId === currentUser.id || targetPersonaId === currentUser.id) {
      return '';
    }

    const recipient = profiles.find((p) => p.id === recipientId || p.id === targetPersonaId) || 
      INITIAL_PROFILES.find((p) => p.id === targetPersonaId) || {
        id: targetPersonaId,
        displayName: 'Resident',
        fullName: 'Resident',
      };

    const existing = conversations.find(
      (c) => 
        (c.participantOneId === currentUser.id && (c.participantTwoId === recipientId || c.participantTwoId === targetPersonaId)) ||
        ((c.participantOneId === recipientId || c.participantOneId === targetPersonaId) && c.participantTwoId === currentUser.id)
    );

    const convId = existing ? existing.id : `conv-${Date.now()}`;
    const cleanInitialMessage = initialMessage ? initialMessage.trim() : '';

    if (!existing) {
      const newConv: Conversation = {
        id: convId,
        participantOneId: currentUser.id,
        participantOneName: currentUser.displayName,
        participantTwoId: recipient.id,
        participantTwoName: recipient.displayName || recipient.fullName || 'Resident',
        subject: subject || 'Direct Message',
        contextType: contextType || 'general',
        status: 'accepted',
        lastMessage: cleanInitialMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);

      // Sync conversation and initial message atomically to server/Supabase
      fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          action: 'START_CONVERSATION',
          payload: { conversation: newConv, initialMessage: cleanInitialMessage },
          user: currentUser,
        }),
      }).catch((err) => console.warn('[Sync] /api/sync START_CONVERSATION fallback:', err));
    }

    if (cleanInitialMessage) {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatarUrl,
        isAnonymous: false,
        content: cleanInitialMessage,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== newMsg.id), newMsg]);
      
      // If conversation already existed, sync the initial message
      if (existing) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tesdh-session': currentUser.id },
          body: JSON.stringify({
            action: 'SEND_MESSAGE',
            payload: { conversationId: convId, content: cleanInitialMessage },
            user: currentUser,
          }),
        }).catch(() => {});
      }
    }

    return convId;
  };

  // Notification Centre Management
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientId === currentUser.id || n.recipientId === 'all'
          ? { ...n, isRead: true }
          : n
      )
    );
  };

  const unreadNotificationCount = notifications.filter(
    (n) => !n.isRead && (n.recipientId === currentUser.id || n.recipientId === 'all')
  ).length;

  // Moderation & Verification
  // Moderation & Verification
  const refreshModerationCases = useCallback(async () => {
    try {
      const res = await fetch('/api/moderation/cases', {
        headers: { 'x-tesdh-session': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.cases)) setUnifiedCases(data.cases);
          if (Array.isArray(data.reports)) setModerationReports(data.reports);
          if (Array.isArray(data.aiQueue)) setAiModerationQueue(data.aiQueue);
          if (Array.isArray(data.falsePositiveStats)) setFalsePositiveStats(data.falsePositiveStats);
          if (data.health) setModerationHealth(data.health);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh moderation cases:', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (currentUser.role === 'management') {
      refreshModerationCases();
    }
  }, [currentUser.role, refreshModerationCases]);

  const submitModerationReport = useCallback(async (data: {
    targetType: 'post' | 'comment' | 'reply' | 'service' | 'exchange' | 'incident' | 'user';
    targetId: string;
    targetTitle?: string;
    targetContent?: string;
    reason: ModerationReason;
    details?: string;
  }): Promise<{ success: boolean; isDuplicate?: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to submit report' };
      }

      if (json.report) {
        setModerationReports((prev) => [json.report, ...prev.filter((r) => r.id !== json.report.id)]);
      }
      if (json.unifiedCase) {
        setUnifiedCases((prev) => [
          json.unifiedCase,
          ...prev.filter((c) => c.id !== json.unifiedCase.id && !(c.targetType === json.unifiedCase.targetType && c.targetId === json.unifiedCase.targetId))
        ]);
      }
      logAudit('REPORT_CONTENT', data.targetType, data.targetId, { reason: data.reason });
      return { success: true, isDuplicate: Boolean(json.isDuplicate) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network failure' };
    }
  }, [currentUser.id, logAudit]);

  const resolveModerationReport = useCallback(async (
    reportId: string, 
    action: 'actioned' | 'dismissed', 
    note: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only management staff can resolve reports.' };
    }

    try {
      await fetch('/api/moderation/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          reportId,
          action: action === 'actioned' ? 'kept' : 'dismissed',
          note,
        }),
      });

      setModerationReports((prev) =>
        prev.map((rep) =>
          rep.id === reportId
            ? { ...rep, status: action, reviewedBy: currentUser.fullName, resolutionNote: note }
            : rep
        )
      );

      logAudit('MODERATION_ACTION', 'moderation_report', reportId, {
        decision: action,
        note,
      });

      await refreshModerationCases();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update report' };
    }
  }, [currentUser, logAudit, refreshModerationCases]);

  const executeCaseAction = useCallback(async (
    caseId: string,
    action: 'dismissed' | 'kept' | 'removed' | 'under_review' | 'further_review',
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Management permission required' };
    }

    const c = unifiedCases.find((item) => item.id === caseId);
    if (!c) return { success: false, error: 'Case not found' };

    try {
      const res = await fetch('/api/moderation/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          caseId,
          targetId: c.targetId,
          targetType: c.targetType,
          action,
          note,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        return { success: false, error: json.error };
      }

      if (action === 'removed') {
        if (c.targetType === 'post') {
          await deletePost(c.targetId, note || 'Removed by Management Moderation');
        } else if (c.targetType === 'reply' || c.targetType === 'comment') {
          await deleteReply(c.targetId, note || 'Removed by Management Moderation');
        } else if (c.targetType === 'exchange') {
          await deleteExchangeItem(c.targetId);
        } else if (c.targetType === 'service') {
          await deleteService(c.targetId);
        }
      }

      await refreshModerationCases();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Action failed' };
    }
  }, [currentUser, unifiedCases, deletePost, deleteReply, deleteExchangeItem, deleteService, refreshModerationCases]);

  const retryModerationJob = useCallback(async (
    jobId?: string, 
    retryAllFailed?: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Management access required' };
    }
    try {
      const res = await fetch('/api/moderation/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({ jobId, retryAllFailed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshModerationCases();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Job retry failed' };
    }
  }, [currentUser.id, refreshModerationCases]);

  // Phase 3: AI Content Moderation Implementation
  const moderateContent = useCallback(async (
    contentType: 'post' | 'reply' | 'exchange' | 'service',
    contentId: string,
    title: string,
    text: string
  ): Promise<AiModerationItem | null> => {
    try {
      const res = await fetch('/api/ai/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          contentType,
          contentId,
          contentTitle: title,
          contentText: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          const item: AiModerationItem = data.result;
          if (item.flaggedCategory !== 'safe') {
            setAiModerationQueue((prev) => {
              const existingIdx = prev.findIndex((q) => q.contentId === contentId);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = item;
                return next;
              }
              return [item, ...prev];
            });
          }
          if (currentUser.role === 'management') {
            refreshModerationCases().catch(() => {});
          }
          return item;
        }
      }
    } catch (err) {
      console.warn('AI moderation scan encountered an error; flagging content as pending review for safety:', err);
    }
    return null;
  }, [currentUser.id, currentUser.role, refreshModerationCases]);

  const resolveAiModeration = useCallback(async (
    itemId: string,
    decision: 'dismissed' | 'kept' | 'removed' | 'further_review',
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'management') {
      return { success: false, error: 'Access denied: Only authorized management staff can review moderation items.' };
    }

    const item = aiModerationQueue.find((q) => q.id === itemId);
    if (!item) {
      return { success: false, error: 'Moderation item not found in queue.' };
    }

    const now = new Date().toISOString();
    let nextStatus: AiModerationStatus = 'reviewed';
    if (decision === 'dismissed') {
      nextStatus = 'dismissed';
      if (item.flaggedCategory !== 'safe') {
        setFalsePositiveStats((prev) =>
          prev.map((s) => s.category === item.flaggedCategory ? { ...s, count: s.count + 1, lastDismissedAt: now } : s)
        );
      }
    } else if (decision === 'kept') {
      nextStatus = 'actioned';
    } else if (decision === 'removed') {
      nextStatus = 'actioned';
      if (item.contentType === 'post') {
        await deletePost(item.contentId, note || 'Removed by Management Moderation');
      } else if (item.contentType === 'exchange') {
        await deleteExchangeItem(item.contentId);
      } else if (item.contentType === 'service') {
        await deleteService(item.contentId);
      } else if (item.contentType === 'reply') {
        await deleteReply(item.contentId, note || 'Removed by Management Moderation');
      }
    } else if (decision === 'further_review') {
      nextStatus = 'under_review';
    }

    setAiModerationQueue((prev) =>
      prev.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: nextStatus,
              decision,
              reviewedBy: currentUser.fullName,
              resolutionNote: note || `Management decision: ${decision}`,
              reviewedAt: now,
            }
          : q
      )
    );

    // Call server action endpoint to ensure server-side persistence
    try {
      await fetch('/api/ai/moderate/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          itemId,
          decision,
          note: note || `Management decision: ${decision}`,
        }),
      });
      await refreshModerationCases();
    } catch {
      // Local optimistic update already applied
    }

    logAudit('AI_MODERATION_ACTION', item.contentType, item.contentId, {
      decision,
      note,
      category: item.flaggedCategory,
      riskLevel: item.riskLevel,
    });

    return { success: true };
  }, [currentUser, aiModerationQueue, deletePost, deleteExchangeItem, deleteService, deleteReply, logAudit, refreshModerationCases]);

  const verifyResidentAccount = async (userId: string, approve: boolean) => {
    if (currentUser.role !== 'management') return;

    const newStatus = approve ? 'verified' : 'rejected';
    
    if (schemaReady) {
      await supabase.from('profiles').update({
        verification_status: newStatus,
      }).eq('id', userId);
      await refreshSupabaseData();
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, verificationStatus: newStatus } : p))
    );

    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, verificationStatus: newStatus }));
    }

    addNotification({
      recipientId: userId,
      senderId: currentUser.id,
      type: 'verification_status_update',
      title: approve ? 'Resident Account Verified' : 'Verification Request Declined',
      content: approve 
        ? 'Congratulations! Your resident account has been verified by the Management Office. Full community access is now unlocked.' 
        : 'Your verification request could not be processed. Please contact the management office counter for document review.',
      priority: approve ? 'normal' : 'urgent',
    });

    logAudit(approve ? 'APPROVE_RESIDENT_VERIFICATION' : 'REJECT_RESIDENT_VERIFICATION', 'profiles', userId, {
      newStatus,
    });
  };

  // ============================================================================
  // Phase 4: Management Intelligence, Advanced Analytics & Operational Alerts
  // ============================================================================
  const [managementAnalytics, setManagementAnalytics] = useState<AnalyticsDataset | null>(null);
  const [operationalAlerts, setOperationalAlerts] = useState<OperationalAlert[]>([]);
  const [aiInsights, setAiInsights] = useState<AiManagementInsight[]>([]);
  const [isAiInsightsLoading, setIsAiInsightsLoading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [managementPeriod, setManagementPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [activeManagementFilter, setActiveManagementFilter] = useState<{ targetTab: string; filterKey?: string; filterValue?: string } | null>(null);

  const navigateToManagementTab = useCallback((tab: string, filter?: { filterKey?: string; filterValue?: string }) => {
    setActiveManagementFilter(filter ? { targetTab: tab, ...filter } : null);
    handleSetActiveTab('management');
  }, [handleSetActiveTab]);

  const fetchManagementAnalytics = useCallback(async (
    period: '7d' | '30d' | '90d' | 'custom' = managementPeriod
  ): Promise<AnalyticsDataset | null> => {
    setIsAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/management/analytics?period=${period}`, {
        headers: { 'x-tesdh-session': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.dataset) {
          setManagementAnalytics(data.dataset);
        }
        if (data.alerts && Array.isArray(data.alerts)) {
          setOperationalAlerts(data.alerts);
        }
        return data.dataset;
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
    return null;
  }, [currentUser.id, managementPeriod]);

  const fetchAiInsights = useCallback(async (forceRefresh = false): Promise<AiManagementInsight[]> => {
    setIsAiInsightsLoading(true);
    try {
      const res = await fetch('/api/management/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({ period: managementPeriod, forceRefresh }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.insights && Array.isArray(data.insights)) {
          setAiInsights(data.insights);
          return data.insights;
        }
      }
    } catch (err) {
      console.warn('AI Insights fetch error:', err);
    } finally {
      setIsAiInsightsLoading(false);
    }
    return [];
  }, [currentUser.id, managementPeriod]);

  const askManagementAi = useCallback(async (
    query: string, 
    history: any[] = []
  ): Promise<ManagementAiChatMessage | null> => {
    try {
      const res = await fetch('/api/management/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({ query, history, language }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.message || null;
      }
    } catch (err) {
      console.warn('Management Assistant error:', err);
    }
    return null;
  }, [currentUser.id, language]);

  const generateOperationalReport = useCallback(async (
    type: ManagementReportType
  ): Promise<ManagementReport | null> => {
    try {
      const res = await fetch('/api/management/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({ type, period: managementPeriod }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.report || null;
      }
    } catch (err) {
      console.warn('Report generation error:', err);
    }
    return null;
  }, [currentUser.id, managementPeriod]);

  const acknowledgeOperationalAlert = useCallback((alertId: string) => {
    setOperationalAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged', acknowledgedBy: currentUser.fullName, acknowledgedAt: new Date().toISOString() } : a))
    );
  }, [currentUser.fullName]);

  // Initial fetch for management when active user has management role
  useEffect(() => {
    if (currentUser.role === 'management') {
      fetchManagementAnalytics(managementPeriod).catch(() => {});
      fetchAiInsights(false).catch(() => {});
    }
  }, [currentUser.role, managementPeriod, fetchManagementAnalytics, fetchAiInsights]);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLiveSupabase: true,
        schemaReady,
        schemaErrorMessage,
        supabaseUser,
        currentUser,
        availableProfiles: profiles,
        isAuthenticated,
        isDemoMode,
        signInWithEmail,
        signUpWithEmail,
        tryDemo,
        switchProfile,
        signOut,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        updateProfile,
        changeUserRole,
        updateUserAccountStatus,
        theme,
        resolvedTheme,
        setTheme,
        uiScale,
        setUIScale,
        notificationSettings,
        updateNotificationSettings,
        blockedUserIds,
        blockUser,
        unblockUser,
        activeTab,
        setActiveTab: handleSetActiveTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isMobileNavOpen,
        setIsMobileNavOpen,
        toggleMobileNav,
        isAuthorizedForManagement,
        navigationTarget,
        navigateToItem,
        clearNavigationTarget,
        rsvpEvents,
        toggleRsvpEvent,
        posts,
        comments,
        getPostComments,
        createPost,
        deletePost,
        togglePinPost,
        updatePost,
        upvotePost,
        addReply,
        deleteReply,
        incidents,
        reportIncident,
        updateIncidentStatus,
        verifyIncident,
        approveIncident,
        mergeIncidents,
        rejectIncident,
        archiveIncident,
        exchangeItems,
        services,
        createExchangeItem,
        reserveExchangeItem,
        completeExchangeItem,
        deleteExchangeItem,
        createService,
        deleteService,
        conversations,
        messages,
        messageRequests,
        sendMessage,
        getOrCreateConversation,
        startConversation,
        searchProperties,
        sendPropertyMessageRequest,
        acceptMessageRequest,
        rejectMessageRequest,
        blockPropertySender,
        notifications,
        unreadNotificationCount,
        isNotificationCenterOpen,
        setIsNotificationCenterOpen,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        moderationReports,
        auditLogs,
        unifiedCases,
        moderationHealth,
        submitModerationReport,
        resolveModerationReport,
        executeCaseAction,
        refreshModerationCases,
        retryModerationJob,
        verifyResidentAccount,
        refreshSupabaseData,
        aiModerationQueue,
        falsePositiveStats,
        resolveAiModeration,
        moderateContent,
        managementAnalytics,
        operationalAlerts,
        aiInsights,
        isAiInsightsLoading,
        isAnalyticsLoading,
        managementPeriod,
        setManagementPeriod,
        fetchManagementAnalytics,
        fetchAiInsights,
        askManagementAi,
        generateOperationalReport,
        acknowledgeOperationalAlert,
        activeManagementFilter,
        setActiveManagementFilter,
        navigateToManagementTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
