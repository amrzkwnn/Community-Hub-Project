import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Removal of Directory Text Above Section Titles', () => {
  const rootDir = process.cwd();

  it('Community Feed header contains no directory or breadcrumb text above the section title', () => {
    const feedPath = path.join(rootDir, 'src', 'components', 'feed', 'FeedView.tsx');
    const content = fs.readFileSync(feedPath, 'utf8');

    // Breadcrumb text must not be present in the header
    assert.strictEqual(
      content.includes('<span>Township Operations</span>'),
      false,
      'FeedView header should not have Township Operations breadcrumb span'
    );
    assert.strictEqual(
      content.includes('City of Elmina Hub'),
      false,
      'FeedView header should not have City of Elmina Hub breadcrumb'
    );
    assert.strictEqual(
      content.includes('Zone West / Valley 1–5'),
      false,
      'FeedView header should not have Zone West / Valley breadcrumb'
    );

    // Title must remain intact
    assert.strictEqual(content.includes('Community Feed'), true);
  });

  it('Resilience Map header contains no directory or breadcrumb text above the section title', () => {
    const resiliencePath = path.join(rootDir, 'src', 'components', 'resilience', 'ResilienceView.tsx');
    const content = fs.readFileSync(resiliencePath, 'utf8');

    // Breadcrumb text must not be present
    assert.strictEqual(
      content.includes('{/* Breadcrumb */}'),
      false,
      'ResilienceView should not have Breadcrumb comment or element'
    );
    assert.strictEqual(
      content.includes('uppercase tracking-wider font-semibold text-[#9E1315] dark:text-rose-400">Resilience & Safety'),
      false,
      'ResilienceView should not have Resilience & Safety breadcrumb'
    );

    // Title must remain intact, badge and subtitle removed
    assert.strictEqual(content.includes('Resilience Map'), true);
    assert.strictEqual(content.includes('Live Monitoring'), false, 'Live Monitoring badge must be removed');
    assert.strictEqual(
      content.includes('Real-time neighbourhood incident reporting, environmental hydrology sensors'),
      false,
      'ResilienceView subtitle must be removed'
    );
  });

  it('Exchange header contains no directory or breadcrumb text above the section title', () => {
    const exchangePath = path.join(rootDir, 'src', 'components', 'exchange', 'ExchangeView.tsx');
    const content = fs.readFileSync(exchangePath, 'utf8');

    // Breadcrumb text must not be present
    assert.strictEqual(
      content.includes('Township Exchange'),
      false,
      'ExchangeView should not have Township Exchange breadcrumb'
    );

    // Title must remain intact, badge removed
    assert.strictEqual(content.includes('Exchange'), true);
    assert.strictEqual(content.includes('Verified Neighbourhood Reuse'), false, 'Verified badge must be removed');
  });

  it('Local Services header contains no directory or breadcrumb text above the section title', () => {
    const servicesPath = path.join(rootDir, 'src', 'components', 'services', 'ServicesView.tsx');
    const content = fs.readFileSync(servicesPath, 'utf8');

    // Breadcrumb text must not be present
    assert.strictEqual(
      content.includes('Township Directory'),
      false,
      'ServicesView should not have Township Directory breadcrumb'
    );

    // Title must remain intact, badge removed
    assert.strictEqual(content.includes('Local Services &amp; Mutual Aid'), true);
    assert.strictEqual(content.includes('Verified Township Network'), false, 'Verified badge must be removed');
  });

  it('Settings & Preferences header contains no directory or breadcrumb text above the section title', () => {
    const settingsPath = path.join(rootDir, 'src', 'components', 'settings', 'SettingsView.tsx');
    const content = fs.readFileSync(settingsPath, 'utf8');

    // Breadcrumb text must not be present
    assert.strictEqual(
      content.includes('Resident Settings'),
      false,
      'SettingsView should not have Resident Settings breadcrumb'
    );

    // Title must remain intact, subtitle removed
    assert.strictEqual(content.includes('Settings &amp; Preferences'), true);
    assert.strictEqual(
      content.includes('Customize your interface theme, civic notification channels, and privacy controls.'),
      false,
      'SettingsView subtitle must be removed'
    );
  });

  it('Management Console header contains no directory label above the section title', () => {
    const mgmtPath = path.join(rootDir, 'src', 'components', 'management', 'ManagementView.tsx');
    const content = fs.readFileSync(mgmtPath, 'utf8');

    // Directory text must not be present
    assert.strictEqual(
      content.includes('Sime Darby Property Township Management Office & JMB'),
      false,
      'ManagementView should not have Township Management Office & JMB directory label above title'
    );

    // Title must remain intact, subtitle removed
    assert.strictEqual(content.includes('Community Administration & Security Console'), true);
    assert.strictEqual(
      content.includes('Centralized operations for resident identity verification'),
      false,
      'ManagementView subtitle must be removed'
    );
  });

  it('Home header contains no directory or breadcrumb text above the section title', () => {
    const homePath = path.join(rootDir, 'src', 'components', 'home', 'HomeView.tsx');
    const content = fs.readFileSync(homePath, 'utf8');

    // Breadcrumb / directory text must not be present
    assert.strictEqual(
      content.includes('City of Elmina • Sime Darby Property'),
      false,
      'HomeView should not have City of Elmina • Sime Darby Property text above title'
    );

    // Title must remain intact, subtitle removed
    assert.strictEqual(content.includes('Welcome to Your Community'), true);
    assert.strictEqual(
      content.includes("Stay connected, lend a hand and discover what's happening around Elmina.") ||
      content.includes("Stay connected, lend a hand and discover what&apos;s happening around Elmina."),
      false,
      'HomeView subtitle must be removed'
    );
  });
});

