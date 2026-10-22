import test from 'node:test';
import assert from 'node:assert';
import { 
  executeAiSmartSearch, 
  searchExchangeListings, 
  searchIncidents, 
  searchLocalServices, 
  searchUpcomingEvents,
  analyzeIncidentReportIntent,
  calculateHaversineDistance,
  ELMINA_LANDMARKS 
} from '../src/lib/server/aiSearch.ts';

test('TESDH Community Hub — AI Phase 2: Community Search, Direct Navigation & Incident Assistance', async (t) => {

  // ==========================================
  // STAGE 2A: INTELLIGENT COMMUNITY SEARCH
  // ==========================================
  await t.test('Stage 2A: Intelligent Community Search across authorized modules', async (sub) => {
    
    // 1. Exchange Search
    await sub.test('Exchange Search: "Find me chairs in Exchange." returns real chair listings', async () => {
      const res = await executeAiSmartSearch('Find me chairs in Exchange.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1, 'Must return at least 1 chair listing');
      assert.ok(res.cards.some((c) => c.title.toLowerCase().includes('chair')), 'Should contain chair in title');
      assert.ok(!res.cards.some((c) => c.title.toLowerCase().includes('sofa')), 'Should not return sofa for chair query');
      
      const item = res.cards[0];
      assert.strictEqual(item.type, 'exchange');
      assert.strictEqual(item.navigationTarget.tab, 'exchange');
      assert.ok(item.navigationTarget.itemId, 'Must contain real item ID');
      assert.ok(item.actionLabel.includes('View Item'), 'Must have View Item action');
    });

    await sub.test('Exchange Search: "Show me free furniture." returns only free giveaway furniture', async () => {
      const res = await executeAiSmartSearch('Show me free furniture.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      for (const card of res.cards) {
        assert.ok(
          card.price?.toLowerCase().includes('free') || card.price?.toLowerCase().includes('giveaway'),
          `Item "${card.title}" must be a free giveaway`
        );
      }
    });

    await sub.test('Exchange Search: "Find a bicycle under RM200." returns available bicycle giveaway', async () => {
      const res = await executeAiSmartSearch('Find a bicycle under RM200.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards[0].title.toLowerCase().includes('bicycle'));
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'exch-stitch-4');
    });

    await sub.test('Exchange Search: "Are there any dining tables available?" never invents non-existent records', async () => {
      const res = await searchExchangeListings('Are there any dining tables available?');
      // No dining tables are currently listed (only chairs and sofas)
      assert.strictEqual(res.length, 0, 'Must never invent a dining table when none is listed');
    });

    await sub.test('Exchange Search (Malay): "Cari kerusi terpakai." matches preloved/used chairs', async () => {
      const res = await executeAiSmartSearch('Cari kerusi terpakai.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards.some((c) => c.title.toLowerCase().includes('chair')));
    });

    await sub.test('Exchange Search (Malay): "Ada barang percuma?" returns free giveaways', async () => {
      const res = await executeAiSmartSearch('Ada barang percuma?');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      for (const card of res.cards) {
        assert.ok(card.price?.toLowerCase().includes('giveaway') || card.price?.toLowerCase().includes('free'));
      }
    });

    // 2. Resilience Map Incident Search
    await sub.test('Incident Search: "Is there any incident near Jalan Elmina?" matches street location', async () => {
      const res = await executeAiSmartSearch('Is there any incident near Jalan Elmina?');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      for (const card of res.cards) {
        assert.strictEqual(card.type, 'incident');
        assert.strictEqual(card.actionLabel, 'View Incident on Map');
        assert.strictEqual(card.navigationTarget.tab, 'resilience');
        assert.ok(card.location?.toLowerCase().includes('elmina'));
      }
    });

    await sub.test('Incident Search: "Show unresolved streetlight problems." returns active streetlight issue', async () => {
      const res = await executeAiSmartSearch('Show unresolved streetlight problems.');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'inc-7');
      assert.ok(res.cards[0].title.toLowerCase().includes('streetlight'));
      assert.strictEqual(res.cards[0].isVerified, true);
    });

    await sub.test('Incident Search: "Are there flooding incidents around this area?" returns flood issues', async () => {
      const res = await executeAiSmartSearch('Are there flooding incidents around this area?');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards[0].category === 'FLOOD' || res.cards[0].title.toLowerCase().includes('wetland'));
    });

    await sub.test('Incident Search: "Find verified incidents near Persiaran Elmina" enforces verification filter', async () => {
      const res = await searchIncidents('Find verified incidents near Persiaran Elmina');
      assert.ok(res.length >= 1);
      for (const card of res) {
        assert.strictEqual(card.isVerified, true, 'Every returned card must be verified by management');
      }
    });

    await sub.test('Incident Search (Malay): "Ada laporan kerosakan jalan dekat sini?" matches pothole reports', async () => {
      const res = await executeAiSmartSearch('Ada laporan kerosakan jalan dekat sini?');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards.some((c) => c.navigationTarget.itemId === 'inc-6' || c.title.toLowerCase().includes('pothole')));
    });

    // 3. Local Services Search
    await sub.test('Local Services: "Find a plumber." returns plumbing service offering', async () => {
      const res = await executeAiSmartSearch('Find a plumber.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'serv-stitch-7');
      assert.strictEqual(res.cards[0].actionLabel, 'View Service');
      assert.strictEqual(res.cards[0].navigationTarget.tab, 'services');
      assert.strictEqual(res.cards[0].navigationTarget.subTab, 'services');
    });

    await sub.test('Local Services: "I need air conditioner repair." returns aircon overhaul service', async () => {
      const res = await executeAiSmartSearch('I need air conditioner repair.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'serv-stitch-8');
      assert.strictEqual(res.cards[0].actionLabel, 'View Service');
    });

    await sub.test('Local Services: "Show available cleaning services." returns porch wash / cleaning', async () => {
      const res = await executeAiSmartSearch('Show available cleaning services.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards.some((c) => c.navigationTarget.itemId === 'serv-stitch-6'));
    });

    await sub.test('Local Services (Malay): "Cari tukang elektrik." matches certified wireman service', async () => {
      const res = await executeAiSmartSearch('Cari tukang elektrik.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'serv-stitch-9');
      assert.strictEqual(res.cards[0].actionLabel, 'View Service');
    });

    await sub.test('Help Requests: "Looking for SPM tutor" routes to requests subTab', async () => {
      const res = await searchLocalServices('Looking for SPM tutor');
      assert.ok(res.length >= 1);
      const req = res.find((c) => c.type === 'request');
      assert.ok(req);
      assert.strictEqual(req.actionLabel, 'View Help Request');
      assert.strictEqual(req.navigationTarget.subTab, 'requests');
    });

    // 4. Upcoming Events Search
    await sub.test('Upcoming Events: "What events are happening this weekend?" returns scheduled events in Asia/Kuala_Lumpur', async () => {
      const res = await executeAiSmartSearch('What events are happening this weekend?');
      assert.strictEqual(res.detectedIntent, 'events');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].type, 'event');
      assert.strictEqual(res.cards[0].actionLabel, 'View Event');
      assert.strictEqual(res.cards[0].navigationTarget.tab, 'home');
      assert.strictEqual(res.cards[0].navigationTarget.itemType, 'post');
      assert.ok(res.cards[0].date, 'Must have formatted date');
    });

    await sub.test('Upcoming Events (Malay): "Ada aktiviti komuniti minggu ini?" matches community events', async () => {
      const res = await executeAiSmartSearch('Ada aktiviti komuniti minggu ini?');
      assert.strictEqual(res.detectedIntent, 'events');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].type, 'event');
    });
  });

  // ==========================================
  // STAGE 2B: DIRECT NAVIGATION SYSTEM
  // ==========================================
  await t.test('Stage 2B: Direct Navigation System validation', async () => {
    const exchangeResults = await searchExchangeListings('chair');
    const incidentResults = await searchIncidents('flood');
    const serviceResults = await searchLocalServices('plumber');
    const eventResults = await searchUpcomingEvents('weekend');

    // 1. Exchange Item -> tab: 'exchange', itemId exists
    assert.ok(exchangeResults.length >= 1);
    assert.strictEqual(exchangeResults[0].navigationTarget.tab, 'exchange');
    assert.ok(exchangeResults[0].navigationTarget.itemId);

    // 2. Incident -> tab: 'resilience', itemId exists
    assert.ok(incidentResults.length >= 1);
    assert.strictEqual(incidentResults[0].navigationTarget.tab, 'resilience');
    assert.ok(incidentResults[0].navigationTarget.itemId);

    // 3. Local Service -> tab: 'services', subTab: 'services', itemId exists
    assert.ok(serviceResults.length >= 1);
    assert.strictEqual(serviceResults[0].navigationTarget.tab, 'services');
    assert.strictEqual(serviceResults[0].navigationTarget.subTab, 'services');
    assert.ok(serviceResults[0].navigationTarget.itemId);

    // 4. Event -> tab: 'home', itemType: 'post', itemId exists
    assert.ok(eventResults.length >= 1);
    assert.strictEqual(eventResults[0].navigationTarget.tab, 'home');
    assert.strictEqual(eventResults[0].navigationTarget.itemType, 'post');
    assert.ok(eventResults[0].navigationTarget.itemId);
  });

  // ==========================================
  // STAGE 2C: AI-ASSISTED INCIDENT REPORTING
  // ==========================================
  await t.test('Stage 2C: AI-Assisted Incident Reporting', async (sub) => {
    
    // A. Natural-language incident description recognition & category suggestion
    await sub.test('Recognizes incident reporting description and suggests street_light category', async () => {
      const report = await analyzeIncidentReportIntent('I found a broken streetlight near Jalan Elmina.');
      assert.strictEqual(report.isReportingIntent, true);
      assert.strictEqual(report.suggestedCategory, 'street_light');
      assert.ok(report.suggestedCategoryLabel?.includes('Lighting'));
      assert.ok(report.draftTitle?.includes('Streetlight'));
      assert.ok(report.draftDescription?.includes('broken streetlight'));
      assert.ok(report.draftCard, 'Must generate draft card');
      assert.strictEqual(report.draftCard?.type, 'incident_report_draft');
      assert.strictEqual(report.draftCard?.actionLabel, 'Report This Incident');
      assert.strictEqual(report.draftCard?.navigationTarget.tab, 'resilience');
      assert.strictEqual(report.draftCard?.navigationTarget.action, 'report_incident');
      assert.strictEqual(report.draftCard?.navigationTarget.prefill?.category, 'street_light');
    });

    // B. Duplicate Incident Detection
    await sub.test('Detects potential duplicate for streetlight issue along Persiaran Elmina', async () => {
      const report = await analyzeIncidentReportIntent('I found a broken streetlight near Jalan Elmina.');
      assert.ok(report.duplicates.length >= 1, 'Should find existing active streetlight incident (inc-7)');
      const dup = report.duplicates[0];
      assert.strictEqual(dup.id, 'inc-7');
      assert.strictEqual(dup.actionLabel, 'View Existing Report');
      assert.strictEqual(dup.navigationTarget.tab, 'resilience');
      assert.strictEqual(dup.navigationTarget.itemId, 'inc-7');
      assert.strictEqual(dup.isVerified, true, 'Preserves verified database status');
    });

    // C. Non-duplicate / unique reporting scenario
    await sub.test('Unique report creates draft card with no duplicate if none match', async () => {
      const report = await analyzeIncidentReportIntent('I saw a fallen tree blocking the bicycle path near Elmina Valley 3.');
      assert.strictEqual(report.isReportingIntent, true);
      assert.strictEqual(report.suggestedCategory, 'fallen_tree');
      assert.ok(report.draftCard);
      assert.strictEqual(report.draftCard?.navigationTarget.prefill?.category, 'fallen_tree');
      assert.strictEqual(report.draftCard?.actionLabel, 'Report This Incident');
    });

    // D. Pure search query does NOT trigger reporting draft
    await sub.test('Pure search query does NOT trigger reporting draft', async () => {
      const report = await analyzeIncidentReportIntent('Show unresolved streetlight problems.');
      assert.strictEqual(report.isReportingIntent, false);
      assert.strictEqual(report.draftCard, null);
    });

    // E. Bahasa Melayu Incident Reporting
    await sub.test('Malay report intent: "Saya jumpa pokok tumbang dekat Persiaran Elmina"', async () => {
      const report = await analyzeIncidentReportIntent('Saya jumpa pokok tumbang dekat Persiaran Elmina', { preferredLanguage: 'bm' });
      assert.strictEqual(report.isReportingIntent, true);
      assert.strictEqual(report.suggestedCategory, 'fallen_tree');
      assert.ok(report.draftTitle?.includes('Pokok Tumbang'));
      assert.strictEqual(report.draftCard?.actionLabel, 'Lapor Insiden Ini');
    });

    // F. Master search integration
    await sub.test('executeAiSmartSearch routes reporting intent to incident_reporting', async () => {
      const res = await executeAiSmartSearch('I found a broken streetlight near Jalan Elmina.');
      assert.strictEqual(res.detectedIntent, 'incident_reporting');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].type, 'incident_report_draft');
      assert.strictEqual(res.cards[0].actionLabel, 'Report This Incident');
      // If duplicates found, they follow the draft card
      if (res.cards.length > 1) {
        assert.strictEqual(res.cards[1].type, 'incident');
        assert.strictEqual(res.cards[1].actionLabel, 'View Existing Report');
      }
    });
  });

  // ==========================================
  // STAGE 2E: PRIVACY AND SECURITY
  // ==========================================
  await t.test('Stage 2E: Privacy and Security Enforcement', async () => {
    const exRes = await searchExchangeListings('chair');
    const incRes = await searchIncidents('elmina');
    const servRes = await searchLocalServices('plumber');
    const reportRes = await analyzeIncidentReportIntent('I found a broken streetlight near Jalan Elmina.');

    const allCards = [...exRes, ...incRes, ...servRes, ...(reportRes.draftCard ? [reportRes.draftCard] : [])];

    for (const card of allCards) {
      const serialized = JSON.stringify(card);
      // No personal mobile numbers exposed
      assert.strictEqual(/01\d-\d{7,8}/.test(serialized), false, 'Must not leak mobile numbers');
      // No IC numbers
      assert.strictEqual(/\d{6}-\d{2}-\d{4}/.test(serialized), false, 'Must not leak IC numbers');
      // No private house numbers
      assert.strictEqual(/No\.\s*\d+,\s*Jalan/i.test(serialized), false, 'Must not expose private residential house numbers');
    }
  });

  // ==========================================
  // STAGE 2F: MULTILINGUAL PERFORMANCE
  // ==========================================
  await t.test('Stage 2F: English & Bahasa Melayu parity', async () => {
    // English
    const enRes = await executeAiSmartSearch('Find plumbing services');
    assert.strictEqual(enRes.detectedIntent, 'services');
    assert.ok(enRes.cards.length >= 1);

    // Malay
    const bmRes = await executeAiSmartSearch('Cari perkhidmatan paip');
    assert.strictEqual(bmRes.detectedIntent, 'services');
    assert.ok(bmRes.cards.length >= 1);
    assert.strictEqual(enRes.cards[0].navigationTarget.itemId, bmRes.cards[0].navigationTarget.itemId, 'Both languages must resolve to the same underlying record');
  });
});
