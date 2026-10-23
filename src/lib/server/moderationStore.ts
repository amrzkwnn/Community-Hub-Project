import fs from 'fs';
import path from 'path';
import os from 'os';
import type {
  ModerationReport,
  AiModerationItem,
  ModerationJob,
  UnifiedModerationCase,
  AiModerationViolationCategory,
  AiModerationRiskLevel,
  FalsePositiveStats
} from '../../types/index.ts';
import { INITIAL_AI_MODERATION_ITEMS, INITIAL_MODERATION_REPORTS } from '../data/mockData.ts';

// Storage file location for durable persistence across server requests and reloads.
// In serverless environments (e.g. Vercel Lambda), process.cwd() is read-only.
// We use os.tmpdir() when VERCEL is detected to ensure reliable file operations without EROFS errors.
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT
);
const STORE_DIR = isServerless
  ? path.join(os.tmpdir(), 'tesdh_runtime_data')
  : path.join(process.cwd(), '.runtime_data');
const STORE_FILE = path.join(STORE_DIR, 'moderation_store.json');

interface ModerationStoreData {
  reports: ModerationReport[];
  aiQueue: AiModerationItem[];
  jobs: ModerationJob[];
  cases: UnifiedModerationCase[];
  falsePositiveCounts: Record<AiModerationViolationCategory, number>;
}

const DEFAULT_STORE: ModerationStoreData = {
  reports: [...INITIAL_MODERATION_REPORTS],
  aiQueue: [...INITIAL_AI_MODERATION_ITEMS],
  jobs: [],
  cases: [],
  falsePositiveCounts: {
    spam: 1,
    scam: 0,
    harassment: 0,
    dangerous_content: 0,
    misleading_claim: 2,
    safe: 0,
  },
};

let memoryStore: ModerationStoreData | null = null;

function normalizeTargetType(t: string): string {
  if (t === 'comment') return 'reply';
  return t;
}

function typesMatch(t1: string, t2: string): boolean {
  if (t1 === t2) return true;
  return normalizeTargetType(t1) === normalizeTargetType(t2);
}

function ensureStoreLoaded(): ModerationStoreData {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      
      const loadedReports: ModerationReport[] = Array.isArray(parsed.reports) && parsed.reports.length > 0 
        ? parsed.reports 
        : [...INITIAL_MODERATION_REPORTS];
        
      // Merge in any initial reports that might be missing
      for (const initRep of INITIAL_MODERATION_REPORTS) {
        if (!loadedReports.some((r) => r.id === initRep.id)) {
          loadedReports.push(initRep);
        }
      }

      const loadedAiQueue: AiModerationItem[] = Array.isArray(parsed.aiQueue) && parsed.aiQueue.length > 0
        ? parsed.aiQueue
        : [...INITIAL_AI_MODERATION_ITEMS];
        
      for (const initAi of INITIAL_AI_MODERATION_ITEMS) {
        if (!loadedAiQueue.some((a) => a.id === initAi.id)) {
          loadedAiQueue.push(initAi);
        }
      }

      memoryStore = {
        reports: loadedReports,
        aiQueue: loadedAiQueue,
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
        cases: Array.isArray(parsed.cases) ? parsed.cases : [],
        falsePositiveCounts: {
          ...DEFAULT_STORE.falsePositiveCounts,
          ...(parsed.falsePositiveCounts || {})
        }
      };

      // Re-index unified cases to guarantee every manual report & AI flag is represented
      rebuildAllCases(memoryStore);
      persistStore();
      return memoryStore;
    }
  } catch (err) {
    console.warn('[moderationStore] Failed reading persistent store, using default memory store:', err);
  }

  memoryStore = {
    reports: [...INITIAL_MODERATION_REPORTS],
    aiQueue: [...INITIAL_AI_MODERATION_ITEMS],
    jobs: [],
    cases: [],
    falsePositiveCounts: { ...DEFAULT_STORE.falsePositiveCounts }
  };
  rebuildAllCases(memoryStore);
  persistStore();
  return memoryStore;
}

