import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_PROFILES } from '../src/lib/data/mockData.ts';

test('TESDH Community Hub — Demo Account Switching & Permission Verification', async (t) => {
  const rootDir = process.cwd();
  const headerPath = path.join(rootDir, 'src/components/navigation/Header.tsx');
  const appContextPath = path.join(rootDir, 'src/lib/context/AppContext.tsx');
  const messagesPath = path.join(rootDir, 'src/components/messages/MessagesView.tsx');
  const profileModalPath = path.join(rootDir, 'src/components/common/ProfileModal.tsx');
  const managementPath = path.join(rootDir, 'src/components/management/ManagementView.tsx');

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const appContextContent = fs.readFileSync(appContextPath, 'utf8');
  const messagesContent = fs.readFileSync(messagesPath, 'utf8');
  const profileModalContent = fs.readFileSync(profileModalPath, 'utf8');
  const managementContent = fs.readFileSync(managementPath, 'utf8');

  // =========================================================================
  // 1. CANONICAL DEMO ACCOUNTS CONFIGURATION
  // =========================================================================
  await t.test('1. Canonical demo profiles exist with required test personas', () => {
    assert.strictEqual(Array.isArray(INITIAL_PROFILES), true, 'INITIAL_PROFILES must be an array');
    assert.ok(INITIAL_PROFILES.length >= 4, 'Must have at least 4 canonical demo profiles');

    const nurul = INITIAL_PROFILES.find((p) => p.id === 'user-nurul');
    const vikram = INITIAL_PROFILES.find((p) => p.id === 'user-vikram');
    const azman = INITIAL_PROFILES.find((p) => p.id === 'user-azman');
    const rosli = INITIAL_PROFILES.find((p) => p.id === 'user-rosli');

    assert.ok(nurul, 'Demo resident Nurul must be configured');
    assert.strictEqual(nurul.role, 'resident');
    assert.ok(nurul.avatarUrl, 'Nurul must have a configured avatar image');

    assert.ok(vikram, 'Demo resident Vikram must be configured');
    assert.strictEqual(vikram.role, 'resident');

    assert.ok(azman, 'Demo management Capt Azman must be configured');
    assert.strictEqual(azman.role, 'management');

    assert.ok(rosli, 'Demo security Sergeant Rosli must be configured');
    assert.strictEqual(rosli.role, 'security');
  });

  // =========================================================================
  // 2. HEADER PROFILE SELECTION DROPDOWN DESIGN & INTERACTION
  // =========================================================================
  await t.test('2. Header dropdown renders canonical demo accounts with active account indicator', () => {
    // Header imports INITIAL_PROFILES
    assert.match(
      headerContent,
      /import\s+\{\s*INITIAL_PROFILES\s*\}\s+from\s+['"]@\/lib\/data\/mockData['"]/,
      'Header must import INITIAL_PROFILES for deterministic demo account switching'
    );

    // Header renders demo profiles
    assert.match(
      headerContent,
      /profilesToRender\.map\(\(p\)\s*=>/,
      'Header must map over demo profiles to render switcher options'
    );

    // Active account indicator & aria-selected
    assert.match(
      headerContent,
      /aria-selected=\{isSelected\}/,
      'Each demo profile button must declare accessibility aria-selected state'
    );
    assert.match(
      headerContent,
      /isSelected\s*\?\s*['"][^'"]*bg-rose-50/,
      'Active account must be visually styled differently to indicate selection'
    );

    // Stacking context and clickability
    assert.match(
      headerContent,
      /ref=\{roleMenuRef\}\s+className="[^"]*z-50/,
      'Profile menu container must have z-50 stacking'
    );
    assert.match(
      headerContent,
      /pointer-events-auto animate-in/,
      'Dropdown menu must explicitly enable pointer events'
    );
  });

  await t.test('3. Header click handling prevents outside-click event races', () => {
    // handleClickOutside must verify roleMenuRef containment and composedPath
    assert.match(
      headerContent,
      /roleMenuRef\.current\.contains\(target\)/,
      'Outside click listener must verify target containment'
    );
    assert.match(
      headerContent,
      /event\.composedPath\(\)\.includes\(roleMenuRef\.current\)/,
      'Outside click listener must check composedPath to prevent race on detached DOM nodes'
    );

    // Click handler stops propagation
    assert.match(
      headerContent,
      /e\.stopPropagation\(\);[\s\S]*?switchProfile\(p\.id\);[\s\S]*?setRoleMenuOpen\(false\);/,
      'Demo account selection must stop event propagation to avoid premature menu cancellation'
    );
  });

  // =========================================================================
  // 3. APPLICATION CONTEXT SWITCHING & PERMISSION GUARDS
  // =========================================================================
  await t.test('4. AppContext preserves canonical demo accounts during Supabase synchronization', () => {
    assert.match(
      appContextContent,
      /const merged = \[\.\.\.INITIAL_PROFILES\]/,
      'AppContext must never discard INITIAL_PROFILES when merging remote public_profiles'
    );
  });

  await t.test('5. switchProfile persists selection and isolates Supabase sessions', () => {
    // Key definition
    assert.match(
      appContextContent,
      /const ACTIVE_PROFILE_CACHE_KEY = 'tesdh-active-profile-id';/,
      'AppContext must declare ACTIVE_PROFILE_CACHE_KEY'
    );

    // Persistence on switch
    assert.match(
      appContextContent,
      /localStorage\.setItem\(ACTIVE_PROFILE_CACHE_KEY,\s*selected\.id\)/,
      'switchProfile must persist the selected demo profile ID to localStorage'
    );

    // Client mount restoration
    assert.match(
      appContextContent,
      /localStorage\.getItem\(ACTIVE_PROFILE_CACHE_KEY\)/,
      'AppContext must restore active demo profile from localStorage on client mount'
    );

    // Session isolation: clean signOut if Supabase session is present
    assert.match(
      appContextContent,
      /if\s*\(\s*supabaseUser\s*\)\s*\{[\s\S]*?supabase\.auth\.signOut\(\)/,
      'switchProfile must sign out any active Supabase user session to avoid credential/token leakage'
    );

    // Redirect out of management tab if switching to resident
    assert.match(
      appContextContent,
      /if\s*\(\s*selected\.role\s*!==\s*'management'\s*&&\s*activeTab\s*===\s*'management'\s*\)\s*\{[\s\S]*?(?:handleSetActiveTab|setActiveTab)\('home'\)/,
      'switchProfile must redirect non-management profiles away from management tab'
    );

    // Robust error handling when profile is not found
    assert.match(
      appContextContent,
      /if\s*\(\s*!selected\s*\)\s*\{[\s\S]*?addNotification\(/,
      'switchProfile must alert the user if an invalid profile ID is requested'
    );
  });

  // =========================================================================
  // 4. PREVENTING STALE ACCOUNT DATA IN VIEWS
  // =========================================================================
  await t.test('6. MessagesView resets active conversation and composer on account switch', () => {
    assert.match(
      messagesContent,
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?setActiveConversationId[\s\S]*?setIsDossierOpen\(false\)[\s\S]*?setAttachedFile\(null\)/,
      'MessagesView must reset conversation ID, dossier, and file attachment states when currentUser changes'
    );
  });

  await t.test('7. ProfileModal resets form state on user switch and modal open', () => {
    assert.match(
      profileModalContent,
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?setDisplayName\(currentUser\.displayName[\s\S]*?\}, \[\s*isProfileModalOpen,\s*currentUser\s*\]\)/,
      'ProfileModal must reset form state when currentUser changes or modal opens'
    );
  });

  // =========================================================================
  // 5. ROLE-BASED MANAGEMENT CONSOLE SWITCHING
  // =========================================================================
  await t.test('8. ManagementView provides functional switchProfile to user-azman', () => {
    assert.match(
      managementContent,
      /switchProfile\('user-azman'\)/,
      'ManagementView must call switchProfile("user-azman") on restricted access screen'
    );
  });
});
