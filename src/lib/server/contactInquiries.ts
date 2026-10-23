import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

export interface ContactInquiry {
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

export interface CreateInquiryInput {
  fullName: string;
  email: string;
  phone?: string;
  category: string;
  message: string;
  userId?: string;
}

// In-memory rate limiting map: identifier -> timestamp[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;
const MIN_COOLDOWN_MS = 5000; // 5 seconds between consecutive submissions

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'contact_inquiries.json');

// Initial seed inquiries for management inbox demonstration
const SEED_INQUIRIES: ContactInquiry[] = [
  {
    id: 'inq-seed-001',
    referenceId: 'INQ-20261021-9C4A',
    fullName: 'Puan Siti Aminah',
    email: 'siti.aminah@elmina.my',
    phone: '012-345 6789',
    category: 'billing',
    message: 'Salam JMB, saya ingin menyemak status permohonan pelekat kenderaan kedua bagi rumah saya di Elmina Green 3.',
    status: 'in_review',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    adminNotes: 'Officer Azman: Verified deed documents. Pending sticker issuance.',
  },
  {
    id: 'inq-seed-002',
    referenceId: 'INQ-20261022-3B7D',
    fullName: 'Kenneth Tan',
    email: 'ktan.consult@gmail.com',
    phone: '019-876 5432',
    category: 'maintenance',
    message: 'Good morning, inquiring on schedule for communal garden landscaping trimming along Persiaran Elmina central spine.',
    status: 'new',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
];

function ensureStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_INQUIRIES, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[ContactInquiries] Failed to initialize storage:', err);
  }
}

export function readStoredInquiries(): ContactInquiry[] {
  ensureStorage();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[ContactInquiries] Failed to read stored inquiries:', err);
  }
  return [...SEED_INQUIRIES];
}

export function writeStoredInquiries(inquiries: ContactInquiry[]): void {
  ensureStorage();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ContactInquiries] Failed to write stored inquiries:', err);
  }
}

export function generateReferenceId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INQ-${year}${month}${day}-${randomHex}`;
}

export function validateInquiryInput(input: CreateInquiryInput): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Full Name
  const trimmedName = (input.fullName || '').trim();
  if (!trimmedName) {
    errors.fullName = 'Full name is required.';
  } else if (trimmedName.length < 2) {
    errors.fullName = 'Name must be at least 2 characters.';
  } else if (trimmedName.length > 100) {
    errors.fullName = 'Name cannot exceed 100 characters.';
  }

  // Email
  const trimmedEmail = (input.email || '').trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!trimmedEmail) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(trimmedEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  // Phone (optional, but validate format if entered)
  const trimmedPhone = (input.phone || '').trim();
  if (trimmedPhone) {
    const phoneRegex = /^[0-9+() -]{7,20}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      errors.phone = 'Please provide a valid telephone number.';
    }
  }

  // Category
  const validCategories = ['general', 'maintenance', 'security', 'billing'];
  if (!validCategories.includes(input.category)) {
    errors.category = 'Please select a valid inquiry category.';
  }

  // Message
  const trimmedMessage = (input.message || '').trim();
  if (!trimmedMessage) {
    errors.message = 'Message content is required.';
  } else if (trimmedMessage.length < 10) {
    errors.message = 'Message must be at least 10 characters long.';
  } else if (trimmedMessage.length > 2000) {
    errors.message = 'Message cannot exceed 2,000 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function checkRateLimit(clientIdentifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientIdentifier) || [];

  // Filter out timestamps outside the active window
  const activeTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  // Check cooldown between consecutive submissions
  const lastSubmission = activeTimestamps[activeTimestamps.length - 1];
  if (lastSubmission && now - lastSubmission < MIN_COOLDOWN_MS) {
    const cooldownRemaining = Math.ceil((MIN_COOLDOWN_MS - (now - lastSubmission)) / 1000);
    return { allowed: false, retryAfterSeconds: cooldownRemaining };
  }

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = activeTimestamps[0];
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  activeTimestamps.push(now);
  rateLimitMap.set(clientIdentifier, activeTimestamps);
  return { allowed: true };
}

export async function createContactInquiry(input: CreateInquiryInput): Promise<ContactInquiry> {
  const referenceId = generateReferenceId();
  const nowIso = new Date().toISOString();
  const id = `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const inquiry: ContactInquiry = {
    id,
    referenceId,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone ? input.phone.trim() : undefined,
    category: input.category as ContactInquiry['category'],
    message: input.message.trim(),
    status: 'new',
    createdAt: nowIso,
    updatedAt: nowIso,
    userId: input.userId,
  };

  // 1. Save to durable local storage
  const existing = readStoredInquiries();
  writeStoredInquiries([inquiry, ...existing]);

  // 2. Best-effort durable sync to Supabase contact_inquiries table if present
  try {
    const supabase = await createClient();
    await supabase.from('contact_inquiries').insert({
      id: inquiry.id,
      reference_id: inquiry.referenceId,
      full_name: inquiry.fullName,
      email: inquiry.email,
      phone: inquiry.phone || null,
      category: inquiry.category,
      message: inquiry.message,
      status: inquiry.status,
      user_id: inquiry.userId || null,
      created_at: inquiry.createdAt,
      updated_at: inquiry.updatedAt,
    });
  } catch {
    // If Supabase table is not yet migrated, durable local record remains safe
  }

  return inquiry;
}

export async function listContactInquiries(): Promise<ContactInquiry[]> {
  // Check Supabase first
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row: {
        id: string;
        reference_id: string;
        full_name: string;
        email: string;
        phone?: string | null;
        category: ContactInquiry['category'];
        message: string;
        status: ContactInquiry['status'];
        created_at: string;
        updated_at: string;
        user_id?: string | null;
        admin_notes?: string | null;
      }) => ({
        id: row.id,
        referenceId: row.reference_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone || undefined,
        category: row.category,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userId: row.user_id || undefined,
        adminNotes: row.admin_notes || undefined,
      }));
    }
  } catch {
    // Fall back to durable local storage
  }

  return readStoredInquiries();
}

export async function updateInquiryStatus(
  referenceId: string, 
  status: ContactInquiry['status'],
  adminNotes?: string
): Promise<ContactInquiry | null> {
  const stored = readStoredInquiries();
  const index = stored.findIndex((i) => i.referenceId === referenceId || i.id === referenceId);

  if (index === -1) return null;

  stored[index].status = status;
  stored[index].updatedAt = new Date().toISOString();
  if (adminNotes !== undefined) {
    stored[index].adminNotes = adminNotes;
  }

  writeStoredInquiries(stored);

  // Attempt remote sync if available
  try {
    const supabase = await createClient();
    await supabase
      .from('contact_inquiries')
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: stored[index].updatedAt,
      })
      .or(`reference_id.eq.${referenceId},id.eq.${referenceId}`);
  } catch {
    // Local storage updated
  }

  return stored[index];
}