function rebuildAllCases(store: ModerationStoreData) {
  // Sync all manual reports into cases
  for (const rep of store.reports) {
    internalSyncCase(store, rep.targetType, rep.targetId, rep.targetTitle, rep.targetContent);
  }
  // Sync all AI items into cases
  for (const ai of store.aiQueue) {
    internalSyncCase(store, ai.contentType, ai.contentId, ai.contentTitle, ai.contentPreview, ai.authorId, ai.authorName);
  }
}

function internalSyncCase(
  store: ModerationStoreData,
  targetType: 'post' | 'comment' | 'reply' | 'service' | 'exchange' | 'incident' | 'user',
  targetId: string,
  targetTitle?: string,
  targetContent?: string,
  authorId?: string,
  authorName?: string,
  authorPrecinct?: string
): UnifiedModerationCase {
  const existingCaseIdx = store.cases.findIndex(
    (c) => typesMatch(c.targetType, targetType) && c.targetId === targetId
  );

  const relatedReports = store.reports.filter(
    (r) => typesMatch(r.targetType, targetType) && r.targetId === targetId
  );
  const relatedAiFlag = store.aiQueue.find(
    (a) => typesMatch(a.contentType, targetType) && a.contentId === targetId
  );

  const highestRisk: AiModerationRiskLevel = 
    relatedAiFlag?.riskLevel || 
    (relatedReports.some((r) => ['threats_violence', 'harassment'].includes(r.reason)) ? 'high' : 'medium');

  const primaryCategory = 
    relatedAiFlag?.flaggedCategory || 
    (relatedReports[0]?.reason || 'other');

  let overallStatus: UnifiedModerationCase['overallStatus'] = 'pending';
  if (relatedAiFlag?.decision === 'removed' || relatedReports.some((r) => r.status === 'actioned')) {
    overallStatus = 'removed';
  } else if (relatedAiFlag?.decision === 'kept') {
    overallStatus = 'kept';
  } else if (relatedAiFlag?.status === 'dismissed' && relatedReports.every((r) => r.status === 'dismissed')) {
    overallStatus = 'dismissed';
  } else if (relatedReports.some((r) => r.status === 'under_review') || relatedAiFlag?.status === 'under_review') {
    overallStatus = 'under_review';
  }

  const firstReportedAt = 
    relatedReports[0]?.createdAt || 
    relatedAiFlag?.flaggedAt || 
    new Date().toISOString();

  const caseId = existingCaseIdx >= 0 ? store.cases[existingCaseIdx].id : `case-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const unifiedCase: UnifiedModerationCase = {
    id: caseId,
    targetType,
    targetId,
    targetTitle: targetTitle || relatedReports[0]?.targetTitle || relatedAiFlag?.contentTitle,
    targetContent: targetContent || relatedReports[0]?.targetContent || relatedAiFlag?.contentPreview || '',
    authorId: authorId || relatedAiFlag?.authorId,
    authorName: authorName || relatedAiFlag?.authorName,
    authorPrecinct,
    reports: relatedReports,
    aiFlag: relatedAiFlag,
    overallStatus,
    primaryCategory,
    highestRisk,
    firstReportedAt,
    lastUpdatedAt: new Date().toISOString(),
    managementNotes: relatedAiFlag?.resolutionNote || relatedReports[0]?.resolutionNote,
    reviewedBy: relatedAiFlag?.reviewedBy || relatedReports[0]?.reviewedBy,
    reviewedAt: relatedAiFlag?.reviewedAt || relatedReports[0]?.reviewedAt,
  };

  if (existingCaseIdx >= 0) {
    store.cases[existingCaseIdx] = unifiedCase;
  } else {
    store.cases.unshift(unifiedCase);
  }

  return unifiedCase;
}

function persistStore() {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[moderationStore] Failed writing persistent store:', err);
  }
}

/**
 * Re-indexes a unified case whenever an AI flag or resident report is added or updated.
 */
function syncUnifiedCase(
  targetType: 'post' | 'comment' | 'reply' | 'service' | 'exchange' | 'incident' | 'user',
  targetId: string,
  targetTitle?: string,
  targetContent?: string,
  authorId?: string,
  authorName?: string,
  authorPrecinct?: string
): UnifiedModerationCase {
  const store = ensureStoreLoaded();
  const c = internalSyncCase(store, targetType, targetId, targetTitle, targetContent, authorId, authorName, authorPrecinct);
  persistStore();
  return c;
}

// -----------------------------------------------------------------------------
// Manual Reports API
// -----------------------------------------------------------------------------

import crypto from 'crypto';

export function addManualReport(reportData: Omit<ModerationReport, 'id' | 'createdAt' | 'status'> & {
  id?: string;
  createdAt?: string;
  status?: ModerationReport['status'];
}): { report: ModerationReport; unifiedCase: UnifiedModerationCase; isDuplicate: boolean } {
  const store = ensureStoreLoaded();

  // Deduplication check: prevent same reporter from reporting same content within 5 minutes
  const now = Date.now();
  const existingRecent = store.reports.find(
    (r) =>
      r.reporterId === reportData.reporterId &&
      typesMatch(r.targetType, reportData.targetType) &&
      r.targetId === reportData.targetId &&
      now - new Date(r.createdAt).getTime() < 5 * 60 * 1000
  );

  if (existingRecent) {
    const unifiedCase = syncUnifiedCase(
      reportData.targetType,
      reportData.targetId,
      reportData.targetTitle,
      reportData.targetContent
    );
    return { report: existingRecent, unifiedCase, isDuplicate: true };
  }

  const generatedId = reportData.id || crypto.randomUUID();

  const newReport: ModerationReport = {
    id: generatedId,
    reporterId: reportData.reporterId,
    reporterName: reportData.reporterName,
    targetType: reportData.targetType,
    targetId: reportData.targetId,
    targetTitle: reportData.targetTitle,
    targetContent: reportData.targetContent,
    reason: reportData.reason,
    details: reportData.details,
    status: reportData.status || 'pending',
    createdAt: reportData.createdAt || new Date().toISOString(),
  };

  store.reports.unshift(newReport);

  const unifiedCase = syncUnifiedCase(
    reportData.targetType,
    reportData.targetId,
    reportData.targetTitle,
    reportData.targetContent
  );

  persistStore();
  return { report: newReport, unifiedCase, isDuplicate: false };
}

export function getManualReports(): ModerationReport[] {
  const store = ensureStoreLoaded();
  return [...store.reports];
}

export function upsertDatabaseReports(dbReports: ModerationReport[]) {
  const store = ensureStoreLoaded();
  let modified = false;
  for (const rep of dbReports) {
    const existingIdx = store.reports.findIndex((r) => r.id === rep.id);
    if (existingIdx >= 0) {
      if (store.reports[existingIdx].status !== rep.status || rep.resolutionNote) {
        store.reports[existingIdx] = { ...store.reports[existingIdx], ...rep };
        modified = true;
      }
    } else {
      store.reports.unshift(rep);
      modified = true;
    }
  }
  if (modified) {
    rebuildAllCases(store);
    persistStore();
  }
}

export function updateManualReport(
  reportId: string,
  updates: Partial<ModerationReport>
): ModerationReport | null {
  const store = ensureStoreLoaded();
  const idx = store.reports.findIndex((r) => r.id === reportId);
  if (idx === -1) return null;

  store.reports[idx] = {
    ...store.reports[idx],
    ...updates,
    reviewedAt: updates.reviewedAt || new Date().toISOString(),
  };

  const rep = store.reports[idx];
  syncUnifiedCase(rep.targetType, rep.targetId, rep.targetTitle, rep.targetContent);
  persistStore();
  return store.reports[idx];
}

// -----------------------------------------------------------------------------
// AI Moderation Queue API
// -----------------------------------------------------------------------------

export function recordAiModerationItem(item: Partial<AiModerationItem> & { contentId: string }): AiModerationItem {
  const store = ensureStoreLoaded();
  const fullItem: AiModerationItem = {
    id: item.id || `mod-queue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: item.status || 'pending',
    flaggedAt: item.flaggedAt || new Date().toISOString(),
    ...item,
  } as AiModerationItem;

  const existingIdx = store.aiQueue.findIndex((q) => q.contentId === fullItem.contentId);
  if (existingIdx >= 0) {
    store.aiQueue[existingIdx] = {
      ...store.aiQueue[existingIdx],
      ...fullItem,
      id: store.aiQueue[existingIdx].id || fullItem.id,
    };
  } else {
    store.aiQueue.unshift(fullItem);
  }

  syncUnifiedCase(
    fullItem.contentType,
    fullItem.contentId,
    fullItem.contentTitle,
    fullItem.contentPreview,
    fullItem.authorId,
    fullItem.authorName
  );

  persistStore();
  return existingIdx >= 0 ? store.aiQueue[existingIdx] : fullItem;
}

