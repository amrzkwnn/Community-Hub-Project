import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Accessibility Regression Checks (Section 6)', () => {
  const exchangeViewPath = path.join(process.cwd(), 'src/components/exchange/ExchangeView.tsx');
  const feedViewPath = path.join(process.cwd(), 'src/components/feed/FeedView.tsx');
  const servicesViewPath = path.join(process.cwd(), 'src/components/services/ServicesView.tsx');
  const globalsCssPath = path.join(process.cwd(), 'src/app/globals.css');

  const exchangeContent = fs.readFileSync(exchangeViewPath, 'utf8');
  const feedContent = fs.readFileSync(feedViewPath, 'utf8');
  const servicesContent = fs.readFileSync(servicesViewPath, 'utf8');
  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

  it('1. Semantic Structure: Logical heading hierarchy and page landmarks', () => {
    // Assert <h1> headers exist as primary landmarks in all three sections
    assert.match(exchangeContent, /<h1[^>]*>\s*Exchange\s*<\/h1>/);
    assert.match(feedContent, /<h1[^>]*>\s*Community Feed\s*<\/h1>/);
    assert.match(servicesContent, /<h1[^>]*>\s*Local Services &amp; Mutual Aid\s*<\/h1>/);

    // Assert modals have appropriate secondary headings (h2/h3) rather than duplicate h1
    assert.match(exchangeContent, /<h3[^>]*>\s*Create Exchange Listing\s*<\/h3>/);
    assert.match(feedContent, /<h2[^>]*>\s*Publish to Elmina Community\s*<\/h2>/);
    assert.match(servicesContent, /<h3[^>]*>\s*Offer a Service to Neighbours\s*<\/h3>/);
    assert.match(servicesContent, /<h3[^>]*>\s*Post a Request for Help\s*<\/h3>/);
  });

  it('2. Screen Readers & ARIA: Exchange accessible names and controls', () => {
    // Search input has descriptive aria-label
    assert.match(exchangeContent, /aria-label="Search items by keyword, category, or precinct"/);

    // Mode filter group and aria-pressed attributes
    assert.match(exchangeContent, /role="group"\s+aria-label="Filter by listing type"/);
    assert.match(exchangeContent, /aria-pressed=\{selectedTypeFilter === 'all'\}/);
    assert.match(exchangeContent, /aria-pressed=\{selectedTypeFilter === 'Free'\}/);
    assert.match(exchangeContent, /aria-pressed=\{selectedTypeFilter === 'Exchange'\}/);

    // Category pills group and aria-pressed attributes
    assert.match(exchangeContent, /role="group"\s+aria-label="Filter by item category"/);
    assert.match(exchangeContent, /aria-pressed=\{isSelected\}/);

    // Select dropdowns have accessible names
    assert.match(exchangeContent, /aria-label="Filter by condition"/);
    assert.match(exchangeContent, /aria-label="Filter by availability"/);

    // Drawer and Modal close buttons have accessible names
    assert.match(exchangeContent, /aria-label="Close item details"/);
    assert.match(exchangeContent, /aria-label="Close create listing dialog"/);

    // Photo thumbnails have accessible names
    assert.match(exchangeContent, /aria-label=\{`View photo \$\{idx \+ 1\} of \$\{images\.length\}`\}/);

    // Listing type selector in modal has role="group" and aria-pressed
    assert.match(exchangeContent, /role="group"\s+aria-label="Select listing type"/);
    assert.match(exchangeContent, /aria-pressed=\{newType === 'giveaway'\}/);
    assert.match(exchangeContent, /aria-pressed=\{newType === 'exchange'\}/);
  });

  it('3. Screen Readers & ARIA: Community Feed accessible names and controls', () => {
    // Sort dropdown has descriptive aria-label
    assert.match(feedContent, /aria-label="Sort community feed posts"/);

    // Filter pills have role="group" and aria-pressed
    assert.match(feedContent, /role="group"\s+aria-label="Filter community feed by category"/);
    assert.match(feedContent, /aria-pressed=\{selectedFilter === 'all'\}/);
    assert.match(feedContent, /aria-pressed=\{selectedFilter === 'alerts'\}/);
    assert.match(feedContent, /aria-pressed=\{selectedFilter === 'discussion'\}/);

    // Create post modal close and dismiss buttons have aria-labels
    assert.match(feedContent, /aria-label="Close publish post dialog"/);
    assert.match(feedContent, /aria-label="Dismiss alert"/);
    assert.match(feedContent, /aria-label="Select post category"/);
  });

  it('4. Screen Readers & ARIA: Local Services accessible names and controls', () => {
    // Primary segmented view switcher has role="tablist", role="tab", aria-selected
    assert.match(servicesContent, /role="tablist"\s+aria-label="Services and mutual aid navigation"/);
    assert.match(servicesContent, /role="tab"\s+aria-selected=\{activeTab === 'services'\}/);
    assert.match(servicesContent, /role="tab"\s+aria-selected=\{activeTab === 'requests'\}/);

    // Contextual search aria-label
    assert.match(servicesContent, /aria-label=\{activeTab === 'services' \? 'Search local services in Elmina' : 'Search mutual aid requests in Elmina'\}/);

    // Select dropdowns have aria-labels
    assert.match(servicesContent, /aria-label="Filter by precinct"/);
    assert.match(servicesContent, /aria-label="Filter by pricing"/);
    assert.match(servicesContent, /aria-label="Filter by request status"/);
    assert.match(servicesContent, /aria-label="Filter by compensation preference"/);

    // Category pills have role="group" and aria-pressed
    assert.match(servicesContent, /role="group"\s+aria-label="Filter by service category"/);
    assert.match(servicesContent, /aria-pressed=\{selectedCategory === cat\.id\}/);

    // Modal close buttons have accessible names
    assert.match(servicesContent, /aria-label="Close offer service dialog"/);
    assert.match(servicesContent, /aria-label="Close request help dialog"/);
    assert.match(servicesContent, /aria-label="Close service details dialog"/);
    assert.match(servicesContent, /aria-label="Close message provider dialog"/);
  });

  it('5. Decorative Icons: Hidden from assistive technology with aria-hidden="true"', () => {
    // Icons in controls and buttons have aria-hidden="true"
    assert.match(exchangeContent, /<Plus[^>]*aria-hidden="true"/);
    assert.match(exchangeContent, /<Search[^>]*aria-hidden="true"/);
    assert.match(exchangeContent, /<RotateCcw[^>]*aria-hidden="true"/);
    assert.match(exchangeContent, /<X[^>]*aria-hidden="true"/);

    assert.match(feedContent, /material-symbols-outlined[^>]*aria-hidden="true"[^>]*>\s*expand_more\s*<\/span>/);
    assert.match(feedContent, /material-symbols-outlined[^>]*aria-hidden="true"[^>]*>\s*add_circle\s*<\/span>/);
    assert.match(feedContent, /material-symbols-outlined[^>]*aria-hidden="true"[^>]*>\s*close\s*<\/span>/);

    assert.match(servicesContent, /<Plus[^>]*aria-hidden="true"/);
    assert.match(servicesContent, /<Wrench[^>]*aria-hidden="true"/);
    assert.match(servicesContent, /<HeartHandshake[^>]*aria-hidden="true"/);
    assert.match(servicesContent, /<Search[^>]*aria-hidden="true"/);
    assert.match(servicesContent, /<X[^>]*aria-hidden="true"/);
  });

  it('6. Keyboard Navigation & Contrast: Visible focus indicator rules defined in globals.css', () => {
    // Check that globals.css contains high-contrast visible focus indicators for light & dark mode
    assert.match(globalsCss, /:focus-visible/);
    assert.match(globalsCss, /outline:\s*2px\s+solid/);
    assert.match(globalsCss, /#9e1315/i); // Light mode primary brand red
    assert.match(globalsCss, /#ffb4ab/i); // Dark mode high-contrast focus ring
  });

  it('7. Motion: Reduced motion preferences respected across the application', () => {
    // Check media query prefers-reduced-motion exists
    assert.match(globalsCss, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
    // Component headers include motion-reduce:transition-none
    assert.match(exchangeContent, /motion-reduce:transition-none/);
    assert.match(feedContent, /motion-reduce:transition-none/);
    assert.match(servicesContent, /motion-reduce:transition-none/);
  });
});
