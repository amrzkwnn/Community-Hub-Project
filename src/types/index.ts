// ============================================================================
// TESDH Community Hub - TypeScript Type Definitions
// ============================================================================

export type UserRole = 'resident' | 'moderator' | 'management' | 'security';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  fullName: string;
  displayName: string;
  role: UserRole;
  townshipPrecinct: string; // e.g. "Elmina Green 3", "Denai Alam", "Elmina West"
  unitNumber?: string;       // PRIVATE: strictly hidden from public views
  phone?: string;            // PRIVATE: strictly hidden from public views
  verificationStatus: VerificationStatus;
  verificationDocUrl?: string;
  avatarUrl?: string;
  status?: 'active' | 'suspended';
  restrictionReason?: string;
  blockedUserIds?: string[];
  createdAt: string;
}

export type AddressVerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'revoked';

export type ResidenceType = 'owner' | 'tenant' | 'household_member';

export interface ResidentAddressRecord {
  id: string;
  userId: string;
  fullName: string;
  userName?: string;
  userAvatar?: string;
  precinct: string;
  unitNumber: string;
  streetName?: string;
  residenceType: ResidenceType;
  proofDocumentUrl?: string;
  proofDocumentName?: string;
  status: AddressVerificationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PostCategory = 
  | 'announcement'      // Official Announcement (Management only)
  | 'security_alert'    // Security Alert (Security/Management)
  | 'event'             // Events & Activities (e.g. Gotong-royong)
  | 'complaint'         // Resident Report / Complaint (Supports Anonymous to neighbors)
  | 'discussion';       // Community Discussion

export type PostStatus = 'active' | 'flagged' | 'hidden' | 'archived';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorRole: UserRole;
  authorAvatar?: string;
  authorVerified: boolean;
  category: PostCategory;
  title: string;
  content: string;
  imageUrl?: string;
  galleryImages?: string[];
  imageLabels?: string[];
  badgeText?: string;
  isPinned: boolean;
  isAnonymous: boolean;
  upvotesCount: number;
  upvotedByCurrentUser?: boolean;
  repliesCount: number;
  status: PostStatus;
  isEdited?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  moderationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional event-specific metadata
  eventDate?: string;
  eventEndDate?: string;
  eventTime?: string;
  eventVenue?: string;
}

export interface PostReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorRole: UserRole;
  authorAvatar?: string;
  authorVerified: boolean;
  content: string;
  isOfficialResponse: boolean;
  isEdited?: boolean;
  status?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  moderationReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ServiceType = 'offering' | 'requesting';

export type ServiceCategory = 
  | 'home_services'     // Plumbing, Air Conditioning, Electrical, Repairs
  | 'childcare'         // Nanny & Babysitting
  | 'pet_care'          // Pet Sitting & Boarding
  | 'tutoring'          // Academic Tutoring & Music
  | 'carpool'           // Rideshare / Carpool (School / Office)
  | 'gardening'         // Lawn Mowing & Landscaping
  | 'tech_help'         // Gadget & Computer Help
  | 'cleaning'          // Cleaning & Wash
  | 'moving'            // Heavy Lifting & Moving
  | 'other';

export interface LocalService {
  id: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorVerified: boolean;
  type: ServiceType;
  category: ServiceCategory;
  title: string;
  description: string;
  priceEstimate?: string;
  imageUrl?: string;
  imageUrls?: string[];
  precinct: string;
  status: 'active' | 'closed' | 'flagged' | 'open' | 'in_progress' | 'fulfilled';
  createdAt: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  urgency?: 'normal' | 'urgent';
  compensationPreference?: string;
  requestedDate?: string;
  viewsCount?: number;
}

export type ExchangeType = 'giveaway' | 'exchange' | 'loan';

export type ItemCondition = 'brand_new' | 'like_new' | 'good' | 'fair';

export type ExchangeCategory = 
  | 'furniture'
  | 'baby_kids'
  | 'appliances'
  | 'books_study'
  | 'plants_garden'
  | 'sports_leisure'
  | 'others';

