import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('TESDH Community Hub — Remove Unwanted Section Descriptions & Banner Elements', async (t) => {
  const exchangeViewPath = path.resolve('src/components/exchange/ExchangeView.tsx');
  const feedViewPath = path.resolve('src/components/feed/FeedView.tsx');
  const servicesViewPath = path.resolve('src/components/services/ServicesView.tsx');

  const exchangeView = fs.readFileSync(exchangeViewPath, 'utf8');
  const feedView = fs.readFileSync(feedViewPath, 'utf8');
  const servicesView = fs.readFileSync(servicesViewPath, 'utf8');

  await t.test('1. Circular Exchange: Removal of Subtitle & Sustainability Statistics Bar', () => {
    // Subtitle must be completely removed
    assert.strictEqual(
      exchangeView.includes('Give items a second life within your community'),
      false,
      'ExchangeView should not contain subtitle "Give items a second life within your community"'
    );

    // Sustainability statistics banner text elements must be removed
    assert.strictEqual(
      exchangeView.includes('482 Items Reused this Quarter'),
      false,
      'ExchangeView should not contain "482 Items Reused this Quarter"'
    );
    assert.strictEqual(
      exchangeView.includes('Diverted 3.4 tonnes from Meru Landfill'),
      false,
      'ExchangeView should not contain "Diverted 3.4 tonnes from Meru Landfill"'
    );
    assert.strictEqual(
      exchangeView.includes('All 7 Precincts Active'),
      false,
      'ExchangeView should not contain "All 7 Precincts Active"'
    );
    assert.strictEqual(
      exchangeView.includes('Restrained Civic Impact Ticker'),
      false,
      'ExchangeView should not contain Civic Impact Ticker comment or wrapper'
    );

    // Core functionality and approved elements must remain intact
    assert.strictEqual(exchangeView.includes('Exchange'), true, 'Exchange title must remain');
    assert.strictEqual(exchangeView.includes('Verified Neighbourhood Reuse'), false, 'Verified Neighbourhood Reuse badge should be removed from header');
    assert.strictEqual(exchangeView.includes('+ Create Listing'), true, 'Create Listing button must remain');
    assert.strictEqual(exchangeView.includes('Search items, homeware, baby gear, tools...'), true, 'Search input must remain');
    assert.strictEqual(exchangeView.includes('id="exchange-scroll-container"'), true, 'Scroll container must remain');
  });

  await t.test('2. Community Feed: Removal of Section Description', () => {
    // Description text must be completely removed
    assert.strictEqual(
      feedView.includes('Curated municipal advisories, verified resident dispatches, and neighborhood initiatives'),
      false,
      'FeedView should not contain description "Curated municipal advisories, verified resident dispatches, and neighborhood initiatives"'
    );

    // Core functionality and approved elements must remain intact
    assert.strictEqual(feedView.includes('Community Feed'), true, 'Community Feed title must remain');
    assert.strictEqual(feedView.includes('Create Post'), true, 'Create Post button must remain');
    assert.strictEqual(feedView.includes('Sort: Latest Activity'), true, 'Sort selector must remain');
    assert.strictEqual(feedView.includes('id="filterPillsContainer"'), true, 'Filter pills container must remain');
    assert.strictEqual(feedView.includes('id="quickComposerAnchor"'), true, 'Quick composer anchor must remain');
    assert.strictEqual(feedView.includes('id="feed-scroll-container"'), true, 'Feed scroll container must remain');
  });

  await t.test('3. Local Services: Removal of Section Description', () => {
    // Description text must be completely removed
    assert.strictEqual(
      servicesView.includes('Offer your skills, find trustworthy neighbourhood services, or ask fellow Elmina residents for urgent help'),
      false,
      'ServicesView should not contain description "Offer your skills, find trustworthy neighbourhood services, or ask fellow Elmina residents for urgent help"'
    );

    // Core functionality and approved elements must remain intact
    assert.strictEqual(servicesView.includes('Local Services &amp; Mutual Aid'), true, 'Local Services title must remain');
    assert.strictEqual(servicesView.includes('Verified Township Network'), false, 'Verified Township Network badge should be removed from header');
    assert.strictEqual(servicesView.includes('Find Services'), true, 'Find Services tab must remain');
    assert.strictEqual(servicesView.includes('Requests for Help'), true, 'Requests for Help tab must remain');
    assert.strictEqual(servicesView.includes('+ Offer a Service'), true, 'Offer a Service action must remain');
    assert.strictEqual(servicesView.includes('+ Post a Request'), true, 'Post a Request action must remain');
  });
});
