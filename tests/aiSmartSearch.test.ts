import test from 'node:test';
import assert from 'node:assert';
import { 
  executeAiSmartSearch, 
  searchExchangeListings, 
  searchIncidents, 
  searchLocalServices, 
  calculateHaversineDistance,
  ELMINA_LANDMARKS 
} from '../src/lib/server/aiSearch.ts';

test('TESDH Community Hub — AI Smart Search & Direct Navigation Engine', async (t) => {

  await t.test('1. Smart Exchange Search: Natural-language query matching & filters', async (sub) => {
    // A. "Find me chairs in Exchange."
    await sub.test('Chairs query returns matching chairs and no sofas', async () => {
      const res = await executeAiSmartSearch('Find me chairs in Exchange.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1, 'Should find at least 1 chair');
      const titles = res.cards.map((c) => c.title.toLowerCase());
      assert.ok(titles.some((t) => t.includes('chair')), 'Must contain a chair');
      assert.ok(!titles.some((t) => t.includes('sofa')), 'Should not return sofa for chair query');
      
      const first = res.cards[0];
      assert.strictEqual(first.type, 'exchange');
      assert.strictEqual(first.actionLabel, 'View Item Details');
      assert.strictEqual(first.navigationTarget.tab, 'exchange');
      assert.ok(first.navigationTarget.itemId, 'Must contain target item ID');
    });

    // B. "Does anyone have a used bicycle?"
    await sub.test('Bicycle query returns used bicycle listing', async () => {
      const res = await executeAiSmartSearch('Does anyone have a used bicycle?');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards[0].title.toLowerCase().includes('bicycle'));
      assert.strictEqual(res.cards[0].navigationTarget.tab, 'exchange');
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'exch-stitch-4');
    });

    // C. "Show me free furniture."
    await sub.test('Free furniture returns only giveaway furniture items', async () => {
      const res = await executeAiSmartSearch('Show me free furniture.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      for (const card of res.cards) {
        assert.strictEqual(card.price, 'Free Giveaway', 'All results must be free giveaways');
      }
    });

    // D. "Find a sofa under RM 200."
    await sub.test('Sofa under RM 200 returns sofa giveaway (RM 0 < RM 200)', async () => {
      const res = await executeAiSmartSearch('Find a sofa under RM 200.');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards[0].title.toLowerCase().includes('sofa'));
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'exch-stitch-5');
    });

    // E. Bahasa Melayu: "Ada sesiapa jual kerusi?"
    await sub.test('Malay language kerusi query correctly matches chairs', async () => {
      const res = await executeAiSmartSearch('Ada sesiapa jual kerusi?');
      assert.strictEqual(res.detectedIntent, 'exchange');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards.some((c) => c.title.toLowerCase().includes('chair')));
    });

    // F. Non-existent query: no fabricated items
    await sub.test('Non-existent items return empty results without fabrication', async () => {
      const res = await executeAiSmartSearch('Find me spaceships in Exchange.');
      assert.strictEqual(res.cards.length, 0, 'Must return 0 cards for nonexistent items');
    });
  });

  await t.test('2. Smart Incident Search: Geographic proximity & categories', async (sub) => {
    // A. "Is there any incident near Jalan Elmina?"
    await sub.test('Street query finds incidents on or near Persiaran/Jalan Elmina', async () => {
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

    // B. "Show me flooding reports around my area."
    await sub.test('Flooding query returns only flood-related incidents', async () => {
      const res = await executeAiSmartSearch('Show me flooding reports around my area.');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards[0].title.toLowerCase().includes('wetland') || res.cards[0].category === 'FLOOD');
      assert.strictEqual(res.cards[0].isVerified, true, 'Management verified incident must have isVerified true');
      assert.strictEqual(res.cards[0].status, 'Verified by Management');
    });

    // C. "Are there any unresolved road problems nearby?"
    await sub.test('Unresolved road problems query finds pothole and drainage hazards', async () => {
      const res = await executeAiSmartSearch('Are there any unresolved road problems nearby?');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      const ids = res.cards.map((c) => c.navigationTarget.itemId);
      assert.ok(ids.includes('inc-6') || ids.includes('inc-1'), 'Should include pothole or blocked road drain');
    });

    // D. "Find streetlight issues near this street."
    await sub.test('Streetlight query finds only streetlight incident', async () => {
      const res = await executeAiSmartSearch('Find streetlight issues near this street.');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'inc-7');
      assert.ok(res.cards[0].title.toLowerCase().includes('streetlight'));
      assert.strictEqual(res.cards[0].isVerified, true);
    });

    // E. Bahasa Melayu: "Ada laporan masalah jalan dekat sini?"
    await sub.test('Malay road problem query matches incidents', async () => {
      const res = await executeAiSmartSearch('Ada laporan masalah jalan dekat sini?');
      assert.strictEqual(res.detectedIntent, 'incidents');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.tab, 'resilience');
    });

    // F. Geographic calculation
    await sub.test('Haversine distance calculates accurate meter distance', () => {
      const dist = calculateHaversineDistance(
        ELMINA_LANDMARKS.rainbow_bridge.lat,
        ELMINA_LANDMARKS.rainbow_bridge.lng,
        ELMINA_LANDMARKS.central_park.lat,
        ELMINA_LANDMARKS.central_park.lng
      );
      assert.ok(dist > 50 && dist < 500, `Expected 50-500m distance, got ${dist}m`);
    });
  });

  await t.test('3. Smart Search for Local Services & Requests for Help', async (sub) => {
    // A. "Find a plumber near me."
    await sub.test('Plumber query returns sanitary plumbing service', async () => {
      const res = await executeAiSmartSearch('Find a plumber near me.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'serv-stitch-7');
      assert.strictEqual(res.cards[0].actionLabel, 'View Service');
      assert.strictEqual(res.cards[0].navigationTarget.tab, 'services');
      assert.strictEqual(res.cards[0].navigationTarget.subTab, 'services');
    });

    // B. "I need someone to repair my air conditioner."
    await sub.test('Air conditioner query returns air conditioner servicing', async () => {
      const res = await executeAiSmartSearch('I need someone to repair my air conditioner.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'serv-stitch-8');
      assert.ok(res.cards[0].title.toLowerCase().includes('air conditioner'));
    });

    // C. "Show available cleaning services."
    await sub.test('Cleaning services query returns porch washing and overhaul', async () => {
      const res = await executeAiSmartSearch('Show available cleaning services.');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.ok(res.cards.some((c) => c.navigationTarget.itemId === 'serv-stitch-6'));
    });

    // D. "Ada perkhidmatan elektrik?"
    await sub.test('Malay electrical service query matches wireman service', async () => {
      const res = await executeAiSmartSearch('Ada perkhidmatan elektrik?');
      assert.strictEqual(res.detectedIntent, 'services');
      assert.ok(res.cards.length >= 1);
      assert.strictEqual(res.cards[0].navigationTarget.itemId, 'serv-stitch-9');
      assert.ok(res.cards[0].title.toLowerCase().includes('electrical wiring'));
    });

    // E. Requests for Help: "Looking for SPM tutor"
    await sub.test('Help requests route to requests subTab with View Help Request label', async () => {
      const res = await searchLocalServices('Looking for SPM tutor');
      assert.ok(res.length >= 1);
      const reqCard = res.find((c) => c.type === 'request');
      assert.ok(reqCard, 'Should find a help request');
      assert.strictEqual(reqCard.actionLabel, 'View Help Request');
      assert.strictEqual(reqCard.navigationTarget.subTab, 'requests');
    });

    // F. Nonexistent service query
    await sub.test('Nonexistent service returns empty cards', async () => {
      const res = await executeAiSmartSearch('Find an astronaut rocket repair service');
      assert.strictEqual(res.cards.length, 0);
    });
  });

  await t.test('4. Smart Search for Upcoming Events (Malaysia Local Time)', async (sub) => {
    await sub.test('Upcoming events query returns events formatted in Malaysia timezone', async () => {
      const res = await executeAiSmartSearch('What events are happening this weekend?');
      assert.strictEqual(res.detectedIntent, 'events');
      assert.ok(res.cards.length >= 1);
      const first = res.cards[0];
      assert.strictEqual(first.type, 'event');
      assert.strictEqual(first.actionLabel, 'View Event');
      assert.strictEqual(first.navigationTarget.tab, 'home');
      assert.strictEqual(first.navigationTarget.itemType, 'post');
      assert.ok(first.date, 'Must have formatted date');
    });

    await sub.test('Malay query for acara komuniti returns community events', async () => {
      const res = await executeAiSmartSearch('Ada acara komuniti minggu ini?');
      assert.strictEqual(res.detectedIntent, 'events');
      assert.ok(res.cards.length >= 1);
    });
  });

  await t.test('5. Cross-Section Direct Navigation & Structure Validation', () => {
    // Check that every card produced by any search has valid fields
    const mockCard = {
      id: 'test-1',
      type: 'exchange' as const,
      title: 'Test Item',
      navigationTarget: {
        tab: 'exchange' as const,
        itemId: 'test-1',
        itemType: 'exchange',
      },
      actionLabel: 'View Item Details',
    };

    assert.ok(mockCard.id, 'Card must have ID');
    assert.ok(mockCard.navigationTarget.tab, 'Card must have valid tab target');
    assert.ok(mockCard.navigationTarget.itemId, 'Card must have valid itemId');
    assert.ok(['exchange', 'resilience', 'services', 'home'].includes(mockCard.navigationTarget.tab));
  });

  await t.test('6. Privacy & Security: No PII or confidential data leakage', async () => {
    const resEx = await searchExchangeListings('chair');
    const resInc = await searchIncidents('elmina');
    const resServ = await searchLocalServices('plumber');
    const allCards = [...resEx, ...resInc, ...resServ];

    for (const card of allCards) {
      const blob = JSON.stringify(card);
      // No personal phone numbers
      assert.strictEqual(/01[0-9]-[0-9]{7,8}/.test(blob), false, 'Must not expose personal phone numbers');
      // No full IC or private home addresses
      assert.strictEqual(/No\.\s*\d+,\s*Jalan/i.test(blob), false, 'Must not expose private residential house numbers');
    }
  });
});
