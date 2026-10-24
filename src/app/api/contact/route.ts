import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  validateInquiryInput,
  createContactInquiry,
  listContactInquiries,
  updateInquiryStatus,
  CreateInquiryInput,
  ContactInquiry,
} from '@/lib/server/contactInquiries';
import { requireManagementOfficer } from '@/lib/server/managementAuth';

/**
 * POST /api/contact
 * Public endpoint to submit a verified township inquiry.
 * Validates inputs, enforces anti-abuse rate-limiting, and persists inquiry durably.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    // Determine client rate-limit key
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor.split(',')[0].trim() || 'anonymous-client';
    const emailKey = typeof body?.email === 'string' ? body.email : 'anon';
    const clientIdentifier = `${clientIp}:${emailKey}`;

    // Enforce rate limiting
    const rateCheck = checkRateLimit(clientIdentifier);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Submission rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds ?? 10} seconds before submitting again.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Server-side authentication check (do NOT trust client body.userId)
    let authenticatedUserId: string | undefined = undefined;
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        authenticatedUserId = user.id;
      }
    } catch {
      // Unauthenticated public submission
    }

    // Server-side validation
    const input: CreateInquiryInput = {
      fullName: typeof body.fullName === 'string' ? body.fullName : '',
      email: typeof body.email === 'string' ? body.email : '',
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      category: typeof body.category === 'string' ? body.category : 'general',
      message: typeof body.message === 'string' ? body.message : '',
    };

    const validation = validateInquiryInput(input);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed. Please correct the highlighted errors.',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Create and durably persist inquiry in Supabase
    const savedInquiry = await createContactInquiry(input, authenticatedUserId);

    return NextResponse.json(
      {
        success: true,
        referenceId: savedInquiry.referenceId,
        inquiry: {
          id: savedInquiry.id,
          referenceId: savedInquiry.referenceId,
          fullName: savedInquiry.fullName,
          email: savedInquiry.email,
          category: savedInquiry.category,
          status: savedInquiry.status,
          createdAt: savedInquiry.createdAt,
        },
        message: 'Your inquiry has been successfully received by NadiKomuniti Township Management.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/contact POST] Persistence error:', errorMsg);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMsg.includes('Database') || errorMsg.includes('persistence')
          ? errorMsg
          : 'A server error occurred while processing your inquiry.' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contact
 * Authorized endpoint for management officers to view and audit submitted inquiries.
 */
export async function GET(request: NextRequest) {
  const auth = await requireManagementOfficer(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const inquiries = await listContactInquiries();
    return NextResponse.json({
      success: true,
      inquiries,
      count: inquiries.length,
      retrievedBy: auth.officer.name,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/contact GET] Error listing inquiries:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve inquiries.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contact
 * Authorized endpoint for management officers to update inquiry status and notes.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireManagementOfficer(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json()) as {
      referenceId?: string;
      status?: ContactInquiry['status'];
      adminNotes?: string;
    };
    const { referenceId, status, adminNotes } = body;

    if (!referenceId || !status) {
      return NextResponse.json(
        { success: false, error: 'Reference ID and valid status are required.' },
        { status: 400 }
      );
    }

    const updated = await updateInquiryStatus(referenceId, status, adminNotes);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Inquiry with reference ID '${referenceId}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      inquiry: updated,
      updatedBy: auth.officer.name,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/contact PATCH] Error updating inquiry:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Failed to update inquiry status.' },
      { status: 500 }
    );
  }
}