export function getAiModerationQueue(): AiModerationItem[] {
  const store = ensureStoreLoaded();
  return [...store.aiQueue];
}

export function updateAiModerationItem(
  itemId: string,
  updates: Partial<AiModerationItem>
): AiModerationItem | null {
  const store = ensureStoreLoaded();
  const idx = store.aiQueue.findIndex((q) => q.id === itemId);
  if (idx === -1) return null;

  store.aiQueue[idx] = {
    ...store.aiQueue[idx],
    ...updates,
    reviewedAt: updates.reviewedAt || new Date().toISOString(),
  };

  const item = store.aiQueue[idx];
  syncUnifiedCase(
    item.contentType,
    item.contentId,
    item.contentTitle,
    item.contentPreview,
    item.authorId,
    item.authorName
  );

  persistStore();
  return store.aiQueue[idx];
}

// -----------------------------------------------------------------------------
// Durable Moderation Jobs API
// -----------------------------------------------------------------------------

export function enqueueModerationJob(jobData: {
  contentType: 'post' | 'reply' | 'exchange' | 'service';
  contentId: string;
  contentTitle?: string;
  contentText: string;
  authorId: string;
  authorName: string;
}): ModerationJob {
  const store = ensureStoreLoaded();
  const contentHash = Buffer.from(`${jobData.contentTitle || ''}:${jobData.contentText}`).toString('base64');

  // Idempotency: If job already exists with same contentHash and is completed, return existing
  const existingJob = store.jobs.find(
    (j) => j.contentId === jobData.contentId && j.contentHash === contentHash && j.status === 'completed'
  );
  if (existingJob) {
    return existingJob;
  }

  const newJob: ModerationJob = {
    id: `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    contentType: jobData.contentType,
    contentId: jobData.contentId,
    contentTitle: jobData.contentTitle,
    contentText: jobData.contentText,
    contentHash,
    authorId: jobData.authorId,
    authorName: jobData.authorName,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    modelVersion: 'gemini-3.5-flash-lite',
  };

  store.jobs.unshift(newJob);
  persistStore();
  return newJob;
}

export function getModerationJobs(): ModerationJob[] {
  const store = ensureStoreLoaded();
  return [...store.jobs];
}

export function updateModerationJob(
  jobId: string,
  updates: Partial<ModerationJob>
): ModerationJob | null {
  const store = ensureStoreLoaded();
  const idx = store.jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;

  store.jobs[idx] = {
    ...store.jobs[idx],
    ...updates,
    processedAt: updates.processedAt || new Date().toISOString(),
  };

  persistStore();
  return store.jobs[idx];
}

// -----------------------------------------------------------------------------
// Unified Cases API
// -----------------------------------------------------------------------------

export function getUnifiedCases(): UnifiedModerationCase[] {
  const store = ensureStoreLoaded();
  return [...store.cases].sort((a, b) => {
    // Priority: pending high risk > pending medium > under_review > resolved
    const riskScore = (c: UnifiedModerationCase) => {
      if (c.overallStatus === 'pending') {
        return c.highestRisk === 'high' ? 100 : 80;
      }
      if (c.overallStatus === 'under_review') return 50;
      return 10;
    };
    return riskScore(b) - riskScore(a);
  });
}

export function getUnifiedCaseById(caseId: string): UnifiedModerationCase | null {
  const store = ensureStoreLoaded();
  return store.cases.find((c) => c.id === caseId) || null;
}

// -----------------------------------------------------------------------------
// False Positive Telemetry API
// -----------------------------------------------------------------------------

export function getFalsePositiveStats(): FalsePositiveStats[] & { byCategory: Record<AiModerationViolationCategory, number> } {
  const store = ensureStoreLoaded();
  const list = Object.entries(store.falsePositiveCounts).map(([cat, count]) => ({
    category: cat as AiModerationViolationCategory,
    count,
  })) as FalsePositiveStats[] & { byCategory: Record<AiModerationViolationCategory, number> };
  list.byCategory = { ...store.falsePositiveCounts };
  return list;
}

export function incrementFalsePositive(category: AiModerationViolationCategory) {
  const store = ensureStoreLoaded();
  store.falsePositiveCounts[category] = (store.falsePositiveCounts[category] || 0) + 1;
  persistStore();
}

// -----------------------------------------------------------------------------
// Telemetry & Diagnostic API
// -----------------------------------------------------------------------------

interface ModerationTelemetry {
  lastSuccessAt?: string;
  lastLatencyMs?: number;
  lastModelUsed?: string;
  lastErrorCategory?: string;
  lastErrorCode?: number;
  lastErrorAt?: string;
  totalAnalyses: number;
}

const runtimeTelemetry: ModerationTelemetry = {
  lastSuccessAt: new Date().toISOString(),
  lastLatencyMs: 1450,
  lastModelUsed: 'gemini-3.5-flash-lite',
  totalAnalyses: 0,
};

export function recordModerationTelemetry(data: {
  success: boolean;
  modelUsed?: string;
  latencyMs?: number;
  errorStatus?: number;
  errorMessage?: string;
  tokenUsage?: number;
}) {
  runtimeTelemetry.totalAnalyses += 1;
  if (data.success) {
    runtimeTelemetry.lastSuccessAt = new Date().toISOString();
    if (data.latencyMs) runtimeTelemetry.lastLatencyMs = data.latencyMs;
    if (data.modelUsed) runtimeTelemetry.lastModelUsed = data.modelUsed;
    runtimeTelemetry.lastErrorCategory = undefined;
    runtimeTelemetry.lastErrorCode = undefined;
  } else {
    runtimeTelemetry.lastErrorAt = new Date().toISOString();
    runtimeTelemetry.lastErrorCode = data.errorStatus;
    if (data.errorStatus === 503) {
      runtimeTelemetry.lastErrorCategory = '503 Provider High Demand';
    } else if (data.errorStatus === 429) {
      runtimeTelemetry.lastErrorCategory = '429 Rate Limit / Quota Exceeded';
    } else if (data.errorStatus === 404) {
      runtimeTelemetry.lastErrorCategory = '404 Model Deprecated/Unavailable';
    } else if (data.errorStatus === 401 || data.errorStatus === 403) {
      runtimeTelemetry.lastErrorCategory = '401/403 Authentication Access';
    } else {
      runtimeTelemetry.lastErrorCategory = `${data.errorStatus || 'Network'} Failure`;
    }
  }
}

export function getModerationTelemetry(): ModerationTelemetry {
  return { ...runtimeTelemetry };
}

// -----------------------------------------------------------------------------
// Moderation Health
// -----------------------------------------------------------------------------

export function getModerationHealth() {
  const store = ensureStoreLoaded();
  const totalJobs = store.jobs.length;
  const pendingJobs = store.jobs.filter((j) => j.status === 'pending').length;
  const processingJobs = store.jobs.filter((j) => j.status === 'processing').length;
  const completedJobs = store.jobs.filter((j) => j.status === 'completed').length;
  const failedJobs = store.jobs.filter((j) => j.status === 'failed').length;
  const retryScheduledJobs = store.jobs.filter((j) => j.status === 'retry_scheduled').length;
  const awaitingManualReview = store.cases.filter((c) => c.overallStatus === 'pending' || c.overallStatus === 'under_review').length;

  return {
    isProcessingEnabled: true,
    totalJobs,
    pendingJobs,
    processingJobs,
    completedJobs,
    failedJobs,
    retryScheduledJobs,
    awaitingManualReview,
    queueHealth: failedJobs > 5 ? 'degraded' : (runtimeTelemetry.lastErrorCategory ? 'degraded' : 'healthy'),
    activeModel: `${runtimeTelemetry.lastModelUsed || 'gemini-3.5-flash-lite'} (Google GenAI)`,
    fallbackModels: ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite'],
    lastSuccessfulCheckAt: runtimeTelemetry.lastSuccessAt,
    lastLatencyMs: runtimeTelemetry.lastLatencyMs,
    recentErrorCategory: runtimeTelemetry.lastErrorCategory,
    recentErrorCode: runtimeTelemetry.lastErrorCode,
    totalReports: store.reports.length,
    pendingReports: store.reports.filter((r) => r.status === 'pending').length,
    totalAiFlags: store.aiQueue.length,
    pendingAiFlags: store.aiQueue.filter((a) => a.status === 'pending').length,
    recentJobs: store.jobs.slice(0, 50),
  };
}

export function executeUnifiedCaseAction(
  caseId: string,
  action: 'dismissed' | 'kept' | 'removed' | 'under_review' | 'further_review',
  note?: string,
  reviewerId?: string,
  reviewerName?: string
): { success: boolean; error?: string; updatedCase?: UnifiedModerationCase } {
  const store = ensureStoreLoaded();
  const c = store.cases.find((item) => item.id === caseId);
  if (!c) return { success: false, error: 'Case not found' };

  const now = new Date().toISOString();
  const auditor = reviewerName || 'Duty Management';
  const reviewerNote = note || `Management decision: ${action}`;

  // Update underlying reports
  for (const rep of c.reports) {
    const repStatus = action === 'dismissed' ? 'dismissed' : action === 'under_review' ? 'under_review' : 'actioned';
    updateManualReport(rep.id, {
      status: repStatus,
      reviewedBy: auditor,
      reviewedById: reviewerId,
      resolutionNote: reviewerNote,
      reviewedAt: now,
    });
  }

  // Update underlying AI flags
  if (c.aiFlag) {
    const nextStatus = action === 'dismissed' ? 'dismissed' : action === 'removed' ? 'removed' : action === 'under_review' || action === 'further_review' ? 'under_review' : 'actioned';
    if (action === 'dismissed') {
      incrementFalsePositive(c.aiFlag.flaggedCategory);
    }
    updateAiModerationItem(c.aiFlag.id, {
      status: nextStatus,
      decision: action === 'further_review' ? 'further_review' : (action as any),
      reviewedBy: auditor,
      resolutionNote: reviewerNote,
      reviewedAt: now,
    });
  }

  // Update case directly
  c.overallStatus = action === 'under_review' ? 'under_review' : action === 'further_review' ? 'under_review' : action;
  c.managementNotes = reviewerNote;
  c.reviewedBy = auditor;
  c.reviewedAt = now;
  c.lastUpdatedAt = now;

  persistStore();
  return { success: true, updatedCase: c };
}

export function resetStoreForTesting() {
  const store = ensureStoreLoaded();
  store.reports = [];
  store.jobs = [];
  store.cases = [];
  persistStore();
}

