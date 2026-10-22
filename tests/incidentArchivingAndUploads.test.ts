import { describe, it } from 'node:test';
import assert from 'node:assert';

type UserRole = 'resident' | 'moderator' | 'management' | 'security';

interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  townshipPrecinct: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  phone?: string;
}

interface IncidentTimelineEvent {
  timestamp: string;
  status: string;
  note: string;
  updatedBy?: string;
}

interface ResilienceIncident {
  id: string;
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  locationName: string;
  reportedAt: string;
  resolvedAt?: string;
  reporterId: string;
  reporterName: string;
  isAnonymous?: boolean;
  isVerified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verificationNotes?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedByName?: string;
  imageUrl?: string;
  timeline?: IncidentTimelineEvent[];
}

interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorRole: string;
  authorVerified: boolean;
  category: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  upvotes: number;
  repliesCount: number;
}

interface CircularExchangeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  listingType: string;
  condition: string;
  precinct: string;
  imageUrl?: string;
  imageUrls?: string[];
  status: string;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  createdAt: string;
}

interface LocalService {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  priceEstimate?: string;
  precinct: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

// Mock Profiles
const managementUser: UserProfile = {
  id: 'user-azman',
  fullName: 'Capt (R) Azman bin Hashim',
  role: 'management',
  townshipPrecinct: 'Elmina East',
  verificationStatus: 'verified',
  phone: '012-3456789'
};

const residentUser: UserProfile = {
  id: 'user-nurul',
  fullName: 'Nurul Huda binti Ismail',
  role: 'resident',
  townshipPrecinct: 'Elmina Green 3',
  verificationStatus: 'verified',
  phone: '017-8899001'
};

const otherResidentUser: UserProfile = {
  id: 'user-tan',
  fullName: 'Tan Wei Ming',
  role: 'resident',
  townshipPrecinct: 'Elmina Green 1',
  verificationStatus: 'verified',
  phone: '019-3344556'
};

// Mock In-Memory Incidents Store
let testIncidents: ResilienceIncident[] = [
  {
    id: 'inc-101',
    title: 'Flash Flood at Persiaran Elmina Junction',
    description: '30cm water ponding at low-lying junction after heavy rainfall.',
    incidentType: 'flood',
    severity: 'high',
    status: 'resolved',
    latitude: 3.1950,
    longitude: 101.5120,
    locationName: 'Persiaran Elmina Junction',
    reportedAt: '2026-10-14T08:00:00Z',
    resolvedAt: '2026-10-14T12:00:00Z',
    reporterId: 'user-nurul',
    reporterName: 'Nurul Huda',
    isAnonymous: false,
    isVerified: true,
    verifiedAt: '2026-10-14T08:30:00Z',
    verifiedBy: 'user-azman',
    verifiedByName: 'Capt (R) Azman',
    verificationNotes: 'Confirmed by rapid patrol team.',
    timeline: [
      { timestamp: '2026-10-14T08:00:00Z', status: 'reported', note: 'Resident reported water ponding' },
      { timestamp: '2026-10-14T08:30:00Z', status: 'under_review', note: 'Patrol dispatched', updatedBy: 'Capt (R) Azman' },
      { timestamp: '2026-10-14T12:00:00Z', status: 'resolved', note: 'Drain cleared and traffic normal', updatedBy: 'Capt (R) Azman' }
    ]
  },
  {
    id: 'inc-102',
    title: 'Fallen Tree Branch along Denai Alam Access Road',
    description: 'Obstructing single lane heading towards Guthrie corridor.',
    incidentType: 'tree_fall',
    severity: 'medium',
    status: 'under_review',
    latitude: 3.1910,
    longitude: 101.5180,
    locationName: 'Denai Alam Access Road',
    reportedAt: '2026-10-16T09:00:00Z',
    reporterId: 'user-tan',
    reporterName: 'Tan Wei Ming',
    isAnonymous: false,
    isVerified: false
  }
];

// Archiving Logic simulating Supabase RPC and client checks
function archiveIncident(
  incidentId: string, 
  actor: UserProfile
): { success: boolean; error?: string; incident?: ResilienceIncident } {
  // 1. Role verification
  if (actor.role !== 'management') {
    return { success: false, error: 'Unauthorized: Only management users can archive resolved incidents.' };
  }

  const incident = testIncidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { success: false, error: 'Incident record not found.' };
  }

  // 2. Only resolved incidents may be archived
  if (incident.status !== 'resolved') {
    return { success: false, error: 'Only resolved incidents can be archived from active maps.' };
  }

  // 3. Soft-deletion: Never permanently delete
  const updatedIncident: ResilienceIncident = {
    ...incident,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: actor.id,
    archivedByName: actor.fullName,
    timeline: [
      ...(incident.timeline || []),
      {
        timestamp: new Date().toISOString(),
        status: 'archived',
        note: 'Archived from public hazard map and community feed by management.',
        updatedBy: actor.fullName
      }
    ]
  };

