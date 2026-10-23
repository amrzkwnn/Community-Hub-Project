import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Stitch Mobile Designs & Discussion Title Fix Verification', () => {
  const rootDir = process.cwd();

  it('1. Discussion Title Bug Fix: title is retrieved, saved, and rendered in both mobile and PC views', () => {
    const feedPath = path.join(rootDir, 'src', 'components', 'feed', 'FeedView.tsx');
    const content = fs.readFileSync(feedPath, 'utf8');

    // Title input in Create Post interface
    assert.strictEqual(content.includes('newTitle') && content.includes('placeholder="Enter dispatch title'), true, 'Create post must have title input');
    
    // Discussion title rendering on Feed Card
    assert.strictEqual(content.includes('post.title'), true, 'Feed cards must render post.title when available');

    // Discussion title in Individual Post Modal
    assert.strictEqual(content.includes('selectedPostModal.title'), true, 'Individual post view must render selectedPostModal.title');
    assert.strictEqual(content.includes('openIndividualPost'), true, 'Must have openIndividualPost handler');
    assert.strictEqual(content.includes('closeIndividualPost'), true, 'Must have closeIndividualPost handler');
    assert.strictEqual(content.includes('selectedPostModal.title &&'), true, 'Must conditionally render title without undefined/null');

    // URL sync for individual post view (?tab=feed&id=...)
    assert.strictEqual(content.includes("URLSearchParams(window.location.search)"), true, 'Must sync URL for direct navigation');
  });

  it('2. Mobile Design Home: uses original neighborhood background, downward-fading blur scrim, and swipeable cards', () => {
    const homePath = path.join(rootDir, 'src', 'components', 'home', 'HomeView.tsx');
    const content = fs.readFileSync(homePath, 'utf8');

    // Original neighborhood image asset
    assert.strictEqual(content.includes('/images/elmina-township-bg.png'), true, 'Must reuse original elmina-township-bg.png');

    // Downward fading blur scrim mask behind title
    assert.strictEqual(content.includes('linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0) 100%)'), true, 'Must use downward fading progressive blur mask');
    assert.strictEqual(content.includes('Welcome to Your Community'), true, 'Must display Welcome to Your Community heading');

    // Swipeable carousel with 5 cards
    assert.strictEqual(content.includes('id="featureScroller"'), true, 'Must have swipeable featureScroller');
    assert.strictEqual(content.includes("handleCardClick('exchange')"), true, 'Card 1 Circular Exchange');
    assert.strictEqual(content.includes("handleCardClick('resilience')"), true, 'Card 2 Resilience Map');
    assert.strictEqual(content.includes("handleCardClick('feed')"), true, 'Card 3 Community Feed');
    assert.strictEqual(content.includes("handleCardClick('services')"), true, 'Card 4 Local Services');
    assert.strictEqual(content.includes("handleCardClick('messages')"), true, 'Card 5 Secure Messages');

    // Desktop layout preserved
    assert.strictEqual(content.includes('hidden md:block'), true, 'Must preserve desktop layout under hidden md:block');
  });

  it('3. Mobile Design Map: Resilience map layout with floating live feed, category pills, and slide-up incident sheet', () => {
    const resiliencePath = path.join(rootDir, 'src', 'components', 'resilience', 'ResilienceView.tsx');
    const content = fs.readFileSync(resiliencePath, 'utf8');

    // Mobile layout
    assert.strictEqual(content.includes('Live Township Feed'), true, 'Must have Live Township Feed pill');
    assert.strictEqual(content.includes('+ Report Incident'), true, 'Must have floating Report Incident button');
    assert.strictEqual(content.includes('Mobile Slide-Up Selected Incident Sheet') || content.includes('selectedIncident &&'), true, 'Must have active incident slide-up sheet');
    assert.strictEqual(content.includes('Drainage'), true, 'Must have Drainage category pill');
    assert.strictEqual(content.includes('Roads'), true, 'Must have Roads category pill');

    // Desktop layout preserved
    assert.strictEqual(content.includes('hidden md:block'), true, 'Must preserve desktop layout under hidden md:block');
  });

  it('4. Mobile Exchange: Circular exchange 2-column listings, price badges, and category pills', () => {
    const exchangePath = path.join(rootDir, 'src', 'components', 'exchange', 'ExchangeView.tsx');
    const content = fs.readFileSync(exchangePath, 'utf8');

    // Mobile layout
    assert.strictEqual(content.includes('+ Create Listing'), true, 'Must have + Create Listing button');
    assert.strictEqual(content.includes('grid-cols-2'), true, 'Must have 2-column mobile listings');
    assert.strictEqual(content.includes('Tools &amp; Garden') || content.includes('Tools & Garden'), true, 'Must have Tools & Garden category');
    assert.strictEqual(content.includes('FREE'), true, 'Must have FREE price badge');
    assert.strictEqual(content.includes('EXCHANGE'), true, 'Must have EXCHANGE badge');

    // Desktop layout preserved
    assert.strictEqual(content.includes('hidden md:flex'), true, 'Must preserve desktop layout under hidden md:flex');
  });

  it('5. Mobile Local Service: Local services segmented control, category chips, and verified resident cards', () => {
    const servicesPath = path.join(rootDir, 'src', 'components', 'services', 'ServicesView.tsx');
    const content = fs.readFileSync(servicesPath, 'utf8');

    // Mobile layout
    assert.strictEqual(content.includes('Find Services'), true, 'Must have Find Services tab');
    assert.strictEqual(content.includes('Community Requests'), true, 'Must have Community Requests tab');
    assert.strictEqual(content.includes('Verified Resident'), true, 'Must have Verified Resident badges');
    assert.strictEqual(content.includes('isDetailOpen') && content.includes('detailService'), true, 'Must have details sheet action');

    // Title consistency
    assert.strictEqual(content.includes('text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight'), true, 'Must use consistent section title styling');

    // Desktop layout preserved
    assert.strictEqual(content.includes('hidden md:flex'), true, 'Must preserve desktop layout under hidden md:flex');
  });

  it('6. Mobile Messages: Messages header, search, filter chips, conversation cards, intercom direct, floating compose', () => {
    const messagesPath = path.join(rootDir, 'src', 'components', 'messages', 'MessagesView.tsx');
    const content = fs.readFileSync(messagesPath, 'utf8');

    // Mobile layout
    assert.strictEqual(content.includes('Search neighbors, listings, or gate slips...'), true, 'Must have Stitch search placeholder');
    assert.strictEqual(content.includes('All resident communications are end-to-end township verified.'), true, 'Must have security advisory micro-strip');
    assert.strictEqual(content.includes('ID: SEC-04'), true, 'Must have advisory ID');
    assert.strictEqual(content.includes('Guard Intercom Direct'), true, 'Must have Guard Intercom Direct quick dial');
    assert.strictEqual(content.includes('New Chat'), true, 'Must have floating New Chat compose button');
    assert.strictEqual(content.includes('mobileActiveThreadOpen'), true, 'Must support active thread view on mobile');

    // Desktop layout preserved
    assert.strictEqual(content.includes('hidden md:flex'), true, 'Must preserve desktop layout under hidden md:flex');
  });

  it('7. Mobile Setting: Settings header, profile card, appearance group, preferences, privacy, hotline, logout', () => {
    const settingsPath = path.join(rootDir, 'src', 'components', 'settings', 'SettingsView.tsx');
    const content = fs.readFileSync(settingsPath, 'utf8');

    // Mobile Stitch layout
    assert.strictEqual(content.includes('Interface Theme'), true, 'Must have Interface Theme switcher');
    assert.strictEqual(content.includes('UI Scale'), true, 'Must have UI Scale discrete selector');
    assert.strictEqual(content.includes('English &amp; Bahasa Melayu') || content.includes('English & Bahasa Melayu'), true, 'Must support English and Bahasa Melayu');
    assert.strictEqual(content.includes('Township Alerts'), true, 'Must have Township Alerts toggle');
    assert.strictEqual(content.includes('Blocked Residents'), true, 'Must have Blocked Residents link');
    assert.strictEqual(content.includes('Auxiliary Police Desk'), true, 'Must have Auxiliary Police Desk hotline');
    assert.strictEqual(content.includes('Log Out'), true, 'Must have Log Out action');
    assert.strictEqual(content.includes('TESDH Civic OS · v4.12.0'), true, 'Must have Civic OS version footer');

    // Desktop layout preserved
    assert.strictEqual(content.includes('hidden md:block'), true, 'Must preserve desktop operational header under hidden md:block');
  });
});
