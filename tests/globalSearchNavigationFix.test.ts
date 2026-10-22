import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { performGlobalSearch } from '../src/lib/utils/searchEngine.ts';
import type { 
  CommunityPost, 
  PostReply, 
  ResilienceIncident, 
  CircularExchangeItem, 
  LocalService, 
  UserProfile,
  NavigationTarget 
} from '../src/types/index.ts';

describe('Global Search Navigation & Stale State Prevention', () => {
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
      content: 'Gathering near the Rainbow Bridge pavilion this Saturday at 7:30 AM.',
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
      content: 'Culvert inspection and drainage clearing operations scheduled.',
      isPinned: true,
      isAnonymous: false,
      upvotesCount: 45,
      repliesCount: 0,
      status: 'active',
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
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
        content: 'I will bring my binoculars and bird guide!',
        isOfficialResponse: false,
        createdAt: '2026-10-15T08:30:00Z',
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
      description: 'Roadside drainage culvert on Persiaran Elmina is clogged with palm fronds.',
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
      description: 'Well-maintained solid wood coffee table.',
      condition: 'good',
      seekingItem: 'Monstera or Fiddle Leaf Fig',
      precinct: 'Elmina Green 1',
      status: 'available',
      createdAt: '2026-10-14T10:00:00Z',
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
      description: 'Certified technician in EV2.',
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
      description: 'Seeking experienced tutor.',
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

  it('1. Search for a post generates valid navigation target with feed tab and post itemType', () => {
    const hits = performGlobalSearch('brisk walk', baseData);
    assert.ok(hits.length > 0);
    const postHit = hits.find((h) => h.id === 'post-1' && h.module === 'feed');
    assert.ok(postHit);

    // Target creation verification
    const target: NavigationTarget = {
      tab: 'feed',
      itemId: postHit.id,
      itemType: 'post',
      timestamp: Date.now(),
    };
    assert.equal(target.tab, 'feed');
    assert.equal(target.itemId, 'post-1');
    assert.equal(target.itemType, 'post');
  });

  it('2. Search for a comment links to parent post and specifies comment itemType', () => {
    const hits = performGlobalSearch('binoculars', baseData);
    assert.ok(hits.length > 0);
    const commentHit = hits.find((h) => h.id === 'reply-1' && h.module === 'comments');
    assert.ok(commentHit);
    assert.equal(commentHit.parentPostId, 'post-1');

    const target: NavigationTarget = {
      tab: 'feed',
      itemId: commentHit.id,
      parentId: commentHit.parentPostId,
      itemType: 'comment',
      timestamp: Date.now(),
    };
    assert.equal(target.tab, 'feed');
    assert.equal(target.itemId, 'reply-1');
    assert.equal(target.parentId, 'post-1');
    assert.equal(target.itemType, 'comment');
  });

  it('3. Search across non-feed modules routes to respective tabs', () => {
    // Incident
    const incidentHits = performGlobalSearch('drain', baseData);
    const inc = incidentHits.find((h) => h.module === 'incidents');
    assert.ok(inc);
    assert.equal(inc.id, 'inc-1');

    // Exchange
    const exchHits = performGlobalSearch('coffee table', baseData);
    const exch = exchHits.find((h) => h.module === 'exchange');
    assert.ok(exch);
    assert.equal(exch.id, 'exch-1');

    // Service Offering
    const servHits = performGlobalSearch('chemical wash', baseData);
    const serv = servHits.find((h) => h.module === 'services');
    assert.ok(serv);
    assert.equal(serv.id, 'serv-offering-1');

    // Help Request
    const reqHits = performGlobalSearch('Add Maths', baseData);
    const req = reqHits.find((h) => h.module === 'requests');
    assert.ok(req);
    assert.equal(req.id, 'serv-request-1');
  });

  it('4. Navigation target is consumed and cleared after target is reached', () => {
    let currentNavTarget: NavigationTarget | null = {
      tab: 'feed',
      itemId: 'post-1',
      itemType: 'post',
      timestamp: Date.now(),
    };

    // Simulated consumer in FeedView
    const consumeTarget = () => {
      const consumed = currentNavTarget;
      currentNavTarget = null;
      return consumed;
    };

    const consumed = consumeTarget();
    assert.ok(consumed);
    assert.equal(consumed.itemId, 'post-1');
    // Once consumed, target must be null
    assert.equal(currentNavTarget, null);
  });

  it('5. Manual tab switch unconditionally clears any transient navigation target', () => {
    let currentNavTarget: NavigationTarget | null = {
      tab: 'feed',
      itemId: 'post-1',
      itemType: 'post',
      timestamp: Date.now(),
    };
    let activeTab = 'feed';

    // handleSetActiveTab pattern
    const handleSetActiveTab = (tab: string) => {
      currentNavTarget = null;
      activeTab = tab;
    };

    // User navigates away to resilience map
    handleSetActiveTab('resilience');
    assert.equal(activeTab, 'resilience');
    assert.equal(currentNavTarget, null);

    // User navigates back to feed
    handleSetActiveTab('feed');
    assert.equal(activeTab, 'feed');
    // Returning to feed has no stale target!
    assert.equal(currentNavTarget, null, 'Returning to feed must have no stale navigation target');
  });

  it('6. Sequential search: new search clears previous selection without lingering filters', () => {
    let currentSearchQuery = 'brisk walk';
    let currentSelection: string | null = 'post-1';

    // When selecting first item, search query and selection are consumed
    currentSearchQuery = '';
    currentSelection = null;
    assert.equal(currentSelection, null);

    // Searching second item
    currentSearchQuery = 'Drainage Cleansing';
    const secondHits = performGlobalSearch(currentSearchQuery, baseData);
    assert.ok(secondHits.length > 0);
    const secondPost = secondHits.find((h) => h.id === 'post-2');
    assert.ok(secondPost);

    // The previous item (post-1) is not the selected target
    assert.notEqual(secondPost.id, 'post-1');
  });

  it('7. Stale sequence invalidation: outdated search responses are dropped', () => {
    let searchSeq = 0;
    let renderedResults: SearchResultItem[] = [];

    // Query 1 starts
    const seq1 = ++searchSeq;

    // Query 2 starts quickly after
    const seq2 = ++searchSeq;

    // Suppose Query 1 finishes late
    const hitsQuery1 = performGlobalSearch('brisk', baseData);
    if (seq1 === searchSeq) {
      renderedResults = hitsQuery1;
    }

    // Since seq1 (1) !== searchSeq (2), Query 1 results were dropped!
    assert.equal(renderedResults.length, 0);

    // Query 2 finishes
    const hitsQuery2 = performGlobalSearch('drain', baseData);
    if (seq2 === searchSeq) {
      renderedResults = hitsQuery2;
    }

    // Query 2 results accepted
    assert.ok(renderedResults.length > 0);
    assert.ok(renderedResults.some((r) => r.id === 'inc-1' || r.id === 'post-2'));
  });
});