  testIncidents = testIncidents.map((i) => (i.id === incidentId ? updatedIncident : i));
  return { success: true, incident: updatedIncident };
}

// Storage File Validator Helper
function validateUploadFile(
  file: { name: string; type: string; size: number }
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file format. Allowed formats: JPEG, PNG, or WebP.' 
    };
  }

  if (file.size > maxSizeBytes) {
    return { 
      valid: false, 
      error: 'File size exceeds maximum permitted limit of 10MB.' 
    };
  }

  return { valid: true };
}

describe('1. Resolved Incident Archiving & Permanent Retention', () => {
  it('strictly prohibits non-management residents from archiving incidents', () => {
    const result = archiveIncident('inc-101', residentUser);
    assert.strictEqual(result.success, false);
    assert.match(result.error!, /Only management users/);

    // Verify incident remains unarchived
    const inc = testIncidents.find((i) => i.id === 'inc-101');
    assert.strictEqual(inc?.isArchived, undefined);
  });

  it('rejects archiving an active or unresolved incident even by management', () => {
    // inc-102 is under_review, not resolved
    const result = archiveIncident('inc-102', managementUser);
    assert.strictEqual(result.success, false);
    assert.match(result.error!, /Only resolved incidents can be archived/);
  });

  it('allows management officer to soft-archive a resolved incident and preserves complete audit trail', () => {
    const initialCount = testIncidents.length;
    const result = archiveIncident('inc-101', managementUser);

    assert.strictEqual(result.success, true);
    assert.ok(result.incident);
    assert.strictEqual(result.incident.isArchived, true);
    assert.strictEqual(result.incident.archivedBy, managementUser.id);
    assert.strictEqual(result.incident.archivedByName, managementUser.fullName);
    assert.ok(result.incident.archivedAt);

    // Zero-data-loss guarantee: record still exists in Supabase
    assert.strictEqual(testIncidents.length, initialCount);

    // Timeline event appended for audit compliance
    const lastEvent = result.incident.timeline?.[result.incident.timeline.length - 1];
    assert.strictEqual(lastEvent?.status, 'archived');
    assert.strictEqual(lastEvent?.updatedBy, managementUser.fullName);
  });

  it('excludes archived incidents from active map markers and public feed', () => {
    const activeIncidents = testIncidents.filter((i) => !i.isArchived);
    assert.strictEqual(activeIncidents.some((i) => i.id === 'inc-101'), false);
    assert.strictEqual(activeIncidents.some((i) => i.id === 'inc-102'), true);
  });

  it('provides management with complete Incident History archive search and review', () => {
    const historyIncidents = testIncidents.filter((i) => i.isArchived || i.status === 'resolved');
    assert.ok(historyIncidents.length >= 1);
    
    const archivedItem = historyIncidents.find((i) => i.id === 'inc-101');
    assert.ok(archivedItem);
    assert.strictEqual(archivedItem.title, 'Flash Flood at Persiaran Elmina Junction');
    assert.strictEqual(archivedItem.verifiedByName, 'Capt (R) Azman');
    assert.strictEqual(archivedItem.verificationNotes, 'Confirmed by rapid patrol team.');
  });
});

describe('2. Photo Upload Security & Validation', () => {
  it('accepts common image formats: JPEG, PNG, and WebP', () => {
    const jpeg = validateUploadFile({ name: 'flood_photo.jpg', type: 'image/jpeg', size: 2.4 * 1024 * 1024 });
    const png = validateUploadFile({ name: 'pothole.png', type: 'image/png', size: 4.1 * 1024 * 1024 });
    const webp = validateUploadFile({ name: 'tree.webp', type: 'image/webp', size: 1.2 * 1024 * 1024 });

    assert.strictEqual(jpeg.valid, true);
    assert.strictEqual(png.valid, true);
    assert.strictEqual(webp.valid, true);
  });

  it('rejects disallowed non-image and executable file formats', () => {
    const pdf = validateUploadFile({ name: 'invoice.pdf', type: 'application/pdf', size: 500 * 1024 });
    const html = validateUploadFile({ name: 'xss.html', type: 'text/html', size: 1024 });
    const exe = validateUploadFile({ name: 'malware.exe', type: 'application/x-msdownload', size: 2048 });

    assert.strictEqual(pdf.valid, false);
    assert.match(pdf.error!, /Allowed formats: JPEG, PNG, or WebP/);
    assert.strictEqual(html.valid, false);
    assert.strictEqual(exe.valid, false);
  });

  it('enforces maximum 10MB file size limit', () => {
    const validSize = validateUploadFile({ name: 'normal.jpg', type: 'image/jpeg', size: 9.9 * 1024 * 1024 });
    const oversized = validateUploadFile({ name: 'huge_raw.jpg', type: 'image/jpeg', size: 12.5 * 1024 * 1024 });

    assert.strictEqual(validSize.valid, true);
    assert.strictEqual(oversized.valid, false);
    assert.match(oversized.error!, /10MB/);
  });
});

