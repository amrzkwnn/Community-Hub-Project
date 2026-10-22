import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Simplify All Section Headers', () => {
  const rootDir = process.cwd();

  it('1. Home: header displays only the main heading without supplementary subtitle', () => {
    const homePath = path.join(rootDir, 'src', 'components', 'home', 'HomeView.tsx');
    const content = fs.readFileSync(homePath, 'utf8');

    // Main heading remains
    assert.strictEqual(content.includes('Welcome to Your Community'), true, 'Home heading must remain');

    // Subtitle must be removed
    assert.strictEqual(
      content.includes("Stay connected, lend a hand and discover what's happening around Elmina.") ||
      content.includes("Stay connected, lend a hand and discover what&apos;s happening around Elmina.") ||
      content.includes("welcomeSubtitle"),
      false,
      'Home subtitle must be removed'
    );
  });

  it('2. Community Feed: header contains only title and functional action/filter controls', () => {
    const feedPath = path.join(rootDir, 'src', 'components', 'feed', 'FeedView.tsx');
    const content = fs.readFileSync(feedPath, 'utf8');

    assert.strictEqual(content.includes('Community Feed'), true, 'Community Feed title must remain');
    assert.strictEqual(content.includes('Create Post'), true, 'Create Post button must remain');
    assert.strictEqual(content.includes('Sort: Latest Activity'), true, 'Sort selector must remain');
    assert.strictEqual(
      content.includes('Curated municipal advisories, verified resident dispatches, and neighborhood initiatives'),
      false,
      'Feed description must not be present'
    );
  });

  it('3. Resilience Map: header contains title without descriptive paragraph or Live Monitoring badge', () => {
    const resiliencePath = path.join(rootDir, 'src', 'components', 'resilience', 'ResilienceView.tsx');
    const content = fs.readFileSync(resiliencePath, 'utf8');

    assert.strictEqual(content.includes('Resilience Map'), true, 'Resilience Map title must remain');
    assert.strictEqual(content.includes('Live Monitoring'), false, 'Live Monitoring status badge must be removed');
    assert.strictEqual(content.includes('+ Report Incident'), true, 'Report Incident button must remain');
    assert.strictEqual(
      content.includes('Real-time neighbourhood incident reporting, environmental hydrology sensors'),
      false,
      'Resilience Map subtitle must be removed'
    );
  });

  it('4. Exchange: header contains title without descriptive paragraph or Verified badge', () => {
    const exchangePath = path.join(rootDir, 'src', 'components', 'exchange', 'ExchangeView.tsx');
    const content = fs.readFileSync(exchangePath, 'utf8');

    assert.strictEqual(content.includes('Exchange'), true, 'Exchange title must remain');
    assert.strictEqual(content.includes('Verified Neighbourhood Reuse'), false, 'Verified badge must be removed');
    assert.strictEqual(content.includes('+ Create Listing'), true, 'Create Listing button must remain');
    assert.strictEqual(
      content.includes('Give items a second life within your community'),
      false,
      'Exchange subtitle must not be present'
    );
  });

  it('5. Local Services: header contains title without descriptive paragraph or Verified badge', () => {
    const servicesPath = path.join(rootDir, 'src', 'components', 'services', 'ServicesView.tsx');
    const content = fs.readFileSync(servicesPath, 'utf8');

    assert.strictEqual(content.includes('Local Services &amp; Mutual Aid'), true, 'Local Services title must remain');
    assert.strictEqual(content.includes('Verified Township Network'), false, 'Verified badge must be removed');
    assert.strictEqual(
      content.includes('Offer your skills, find trustworthy neighbourhood services, or ask fellow Elmina residents for urgent help'),
      false,
      'Services description must not be present'
    );
  });

  it('6. Secure Messages: top metadata bar contains actions without protocol badge or decorative node text', () => {
    const messagesPath = path.join(rootDir, 'src', 'components', 'messages', 'MessagesView.tsx');
    const content = fs.readFileSync(messagesPath, 'utf8');

    assert.strictEqual(content.includes('Municipal E2EE Protocol v3.2'), false, 'Protocol badge must be removed');
    assert.strictEqual(content.includes('Request Resident Contact'), true, 'Request Contact CTA must remain');
    assert.strictEqual(
      content.includes('Sime Darby Property Governance Node #SEL-ELM-04'),
      false,
      'Governance node decorative text must be removed'
    );
  });

  it('7. Settings: header contains title without auto-saved indicator or descriptive paragraph', () => {
    const settingsPath = path.join(rootDir, 'src', 'components', 'settings', 'SettingsView.tsx');
    const content = fs.readFileSync(settingsPath, 'utf8');

    assert.strictEqual(content.includes('Settings &amp; Preferences'), true, 'Settings title must remain');
    assert.strictEqual(content.includes('Preferences Auto-Saved'), false, 'Auto-saved indicator must be removed');
    assert.strictEqual(
      content.includes('Customize your interface theme, civic notification channels, and privacy controls.'),
      false,
      'Settings subtitle must be removed'
    );
  });

  it('8. Management Console: header contains console title and auditor badge without descriptive paragraph', () => {
    const mgmtPath = path.join(rootDir, 'src', 'components', 'management', 'ManagementView.tsx');
    const content = fs.readFileSync(mgmtPath, 'utf8');

    assert.strictEqual(content.includes('Community Administration & Security Console'), true, 'Management title must remain');
    assert.strictEqual(content.includes('Duty Officer (Auditor)'), true, 'Auditor badge must remain');
    assert.strictEqual(
      content.includes('Centralized operations for resident identity verification'),
      false,
      'Management subtitle must be removed'
    );
  });

  it('9. Tablet Kiosk: header contains kiosk title and badge without township network subtitle', () => {
    const kioskPath = path.join(rootDir, 'src', 'components', 'kiosk', 'KioskView.tsx');
    const content = fs.readFileSync(kioskPath, 'utf8');

    assert.strictEqual(content.includes('TESDH Wall-Mounted Tablet Kiosk'), true, 'Kiosk title must remain');
    assert.strictEqual(
      content.includes('Bandar Elmina • Sime Darby Property Township Network'),
      false,
      'Kiosk subtitle must be removed'
    );
  });
});
