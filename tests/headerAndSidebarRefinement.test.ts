import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('TESDH Community Hub — Global Header & Sidebar UI Refinement', async (t) => {
  const rootDir = process.cwd();
  const headerPath = path.join(rootDir, 'src/components/navigation/Header.tsx');
  const sidebarPath = path.join(rootDir, 'src/components/navigation/Sidebar.tsx');
  const contactModalPath = path.join(rootDir, 'src/components/common/ContactModal.tsx');
  const appContextPath = path.join(rootDir, 'src/lib/context/AppContext.tsx');
  const settingsPath = path.join(rootDir, 'src/components/settings/SettingsView.tsx');

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const contactModalContent = fs.readFileSync(contactModalPath, 'utf8');
  const appContextContent = fs.readFileSync(appContextPath, 'utf8');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');

  // =========================================================================
  // 1. REMOVE THE ENTIRE "SUPABASE LIVE" STATUS BAR
  // =========================================================================
  await t.test('1. Supabase Live status bar completely removed from visible Header', () => {
    assert.doesNotMatch(
      headerContent,
      /Supabase Live/i,
      'Header must not contain visible "Supabase Live" text'
    );
    assert.doesNotMatch(
      headerContent,
      /Active &amp; Connected Database Schema|Initializing tables/i,
      'Header must not contain live schema status indicators'
    );
    assert.doesNotMatch(
      headerContent,
      /privacyProtected/,
      'Sub-bar dedicated wrapper and status elements must be completely removed'
    );
  });

  // =========================================================================
  // 2. REPLACE THE AUXILIARY POLICE TEXT WITH A "CONTACT US" BUTTON
  // =========================================================================
  await t.test('2. Replace Auxiliary Police text with solid red rectangular Contact Us button', () => {
    // Old auxiliary police badge pill removed from header
    assert.doesNotMatch(
      headerContent,
      /Elmina Auxiliary Police:\s*03-7845 2222/,
      'Old inline auxiliary police text/number badge must be removed from header'
    );

    // Contact Us button present
    assert.match(
      headerContent,
      /Contact Us|contactUs/,
      'Header must render a button labeled Contact Us'
    );

    // Styling checks: red rectangle with gentle radius (8-10px / rounded-lg), not pill-shaped
    const allButtons = headerContent.match(/<button[\s\S]*?<\/button>/g) || [];
    const contactBtnMatch = allButtons.filter((b) => b.includes('setIsContactModalOpen(true)'));
    assert.ok(contactBtnMatch.length > 0, 'Contact Us button must be rendered');
    assert.match(contactBtnMatch[0], /rounded-lg/, 'Contact Us button must use rounded-lg (approx 8-10px radius)');
    assert.match(contactBtnMatch[0], /bg-\[#9E1315\]/, 'Contact Us button must use Sime Darby heritage red #9E1315');
    assert.doesNotMatch(contactBtnMatch[0], /rounded-full/, 'Contact Us button must not be pill-shaped (rounded-full)');

    // Contact Modal contains official verified contacts
    assert.match(
      contactModalContent,
      /03-7845 2222/,
      'Contact Modal must preserve Elmina Auxiliary Police 24/7 hotline 03-7845 2222'
    );
    assert.match(
      contactModalContent,
      /03-7832 1100/,
      'Contact Modal must provide Elmina Township Management Office number 03-7832 1100'
    );
    assert.match(
      contactModalContent,
      /tel:0378452222/,
      'Contact Modal must provide functional click-to-call telephone link'
    );
  });

  // =========================================================================
  // 3. REDESIGN PROFILE SELECTION AS A ROUNDED RECTANGLE
  // =========================================================================
  await t.test('3. Profile selection control redesigned as rounded rectangular box', () => {
    // Must use rounded-xl (10-12px) instead of rounded-full
    assert.match(
      headerContent,
      /roleMenuOpen[\s\S]*?rounded-xl/,
      'Profile selection trigger button must use rounded-xl (~10-12px radius)'
    );
    assert.doesNotMatch(
      headerContent,
      /setRoleMenuOpen\(!roleMenuOpen\)[\s\S]*?rounded-full border/,
      'Profile selection container button must not be pill-shaped (rounded-full)'
    );
    // Preserves profile avatar and chevron
    assert.match(
      headerContent,
      /currentUser\.avatarUrl/,
      'Profile selection must retain the user avatar image'
    );
    assert.match(
      headerContent,
      /ChevronDown/,
      'Profile selection must retain dropdown chevron indicator'
    );
  });

  // =========================================================================
  // 4. MOVE THE SIGN IN BUTTON INTO PROFILE SELECTION
  // =========================================================================
  await t.test('4. Standalone Sign In removed from Header bar; moved to bottom of profile dropdown', () => {
    // Standalone sign-in removed from header cluster
    assert.doesNotMatch(
      headerContent,
      /NotificationCenter[\s\S]*?setIsAuthModalOpen\(true\)[\s\S]*?roleMenuRef/,
      'Standalone Sign In button must be removed from between notifications and profile'
    );

    // Profile menu includes divider and auth action at bottom
    assert.match(
      headerContent,
      /<hr\s+className="[^"]*border-[^"]*"\s*\/>[\s\S]*?(?:signOut|setIsAuthModalOpen)/,
      'Profile dropdown must feature a divider above the authentication action at bottom'
    );
    assert.match(
      headerContent,
      /supabaseUser\s*\?\s*\([\s\S]*?signOut[\s\S]*?\)\s*:\s*\([\s\S]*?setIsAuthModalOpen\(true\)/,
      'Profile dropdown must display Sign Out when signed in, and Sign In when signed out'
    );
  });

  // =========================================================================
  // 5. MAKE THE UPPER HEADER TRANSPARENT WITH BACKGROUND BLUR
  // =========================================================================
  await t.test('5. Header applies transparent background with backdrop blur without blurring controls', () => {
    assert.match(
      headerContent,
      /backdrop-blur-md/,
      'Header must utilize backdrop-blur-md for modern translucent glassmorphic effect'
    );
    assert.match(
      headerContent,
      /bg-white\/75|bg-white\/80/,
      'Header background must be transparent / semi-translucent'
    );
    assert.doesNotMatch(
      headerContent,
      /filter:\s*blur/,
      'Header foreground must not have direct CSS blur filter applied'
    );
  });

  // =========================================================================
  // 6. REMOVE INTERFACE MODE FROM THE LEFT SIDEBAR
  // =========================================================================
  await t.test('6. Interface Mode removed from left sidebar while preserved in Settings', () => {
    assert.doesNotMatch(
      sidebarContent,
      /Interface Mode/i,
      'Left sidebar must not contain the Interface Mode heading or label'
    );
    assert.doesNotMatch(
      sidebarContent,
      /aria-label="Light mode"|aria-label="System mode"|aria-label="Dark mode"/,
      'Left sidebar must not contain theme switcher controls'
    );

    // Settings -> Appearance retains theme controls
    assert.match(
      settingsContent,
      /handleThemeChange/,
      'SettingsView must retain handleThemeChange'
    );
    assert.match(
      settingsContent,
      /handleThemeChange\('light'\)|handleThemeChange\('dark'\)|handleThemeChange\('system'\)/,
      'SettingsView must allow switching between Light, Dark, and System modes'
    );
  });

  // =========================================================================
  // 7. MAKE THE LEFT SIDEBAR COLLAPSIBLE WITH SLIDE ANIMATION
  // =========================================================================
  await t.test('7. Left sidebar collapsible with slide animation and toggle control', () => {
    // Header toggle button
    assert.match(
      headerContent,
      /toggleSidebar/,
      'Header must provide a toggle button that controls sidebar collapse'
    );
    assert.match(
      headerContent,
      /aria-label=\{isSidebarCollapsed \? "Expand navigation sidebar" : "Collapse navigation sidebar"\}/,
      'Sidebar toggle must include descriptive accessibility aria-label'
    );
    assert.match(
      headerContent,
      /PanelLeft|PanelLeftClose/,
      'Sidebar toggle must display appropriate panel expand/collapse icons'
    );

    // Sidebar smooth width transition and translation
    assert.match(
      sidebarContent,
      /isSidebarCollapsed\s*\?\s*'w-0 border-r-0 overflow-hidden pointer-events-none'\s*:\s*'w-60/,
      'Desktop sidebar must transition width from w-60 to w-0 without leaving blank gutter'
    );
    assert.match(
      sidebarContent,
      /-translate-x-full/,
      'Desktop sidebar content must translate out to the left edge when collapsing'
    );
    assert.match(
      sidebarContent,
      /280ms/,
      'Sidebar slide duration must be tuned within the 250-320ms specification'
    );

    // AppContext provides hydration-safe collapsed state
    assert.match(
      appContextContent,
      /isSidebarCollapsed/,
      'AppContext must provide isSidebarCollapsed state'
    );
    assert.match(
      appContextContent,
      /localStorage\.getItem\('tesdh-sidebar-collapsed'\)/,
      'Sidebar collapsed state must be persisted safely on client mount'
    );
  });

  // =========================================================================
  // 8. TOP-LEFT BRANDING UPDATED TO SINGLE-LINE "COMMUNITY HUB"
  // =========================================================================
  await t.test('8. Top-left navigation branding updated to Community Hub without subtitle', () => {
    // Header branding
    assert.match(
      headerContent,
      /<span[^>]*>\s*(?:NadiKomuniti|Community Hub)\s*<\/span>|NadiKomuniti/,
      'Header must display approved branding title ("NadiKomuniti" or "Community Hub")'
    );
    assert.doesNotMatch(
      headerContent,
      /TESDH Hub/,
      'Header must no longer contain "TESDH Hub"'
    );
    assert.doesNotMatch(
      headerContent,
      /City of Elmina<\/span>/,
      'Header branding must not contain "City of Elmina" subtitle'
    );

    // Sidebar branding (desktop and mobile)
    assert.match(
      sidebarContent,
      /<span[^>]*>\s*(?:NadiKomuniti|Community Hub)\s*<\/span>|NadiKomuniti/,
      'Sidebar must display approved branding title ("NadiKomuniti" or "Community Hub")'
    );
    assert.doesNotMatch(
      sidebarContent,
      /TESDH Hub/,
      'Sidebar must no longer contain "TESDH Hub"'
    );
    assert.doesNotMatch(
      sidebarContent,
      /City of Elmina<\/span>/,
      'Sidebar branding must not contain "City of Elmina" subtitle'
    );
  });

  // =========================================================================
  // 9. COLLAPSED SIDEBAR BRANDING BEHAVIOR & TRANSITION SYNCHRONIZATION
  // =========================================================================
  await t.test('9. Collapsed sidebar fully hides branding without icon-only rail or duplicate popping', () => {
    // Desktop branding is contained exclusively in the sliding sidebar container
    assert.match(
      headerContent,
      /className="flex\s+lg:hidden\s+items-center\s+gap-2\.5/,
      'Header branding must only be displayed on mobile (flex lg:hidden) to avoid duplicate popping on desktop'
    );

    // Sidebar fully collapses to w-0 without remaining gutter or icon-only state
    assert.match(
      sidebarContent,
      /isSidebarCollapsed\s*\?\s*'w-0\s+border-r-0\s+overflow-hidden\s+pointer-events-none'/,
      'Collapsed sidebar must completely collapse to width 0 with overflow-hidden and pointer-events-none'
    );

    // Sidebar inner content translates -translate-x-full simultaneously
    assert.match(
      sidebarContent,
      /isSidebarCollapsed\s*\?\s*'-translate-x-full'\s*:\s*'translate-x-0'/,
      'Sidebar contents must translate out of view synchronously without text wrapping'
    );

    // Sidebar toggle button remains permanently accessible in header
    assert.match(
      headerContent,
      /PanelLeft|PanelLeftClose/,
      'Header toggle button must remain accessible at all times to reopen sidebar'
    );
  });
});

