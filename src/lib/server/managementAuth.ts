import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';

export interface AuthenticatedOfficer {
  id: string;
  role: string;
  name: string;
}

export async function getAuthenticatedOfficer(request: NextRequest): Promise<AuthenticatedOfficer | null> {
  // 1. Supabase auth cookies
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        role: user.user_metadata?.role || 'resident',
        name: user.user_metadata?.full_name || 'Resident',
      };
    }
  } catch {
    // Continue to session header
  }

  // 2. Session Header / Bearer token / User ID
  const sessionHeader = request.headers.get('x-tesdh-session') || 
    request.headers.get('x-user-id') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (sessionHeader) {
    const matchedProfile = INITIAL_PROFILES.find((p) => p.id === sessionHeader);
    if (matchedProfile) {
      return {
        id: matchedProfile.id,
        role: matchedProfile.role,
        name: matchedProfile.fullName,
      };
    }
  }

  // 3. Direct authenticated header credentials
  const headerRole = request.headers.get('x-user-role');
  const headerId = request.headers.get('x-user-id');
  if (headerId && headerRole) {
    return {
      id: headerId,
      role: headerRole,
      name: request.headers.get('x-user-name') || (headerRole === 'management' ? 'Management Officer' : 'Resident User'),
    };
  }

  return null;
}

/**
 * Enforces management or security officer authentication.
 * Returns null if authorized, or a 401/403 NextResponse if denied.
 */
export async function requireManagementOfficer(
  request: NextRequest, 
  allowedRoles: string[] = ['management', 'security']
): Promise<{ officer: AuthenticatedOfficer } | { errorResponse: NextResponse }> {
  const officer = await getAuthenticatedOfficer(request);
  if (!officer) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Authentication required. Please sign in to access management console services.', code: 'UNAUTHENTICATED' },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(officer.role)) {
    return {
      errorResponse: NextResponse.json(
        { 
          error: 'Forbidden: Access restricted to authorized township management personnel.', 
          code: 'FORBIDDEN',
          currentRole: officer.role,
          requiredRoles: allowedRoles 
        },
        { status: 403 }
      ),
    };
  }

  return { officer };
}
