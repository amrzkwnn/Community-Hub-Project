import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Home Section & Interactive Navigation', () => {
  const homeViewPath = path.join(process.cwd(), 'src/components/home/HomeView.tsx');
  const sidebarPath = path.join(process.cwd(), 'src/components/navigation/Sidebar.tsx');
  const bottomNavPath = path.join(process.cwd(), 'src/components/navigation/BottomNav.tsx');
  const pagePath = path.join(process.cwd(), 'src/app/page.tsx');
  const appContextPath = path.join(process.cwd(), 'src/lib/context/AppContext.tsx');
  const feedViewPath = path.join(process.cwd(), 'src/components/feed/FeedView.tsx');
  const globalsCssPath = path.join(process.cwd(), 'src/app/globals.css');
  const transitionPath = path.join(process.cwd(), 'src/components/navigation/SectionTransition.tsx');

  test('1. Home is configured as default activeTab in AppContext and page shell', () => {
    const appContextContent = fs.readFileSync(appContextPath, 'utf8');
    assert.match(
      appContextContent,
      /useState<string>\('home'\)/,
      'AppContext default activeTab must be "home"'
    );

    const pageContent = fs.readFileSync(pagePath, 'utf8');
    assert.match(
      pageContent,
      /<HomeView\s*\/>/,
      'page.tsx must render HomeView when activeTab is "home"'
    );
    assert.match(
      pageContent,
      /activeTab === 'home' && <HomeView \/>/,
      'HomeView must be the first view rendered in page.tsx'
    );
  });

  test('2. Home is the first item in Sidebar desktop rail and BottomNav mobile navigation', () => {
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    assert.match(
      sidebarContent,
      /setActiveTab\('home'\)/,
      'Sidebar must have navigation action to "home"'
    );
    assert.match(
      sidebarContent,
      /nav-icon-home/,
      'Sidebar Home button must include nav-icon-home microinteraction'
    );

    const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');
    assert.match(
      bottomNavContent,
      /setActiveTab\('home'\)/,
      'BottomNav must include Home tab'
    );
    assert.match(
      bottomNavContent,
      /justify-around|grid-cols-6/,
      'BottomNav must accommodate Home in Stitch mobile layout'
    );
  });

  test('3. HomeView contains exact required heading and simplified header without subtitle', () => {
    const homeContent = fs.readFileSync(homeViewPath, 'utf8');
    assert.ok(
      homeContent.includes('Welcome to Your Community'),
      'HomeView must contain exact heading: "Welcome to Your Community"'
    );
    assert.strictEqual(
      homeContent.includes("Stay connected, lend a hand and discover what's happening around Elmina.") ||
      homeContent.includes("Stay connected, lend a hand and discover what&apos;s happening around Elmina."),
      false,
      'HomeView header must be simplified without subtitle text'
    );
  });

  test('4. All 5 Feature Navigation Cards exist with required descriptions and destinations', () => {
    const homeContent = fs.readFileSync(homeViewPath, 'utf8');

    // Community Feed Card
    assert.ok(
      homeContent.includes('Community Feed'),
      'Must contain Community Feed feature card'
    );
    assert.ok(
      homeContent.includes('See what your neighbours are talking about.'),
      'Must contain exact description: "See what your neighbours are talking about."'
    );
    assert.match(
      homeContent,
      /handleCardClick\('feed'\)/,
      'Community Feed card must navigate to "feed"'
    );

    // Resilience Map Card
    assert.ok(
      homeContent.includes('Resilience Map'),
      'Must contain Resilience Map feature card'
    );
    assert.ok(
      homeContent.includes('Spot local issues and help keep the community safe.'),
      'Must contain exact description: "Spot local issues and help keep the community safe."'
    );
    assert.match(
      homeContent,
      /handleCardClick\('resilience'\)/,
      'Resilience Map card must navigate to "resilience"'
    );

    // Exchange Card
    assert.ok(
      homeContent.includes('Exchange'),
      'Must contain Exchange feature card'
    );
    assert.ok(
      homeContent.includes('Give useful items a second life.'),
      'Must contain exact description: "Give useful items a second life."'
    );
    assert.match(
      homeContent,
      /handleCardClick\('exchange'\)/,
      'Exchange card must navigate to "exchange"'
    );

    // Local Services Card
    assert.ok(
      homeContent.includes('Local Services'),
      'Must contain Local Services feature card'
    );
    assert.ok(
      homeContent.includes('Find help nearby or lend a hand.'),
      'Must contain exact description: "Find help nearby or lend a hand."'
    );
    assert.match(
      homeContent,
      /handleCardClick\('services'\)/,
      'Local Services card must navigate to "services"'
    );

    // Messages Card
    assert.ok(
      homeContent.includes('Messages'),
      'Must contain Messages feature card'
    );
    assert.ok(
      homeContent.includes('Connect privately with your neighbours.'),
      'Must contain exact description: "Connect privately with your neighbours."'
    );
    assert.match(
      homeContent,
      /handleCardClick\('messages'\)/,
      'Secure Messages card must navigate to "messages"'
    );

    // Center-focused 3D perspective carousel layout and controls
    assert.match(
      homeContent,
      /carousel-perspective/,
      'Feature cards must be presented in a center-focused 3D perspective stage'
    );
    assert.match(
      homeContent,
      /carousel-stage-card/,
      'Feature cards must have carousel-stage-card 3D perspective styling'
    );
    assert.match(
      homeContent,
      /aria-label="Previous feature"/,
      'Carousel must include previous navigation control on the far left'
    );
    assert.match(
      homeContent,
      /aria-label="Next feature"/,
      'Carousel must include next navigation control on the far right'
    );
    assert.match(
      homeContent,
      /aria-label="Feature Carousel Navigation"/,
      'Carousel must include centered pagination indicators'
    );
  });

  test('5. Cards are keyboard accessible with Enter/Space handling and role="button"', () => {
    const homeContent = fs.readFileSync(homeViewPath, 'utf8');
    assert.match(
      homeContent,
      /role="button"/,
      'Feature cards must have role="button"'
    );
    assert.match(
      homeContent,
      /tabIndex=\{0\}/,
      'Feature cards must be keyboard focusable with tabIndex={0}'
    );
    assert.match(
      homeContent,
      /handleCardKeyDown/,
      'Feature cards must handle Enter and Space key navigation'
    );
  });

  test('6. Home cleanup: Township card and Weather/AQI widgets removed; Notices & Events retained in 2-column layout', () => {
    const homeContent = fs.readFileSync(homeViewPath, 'utf8');

    // Township & Weather / AQI cards must NOT be on Home
    assert.ok(
      !homeContent.includes('City of Elmina Township</h2>') &&
      !homeContent.includes('City of Elmina Township\n'),
      'City of Elmina Township card must be removed from Home'
    );
    assert.ok(
      !homeContent.includes('31°C'),
      'Weather widget (31°C) must be removed from Home'
    );
    assert.ok(
      !homeContent.includes('AQI 42'),
      'Air Quality Index widget (AQI 42) must be removed from Home'
    );

    // Official Notices retained
    assert.ok(
      homeContent.includes('Official Notices'),
      'Must retain Official Notices section'
    );
    assert.match(
      homeContent,
      /selectedNoticeModal/,
      'Must retain notice modal viewer'
    );

    // Upcoming Events retained
    assert.ok(
      homeContent.includes('Upcoming Events'),
      'Must retain Upcoming Events section'
    );
    assert.match(
      homeContent,
      /selectedEventModal/,
      'Must retain event modal viewer'
    );
    assert.match(
      homeContent,
      /toggleRsvpEvent/,
      'Must support interactive RSVP toggle'
    );

    // Rebalanced 2-column supporting grid
    assert.match(
      homeContent,
      /md:grid-cols-2/,
      'Supporting layout must be rebalanced to a 2-column grid without empty gaps'
    );
  });

  test('7. Duplicated right sidebar has been removed from FeedView to avoid duplication', () => {
    const feedContent = fs.readFileSync(feedViewPath, 'utf8');
    assert.ok(
      !feedContent.includes('RIGHT TOWNSHIP CONTEXT ASIDE'),
      'FeedView must not contain duplicated township context aside'
    );
    assert.ok(
      !feedContent.includes('w-[320px] shrink-0 h-full overflow-y-auto'),
      'FeedView must not contain 320px sidebar aside'
    );
  });

  test('8. Sliding SectionTransition is implemented and respects prefers-reduced-motion', () => {
    const transitionContent = fs.readFileSync(transitionPath, 'utf8');
    assert.match(
      transitionContent,
      /section-slide-forward/,
      'SectionTransition must support forward sliding'
    );
    assert.match(
      transitionContent,
      /section-slide-backward/,
      'SectionTransition must support backward sliding'
    );

    const cssContent = fs.readFileSync(globalsCssPath, 'utf8');
    assert.match(
      cssContent,
      /@keyframes sectionSlideForward/,
      'globals.css must define sectionSlideForward keyframe'
    );
    assert.match(
      cssContent,
      /@keyframes sectionSlideBackward/,
      'globals.css must define sectionSlideBackward keyframe'
    );
    assert.match(
      cssContent,
      /@media \(prefers-reduced-motion: reduce\)/,
      'globals.css must respect prefers-reduced-motion'
    );
  });

  test('9. UI Scale settings (Compact 90%, Default 100%, Large 110%) are implemented across tokens, context and settings', () => {
    const settingsPath = path.join(process.cwd(), 'src/components/settings/SettingsView.tsx');
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    const appContextContent = fs.readFileSync(appContextPath, 'utf8');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

    // AppContext UI scale support & persistence
    assert.match(
      appContextContent,
      /uiScale:\s*UIScalePreset/,
      'AppContext must provide uiScale state'
    );
    assert.match(
      appContextContent,
      /tesdh-ui-scale/,
      'AppContext must persist uiScale to localStorage'
    );
    assert.match(
      appContextContent,
      /setAttribute\('data-ui-scale',\s*uiScale\)/,
      'AppContext must synchronize data-ui-scale on documentElement'
    );

    // CSS scaling design tokens
    assert.match(
      cssContent,
      /html\[data-ui-scale="compact"\]\s*\{\s*font-size:\s*90%;/i,
      'globals.css must define Compact preset at 90% font-size'
    );
    assert.match(
      cssContent,
      /html\[data-ui-scale="default"\]\s*\{\s*font-size:\s*100%;/i,
      'globals.css must define Default preset at 100% font-size'
    );
    assert.match(
      cssContent,
      /html\[data-ui-scale="large"\]\s*\{\s*font-size:\s*110%;/i,
      'globals.css must define Large preset at 110% font-size'
    );

    // SettingsView controls
    assert.ok(
      settingsContent.includes('UI Scale'),
      'SettingsView must contain UI Scale configuration section'
    );
    assert.ok(
      settingsContent.includes('Compact'),
      'SettingsView must provide Compact preset option'
    );
    assert.ok(
      settingsContent.includes('Default'),
      'SettingsView must provide Default preset option'
    );
    assert.ok(
      settingsContent.includes('Large'),
      'SettingsView must provide Large preset option'
    );
    assert.ok(
      settingsContent.includes('Adjust the size of interface elements while keeping layouts readable and consistent.'),
      'SettingsView must contain exact UI Scale description'
    );
  });
});
