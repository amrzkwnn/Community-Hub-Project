import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { performGlobalSearch } from '../src/lib/utils/searchEngine.ts';
import { FEATURES } from '../src/config/features.ts';
import type { 
  CommunityPost, 
  PostReply, 
  ResilienceIncident, 
  CircularExchangeItem, 
  LocalService, 
  UserProfile 
} from '../src/types/index.ts';

describe('Global Search & Data Isolation', () => {
  const residentUser: UserProfile = {
    id: 'user-nurul',
    fullName: 'Nurul Huda binti Ahmad',
    displayName: 'Nurul (EG3)',
    role: 'resident',
    townshipPrecinct: 'Elmina Green 3',
    unitNumber: '24, Jalan EG 3/4',
    phone: '+6012-345 6781',
    verificationStatus: 'verified',
    createdAt: '2026-01-10T08:00:00Z',
  };

  const samplePosts: CommunityPost[] = [
    {
      id: 'post-1',
      authorId: 'user-nurul',
      authorName: 'Dr. Nurul Izzati',
      authorPrecinct: 'Elmina Ridge',
      authorRole: 'resident',
      authorVerified: true,
      category: 'discussion',
      title: 'Community weekend brisk walk and bird watching at Elmina Central Park track',
      content: 'Community weekend brisk walk and bird watching at Elmina Central Park track this Saturday, 7:30 AM! Gathering near the Rainbow Bridge pavilion.',
      isPinned: false,
      isAnonymous: false,
      upvotesCount: 38,
      repliesCount: 2,
      status: 'active',
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
    },
    {
      id: 'post-2',
      authorId: 'user-azman',
      authorName: 'Capt. (R) Azman Salleh',
      authorPrecinct: 'Township Management',
      authorRole: 'management',
      authorVerified: true,
      category: 'announcement',
      title: 'Scheduled Drainage Cleansing Operation on Persiaran Elmina',
      content: 'Culvert inspection and drainage clearing operations scheduled from 2:00 PM to 5:00 PM.',
      isPinned: true,
      isAnonymous: false,
      upvotesCount: 45,
      repliesCount: 0,
      status: 'active',
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'post-deleted',
      authorId: 'user-vikram',
      authorName: 'Vikram Naidu',
      authorPrecinct: 'Denai Alam',
      authorRole: 'resident',
      authorVerified: true,
      category: 'discussion',
      title: 'SecretDeletedPostTitleXYZ',
      content: 'This post has been soft deleted by moderation.',
      isPinned: false,
      isAnonymous: false,
      upvotesCount: 0,
      repliesCount: 0,
      status: 'archived',
      deletedAt: '2026-10-15T10:00:00Z',
      createdAt: '2026-10-14T08:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    }
  ];

  const sampleComments: Record<string, PostReply[]> = {
    'post-1': [
      {
        id: 'reply-1',
        postId: 'post-1',
        authorId: 'user-kenji',
        authorName: 'Kenji Tan',
        authorPrecinct: 'Ilham Residence',
        authorRole: 'resident',
        authorVerified: true,
        content: 'I will bring my binoculars and bird guide! Looking forward to seeing everyone.',
        isOfficialResponse: false,
        createdAt: '2026-10-15T08:30:00Z',
      },
      {
        id: 'reply-deleted',
        postId: 'post-1',
        authorId: 'user-spammer',
        authorName: 'Spammer',
        authorPrecinct: 'Unknown',
        authorRole: 'resident',
        authorVerified: false,
        content: 'SecretDeletedCommentXYZ buy cheap tokens',
        isOfficialResponse: false,
        status: 'deleted',
        deletedAt: '2026-10-15T09:00:00Z',
        createdAt: '2026-10-15T08:45:00Z',
      }
    ]
  };

  const sampleIncidents: ResilienceIncident[] = [
    {
      id: 'inc-1',
      reporterId: 'user-nurul',
      reporterName: 'Nurul Huda',
      reporterPrecinct: 'Elmina Green 3',
      incidentType: 'blocked_drain',
      title: 'Primary Monsoon Drain Blocked by Palm Fronds and Silt',
      description: 'Roadside drainage culvert on Persiaran Elmina is clogged with palm fronds after heavy rain.',
      locationName: 'Persiaran Elmina near Elmina Rainbow Bridge',
      latitude: 3.179321,
      longitude: 101.516512,
      severity: 'high',
      status: 'dispatched',
      isVerified: true,
      isAnonymous: false,
      updates: [],
      createdAt: '2026-10-15T09:15:00Z',
      updatedAt: '2026-10-15T09:15:00Z',
    },
    {
      id: 'inc-archived',
      reporterId: 'user-vikram',
      reporterName: 'Vikram',
      reporterPrecinct: 'Denai Alam',
      incidentType: 'pothole',
      title: 'Resolved and Archived Deep Pothole Near Gate B',
      description: 'Pothole has been fully repaved and verified by engineering team.',
      locationName: 'Gate B Persiaran Mokhtar Dahari',
      latitude: 3.1741,
      longitude: 101.5218,
      severity: 'medium',
      status: 'resolved',
      isVerified: true,
      isArchived: true,
      archivedAt: '2026-10-10T12:00:00Z',
      isAnonymous: false,
      updates: [],
      createdAt: '2026-10-09T08:00:00Z',
      updatedAt: '2026-10-10T12:00:00Z',
    }
  ];

  const sampleExchange: CircularExchangeItem[] = [
    {
      id: 'exch-1',
      authorId: 'user-ros',
      authorName: 'Kak Ros',
      authorPrecinct: 'Elmina Green 1',
      authorVerified: true,
      listingType: 'exchange',
      category: 'furniture',
      title: 'Solid Teak Coffee Table for Living Room',
      description: 'Well-maintained solid wood coffee table with slight surface patina. Seeking indoor potted monsteras or indoor plants in exchange.',
      condition: 'good',
      seekingItem: 'Monstera or Fiddle Leaf Fig',
      precinct: 'Elmina Green 1',
      status: 'available',
      createdAt: '2026-10-14T10:00:00Z',
    },
    {
      id: 'exch-completed',
      authorId: 'user-kenji',
      authorName: 'Kenji',
      authorPrecinct: 'Ilham Residence',
      authorVerified: true,
      listingType: 'giveaway',
      category: 'appliances',
      title: 'Completed Toaster Giveaway',
      description: 'Already given away to neighbour.',
      condition: 'fair',
      precinct: 'Ilham Residence',
      status: 'completed',
      createdAt: '2026-10-10T10:00:00Z',
    }
  ];

  const sampleServices: LocalService[] = [
    {
      id: 'serv-offering-1',
      authorId: 'user-hafiz',
      authorName: 'Hafiz Ridzuan',
      authorPrecinct: 'Elmina Valley 2',
      authorVerified: true,
      type: 'offering',
      category: 'home_services',
      title: 'Aircond Chemical Wash & Inverter Servicing',
      description: 'Certified Daikin & Panasonic technician living in EV2. High-pressure coil cleaning and gas top-up.',
      priceEstimate: 'RM80 / unit',
      precinct: 'Elmina Valley 2',
      status: 'active',
      createdAt: '2026-10-13T10:00:00Z',
    },
    {
      id: 'serv-request-1',
      authorId: 'user-sarah',
      authorName: 'Sarah Lim',
      authorPrecinct: 'Elmina Green 1',
      authorVerified: true,
      type: 'requesting',
      category: 'tutoring',
      title: 'Looking for SPM Add Maths Tutor for Weekend Sessions',
      description: 'Seeking experienced SPM Add Maths tutor for 2-hour Saturday sessions at home in Elmina Green 1.',
      priceEstimate: 'RM70 / hr',
      precinct: 'Elmina Green 1',
      status: 'open',
      createdAt: '2026-10-14T11:00:00Z',
    }
  ];

  const baseData = {
    posts: samplePosts,
    comments: sampleComments,
    incidents: sampleIncidents,
    exchangeItems: sampleExchange,
    services: sampleServices,
    currentUser: residentUser,
  };

  it('1. returns empty results when search query is empty or only whitespace', () => {
    assert.deepEqual(performGlobalSearch('', baseData), []);
    assert.deepEqual(performGlobalSearch('   ', baseData), []);
    assert.deepEqual(performGlobalSearch('\t\n', baseData), []);
  });

  it('2. searches Community Feed posts by title, content, author, and category', () => {
    // Search by title keyword "brisk walk"
    const walkResults = performGlobalSearch('brisk walk', baseData);
    assert.ok(walkResults.length > 0);
    const postHit = walkResults.find((r) => r.module === 'feed');
    assert.ok(postHit);
    assert.match(postHit.title.toLowerCase(), /brisk walk/);
    assert.equal(postHit.moduleLabel, 'Community Post');

    // Search by precinct "Elmina Ridge"
    const precinctResults = performGlobalSearch('Elmina Ridge', baseData);
    assert.ok(precinctResults.some((r) => r.precinct?.includes('Elmina Ridge')));
  });

  it('3. searches Community Comments and links them to parent posts', () => {
    // Search comment keyword "binoculars"
    const results = performGlobalSearch('binoculars', baseData);
    const commentHit = results.find((r) => r.module === 'comments' && r.id === 'reply-1');
    assert.ok(commentHit, 'Comment hit should be present in results');
    assert.equal(commentHit.parentPostId, 'post-1');
    assert.equal(commentHit.parentPostTitle, samplePosts[0].title);
  });

  it('4. searches Active Resilience Map Incidents and excludes archived/resolved incidents', () => {
    // "drain" or "monsoon" is in inc-1
    const drainResults = performGlobalSearch('drain', baseData);
    const incidentHit = drainResults.find((r) => r.module === 'incidents');
    assert.ok(incidentHit, 'Should find active drain incident');
    assert.equal(incidentHit.moduleLabel, 'Active Incident');

    // Verify archived incident is EXCLUDED
    const results = performGlobalSearch('Pothole', baseData);
    assert.ok(!results.some((r) => r.id === 'inc-archived'), 'Archived incidents must not appear in global search results');
  });

  it('5. searches Circular Exchange listings by title, category, and condition', () => {
    // Search for teak coffee table
    const results = performGlobalSearch('coffee table', baseData);
    const exchangeHit = results.find((r) => r.module === 'exchange' && r.id === 'exch-1');
    assert.ok(exchangeHit, 'Exchange item must be found');

    // Completed item must be excluded
    const completedResults = performGlobalSearch('Toaster', baseData);
    assert.ok(!completedResults.some((r) => r.id === 'exch-completed'), 'Completed exchange items must be excluded');
  });

  it('6. searches Local Services and distinguishes Service Offerings from Help Requests', () => {
    // Offering search
    const offeringResults = performGlobalSearch('chemical wash', baseData);
    const offeringHit = offeringResults.find((r) => r.id === 'serv-offering-1');
    assert.ok(offeringHit);
    assert.equal(offeringHit.module, 'services');
    assert.equal(offeringHit.moduleLabel, 'Service Offering');

    // Requesting search (Help Request)
    const requestingResults = performGlobalSearch('Add Maths', baseData);
    const requestingHit = requestingResults.find((r) => r.id === 'serv-request-1');
    assert.ok(requestingHit);
    assert.equal(requestingHit.module, 'requests');
    assert.equal(requestingHit.moduleLabel, 'Help Request');
  });

  it('7. STRICT PRIVACY: strictly isolates private messages and hidden user credentials', () => {
    // Attempt to search by user private phone number
    assert.ok(residentUser.phone);
    const phoneResults = performGlobalSearch(residentUser.phone, baseData);
    assert.equal(phoneResults.length, 0, 'Private phone numbers must never be searchable');

    // Attempt to search by private unit address
    assert.ok(residentUser.unitNumber);
    const unitResults = performGlobalSearch(residentUser.unitNumber, baseData);
    assert.equal(unitResults.length, 0, 'Private unit numbers must never be searchable');
  });

  it('8. ANONYMITY SHIELD: does not leak real author names of anonymous posts or incidents', () => {
    const anonPost: CommunityPost = {
      id: 'post-anon-test',
      authorId: 'user-secret-123',
      authorName: 'Secret Resident Real Name',
      authorPrecinct: 'Elmina Green 1',
      authorRole: 'resident',
      authorVerified: true,
      category: 'complaint',
      title: 'Noise complaints at park junction',
      content: 'Construction vehicle idling late at night near roundabout.',
      isPinned: false,
      isAnonymous: true,
      upvotesCount: 0,
      repliesCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const searchAnon = performGlobalSearch('Secret Resident Real Name', {
      ...baseData,
      posts: [anonPost],
    });
    assert.equal(searchAnon.length, 0, 'Real name of anonymous post author must not be searchable or returned');

    // Searching content must show "Anonymous Neighbour"
    const searchContent = performGlobalSearch('roundabout', {
      ...baseData,
      posts: [anonPost],
    });
    assert.equal(searchContent.length, 1);
    assert.equal(searchContent[0].authorOrLocation, 'Anonymous Neighbour');
  });

  it('9. DELETED CONTENT EXCLUSION: excludes soft-deleted posts and replies', () => {
    const searchDeleted = performGlobalSearch('SecretDeleted', baseData);
    assert.equal(searchDeleted.length, 0, 'Deleted posts and replies must be excluded from search');
  });

  it('10. CASE-INSENSITIVE & PUNCTUATION TOLERANT MATCHING', () => {
    // Upper case vs lower case
    const resUpper = performGlobalSearch('DRAIN', baseData);
    const resLower = performGlobalSearch('drain', baseData);
    assert.ok(resUpper.length > 0);
    assert.equal(resUpper.length, resLower.length);

    // With punctuation
    const resPunct = performGlobalSearch('drain, blocked - monsoon', baseData);
    assert.ok(resPunct.length > 0);
  });
});

describe('Phase-Gated Feature Flags: Kiosk Mode', () => {
  it('1. Kiosk Mode feature flag is explicitly disabled', () => {
    assert.equal(FEATURES.ENABLE_KIOSK_MODE, false, 'Kiosk mode must be set to false for this phase');
  });
});