export interface CircularExchangeItem {
  id: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorVerified: boolean;
  listingType: ExchangeType;
  category: ExchangeCategory;
  title: string;
  description: string;
  condition: ItemCondition;
  imageUrl?: string;
  imageUrls?: string[];
  precinct: string;
  status: 'available' | 'reserved' | 'completed';
  reservedById?: string;
  reservedByName?: string;
  seekingItem?: string;
  createdAt: string;
}

export type IncidentType = 
  | 'flood'               // Flash Flood
  | 'blocked_drain'       // Blocked Drain
  | 'fallen_tree'         // Fallen Tree / Broken Branch
  | 'pothole'             // Pothole / Road Damage
  | 'street_light'        // Streetlight Outage
  | 'water_disruption'    // Water Supply Disruption
  | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 
  | 'pending'
  | 'reported'
  | 'under_review'
  | 'dispatched'
  | 'resolved'
  | 'rejected'
  | 'dismissed';

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  authorName: string;
  authorRole: UserRole;
  statusFrom?: IncidentStatus;
  statusTo?: IncidentStatus;
  note: string;
  createdAt: string;
}

export interface ResilienceIncident {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterPrecinct: string;
  incidentType: IncidentType;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  imageUrl?: string;
  isAnonymous: boolean;
  managementNotes?: string;
  assignedTeam?: string;
  resolvedAt?: string;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archivedByName?: string | null;
  updates: IncidentUpdate[];
  createdAt: string;
  updatedAt: string;
  // Duplicate incident grouping & merging (Part 6)
  parentIncidentId?: string | null;
  isMerged?: boolean;
  mergedIncidentIds?: string[];
  duplicateReason?: string;
  mergedAt?: string;
  mergedBy?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isAnonymous?: boolean;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantOneId: string;
  participantOneName: string;
  participantTwoId: string;
  participantTwoName: string;
  subject?: string;
  contextType?: 'service' | 'exchange' | 'management_inquiry' | 'general' | 'property_messaging';
  status?: 'pending' | 'accepted' | 'rejected' | 'blocked';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface PropertyMessageRequest {
  id: string;
  senderId: string;
  recipientId: string;
  propertyAddress: string;
  subject: string;
  initialMessage: string;
  isAnonymous: boolean;
  senderDisplayName?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  conversationId?: string;
  createdAt: string;
}

export type NotificationType = 
  | 'official_announcement'
  | 'verified_incident_alert'
  | 'incident_status_update'
  | 'message_request'
  | 'message_reply'
  | 'verification_status_update';

export interface CommunityNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: 'normal' | 'urgent' | 'critical';
  targetTab?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export type ModerationReason = 
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'offensive_language'
  | 'threats_violence'
  | 'scam_fraud'
  | 'false_information'
  | 'inappropriate'
  | 'duplicate'
  | 'privacy_violation'
  | 'other';

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'post' | 'comment' | 'reply' | 'service' | 'exchange' | 'incident' | 'user';
  targetId: string;
  targetTitle?: string;
  targetContent?: string;
  reason: ModerationReason;
  details?: string;
  status: 'pending' | 'under_review' | 'actioned' | 'dismissed';
  reviewedBy?: string;
  reviewedById?: string;
  resolutionNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

// Phase 3: AI Content Moderation Types
export type AiModerationViolationCategory = 
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'dangerous_content'
  | 'misleading_claim'
  | 'safe';

export type AiModerationRiskLevel = 'low' | 'medium' | 'high';

export type AiModerationRecommendation = 'no_action' | 'human_review_required';

export type AiModerationStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed' | 'under_review' | 'removed';

export interface AiModerationItem {
  id: string;
  contentType: 'post' | 'reply' | 'exchange' | 'service';
  contentId: string;
  authorId: string;
  authorName: string;
  contentTitle?: string;
  contentPreview: string;
  flaggedCategory: AiModerationViolationCategory;
  riskLevel: AiModerationRiskLevel;
  confidence: number;
  explanation: string;
  policyReference?: string;
  recommendation: AiModerationRecommendation;
  status: AiModerationStatus;
  reviewedBy?: string;
  resolutionNote?: string;
  decision?: 'dismissed' | 'kept' | 'removed' | 'further_review';
  flaggedAt: string;
  reviewedAt?: string;
  serviceStatus?: 'operational' | 'unavailable' | 'degraded';
  modelUsed?: string;
  latencyMs?: number;
}

export type ModerationJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';

export interface ModerationJob {
  id: string;
  contentType: 'post' | 'reply' | 'exchange' | 'service';
  contentId: string;
  contentTitle?: string;
  contentText: string;
  contentHash: string;
  authorId: string;
  authorName: string;
  status: ModerationJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: string;
  createdAt: string;
  processedAt?: string;
  modelVersion: string;
  latencyMs?: number;
  resultId?: string;
  result?: AiModerationItem;
}

export interface UnifiedModerationCase {
  id: string;
  targetType: 'post' | 'comment' | 'reply' | 'service' | 'exchange' | 'incident' | 'user';
  targetId: string;
  targetTitle?: string;
  targetContent: string;
  authorId?: string;
  authorName?: string;
  authorPrecinct?: string;
  reports: ModerationReport[];
  aiFlag?: AiModerationItem;
  overallStatus: 'pending' | 'under_review' | 'actioned' | 'dismissed' | 'removed' | 'kept';
  primaryCategory: string;
  highestRisk: AiModerationRiskLevel;
  firstReportedAt: string;
  lastUpdatedAt: string;
  managementNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface FalsePositiveStats {
  category: AiModerationViolationCategory;
  count: number;
  lastDismissedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type UIScalePreset = 'compact' | 'default' | 'large';

export interface NotificationPreferences {
  muteAll: boolean;
  incidentAlerts: boolean;
  communityPosts: boolean;
  directMessages: boolean;
  circularExchange: boolean;
}

export interface UserSettings {
  theme: ThemeMode;
  uiScale?: UIScalePreset;
  notifications: NotificationPreferences;
  blockedUserIds: string[];
}

export interface NavigationTarget {
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
  timestamp: number;
}

export type SearchResultModule = 'feed' | 'comments' | 'incidents' | 'exchange' | 'services' | 'requests';

export interface SearchResultItem {
  id: string;
  module: SearchResultModule;
  moduleLabel: string;
  badgeColor: string;
  title: string;
  snippet: string;
  authorOrLocation: string;
  precinct?: string;
  categoryOrType: string;
  timestamp?: string;
  parentPostId?: string;
  parentPostTitle?: string;
  isHelpRequest?: boolean;
}

export interface AiSearchResultCard {
  id: string;
  type: 'exchange' | 'incident' | 'service' | 'request' | 'event' | 'incident_report_draft';
  title: string;
  subtitle?: string;
  matchReason?: string;
  category?: string;
  status?: string;
  isVerified?: boolean;
  price?: string;
  location?: string;
  date?: string;
  thumbnail?: string;
  descriptionSnippet: string;
  navigationTarget: {
    tab: 'exchange' | 'resilience' | 'services' | 'home';
    subTab?: 'services' | 'requests';
    itemId?: string;
    itemType?: 'exchange' | 'incident' | 'service' | 'post';
    action?: 'report_incident';
    prefill?: {
      category?: IncidentType;
      title?: string;
      description?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
    };
  };
  actionLabel: string;
}

// ============================================================================
// Phase 4: AI Management Intelligence, Advanced Analytics & Operations
// ============================================================================

export type InsightCategory = 
  | 'community_overview'
  | 'emerging_issues'
  | 'incident_trends'
  | 'moderation_insights'
  | 'resident_concerns'
  | 'service_exchange'
  | 'recommended_actions';

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AiManagementInsight {
  id: string;
  category: InsightCategory;
  title: string;
  explanation: string;
  priority: InsightPriority;
  reportingPeriod: string;
  evidence: {
    metricName: string;
    value: string | number;
    change?: string;
    context?: string;
  }[];
  supportingRecords?: {
    type: 'incident' | 'case' | 'post' | 'service' | 'exchange' | 'report';
    id?: string;
    title?: string;
    count?: number;
    filterQuery?: Record<string, string>;
  }[];
  suggestedAction?: {
    label: string;
    actionType: 'navigate' | 'filter' | 'notice_draft' | 'review_queue';
    targetTab: string;
    targetFilter?: Record<string, string>;
    targetId?: string;
  };
  generatedAt: string;
}

export type OperationalAlertCode = 
  | 'high_unresolved_incidents'
  | 'review_sla_breach'
  | 'moderation_job_failures'
  | 'incident_category_surge'
  | 'verification_backlog'
  | 'infrastructure_cluster';

export type AlertSeverity = 'critical' | 'urgent' | 'warning' | 'info';

export interface OperationalAlert {
  id: string;
  code: OperationalAlertCode;
  title: string;
  description: string;
  severity: AlertSeverity;
  threshold: string;
  currentValue: number;
  status: 'active' | 'acknowledged' | 'resolved';
  supportingData: {
    metric: string;
    count: number;
    category?: string;
    targetTab: string;
    filterQuery?: Record<string, string>;
  };
  suggestedAction: string;
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export type ManagementReportType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'incident_focus'
  | 'moderation_focus';

export interface ManagementReport {
  id: string;
  type: ManagementReportType;
  title: string;
  reportingPeriod: {
    from: string;
    to: string;
    label: string;
  };
  generatedAt: string;
  generatedBy: string;
  executiveSummary: string;
  keyMetrics: {
    name: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  incidentOverview: {
    total: number;
    resolved: number;
    open: number;
    topCategories: { category: string; count: number }[];
    bottleneckSummary: string;
  };
  communityActivity: {
    postsCount: number;
    exchangeCount: number;
    servicesCount: number;
    activeResidentsEstimate: number;
    summary: string;
  };
  moderationOverview: {
    totalReports: number;
    aiFlags: number;
    violationsConfirmed: number;
    pendingReview: number;
    falsePositiveRate: string;
    summary: string;
  };
  recommendedFollowUp: {
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    rationalEvidence: string;
    targetAction?: string;
  }[];
  provenance: {
    recordsAnalyzed: number;
    dataCutoff: string;
    modelUsed: string;
  };
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  label: string;
  incidents: number;
  posts: number;
  exchange: number;
  services: number;
  moderation: number;
}

export interface AnalyticsCategoryCount {
  category: string;
  label: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface IncidentGeoHotspot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  count: number;
  primaryCategory: IncidentType;
  unresolvedCount: number;
  precinct: string;
}

export interface AnalyticsDataset {
  period: '7d' | '30d' | '90d' | 'custom';
  periodLabel: string;
  lastRefreshed: string;
  timezone: string;
  
  // Incident Metrics
  incidentMetrics: {
    total: number;
    open: number;
    underReview: number;
    dispatched: number;
    resolved: number;
    archived: number;
    verified: number;
    unverified: number;
    rejected: number;
    backlogOver48h: number;
    meanTimeToResolutionHours: number;
    resolutionRatePercent: number;
    byCategory: AnalyticsCategoryCount[];
    byPrecinct: { precinct: string; count: number }[];
    hotspots: IncidentGeoHotspot[];
  };

  // Moderation Metrics
  moderationMetrics: {
    totalCases: number;
    pendingReview: number;
    underReview: number;
    resolvedCases: number;
    removedCount: number;
    dismissedCount: number;
    keptCount: number;
    residentReportsCount: number;
    aiFlagsCount: number;
    falsePositiveRatePercent: number;
    meanTurnaroundHours: number;
    jobQueue: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      total: number;
    };
    byReason: { reason: string; count: number }[];
  };

  // Community Activity Metrics
  communityMetrics: {
    totalPosts: number;
    announcements: number;
    complaints: number;
    events: number;
    discussions: number;
    totalExchange: number;
    exchangeGiveaways: number;
    exchangeLoans: number;
    exchangeCompleted: number;
    totalServices: number;
    servicesOffering: number;
    servicesRequesting: number;
    totalComments: number;
    verifiedResidentsCount: number;
    pendingVerificationCount: number;
  };

  // Time Series
  timeSeries: AnalyticsTimeSeriesPoint[];
}

export interface ManagementAiChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  metrics?: {
    promptTokens?: number;
    candidatesTokens?: number;
    durationMs?: number;
    modelUsed?: string;
  };
  supportingLinks?: {
    label: string;
    tab: string;
    filter?: Record<string, string>;
    targetId?: string;
  }[];
  suggestedFollowUps?: string[];
}