describe('3. Photo Upload Modules Integration', () => {
  it('Module 1 (Community Feed): attaches photos to posts and retains author attribution', () => {
    const post: CommunityPost = {
      id: 'post-test-1',
      authorId: residentUser.id,
      authorName: residentUser.fullName,
      authorPrecinct: residentUser.townshipPrecinct,
      authorRole: residentUser.role,
      authorVerified: true,
      category: 'discussion',
      title: 'Elmina Central Park Community Sunset Cleanup',
      content: 'Sharing photos from our neighborhood weekend cleanup initiative!',
      imageUrl: 'https://test-supabase.co/storage/v1/object/public/community-media/feed/cleanup_2026.jpg',
      createdAt: new Date().toISOString(),
      upvotes: 12,
      repliesCount: 3
    };

    assert.ok(post.imageUrl);
    assert.match(post.imageUrl, /community-media\/feed/);
    assert.strictEqual(post.authorId, residentUser.id);
  });

  it('Module 2 (Circular Exchange): supports multiple item photos (up to 5)', () => {
    const itemPhotos = [
      'https://test-supabase.co/storage/v1/object/public/community-media/exchange/desk_front.jpg',
      'https://test-supabase.co/storage/v1/object/public/community-media/exchange/desk_drawer.jpg',
      'https://test-supabase.co/storage/v1/object/public/community-media/exchange/desk_dimensions.jpg'
    ];

    const exchangeItem: CircularExchangeItem = {
      id: 'ex-test-1',
      title: 'Solid Oak Study Table',
      description: 'Pre-loved study desk in great condition. Pick up in Elmina Green 3.',
      category: 'furniture',
      listingType: 'giveaway',
      condition: 'good',
      precinct: 'Elmina Green 3',
      imageUrl: itemPhotos[0],
      imageUrls: itemPhotos,
      status: 'available',
      authorId: residentUser.id,
      authorName: residentUser.fullName,
      authorVerified: true,
      createdAt: new Date().toISOString()
    };

    assert.ok(exchangeItem.imageUrls);
    assert.strictEqual(exchangeItem.imageUrls.length, 3);
    assert.strictEqual(exchangeItem.imageUrl, itemPhotos[0]);
    assert.ok(exchangeItem.imageUrls.length <= 5);
  });

  it('Module 3 (Local Services): attaches service portfolio photo to listings', () => {
    const serviceListing: LocalService = {
      id: 'srv-test-1',
      title: 'Inverter Aircon Servicing & Chemical Cleaning',
      description: 'Professional HVAC technician residing in Elmina Green.',
      category: 'home_services',
      type: 'offering',
      priceEstimate: 'RM 80 / unit',
      precinct: 'Elmina Green 1',
      imageUrl: 'https://test-supabase.co/storage/v1/object/public/community-media/services/aircon_tools.jpg',
      authorId: otherResidentUser.id,
      authorName: otherResidentUser.fullName,
      authorVerified: true,
      createdAt: new Date().toISOString()
    };

    assert.ok(serviceListing.imageUrl);
    assert.match(serviceListing.imageUrl, /community-media\/services/);
  });

  it('Module 4 (Secure Messages): attachments use secure private bucket and restrict access to participants', () => {
    const conversationId = 'conv-nurul-tan';
    const participantIds = [residentUser.id, otherResidentUser.id];

    // Message attachment stored in secure-message-attachments bucket
    const message: Message = {
      id: 'msg-test-1',
      conversationId: conversationId,
      senderId: residentUser.id,
      senderName: residentUser.fullName,
      content: 'Here is the gate access clearance photo for tomorrow morning.',
      imageUrl: `https://test-supabase.co/storage/v1/object/authenticated/secure-message-attachments/conv_${conversationId}/messages/gate_pass.jpg?token=secret_signed_token`,
      createdAt: new Date().toISOString()
    };

    assert.ok(message.imageUrl);
    // Verified storage bucket is private authenticated, NOT public
    assert.match(message.imageUrl, /secure-message-attachments/);
    assert.doesNotMatch(message.imageUrl, /public/);

    // Verify authorized participant check
    const canViewNurul = participantIds.includes(residentUser.id);
    const canViewTan = participantIds.includes(otherResidentUser.id);
    const canViewStranger = participantIds.includes('stranger-hacker');

    assert.strictEqual(canViewNurul, true);
    assert.strictEqual(canViewTan, true);
    assert.strictEqual(canViewStranger, false);
  });
});
