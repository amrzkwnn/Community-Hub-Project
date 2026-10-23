'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  UserRole, 
  ResilienceIncident, 
  CommunityPost, 
  PostReply, 
  CircularExchangeItem, 
  LocalService, 
  UserProfile, 
  UnifiedModerationCase 
} from '@/types';
import { 
  ShieldAlert, 
  UserCheck, 
  AlertTriangle, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  Radio, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  BadgeCheck, 
  Check, 
  X, 
  Users, 
  Archive, 
  Search, 
  History, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  Calendar, 
  CalendarDays,
  Megaphone, 
  Sliders, 
  ExternalLink, 
  Trash2, 
  Pin, 
  RefreshCw, 
  Layers, 
  Tag, 
  Info, 
  Bell, 
  ShieldX, 
  Plus, 
  Edit3, 
  Filter,
  Download,
  Printer,
  TrendingUp,
  ArrowRight,
  LayoutDashboard,
  Settings,
  Flag
} from 'lucide-react';
import TimeAgo from '@/components/common/TimeAgo';
import AiInsightsPanel from './AiInsightsPanel';
import AnalyticsReportsPanel from './AnalyticsReportsPanel';
import ManagementSelect from './ManagementSelect';

export default function ManagementView() {
  const { 
    currentUser, 
    availableProfiles, 
    incidents, 
    moderationReports, 
    auditLogs, 
    aiModerationQueue,
    falsePositiveStats,
    unifiedCases,
    moderationHealth,
    executeCaseAction,
    refreshModerationCases,
    retryModerationJob,
    resolveAiModeration,
    updateIncidentStatus, 
    verifyIncident,
    rejectIncident,
    archiveIncident,
    verifyResidentAccount, 
    changeUserRole,
    updateUserAccountStatus,
    resolveModerationReport, 
    posts,
    comments,
    createPost,
    updatePost,
    deletePost,
    togglePinPost,
    deleteReply,
    exchangeItems,
    deleteExchangeItem,
    services,
    deleteService,
    switchProfile,
    setActiveTab,
    navigateToItem,
    t,
    // Phase 4: AI Management Intelligence & Analytics
    managementAnalytics,
    operationalAlerts: contextAlerts,
    aiInsights,
    managementPeriod,
    setManagementPeriod,
    fetchManagementAnalytics,
    fetchAiInsights,
    acknowledgeOperationalAlert,
    activeManagementFilter,
    setActiveManagementFilter,
    navigateToManagementTab
  } = useApp();

  // Navigation tab state (12 core sections)
  const [activeMgmtTab, setActiveMgmtTab] = useState<
    'overview' | 'ai_insights' | 'analytics' | 'moderation' | 'incidents' | 'residents' | 'content' | 'notices' | 'events' | 'notifications' | 'audit' | 'settings'
  >('overview');

  // Handle drill-down navigation with pre-applied filter
  const handleTabChangeWithFilter = (tab: string, filter?: { filterKey?: string; filterValue?: string }) => {
    setActiveMgmtTab(tab as any);
    if (filter?.filterKey === 'category' && filter.filterValue) {
      setIncidentTypeFilter(filter.filterValue);
    }
    if (filter?.filterKey === 'status' && filter.filterValue) {
      setIncidentStatusFilter(filter.filterValue);
      setModStatusFilter(filter.filterValue);
    }
    if (filter?.filterKey === 'subTab' && filter.filterValue === 'jobs') {
      setModSubTab('jobs');
    }
  };

  // Consume deep-link management filter from context
  useEffect(() => {
    if (activeManagementFilter) {
      handleTabChangeWithFilter(activeManagementFilter.targetTab, {
        filterKey: activeManagementFilter.filterKey,
        filterValue: activeManagementFilter.filterValue,
      });
      setActiveManagementFilter(null);
    }
  }, [activeManagementFilter, setActiveManagementFilter]);

  // Operational feedback messages
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setActionErrorMsg(null);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const showError = (msg: string) => {
    setActionErrorMsg(msg);
    setActionSuccessMsg(null);
    setTimeout(() => setActionErrorMsg(null), 5000);
  };

  // ==========================================
  // SECTION 5B: MODERATION STATE
  // ==========================================
  const [modSubTab, setModSubTab] = useState<'cases' | 'ai_queue' | 'user_reports' | 'jobs' | 'false_positives'>('cases');
  const [modCategoryFilter, setModCategoryFilter] = useState('all');
  const [modRiskFilter, setModRiskFilter] = useState('all');
  const [modStatusFilter, setModStatusFilter] = useState('all');
  const [modSourceFilter, setModSourceFilter] = useState('all');
  const [modSearchQuery, setModSearchQuery] = useState('');
  const [selectedCaseModal, setSelectedCaseModal] = useState<UnifiedModerationCase | null>(null);
  const [caseActionNote, setCaseActionNote] = useState<Record<string, string>>({});
  const [isRetryingJobs, setIsRetryingJobs] = useState(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<any | null>(null);

  // ==========================================
  // SECTION 5C: INCIDENT STATE
  // ==========================================
  const [incidentSubTab, setIncidentSubTab] = useState<'active' | 'history'>('active');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('all');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('all');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('all');
  const [verifyingIncidentId, setVerifyingIncidentId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectingIncidentId, setRejectingIncidentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [archiveModalIncident, setArchiveModalIncident] = useState<ResilienceIncident | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  // ==========================================
  // SECTION 5D: RESIDENT MANAGEMENT STATE
  // ==========================================
  const [residentSearchQuery, setResidentSearchQuery] = useState('');
  const [residentRoleFilter, setResidentRoleFilter] = useState('all');
  const [residentStatusFilter, setResidentStatusFilter] = useState('all');
  const [roleMessage, setRoleMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [suspendModalUser, setSuspendModalUser] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // ==========================================
  // SECTION 5E: OFFICIAL NOTICES STATE
  // ==========================================
  const [noticeSearchQuery, setNoticeSearchQuery] = useState('');
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<'announcement' | 'security_alert'>('announcement');
  const [noticeImageUrl, setNoticeImageUrl] = useState('');
  const [editingNotice, setEditingNotice] = useState<CommunityPost | null>(null);
  const [editNoticeTitle, setEditNoticeTitle] = useState('');
  const [editNoticeContent, setEditNoticeContent] = useState('');

  // ==========================================
  // SECTION 5F: EVENT MANAGEMENT STATE
  // ==========================================
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventImageUrl, setEventImageUrl] = useState('');
  const [editingEvent, setEditingEvent] = useState<CommunityPost | null>(null);

  // ==========================================
  // SECTION 5G: COMMUNITY CONTENT MANAGEMENT
  // ==========================================
  const [contentFilterType, setContentFilterType] = useState<'all' | 'post' | 'reply' | 'exchange' | 'service'>('all');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: 'post' | 'reply' | 'exchange' | 'service';
    id: string;
    title: string;
  } | null>(null);
  const [deleteReasonNote, setDeleteReasonNote] = useState('');

  // ==========================================
  // SECTION 5H: NOTIFICATIONS & BROADCASTS
  // ==========================================
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<'announcement' | 'security_alert'>('announcement');
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);

  // ==========================================
  // SECTION 5I: AUDIT LOGS STATE
  // ==========================================
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // ==========================================
  // SECTION 5K: SETTINGS STATE
  // ==========================================
  const [aiEnabledSetting, setAiEnabledSetting] = useState(true);
  const [activeThresholdPreset, setActiveThresholdPreset] = useState<'standard' | 'strict' | 'lenient'>('standard');

  // 1. STRICT ACCESS CONTROL
  if (currentUser.role !== 'management') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-rose-200 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Access Restricted / Management Access Only
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            This Administration & Security Console is restricted to authorized management personnel with verified database role <code className="bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">management</code>. Client-side profile switching does not bypass server-side Row Level Security (RLS) enforcement.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('feed')}
              className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Return to Community Feed
            </button>
            <button
              onClick={() => switchProfile('user-azman')}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-300"
            >
              Sign In as Management (Capt Azman)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // COMPUTED METRICS & DATA SETS
  // ==========================================
  const pendingResidentReports = moderationReports.filter((r) => r.status === 'pending');
  const pendingAiFlags = aiModerationQueue.filter((i) => i.status === 'pending');
  const pendingCases = unifiedCases.filter((c) => c.overallStatus === 'pending' || c.overallStatus === 'under_review');
  const failedModerationJobs = moderationHealth?.recentJobs?.filter((j: any) => j.status === 'failed') || [];

  const pendingVerificationProfiles = availableProfiles.filter((p) => p.verificationStatus === 'pending');
  const activeIncidents = incidents.filter((i) => !i.isArchived);
  const unverifiedIncidents = incidents.filter((i) => !i.isArchived && !i.isVerified);
  const unresolvedIncidents = incidents.filter((i) => !i.isArchived && i.status !== 'resolved');

  const officialNoticesList = posts.filter(
    (p) => (p.category === 'announcement' || p.category === 'security_alert' || p.authorRole === 'management' || p.authorRole === 'security') && p.status === 'active'
  );

  const upcomingEventsList = posts.filter((p) => p.category === 'event' && p.status === 'active');

  // Filtered Unified Cases
  const filteredCases = useMemo(() => {
    return unifiedCases.filter((c) => {
      if (modCategoryFilter !== 'all' && c.primaryCategory !== modCategoryFilter) return false;
      if (modRiskFilter !== 'all' && c.highestRisk !== modRiskFilter) return false;
      if (modStatusFilter !== 'all' && c.overallStatus !== modStatusFilter) return false;
      if (modSourceFilter === 'resident' && c.reports.length === 0) return false;
      if (modSourceFilter === 'ai' && !c.aiFlag) return false;
      if (modSourceFilter === 'combined' && (c.reports.length === 0 || !c.aiFlag)) return false;
      if (modSearchQuery.trim()) {
        const q = modSearchQuery.toLowerCase();
        const hay = `${c.targetTitle || ''} ${c.targetContent || ''} ${c.authorName || ''} ${c.primaryCategory}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [unifiedCases, modCategoryFilter, modRiskFilter, modStatusFilter, modSourceFilter, modSearchQuery]);

  // Operational high-priority notifications
  const operationalAlerts = useMemo(() => {
    const list: Array<{ id: string; type: 'moderation' | 'incident' | 'resident' | 'job'; title: string; desc: string; time: string; linkTab: any }> = [];

    // Failed jobs alert
    if (failedModerationJobs.length > 0) {
      list.push({
        id: 'failed-jobs',
        type: 'job',
        title: `${failedModerationJobs.length} AI Moderation Jobs Failed`,
        desc: 'Jobs exceeded max retry attempts or experienced network errors. Action: inspect queue or retry.',
        time: 'Active',
        linkTab: 'moderation',
      });
    }

    // High risk moderation cases
    const highRiskCases = unifiedCases.filter((c) => (c.overallStatus === 'pending' || c.overallStatus === 'under_review') && c.highestRisk === 'high');
    if (highRiskCases.length > 0) {
      list.push({
        id: 'high-risk-cases',
        type: 'moderation',
        title: `${highRiskCases.length} High-Risk Content Items Pending Review`,
        desc: 'Content flagged with elevated threat or harassment risk requiring immediate officer evaluation.',
        time: 'Pending',
        linkTab: 'moderation',
      });
    }

    // Unverified hazards
    if (unverifiedIncidents.length > 0) {
      list.push({
        id: 'unverified-incidents',
        type: 'incident',
        title: `${unverifiedIncidents.length} Hazards Awaiting On-Site Verification`,
        desc: 'Citizen hazard submissions pending verification badge dispatch.',
        time: 'Immediate',
        linkTab: 'incidents',
      });
    }

    // Resident verifications
    if (pendingVerificationProfiles.length > 0) {
      list.push({
        id: 'pending-residents',
        type: 'resident',
        title: `${pendingVerificationProfiles.length} Resident Verification Applications`,
        desc: 'New resident documents pending ownership or tenancy validation.',
        time: 'Queue',
        linkTab: 'residents',
      });
    }

    return list;
  }, [failedModerationJobs, unifiedCases, unverifiedIncidents, pendingVerificationProfiles]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Retry Failed Moderation Jobs
  const handleRetryFailedJobs = async () => {
    setIsRetryingJobs(true);
    try {
      const res = await retryModerationJob(undefined, true);
      if (res.success) {
        showSuccess('All failed moderation jobs re-enqueued for processing.');
        await refreshModerationCases();
      } else {
        showError(res.error || 'Failed to retry jobs.');
      }
    } catch (e: any) {
      showError(e.message || 'Error executing retry.');
    } finally {
      setIsRetryingJobs(false);
    }
  };

  // Execute Unified Case Action
  const handleCaseAction = async (caseId: string, action: 'dismissed' | 'kept' | 'removed' | 'under_review' | 'further_review') => {
    const note = caseActionNote[caseId] || '';
    try {
      const res = await executeCaseAction(caseId, action, note);
      if (res.success) {
        showSuccess(`Case decision recorded: ${action.toUpperCase()}. Content state updated and logged in audit trail.`);
        if (selectedCaseModal?.id === caseId) setSelectedCaseModal(null);
      } else {
        showError(res.error || 'Failed to apply decision.');
      }
    } catch (e: any) {
      showError(e.message || 'Error submitting action.');
    }
  };

  // Verify Incident
  const handleVerifyIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingIncidentId) return;
    const res = await verifyIncident(verifyingIncidentId, verificationNotes || 'Verified on-site by Command Centre');
    if (res.success) {
      showSuccess('Incident verified with official hazard badge. Feed alert published.');
    } else {
      showError(res.error || 'Failed to verify incident.');
    }
    setVerifyingIncidentId(null);
    setVerificationNotes('');
  };

  // Reject Incident Verification
  const handleRejectIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingIncidentId) return;
    await rejectIncident(rejectingIncidentId, rejectionReason || 'Report could not be confirmed on-site.');
    showSuccess('Incident verification revoked.');
    setRejectingIncidentId(null);
    setRejectionReason('');
  };

  // Archive Incident
  const handleArchiveIncidentConfirm = async () => {
    if (!archiveModalIncident) return;
    setArchiveLoading(true);
    const res = await archiveIncident(archiveModalIncident.id);
    setArchiveLoading(false);
    if (res.success) {
      setArchiveModalIncident(null);
      showSuccess(`Incident "${archiveModalIncident.title}" safely archived. Retained permanently in Supabase compliance logs.`);
    } else {
      showError(res.error || 'Failed to archive incident.');
    }
  };

  // Role Governance Change
  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setRoleMessage(null);
    const result = await changeUserRole(targetUserId, newRole);
    if (result.success) {
      setRoleMessage({ text: `Role successfully updated to "${newRole}". Audit log recorded.`, isError: false });
      showSuccess(`Role updated to ${newRole.toUpperCase()}.`);
    } else {
      setRoleMessage({ text: result.error || 'Failed to update user role.', isError: true });
      showError(result.error || 'Role update rejected.');
    }
    setTimeout(() => setRoleMessage(null), 5000);
  };

  // Resident Account Status (Active / Suspended)
  const handleAccountStatusChange = async (targetUserId: string, newStatus: 'active' | 'suspended', reason?: string) => {
    const res = await updateUserAccountStatus(targetUserId, newStatus, reason);
    if (res.success) {
      showSuccess(`Resident account status updated to ${newStatus.toUpperCase()}.`);
      setSuspendModalUser(null);
      setSuspendReason('');
    } else {
      showError(res.error || 'Failed to change account status.');
    }
  };

  // Create Notice
  const handleCreateNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    await createPost({
      category: noticeCategory,
      title: noticeTitle.trim(),
      content: noticeContent.trim(),
      imageUrl: noticeImageUrl.trim() || undefined,
      isAnonymous: false,
    });

    setNoticeTitle('');
    setNoticeContent('');
    setNoticeImageUrl('');
    setIsCreateNoticeOpen(false);
    showSuccess('Official notice published to township feeds and pinned successfully.');
  };

  // Update Notice
  const handleUpdateNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editNoticeTitle.trim() || !editNoticeContent.trim()) return;

    const res = await updatePost(editingNotice.id, {
      title: editNoticeTitle.trim(),
      content: editNoticeContent.trim(),
    });

    if (res.success) {
      showSuccess('Notice updated successfully.');
      setEditingNotice(null);
    } else {
      showError(res.error || 'Failed to update notice.');
    }
  };

  // Create Community Event
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDesc.trim() || !eventDate) return;

    await createPost({
      category: 'event',
      title: eventTitle.trim(),
      content: eventDesc.trim(),
      eventDate,
      eventEndDate: eventEndDate || undefined,
      eventTime: eventTime || '09:00 AM',
      eventVenue: eventVenue.trim() || 'Elmina Central Park',
      imageUrl: eventImageUrl.trim() || undefined,
      isAnonymous: false,
    });

    setEventTitle('');
    setEventDesc('');
    setEventDate('');
    setEventEndDate('');
    setEventTime('');
    setEventVenue('');
    setEventImageUrl('');
    setIsCreateEventOpen(false);
    showSuccess('Community event created and synced to the township calendar.');
  };

  // Delete Community Content
  const handleExecuteContentDelete = async () => {
    if (!deleteConfirmItem) return;
    const { type, id, title } = deleteConfirmItem;
    const reason = deleteReasonNote.trim() || 'Removed by Township Management for community policy compliance';

    let success = false;
    let err = '';

    if (type === 'post') {
      const res = await deletePost(id, reason);
      success = res.success;
      err = res.error || '';
    } else if (type === 'reply') {
      const res = await deleteReply(id, reason);
      success = res.success;
      err = res.error || '';
    } else if (type === 'exchange') {
      await deleteExchangeItem(id);
      success = true;
    } else if (type === 'service') {
      await deleteService(id);
      success = true;
    }

    if (success) {
      showSuccess(`Content "${title}" successfully soft-deleted. Audit event logged.`);
      setDeleteConfirmItem(null);
      setDeleteReasonNote('');
    } else {
      showError(err || 'Failed to remove content.');
    }
  };

  // Broadcast Banner Submit
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;
    setBroadcastSubmitting(true);

    try {
      await createPost({
        category: broadcastCategory,
        title: broadcastTitle.trim(),
        content: broadcastContent.trim(),
        isAnonymous: false,
      });

      setBroadcastTitle('');
      setBroadcastContent('');
      showSuccess('Official emergency broadcast dispatched to all residents across Elmina.');
    } catch (e: any) {
      showError(e.message || 'Failed to dispatch broadcast.');
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* ======================================================== */}
      {/* 1. TOP MANAGEMENT CONSOLE BANNER (HERITAGE-RED THEME)     */}
      {/* ======================================================== */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <LayoutDashboard className="w-5 h-5 text-[#9E1315]" />
              <span>Community Administration & Security Console</span>
            </h1>
          </div>

          {/* Right Toolbar: Period Switcher, Quick Actions & Duty Auditor */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reporting Period Selector */}
            <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 flex items-center gap-1 text-xs">
              {(['7d', '30d', '90d'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setManagementPeriod(period);
                    fetchManagementAnalytics(period);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    managementPeriod === period
                      ? 'bg-[#9E1315] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {period.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => {
                  fetchManagementAnalytics(managementPeriod);
                  fetchAiInsights(true);
                  showSuccess('Telemetry and operational metrics refreshed.');
                }}
                title="Refresh Metrics"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a
                href={`/api/management/export?period=${managementPeriod}`}
                download
                title="Export CSV Dataset"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Duty Officer & Auditor Badge */}
            <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2.5 shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#9E1315]" />
              <div>
                <span className="text-xs font-semibold text-white block leading-tight">
                  {currentUser.fullName} (Duty Officer (Auditor))
                </span>
                <span className="text-[10px] text-slate-400 font-mono leading-tight">
                  {currentUser.role.toUpperCase()} • ID: {currentUser.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-500/60 text-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="mt-4 p-3 bg-rose-950/90 border border-rose-500/60 text-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* CONSOLE NAVIGATION TABS (12 FUNCTIONAL AREAS)             */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-slate-800 overflow-x-auto text-xs no-scrollbar">
          {/* 1. Overview */}
          <button
            onClick={() => setActiveMgmtTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'overview'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          {/* 2. AI Insights */}
          <button
            onClick={() => setActiveMgmtTab('ai_insights')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'ai_insights'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Insights</span>
            {aiInsights.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-bold">
                {aiInsights.length}
              </span>
            )}
          </button>

          {/* 3. Moderation */}
          <button
            onClick={() => setActiveMgmtTab('moderation')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'moderation'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Reports & Moderation</span>
            {pendingCases.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {pendingCases.length}
              </span>
            )}
          </button>

          {/* 4. Incidents */}
          <button
            onClick={() => setActiveMgmtTab('incidents')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'incidents'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Incident Management</span>
            {unverifiedIncidents.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-bold">
                {unverifiedIncidents.length}
              </span>
            )}
          </button>

          {/* 5. Residents */}
          <button
            onClick={() => setActiveMgmtTab('residents')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'residents'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Resident Management</span>
            {pendingVerificationProfiles.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-400 text-emerald-950 rounded-full text-[10px] font-bold">
                {pendingVerificationProfiles.length}
              </span>
            )}
          </button>

          {/* 6. Community Content */}
          <button
            onClick={() => setActiveMgmtTab('content')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'content'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Community Content</span>
          </button>

          {/* 7. Official Notices */}
          <button
            onClick={() => setActiveMgmtTab('notices')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'notices'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Official Notices</span>
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full text-[10px] font-semibold">
              {officialNoticesList.length}
            </span>
          </button>

          {/* 8. Events */}
          <button
            onClick={() => setActiveMgmtTab('events')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'events'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Upcoming Events</span>
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full text-[10px] font-semibold">
              {upcomingEventsList.length}
            </span>
          </button>

          {/* 9. Notifications */}
          <button
            onClick={() => setActiveMgmtTab('notifications')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'notifications'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {contextAlerts.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                {contextAlerts.length}
              </span>
            )}
          </button>

          {/* 10. Analytics & Reports */}
          <button
            onClick={() => setActiveMgmtTab('analytics')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'analytics'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          {/* 11. Audit Logs */}
          <button
            onClick={() => setActiveMgmtTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'audit'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>

          {/* 12. Settings */}
          <button
            onClick={() => setActiveMgmtTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeMgmtTab === 'settings'
                ? 'bg-[#9E1315] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Management Settings</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5A: OVERVIEW DASHBOARD (PHASE 4 REVAMP)                  */}
      {/* ======================================================== */}
      {activeMgmtTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Active Operational Alerts Triage Bar */}
          {contextAlerts && contextAlerts.length > 0 && (
            <div className="bg-white rounded-3xl border border-rose-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Active Operational</span>
                    <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      {contextAlerts.length}
                    </span>
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Real-time rule threshold monitoring
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contextAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      alert.severity === 'critical'
                        ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
                        : alert.severity === 'warning'
                        ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
                        : 'bg-blue-50/70 border-blue-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {alert.title}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.2 rounded-full uppercase ${
                          alert.severity === 'critical' ? 'bg-rose-600 text-white' :
                          alert.severity === 'warning' ? 'bg-amber-500 text-slate-950' :
                          'bg-blue-600 text-white'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {alert.description}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Trigger: {alert.threshold}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs">
                      <button
                        onClick={() => acknowledgeOperationalAlert(alert.id)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleTabChangeWithFilter(alert.supportingData.targetTab, { 
                          filterKey: alert.supportingData.category ? 'category' : undefined, 
                          filterValue: alert.supportingData.category 
                        })}
                        className="text-[11px] font-black text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Supporting Records</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Interactive KPI Metrics Row: 6 Standardized Real Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {/* KPI 1: Pending Reports */}
            <div 
              onClick={() => handleTabChangeWithFilter('moderation', { filterKey: 'subTab', filterValue: 'user_reports' })}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9E1315]/40 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">Pending Reports</span>
                <Flag className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {pendingResidentReports.length}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                Resident submissions
              </p>
            </div>

            {/* KPI 2: AI Moderation Flags */}
            <div 
              onClick={() => handleTabChangeWithFilter('moderation', { filterKey: 'subTab', filterValue: 'ai_queue' })}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9E1315]/40 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">AI Moderation</span>
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {pendingAiFlags.length}
              </div>
              <p className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold mt-2 truncate">
                Algorithmic flags
              </p>
            </div>

            {/* KPI 3: Open Incidents */}
            <div 
              onClick={() => handleTabChangeWithFilter('incidents', { filterKey: 'status', filterValue: 'reported' })}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9E1315]/40 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">Open Incidents</span>
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {unresolvedIncidents.length}
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-2 truncate">
                {unverifiedIncidents.length} unverified
              </p>
            </div>

            {/* KPI 4: Pending Verification */}
            <div 
              onClick={() => setActiveMgmtTab('residents')}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9E1315]/40 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">Pending ID</span>
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {pendingVerificationProfiles.length}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                Awaiting validation
              </p>
            </div>

            {/* KPI 5: Active Residents */}
            <div 
              onClick={() => setActiveMgmtTab('residents')}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9E1315]/40 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">Active Residents</span>
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {availableProfiles.filter((p) => p.status !== 'suspended').length}
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-2 truncate">
                Registered profiles
              </p>
            </div>

            {/* KPI 6: Failed Moderation Jobs */}
            <div 
              onClick={() => handleTabChangeWithFilter('moderation', { filterKey: 'subTab', filterValue: 'jobs' })}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9E1315]/40 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">Failed Jobs</span>
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${failedModerationJobs.length === 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'} inline-block`} />
                <span>{failedModerationJobs.length}</span>
              </div>
              <p className={`text-[10px] ${failedModerationJobs.length === 0 ? 'text-slate-500 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400 font-bold'} mt-2 truncate`}>
                {failedModerationJobs.length === 0 ? 'Engine optimal' : 'Requires queue retry'}
              </p>
            </div>
          </div>

          {/* Operational Quick Actions & Immediate Alerts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
            {/* Left 2 Cols: Activity Velocity & Top Hazard Distribution */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
              {/* Community Activity Velocity Sparkline */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 w-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-rose-800" />
                      <span>Township Activity Velocity ({managementPeriod.toUpperCase()})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daily rate of newly logged hazards, moderation cases, and resident community posts.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveMgmtTab('analytics')}
                    className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* SVG Visual Mini Velocity Chart */}
                {managementAnalytics && managementAnalytics.timeSeries.length > 0 ? (
                  <div className="space-y-3 w-full min-w-0">
                    {(() => {
                      const totalPts = managementAnalytics.timeSeries.length;
                      const labelStep = totalPts <= 7 ? 1 : totalPts <= 15 ? 2 : totalPts <= 35 ? 5 : 10;
                      const barWidth = totalPts > 25 ? 'w-0.5 sm:w-1' : totalPts > 12 ? 'w-1 sm:w-1.5' : 'w-1.5 sm:w-2';
                      const gapClass = totalPts > 25 ? 'gap-0.5' : totalPts > 12 ? 'gap-0.5 sm:gap-1' : 'gap-1 sm:gap-2';
                      const maxVal = Math.max(...managementAnalytics.timeSeries.map(p => Math.max(p.incidents, p.moderation, p.posts)), 1);

                      return (
                        <div className={`h-44 w-full min-w-0 overflow-x-hidden flex items-end pt-6 pb-2 px-1 border-b border-slate-100 ${gapClass}`}>
                          {managementAnalytics.timeSeries.map((pt, idx) => {
                            const incHeight = Math.max((pt.incidents / maxVal) * 100, 6);
                            const modHeight = Math.max((pt.moderation / maxVal) * 100, 4);
                            const postHeight = Math.max((pt.posts / maxVal) * 100, 4);
                            const shouldShowLabel = idx % labelStep === 0 || idx === totalPts - 1;
                            const tooltipAlign = idx < 2 ? 'left-0' : idx > totalPts - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2';

                            return (
                              <div key={idx} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end group relative">
                                {/* Hover Tooltip */}
                                <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] p-2 rounded-xl pointer-events-none whitespace-nowrap z-20 shadow-lg ${tooltipAlign}`}>
                                  <span className="font-bold block text-rose-300">{pt.date.slice(0, 10)}</span>
                                  <span>Incidents: {pt.incidents}</span><br/>
                                  <span>Moderation: {pt.moderation}</span><br/>
                                  <span>Posts: {pt.posts}</span>
                                </div>
                                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                                  <div style={{ height: `${incHeight}%` }} className={`${barWidth} bg-rose-600 rounded-t-sm transition-all`} />
                                  <div style={{ height: `${modHeight}%` }} className={`${barWidth} bg-purple-500 rounded-t-sm transition-all`} />
                                  <div style={{ height: `${postHeight}%` }} className={`${barWidth} bg-emerald-500 rounded-t-sm transition-all`} />
                                </div>
                                <div className="h-3.5 w-full flex items-center justify-center overflow-hidden">
                                  {shouldShowLabel ? (
                                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-full text-center block scale-90">
                                      {pt.label || pt.date.slice(5, 10)}
                                    </span>
                                  ) : (
                                    <span className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-600 pt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
                        Incidents
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                        Moderation
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                        Community Posts
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                    Loading activity timeline...
                  </div>
                )}
              </div>

                {/* Top Hazard Categories Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Hazard Category Distribution ({managementPeriod.toUpperCase()})
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {incidents.length} total logged hazards
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(managementAnalytics?.incidentMetrics.byCategory || []).slice(0, 5).map((cat) => (
                      <div 
                        key={cat.category}
                        onClick={() => handleTabChangeWithFilter('incidents', { filterKey: 'category', filterValue: cat.category })}
                        className="space-y-1 cursor-pointer group"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800 group-hover:text-rose-800 capitalize flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                            {cat.category.replace('_', ' ')}
                          </span>
                          <span className="text-slate-600 font-mono text-[11px]">
                            {cat.count} cases ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(cat.percentage, 4)}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* Right Col: AI Insights Preview & Action Launchpad */}
            <div className="space-y-6">
              {/* AI Insights Preview */}
              <div className="bg-gradient-to-br from-slate-900 to-rose-950 text-white p-6 rounded-3xl shadow-lg border border-rose-900/60 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      AI Insights Preview
                    </h3>
                  </div>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                    Decision Support
                  </span>
                </div>

                <div className="space-y-3">
                  {aiInsights.slice(0, 2).map((ins) => (
                    <div
                      key={ins.id}
                      onClick={() => setActiveMgmtTab('ai_insights')}
                      className="p-3.5 rounded-2xl bg-white/10 border border-white/10 hover:border-amber-400/60 transition-all cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {ins.title}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          ins.priority === 'critical' ? 'bg-rose-500 text-white' :
                          ins.priority === 'high' ? 'bg-amber-400 text-slate-950' :
                          'bg-white/20 text-white'
                        }`}>
                          {ins.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                        {ins.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveMgmtTab('ai_insights')}
                  className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open AI Insights Hub ({aiInsights.length})</span>
                </button>
              </div>

              {/* Quick Launchpad Buttons */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                  Executive Launchpad
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => { setActiveMgmtTab('notices'); setIsCreateNoticeOpen(true); }}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-[#9E1315] dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-all text-center cursor-pointer flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <Megaphone className="w-4 h-4 text-[#9E1315] shrink-0" />
                    <span>Post Notice</span>
                  </button>
                  <button
                    onClick={() => { setActiveMgmtTab('events'); setIsCreateEventOpen(true); }}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-[#9E1315] dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-all text-center cursor-pointer flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <CalendarDays className="w-4 h-4 text-[#9E1315] shrink-0" />
                    <span>Add Event</span>
                  </button>
                  <button
                    onClick={() => setActiveMgmtTab('notifications')}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-[#9E1315] dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-all text-center cursor-pointer flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <Radio className="w-4 h-4 text-[#9E1315] shrink-0" />
                    <span>Broadcast Alert</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('map'); }}
                    className="p-3 rounded-xl bg-[#9E1315] hover:bg-[#851012] text-white transition-all text-center cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-white shrink-0" />
                    <span>Resilience Map</span>
                  </button>
                </div>
              </div>

              {/* AI Moderation Pipeline Status */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-800" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      AI Background Engine
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Engine:</span>
                    <strong className="text-slate-900">Gemini Flash + Rule Guard</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Queue Backing:</span>
                    <strong className="text-slate-900">Durable Outbox Store</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Completed Analyses:</span>
                    <strong className="text-slate-900 font-mono">{moderationHealth?.completedJobs || 0}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Failed Jobs:</span>
                    <strong className={`${failedModerationJobs.length > 0 ? 'text-rose-600 font-bold' : 'text-slate-900'} font-mono`}>
                      {failedModerationJobs.length}
                    </strong>
                  </div>
                </div>

                {failedModerationJobs.length > 0 && (
                  <button
                    disabled={isRetryingJobs}
                    onClick={handleRetryFailedJobs}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetryingJobs ? 'animate-spin' : ''}`} />
                    <span>{isRetryingJobs ? 'Retrying...' : 'Retry All Failed Jobs Now'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5A.2: AI MANAGEMENT INTELLIGENCE HUB (PHASE 4)           */}
      {/* ======================================================== */}
      {activeMgmtTab === 'ai_insights' && (
        <AiInsightsPanel onNavigateTab={handleTabChangeWithFilter} />
      )}

      {/* ======================================================== */}
      {/* 5B & PART 4: UNIFIED REPORTS & AI MODERATION             */}
      {/* ======================================================== */}
      {activeMgmtTab === 'moderation' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-150">
          {/* Header & Subtabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-800" />
                <span>Unified Reports & AI Moderation Console</span>
              </h3>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModSubTab('cases')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modSubTab === 'cases' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unified Cases</span>
                <span className="px-1.5 py-0.2 bg-emerald-800 text-white rounded-full text-[10px] font-bold">
                  {unifiedCases.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModSubTab('ai_queue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modSubTab === 'ai_queue' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>AI Flagged</span>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                  {aiModerationQueue.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModSubTab('user_reports')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modSubTab === 'user_reports' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>Manual Reports</span>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                  {moderationReports.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModSubTab('jobs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modSubTab === 'jobs' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                <span>Job Queue</span>
                {failedModerationJobs.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                    {failedModerationJobs.length} Failed
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModSubTab('false_positives')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modSubTab === 'false_positives' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Telemetry</span>
              </button>
            </div>
          </div>

          {/* SUBTAB: UNIFIED CASES (Part 4) */}
          {modSubTab === 'cases' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div className="relative min-w-0 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search cases, text, authors..."
                    value={modSearchQuery}
                    onChange={(e) => setModSearchQuery(e.target.value)}
                    className="w-full h-9 sm:h-10 pl-9 pr-3 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
                  />
                </div>

                <div className="min-w-0 w-full">
                  <ManagementSelect
                    value={modCategoryFilter}
                    onChange={setModCategoryFilter}
                    ariaLabel="Filter by moderation category"
                    options={[
                      { value: 'all', label: 'All Categories' },
                      { value: 'harassment', label: 'Harassment & Bullying' },
                      { value: 'hate_speech', label: 'Hate & Discriminatory' },
                      { value: 'offensive_language', label: 'Profanity / Offensive' },
                      { value: 'threats_violence', label: 'Threats & Violence' },
                      { value: 'spam', label: 'Spam / Advertising' },
                      { value: 'scam_fraud', label: 'Scam & Fraud' },
                      { value: 'privacy_violation', label: 'Privacy Violation' },
                    ]}
                  />
                </div>

                <div className="min-w-0 w-full">
                  <ManagementSelect
                    value={modRiskFilter}
                    onChange={setModRiskFilter}
                    ariaLabel="Filter by risk level"
                    options={[
                      { value: 'all', label: 'All Risk Levels' },
                      { value: 'high', label: 'High Risk Priority' },
                      { value: 'medium', label: 'Medium Risk' },
                      { value: 'low', label: 'Low Risk' },
                    ]}
                  />
                </div>

                <div className="min-w-0 w-full">
                  <ManagementSelect
                    value={modSourceFilter}
                    onChange={setModSourceFilter}
                    ariaLabel="Filter by source"
                    options={[
                      { value: 'all', label: 'All Sources' },
                      { value: 'combined', label: 'Combined (AI + Resident)' },
                      { value: 'resident', label: 'Resident Reports Only' },
                      { value: 'ai', label: 'AI Flags Only' },
                    ]}
                  />
                </div>

                <div className="min-w-0 w-full">
                  <ManagementSelect
                    value={modStatusFilter}
                    onChange={setModStatusFilter}
                    ariaLabel="Filter by review state"
                    options={[
                      { value: 'all', label: 'All Review States' },
                      { value: 'pending', label: 'Pending Officer Review' },
                      { value: 'under_review', label: 'Under Investigation' },
                      { value: 'kept', label: 'Kept (Approved)' },
                      { value: 'dismissed', label: 'Dismissed (False Positive)' },
                      { value: 'removed', label: 'Removed (Soft Deleted)' },
                    ]}
                  />
                </div>
              </div>

              {/* Case Items List */}
              <div className="space-y-4">
                {filteredCases.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-200">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <h4 className="text-sm font-bold text-slate-700">No moderation cases matching filters</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      All citizen reports and AI flags in this view are resolved or none match your search criteria.
                    </p>
                  </div>
                ) : (
                  filteredCases.map((c) => {
                    const isPending = c.overallStatus === 'pending' || c.overallStatus === 'under_review';
                    const riskStyle = 
                      c.highestRisk === 'high' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      c.highestRisk === 'medium' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                      'bg-blue-100 text-blue-800 border-blue-200';

                    return (
                      <div
                        key={c.id}
                        className={`p-5 rounded-3xl border transition-all space-y-4 ${
                          isPending ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/70 border-slate-200 opacity-95'
                        }`}
                      >
                        {/* Case Badges Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase tracking-wider">
                              {c.targetType.toUpperCase()}
                            </span>

                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${riskStyle} uppercase`}>
                              Risk: {c.highestRisk.toUpperCase()}
                            </span>

                            {/* Source Pills */}
                            {c.reports.length > 0 && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{c.reports.length} Resident {c.reports.length === 1 ? 'Report' : 'Reports'}</span>
                              </span>
                            )}

                            {c.aiFlag && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>AI Flagged</span>
                              </span>
                            )}

                            {/* Primary Category */}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {c.primaryCategory.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(c.lastUpdatedAt).toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.overallStatus === 'pending' ? 'bg-rose-100 text-rose-800' :
                              c.overallStatus === 'under_review' ? 'bg-amber-100 text-amber-800' :
                              c.overallStatus === 'removed' ? 'bg-rose-700 text-white' :
                              c.overallStatus === 'kept' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              Status: {c.overallStatus.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Content Snippet */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-900">
                              {c.targetTitle || `Target ID: #${c.targetId}`}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Author: {c.authorName || 'Resident'}
                            </span>
                          </div>

                          <div className="mt-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 italic">
                            &ldquo;{c.targetContent || 'Content not available or already cleared.'}&rdquo;
                          </div>
                        </div>

                        {/* Combined Evidence Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Left: Resident Explanations */}
                          <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200/70 space-y-1">
                            <span className="font-bold text-purple-950 flex items-center gap-1 text-[11px]">
                              <Users className="w-3.5 h-3.5 text-purple-700" />
                              <span>Resident Report Explanations ({c.reports.length})</span>
                            </span>
                            {c.reports.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic">No manual resident reports.</p>
                            ) : (
                              <ul className="space-y-1 text-[11px] text-slate-700">
                                {c.reports.map((r) => (
                                  <li key={r.id}>
                                    <strong>{r.reason.replace('_', ' ')}:</strong> {r.details || 'No additional note provided.'}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Right: AI Analysis */}
                          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 space-y-1">
                            <span className="font-bold text-emerald-950 flex items-center gap-1 text-[11px]">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                              <span>AI Safety Recommendation</span>
                            </span>
                            {!c.aiFlag ? (
                              <p className="text-[11px] text-slate-500 italic">AI did not flag this content (Evaluated safe).</p>
                            ) : (
                              <div className="text-[11px] text-slate-700 space-y-0.5">
                                <p><strong>Confidence:</strong> {Math.round(c.aiFlag.confidence * 100)}% • <strong>Recommendation:</strong> {c.aiFlag.recommendation.replace('_', ' ')}</p>
                                <p className="leading-snug">{c.aiFlag.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Decision Controls */}
                        {isPending ? (
                          <div className="pt-2 border-t border-slate-100 space-y-2.5">
                            <input
                              type="text"
                              placeholder="Officer resolution rationale / audit note for this decision..."
                              value={caseActionNote[c.id] || ''}
                              onChange={(e) => setCaseActionNote((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-700"
                            />

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Keep Content */}
                              <button
                                onClick={() => handleCaseAction(c.id, 'kept')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Keep Content (Approved)</span>
                              </button>

                              {/* Dismiss Flag */}
                              <button
                                onClick={() => handleCaseAction(c.id, 'dismissed')}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                                <span>Dismiss Flag (False Positive)</span>
                              </button>

                              {/* Remove Content */}
                              <button
                                onClick={() => handleCaseAction(c.id, 'removed')}
                                className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Content (Take Down)</span>
                              </button>

                              {/* Under Review */}
                              <button
                                onClick={() => handleCaseAction(c.id, 'under_review')}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Search className="w-3.5 h-3.5 text-amber-700" />
                                <span>Mark Under Review</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <div>
                              <strong className="text-slate-800">Officer Decision ({c.reviewedBy || 'Duty Management'}):</strong> {c.managementNotes || 'Resolved.'}
                            </div>
                            <span className="font-mono text-[10px]">
                              {c.reviewedAt ? new Date(c.reviewedAt).toLocaleString() : 'Recorded'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* SUBTAB: AI FLAGGED QUEUE */}
          {modSubTab === 'ai_queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">
                  Total AI moderation queue entries: {aiModerationQueue.length}
                </span>
              </div>

              <div className="space-y-3">
                {aiModerationQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-2xl">
                    No items in the AI moderation queue.
                  </p>
                ) : (
                  aiModerationQueue.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase">
                            {item.contentType}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            {item.flaggedCategory}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {item.riskLevel.toUpperCase()} RISK
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.flaggedAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 font-bold">
                        {item.contentTitle || `Target ID: #${item.contentId}`}
                      </div>
                      <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                        &ldquo;{item.contentPreview}&rdquo;
                      </div>
                      <div className="text-[11px] text-slate-600">
                        <strong>AI Rationale:</strong> {item.explanation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUBTAB: RESIDENT MANUAL REPORTS */}
          {modSubTab === 'user_reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">
                  Total resident submitted reports: {moderationReports.length}
                </span>
              </div>

              <div className="space-y-3">
                {moderationReports.length === 0 ? (
                  <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-2xl">
                    No manual resident reports submitted.
                  </p>
                ) : (
                  moderationReports.map((rep) => (
                    <div key={rep.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase">
                          Reason: {rep.reason.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 font-bold">
                        {rep.targetTitle || `Target: ${rep.targetType} (#${rep.targetId})`}
                      </div>

                      {rep.targetContent && (
                        <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                          &ldquo;{rep.targetContent}&rdquo;
                        </div>
                      )}

                      {rep.details && (
                        <div className="text-[11px] text-slate-600">
                          <strong>Reporter Note:</strong> {rep.details}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-500">
                        <span>Reported by: {rep.reporterName || 'Resident'}</span>
                        <span className="font-bold uppercase text-slate-700">Status: {rep.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUBTAB: BACKGROUND JOBS & HEALTH */}
          {modSubTab === 'jobs' && (
            <div className="space-y-4">
              {/* Header and Operational Status Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">AI Moderation Service Health</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        moderationHealth?.queueHealth === 'healthy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : moderationHealth?.queueHealth === 'degraded'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {moderationHealth?.queueHealth === 'healthy' ? 'Operational' : moderationHealth?.queueHealth === 'degraded' ? 'Degraded / Multi-Model Active' : 'Service Disrupted'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Active Engine: <strong className="text-slate-800">{moderationHealth?.activeModel || 'gemini-3.5-flash-lite (Google GenAI)'}</strong> • Latency: <span className="font-mono text-slate-700">{moderationHealth?.lastLatencyMs || 1450}ms</span> • Last Checked: <span className="font-mono text-slate-700">{moderationHealth?.lastSuccessfulCheckAt ? new Date(moderationHealth.lastSuccessfulCheckAt).toLocaleTimeString() : 'Recent'}</span>
                    </p>
                  </div>

                  {failedModerationJobs.length > 0 && (
                    <button
                      disabled={isRetryingJobs}
                      onClick={handleRetryFailedJobs}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetryingJobs ? 'animate-spin' : ''}`} />
                      <span>Retry All Failed ({failedModerationJobs.length})</span>
                    </button>
                  )}
                </div>

                {moderationHealth?.recentErrorCategory && !isWarningDismissed && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span><strong>Provider Advisory:</strong> {moderationHealth.recentErrorCategory}. Automated multi-model cascade and bounded retry active.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWarningDismissed(true)}
                      className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer shrink-0 ml-2"
                    >
                      Dismiss Warning
                    </button>
                  </div>
                )}
              </div>

              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Jobs</span>
                  <span className="text-lg font-black text-slate-900">{moderationHealth?.totalJobs || 0}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Completed</span>
                  <span className="text-lg font-black text-emerald-950">{moderationHealth?.completedJobs || 0}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">In-Flight / Pending</span>
                  <span className="text-lg font-black text-blue-950">{(moderationHealth?.pendingJobs || 0) + (moderationHealth?.processingJobs || 0)}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">Retrying / Failed</span>
                  <span className="text-lg font-black text-amber-950">{(moderationHealth?.retryScheduledJobs || 0) + failedModerationJobs.length}</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-purple-700 uppercase font-bold block">Manual Review</span>
                  <span className="text-lg font-black text-purple-950">{pendingCases.length}</span>
                </div>
              </div>

              {/* Recent Jobs Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                      <th className="py-2.5 px-3 font-bold">Job ID</th>
                      <th className="py-2.5 px-3 font-bold">Target</th>
                      <th className="py-2.5 px-3 font-bold">Status</th>
                      <th className="py-2.5 px-3 font-bold">Model Engine</th>
                      <th className="py-2.5 px-3 font-bold">Attempts & Latency</th>
                      <th className="py-2.5 px-3 font-bold">Created At</th>
                      <th className="py-2.5 px-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!moderationHealth?.recentJobs || moderationHealth.recentJobs.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          No background moderation jobs recorded in outbox.
                        </td>
                      </tr>
                    ) : (
                      moderationHealth.recentJobs.map((job: any) => (
                        <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{job.id.slice(0, 14)}...</td>
                          <td className="py-2.5 px-3 text-[11px] font-bold text-slate-800">{job.contentType}: #{job.contentId.slice(0, 8)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              job.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                              job.status === 'retry_scheduled' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[10px] font-mono text-slate-600">{job.modelVersion || 'gemini-3.5-flash-lite'}</td>
                          <td className="py-2.5 px-3 text-[11px] font-mono text-slate-600">
                            Attempt {job.attempts}/{job.maxAttempts || 3}
                            {job.latencyMs ? ` • ${job.latencyMs}ms` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-slate-500 font-mono">
                            {new Date(job.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            {(job.status === 'failed' || job.status === 'retry_scheduled') && (
                              <button
                                onClick={async () => {
                                  const res = await retryModerationJob(job.id);
                                  if (res.success) showSuccess(`Job ${job.id} re-enqueued.`);
                                  else showError(res.error || 'Retry failed.');
                                }}
                                className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                              >
                                Retry
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedJobDetails(job)}
                              className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Job Detail Modal */}
              {selectedJobDetails && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Job Detail Inspector</h4>
                        <span className="text-[10px] font-mono text-slate-400">ID: {selectedJobDetails.id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetails(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><strong className="text-slate-600">Target Type:</strong> <span className="font-mono uppercase">{selectedJobDetails.contentType}</span></div>
                        <div><strong className="text-slate-600">Content ID:</strong> <span className="font-mono">{selectedJobDetails.contentId}</span></div>
                        <div><strong className="text-slate-600">Status:</strong> <span className="font-bold uppercase text-slate-800">{selectedJobDetails.status}</span></div>
                        <div><strong className="text-slate-600">Attempts:</strong> <span className="font-mono">{selectedJobDetails.attempts} of {selectedJobDetails.maxAttempts || 3}</span></div>
                      </div>

                      {selectedJobDetails.contentTitle && (
                        <div>
                          <strong className="text-slate-700 block mb-0.5">Title:</strong>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-bold">
                            {selectedJobDetails.contentTitle}
                          </div>
                        </div>
                      )}

                      <div>
                        <strong className="text-slate-700 block mb-0.5">Content Text:</strong>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                          &ldquo;{selectedJobDetails.contentText}&rdquo;
                        </div>
                      </div>

                      {selectedJobDetails.result && (
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                          <span className="font-bold text-emerald-950 text-[11px] block">AI Classification Result:</span>
                          <p><strong>Category:</strong> {selectedJobDetails.result.flaggedCategory} • <strong>Risk:</strong> {selectedJobDetails.result.riskLevel} • <strong>Confidence:</strong> {Math.round(selectedJobDetails.result.confidence * 100)}%</p>
                          <p className="text-slate-700 leading-snug">{selectedJobDetails.result.explanation}</p>
                        </div>
                      )}

                      {selectedJobDetails.lastError && (
                        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 space-y-0.5">
                          <span className="font-bold text-[11px] block">Error Information:</span>
                          <p className="font-mono text-[10px]">{selectedJobDetails.lastError}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetails(null)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB: TELEMETRY & POLICY PRINCIPLES */}
          {modSubTab === 'false_positives' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  False-Positive Classification Feedback Loop
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When Management dismisses an AI flag, the system records classification feedback categorized by policy topic. This data is monitored to refine deterministic rules and prevent excessive friction in natural community discussions.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {falsePositiveStats.map((stat) => (
                  <div key={stat.category} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      {stat.category.replace('_', ' ')}
                    </span>
                    <span className="text-xl font-black text-slate-900 block">
                      {stat.count}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Dismissed flags
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Privacy and Freedom of Expression Principles</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] space-y-1 text-slate-700">
                  <li>
                    <strong>Management Criticism is Protected:</strong> Resident complaints, grievances regarding maintenance delays, and constructive criticism of JMB/Developer are strictly categorized as <em>safe</em>.
                  </li>
                  <li>
                    <strong>Zero Resident PII Used for Training:</strong> Feedback counters are aggregate metrics; resident content is never sent for model fine-tuning without explicit privacy review.
                  </li>
                  <li>
                    <strong>No Autonomous Punishment:</strong> The AI never independently bans residents, modifies accounts, or removes posts without human management review.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5C: INCIDENT MANAGEMENT                                  */}
      {/* ======================================================== */}
      {activeMgmtTab === 'incidents' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Field Incident Verification & Response Operations</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIncidentSubTab('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    incidentSubTab === 'active' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Active Incidents ({activeIncidents.length})
                </button>
                <button
                  onClick={() => setIncidentSubTab('history')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    incidentSubTab === 'history' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Archived / History ({incidents.filter((i) => i.isArchived).length})
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="relative min-w-0 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search incidents, locations, reporters..."
                  value={incidentSearchQuery}
                  onChange={(e) => setIncidentSearchQuery(e.target.value)}
                  className="w-full h-9 sm:h-10 pl-9 pr-3 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315] bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="min-w-0 w-full">
                <ManagementSelect
                  value={incidentSeverityFilter}
                  onChange={setIncidentSeverityFilter}
                  ariaLabel="Filter by incident severity"
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                />
              </div>

              <div className="min-w-0 w-full">
                <ManagementSelect
                  value={incidentTypeFilter}
                  onChange={setIncidentTypeFilter}
                  ariaLabel="Filter by category or incident type"
                  options={[
                    { value: 'all', label: 'All Incident Types' },
                    { value: 'flood', label: 'Flash Flood' },
                    { value: 'tree_fall', label: 'Fallen Tree / Branch' },
                    { value: 'power_outage', label: 'Power Outage' },
                    { value: 'road_damage', label: 'Road Damage / Pothole' },
                    { value: 'other', label: 'Other Hazard' },
                  ]}
                />
              </div>

              <div className="min-w-0 w-full">
                <ManagementSelect
                  value={incidentStatusFilter}
                  onChange={setIncidentStatusFilter}
                  ariaLabel="Filter by incident status"
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'reported', label: 'Reported' },
                    { value: 'under_review', label: 'Under Review' },
                    { value: 'dispatched', label: 'Team Dispatched' },
                    { value: 'resolved', label: 'Resolved' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Incidents Listing */}
          <div className="space-y-4">
            {incidents
              .filter((inc) => {
                if (incidentSubTab === 'active' && inc.isArchived) return false;
                if (incidentSubTab === 'history' && !inc.isArchived && inc.status !== 'resolved') return false;
                if (incidentSeverityFilter !== 'all' && inc.severity !== incidentSeverityFilter) return false;
                if (incidentTypeFilter !== 'all' && inc.incidentType !== incidentTypeFilter) return false;
                if (incidentStatusFilter !== 'all' && inc.status !== incidentStatusFilter) return false;
                if (incidentSearchQuery.trim()) {
                  const q = incidentSearchQuery.toLowerCase();
                  const match = `${inc.title} ${inc.description} ${inc.locationName} ${inc.reporterName || ''}`.toLowerCase();
                  if (!match.includes(q)) return false;
                }
                return true;
              })
              .map((inc) => {
                const isExpanded = expandedTimelineId === inc.id;
                return (
                  <div key={inc.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{inc.title}</span>
                          
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase">
                            {inc.incidentType.replace('_', ' ')}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inc.severity === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            inc.severity === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            inc.severity === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            Severity: {inc.severity.toUpperCase()}
                          </span>

                          {inc.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full">
                              <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Verified Hazard</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                              Pending Verification
                            </span>
                          )}

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                            inc.status === 'dispatched' ? 'bg-indigo-100 text-indigo-800' :
                            inc.status === 'under_review' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {inc.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                          <MapPin className="w-3.5 h-3.5 text-[#9E1315] shrink-0" />
                          <span>{inc.locationName} ({inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}) • Reporter: {inc.isAnonymous ? 'Anonymous Neighbor' : inc.reporterName} • {new Date(inc.createdAt).toLocaleString()}</span>
                        </p>

                        {inc.isVerified && inc.verifiedByName && (
                          <p className="text-[11px] text-blue-800 font-medium mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Verified by {inc.verifiedByName}: &quot;{inc.verificationNotes}&quot;</span>
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Deep link to Map */}
                        <button
                          onClick={() => {
                            setActiveTab('map');
                            navigateToItem({ tab: 'map', itemId: inc.id, itemType: 'incident' });
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                          <span>View on Map</span>
                        </button>

                        {/* Verification toggle */}
                        {!inc.isVerified ? (
                          <button
                            onClick={() => setVerifyingIncidentId(inc.id)}
                            className="text-xs px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span>Verify Hazard</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setRejectingIncidentId(inc.id)}
                            className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}

                        {/* Status workflow */}
                        <button
                          onClick={() => updateIncidentStatus(inc.id, 'under_review', 'Reviewed by operations command room')}
                          className={`text-xs px-2.5 py-1.5 rounded-xl font-bold cursor-pointer ${
                            inc.status === 'under_review' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                        >
                          Review
                        </button>
                        <button
                          onClick={() => updateIncidentStatus(inc.id, 'dispatched', 'Response team dispatched to coordinate on-site', 'Rapid Response Team')}
                          className={`text-xs px-2.5 py-1.5 rounded-xl font-bold cursor-pointer ${
                            inc.status === 'dispatched' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200'
                          }`}
                        >
                          Dispatch
                        </button>
                        <button
                          onClick={() => updateIncidentStatus(inc.id, 'resolved', 'Resolution work verified complete on-site')}
                          className={`text-xs px-2.5 py-1.5 rounded-xl font-bold cursor-pointer ${
                            inc.status === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                          }`}
                        >
                          Resolve
                        </button>

                        {/* Archive button */}
                        {inc.status === 'resolved' && !inc.isArchived && (
                          <button
                            onClick={() => setArchiveModalIncident(inc)}
                            className="text-xs px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Archive className="w-3.5 h-3.5 text-amber-400" />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {inc.imageUrl && (
                      <div className="pt-1">
                        <a href={inc.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-block group">
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 w-36 h-24 bg-slate-100">
                            <img src={inc.imageUrl} alt={inc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Full Photo
                            </div>
                          </div>
                        </a>
                      </div>
                    )}

                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <strong>Description:</strong> {inc.description}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Verification Modal */}
          {verifyingIncidentId && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900">Verify Incident as Official Hazard Alert</h4>
                  </div>
                  <button onClick={() => setVerifyingIncidentId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleVerifyIncidentSubmit} className="space-y-3 text-xs">
                  <p className="text-slate-600">
                    This incident will be displayed with an official verified badge and highlighted on the community feed for all Elmina residents.
                  </p>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Officer Verification Notes</label>
                    <textarea
                      required
                      rows={3}
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="e.g. Patrol team confirmed 0.3m water accumulation near junction..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setVerifyingIncidentId(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                    >
                      Verify & Broadcast Alert
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Archive Modal */}
          {archiveModalIncident && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Archive className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-bold text-slate-900">Archive Resolved Incident</h4>
                  </div>
                  <button onClick={() => setArchiveModalIncident(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>
                    Archiving incident <strong>&quot;{archiveModalIncident.title}&quot;</strong> will remove it from the public resilience map and community feed.
                  </p>
                  <p className="p-3 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200/70 text-[11px]">
                    <strong>Retention Guarantee:</strong> Incident records are never erased. Complete timeline logs, officer notes, and timestamps are permanently retained in Supabase.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    disabled={archiveLoading}
                    onClick={() => setArchiveModalIncident(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={archiveLoading}
                    onClick={handleArchiveIncidentConfirm}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs"
                  >
                    {archiveLoading ? 'Archiving...' : 'Confirm & Archive'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5D: RESIDENT MANAGEMENT                                  */}
      {/* ======================================================== */}
      {activeMgmtTab === 'residents' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Pending ID Verifications Queue */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-800" />
                  <span>Resident Identity Verification Queue</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review proof of ownership or tenancy (S&P / Assessment Tax / Tenancy Agreement). All PII is masked for PDPA compliance.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Pending: {pendingVerificationProfiles.length}
              </span>
            </div>

            <div className="space-y-3">
              {pendingVerificationProfiles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No pending resident verification requests at this time.</p>
                </div>
              ) : (
                pendingVerificationProfiles.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                        alt={p.fullName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{p.fullName}</h4>
                        <p className="text-[11px] text-slate-500">
                          {p.townshipPrecinct} • Unit: {p.unitNumber || 'Verified in S&P record'}
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Phone: {p.phone || 'Protected'} (Verified via OTP)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => verifyResidentAccount(p.id, false)}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline Request</span>
                      </button>
                      <button
                        onClick={() => verifyResidentAccount(p.id, true)}
                        className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Resident</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resident Directory & Role Governance */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-800" />
                  <span>Resident Directory & Governance</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage resident roles and account standing. Guarded against revoking the last management account.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                <div className="relative min-w-0 flex-1 sm:w-48">
                  <input
                    type="text"
                    placeholder="Search resident..."
                    value={residentSearchQuery}
                    onChange={(e) => setResidentSearchQuery(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
                  />
                </div>
                <div className="min-w-0 w-36 sm:w-40 shrink-0">
                  <ManagementSelect
                    value={residentRoleFilter}
                    onChange={setResidentRoleFilter}
                    ariaLabel="Filter by role"
                    options={[
                      { value: 'all', label: 'All Roles' },
                      { value: 'resident', label: 'Resident' },
                      { value: 'moderator', label: 'Moderator' },
                      { value: 'security', label: 'Security' },
                      { value: 'management', label: 'Management' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {roleMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                roleMessage.isError ? 'bg-rose-50 text-rose-900 border border-rose-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}>
                {roleMessage.isError ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span>{roleMessage.text}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3 font-bold">Resident</th>
                    <th className="py-2.5 px-3 font-bold">Precinct</th>
                    <th className="py-2.5 px-3 font-bold">Verification</th>
                    <th className="py-2.5 px-3 font-bold">Status</th>
                    <th className="py-2.5 px-3 font-bold">Role Assignment</th>
                    <th className="py-2.5 px-3 font-bold">Account Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableProfiles
                    .filter((prof) => {
                      if (residentRoleFilter !== 'all' && prof.role !== residentRoleFilter) return false;
                      if (residentSearchQuery.trim()) {
                        const q = residentSearchQuery.toLowerCase();
                        if (!prof.fullName.toLowerCase().includes(q) && !prof.townshipPrecinct.toLowerCase().includes(q)) return false;
                      }
                      return true;
                    })
                    .map((prof) => (
                      <tr key={prof.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <img src={prof.avatarUrl} alt={prof.fullName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            <div>
                              <span className="font-bold text-slate-900 block">{prof.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {prof.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                          {prof.townshipPrecinct}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prof.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {prof.verificationStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prof.status === 'suspended' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {prof.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="w-32 min-w-0">
                            <ManagementSelect
                              value={prof.role}
                              onChange={(val) => handleRoleChange(prof.id, val as UserRole)}
                              ariaLabel={`Role for ${prof.fullName}`}
                              className="h-8 py-1 text-xs"
                              options={[
                                { value: 'resident', label: 'Resident' },
                                { value: 'moderator', label: 'Moderator' },
                                { value: 'security', label: 'Security' },
                                { value: 'management', label: 'Management' },
                              ]}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {prof.status === 'suspended' ? (
                            <button
                              onClick={() => handleAccountStatusChange(prof.id, 'active')}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                            >
                              Restore Account
                            </button>
                          ) : (
                            <button
                              onClick={() => setSuspendModalUser(prof)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              Restrict / Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suspend Modal */}
          {suspendModalUser && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldX className="w-5 h-5 text-rose-600" />
                    <h4 className="text-sm font-bold text-slate-900">Suspend Resident Account</h4>
                  </div>
                  <button onClick={() => setSuspendModalUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">
                    Suspending <strong>{suspendModalUser.fullName}</strong> will temporarily restrict posting and exchange transactions.
                  </p>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mandatory Officer Rationale</label>
                    <textarea
                      required
                      rows={3}
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="e.g. Repeated abusive comments in violation of section 4.2..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSuspendModalUser(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAccountStatusChange(suspendModalUser.id, 'suspended', suspendReason)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs"
                  >
                    Confirm Suspension
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5E: OFFICIAL NOTICES MANAGEMENT                           */}
      {/* ======================================================== */}
      {activeMgmtTab === 'notices' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-800" />
                  <span>Official Township Notices Administration</span>
                </h3>
              </div>

              <button
                onClick={() => setIsCreateNoticeOpen(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Official Notice</span>
              </button>
            </div>

            {/* Notices List */}
            <div className="space-y-3">
              {officialNoticesList.length === 0 ? (
                <p className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl text-xs">
                  No official notices currently published.
                </p>
              ) : (
                officialNoticesList.map((notice) => (
                  <div key={notice.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{notice.title}</span>
                        {notice.isPinned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1">
                            <Pin className="w-3 h-3 text-emerald-700" />
                            <span>Pinned</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                          {notice.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{notice.content}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Published by {notice.authorName} • {new Date(notice.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePinPost(notice.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        {notice.isPinned ? 'Unpin' : 'Pin to Top'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotice(notice);
                          setEditNoticeTitle(notice.title);
                          setEditNoticeContent(notice.content);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmItem({ type: 'post', id: notice.id, title: notice.title })}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Notice Modal */}
          {isCreateNoticeOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Publish Official Township Notice</h4>
                  <button onClick={() => setIsCreateNoticeOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateNoticeSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notice Category</label>
                    <ManagementSelect
                      value={noticeCategory}
                      onChange={(val) => setNoticeCategory(val as any)}
                      ariaLabel="Notice Category"
                      options={[
                        { value: 'announcement', label: 'Official Management Announcement' },
                        { value: 'security_alert', label: 'Urgent Township Security Alert' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Schedule for Water Reservoir Maintenance"
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notice Content</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Details of the announcement, schedules, affected areas..."
                      value={noticeContent}
                      onChange={(e) => setNoticeContent(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cover Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={noticeImageUrl}
                      onChange={(e) => setNoticeImageUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateNoticeOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Publish Notice
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Notice Modal */}
          {editingNotice && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Edit Notice Content</h4>
                  <button onClick={() => setEditingNotice(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdateNoticeSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={editNoticeTitle}
                      onChange={(e) => setEditNoticeTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notice Content</label>
                    <textarea
                      required
                      rows={5}
                      value={editNoticeContent}
                      onChange={(e) => setEditNoticeContent(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingNotice(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5F: EVENT MANAGEMENT                                     */}
      {/* ======================================================== */}
      {activeMgmtTab === 'events' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-800" />
                  <span>Township Events Administration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organize and publish community events for Elmina residents. Dates are scheduled in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Asia/Kuala_Lumpur</code>.
                </p>
              </div>

              <button
                onClick={() => setIsCreateEventOpen(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Community Event</span>
              </button>
            </div>

            {/* Events List */}
            <div className="space-y-3">
              {upcomingEventsList.length === 0 ? (
                <p className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl text-xs">
                  No upcoming township events scheduled.
                </p>
              ) : (
                upcomingEventsList.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{ev.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
                          <span>{ev.eventDate || 'Upcoming'}</span>
                        </span>
                        {ev.eventTime && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{ev.eventTime}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{ev.content}</p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Venue: {ev.eventVenue || 'Elmina Central Park'} • Organizer: {ev.authorName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDeleteConfirmItem({ type: 'post', id: ev.id, title: ev.title })}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                      >
                        Cancel / Archive
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Event Modal */}
          {isCreateEventOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Schedule New Community Event</h4>
                  <button onClick={() => setIsCreateEventOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateEventSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Event Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elmina Valley Gotong-Royong Clean-Up"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 08:30 AM"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Venue / Gathering Point</label>
                    <input
                      type="text"
                      placeholder="e.g. Pavilion Field, Elmina Central Park"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Event Description</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="What should residents bring? Schedule, refreshments, contact officer..."
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cover Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={eventImageUrl}
                      onChange={(e) => setEventImageUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateEventOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Publish Event
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5G: COMMUNITY CONTENT MANAGEMENT                         */}
      {/* ======================================================== */}
      {activeMgmtTab === 'content' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-800" />
                  <span>Township User-Generated Content Hub</span>
                </h3>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
                <input
                  type="text"
                  placeholder="Search title, content, author..."
                  value={contentSearchQuery}
                  onChange={(e) => setContentSearchQuery(e.target.value)}
                  className="h-9 sm:h-10 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-w-0 flex-1 focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
                />
                <div className="min-w-0 w-48 sm:w-56 shrink-0">
                  <ManagementSelect
                    value={contentFilterType}
                    onChange={(val) => setContentFilterType(val as any)}
                    ariaLabel="Filter content type"
                    options={[
                      { value: 'all', label: 'All Content' },
                      { value: 'post', label: `Feed Posts (${posts.length})` },
                      { value: 'exchange', label: `Exchange Listings (${exchangeItems.length})` },
                      { value: 'service', label: `Local Services (${services.length})` },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Content List */}
            <div className="space-y-3">
              {/* Posts */}
              {(contentFilterType === 'all' || contentFilterType === 'post') &&
                posts
                  .filter((p) => {
                    if (contentSearchQuery.trim()) {
                      const q = contentSearchQuery.toLowerCase();
                      if (!p.title.toLowerCase().includes(q) && !p.content.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  })
                  .slice(0, 15)
                  .map((post) => (
                    <div key={post.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                            POST
                          </span>
                          <span className="text-xs font-bold text-slate-900">{post.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {post.id}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{post.content}</p>
                        <span className="text-[10px] text-slate-400">
                          By: {post.authorName} ({post.authorPrecinct}) • {new Date(post.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDeleteConfirmItem({ type: 'post', id: post.id, title: post.title })}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Take Down</span>
                        </button>
                      </div>
                    </div>
                  ))}

              {/* Exchange Items */}
              {(contentFilterType === 'all' || contentFilterType === 'exchange') &&
                exchangeItems
                  .filter((item) => {
                    if (contentSearchQuery.trim()) {
                      const q = contentSearchQuery.toLowerCase();
                      if (!item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  })
                  .slice(0, 10)
                  .map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                            EXCHANGE
                          </span>
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{item.description}</p>
                        <span className="text-[10px] text-slate-400">
                          By: {item.authorName} ({item.precinct}) • Status: {item.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDeleteConfirmItem({ type: 'exchange', id: item.id, title: item.title })}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Take Down</span>
                        </button>
                      </div>
                    </div>
                  ))}

              {/* Services */}
              {(contentFilterType === 'all' || contentFilterType === 'service') &&
                services
                  .filter((serv) => {
                    if (contentSearchQuery.trim()) {
                      const q = contentSearchQuery.toLowerCase();
                      if (!serv.title.toLowerCase().includes(q) && !serv.description.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  })
                  .slice(0, 10)
                  .map((serv) => (
                    <div key={serv.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                            SERVICE
                          </span>
                          <span className="text-xs font-bold text-slate-900">{serv.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {serv.id}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{serv.description}</p>
                        <span className="text-[10px] text-slate-400">
                          Provider: {serv.authorName} ({serv.precinct}) • {serv.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDeleteConfirmItem({ type: 'service', id: serv.id, title: serv.title })}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Take Down</span>
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Delete Content Modal */}
          {deleteConfirmItem && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <h4 className="text-sm font-bold text-slate-900">Soft-Delete Content</h4>
                  </div>
                  <button onClick={() => setDeleteConfirmItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs text-slate-600">
                  <p>
                    Are you sure you want to remove <strong>&quot;{deleteConfirmItem.title}&quot;</strong>? It will be immediately hidden from community views.
                  </p>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Auditor Removal Reason</label>
                    <textarea
                      rows={3}
                      value={deleteReasonNote}
                      onChange={(e) => setDeleteReasonNote(e.target.value)}
                      placeholder="e.g. Offensive language violation reported by multiple residents..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteConfirmItem(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteContentDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs"
                  >
                    Confirm Take Down
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5H: NOTIFICATIONS & BROADCASTS                           */}
      {/* ======================================================== */}
      {activeMgmtTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section A: Emergency Broadcast Dispatcher */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-800" />
                <span>Township Emergency Broadcast Banner</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official broadcasts are prominently pinned across all resident mobile and desktop views with high priority visual styling.
              </p>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Broadcast Type</label>
                <ManagementSelect
                  value={broadcastCategory}
                  onChange={(val) => setBroadcastCategory(val as any)}
                  ariaLabel="Broadcast Type"
                  options={[
                    { value: 'announcement', label: 'Official Management Announcement (JMB / Sime Darby)' },
                    { value: 'security_alert', label: 'Urgent Security Alert (Auxiliary Police / Guardhouse)' },
                  ]}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Broadcast Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TNB Power Grid Upgrading Work Notification"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast Message Body</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Detail the affected precincts, timelines, diversions, and emergency contacts..."
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={broadcastSubmitting}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{broadcastSubmitting ? 'Dispatching...' : 'Dispatch Broadcast Now'}</span>
              </button>
            </form>
          </div>

          {/* Section B: Operational Alerts Feed */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-700" />
              <span>Real-Time System & Moderation Operational Alerts</span>
            </h4>

            <div className="space-y-2">
              {operationalAlerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{alert.title}</span>
                    <p className="text-[11px] text-slate-600">{alert.desc}</p>
                  </div>
                  <button
                    onClick={() => setActiveMgmtTab(alert.linkTab)}
                    className="text-xs font-bold text-emerald-800 underline cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5I: ACTIVITY & AUDIT LOGS                                */}
      {/* ======================================================== */}
      {activeMgmtTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Administration & Security Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tamper-evident record of consequential operations. Ordinary residents have zero access to this table.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full">
              {auditLogs.length} events logged
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search audit events, actors, actions..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 flex-1 max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-bold">Timestamp</th>
                  <th className="py-2.5 px-3 font-bold">Actor</th>
                  <th className="py-2.5 px-3 font-bold">Action</th>
                  <th className="py-2.5 px-3 font-bold">Target</th>
                  <th className="py-2.5 px-3 font-bold">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs
                  .filter((log) => {
                    if (auditSearchQuery.trim()) {
                      const q = auditSearchQuery.toLowerCase();
                      const match = `${log.action} ${log.actorName} ${log.targetType} ${log.targetId}`.toLowerCase();
                      if (!match.includes(q)) return false;
                    }
                    return true;
                  })
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                        {log.actorName} <span className="text-slate-400 font-normal">({log.actorRole})</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono bg-slate-100 text-emerald-950 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {log.targetType} ({log.targetId.slice(0, 8)})
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs text-[11px] font-mono">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5J: ANALYTICS & ADVANCED REPORTING WORKSPACE (PHASE 4)    */}
      {/* ======================================================== */}
      {activeMgmtTab === 'analytics' && (
        <AnalyticsReportsPanel onNavigateTab={handleTabChangeWithFilter} />
      )}

      {/* ======================================================== */}
      {/* 5K: MANAGEMENT SETTINGS & AI MONITOR                     */}
      {/* ======================================================== */}
      {activeMgmtTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Community Moderation & Operational Configuration
            </h3>
            <p className="text-xs text-slate-500">
              System thresholds, AI moderation policies, and data retention guidelines. Privileged API keys and system credentials cannot be altered from this panel.
            </p>

            <div className="space-y-4 pt-2 text-xs">
              {/* Toggle 1: AI Moderation Engine */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">AI Background Moderation Engine</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Evaluates eligible feed posts, comments, exchange listings, and services for community policy violations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAiEnabledSetting(!aiEnabledSetting);
                    showSuccess(`AI Moderation processing is now ${!aiEnabledSetting ? 'ENABLED' : 'PAUSED'}.`);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
                    aiEnabledSetting ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {aiEnabledSetting ? 'Enabled' : 'Paused'}
                </button>
              </div>

              {/* Threshold Preset */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold text-slate-900">AI Sensitivity & Threshold Preset</h4>
                <p className="text-[11px] text-slate-500">
                  Calibrate the confidence threshold required before a human review flag is created.
                </p>
                <div className="flex gap-2">
                  {(['standard', 'strict', 'lenient'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setActiveThresholdPreset(preset);
                        showSuccess(`Sensitivity preset changed to "${preset.toUpperCase()}".`);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold capitalize cursor-pointer ${
                        activeThresholdPreset === preset ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Policy Reference Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                <span className="font-bold block">Protected Dialogue Policy Reference</span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Under TESDH guidelines, criticisms of township management, complaints regarding gate delays, or reports on maintenance deficiencies are strictly categorized as <strong>legitimate civic feedback</strong>. AI models are constrained with negative guardrails to prevent false-positive suppression of resident complaints.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
