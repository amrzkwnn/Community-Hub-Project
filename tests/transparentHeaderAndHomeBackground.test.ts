import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('TESDH Community Hub — Transparent Header with Progressive Fade-Out Blur & High-Quality Home Background', async (t) => {
  const rootDir = process.cwd();
  const headerPath = path.join(rootDir, 'src/components/navigation/Header.tsx');
  const homeViewPath = path.join(rootDir, 'src/components/home/HomeView.tsx');
  const pagePath = path.join(rootDir, 'src/app/page.tsx');
  const bgImagePath = path.join(rootDir, 'public/images/elmina-township-bg.png');

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // =========================================================================
  // 1. DEDICATED PROGRESSIVE FADING BACKDROP BLUR HEADER
  // =========================================================================
  await t.test('1. Header uses dedicated backdrop layer with progressive blur mask', () => {
    // Header should be positioned absolute to float over background content
    assert.match(
      headerContent,
      /absolute\s+top-0\s+left-0\s+right-0\s+z-30/,
      'Header must be positioned absolute top-0 across the top of the viewport'
    );

    // Header must have a dedicated background layer separate from controls
    assert.match(
      headerContent,
      /aria-hidden="true"\s+className="absolute inset-x-0 top-0 h-\[\d+px\] pointer-events-none/,
      'Header must render a dedicated pointer-events-none background layer'
    );

    // Multi-tier progressive backdrop blur implementation
    assert.match(
      headerContent,
      /backdrop-blur-\[18px\]/,
      'Header background must apply strong upper backdrop blur (~18px)'
    );
    assert.match(
      headerContent,
      /backdrop-blur-md/,
      'Header background must apply medium transition backdrop blur (~12px)'
    );

    // Vertical mask gradient fading the blur downward to zero
    assert.match(
      headerContent,
      /maskImage:\s*'linear-gradient\(to bottom,/,
      'Header backdrop must apply maskImage linear-gradient fading downward'
    );
    assert.match(
      headerContent,
      /WebkitMaskImage:\s*'linear-gradient\(to bottom,/,
      'Header backdrop must apply WebkitMaskImage for Safari/WebKit compatibility'
    );

    // Downward fading tint gradient
    assert.match(
      headerContent,
      /bg-gradient-to-b\s+from-white\/80\s+via-white\/\d+\s+to-transparent/,
      'Header must apply a downward-fading semi-translucent gradient tint'
    );

    // Avoid hard edges: no solid dividing border line on header container
    assert.doesNotMatch(
      headerContent,
      /<header[^>]*border-b\s+border-slate/,
      'Header container must not have a solid border-b dividing line'
    );
  });

  // =========================================================================
  // 2. SHARP FOREGROUND CONTROLS
  // =========================================================================
  await t.test('2. Header controls layer is completely separate, sharp, and interactive', () => {
    // Sharp controls layer with pointer-events-auto
    assert.match(
      headerContent,
      /relative\s+z-10[^"]*pointer-events-auto/,
      'Navigation controls must reside in a separate z-10 pointer-events-auto container'
    );

    // No blur filter applied to parent container or foreground
    assert.doesNotMatch(
      headerContent,
      /filter:\s*blur/,
      'No CSS filter: blur() should be applied to header controls'
    );

    // Essential interactive controls present and intact
    assert.match(headerContent, /toggleSidebar/, 'Sidebar toggle present');
    assert.match(headerContent, /<GlobalSearch\s*\/>/, 'Global search present');
    assert.match(headerContent, /setIsContactModalOpen\(true\)/, 'Contact Us button present');
    assert.match(headerContent, /<NotificationCenter\s*\/>/, 'Notification center present');
    assert.match(headerContent, /roleMenuRef/, 'Profile menu present');
  });

  // =========================================================================
  // 3. HIGH-RESOLUTION CONTINUOUS TOWNSHIP BACKGROUND
  // =========================================================================
  await t.test('3. Home background uses high-resolution asset without artificial blur', () => {
    // Image file must exist locally
    assert.ok(fs.existsSync(bgImagePath), 'High-resolution image file public/images/elmina-township-bg.png must exist');

    const stats = fs.statSync(bgImagePath);
    // Original asset is ~3.06 MB
    assert.ok(stats.size > 2_000_000, `Image file size should be > 2MB (actual: ${stats.size} bytes)`);

    // Verify PNG header dimensions (1728 x 1080)
    const buf = fs.readFileSync(bgImagePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.equal(width, 1728, 'Master image width must be 1728 pixels');
    assert.equal(height, 1080, 'Master image height must be 1080 pixels');

    // HomeView references local high-resolution asset
    assert.match(
      homeViewContent,
      /backgroundImage:\s*"url\('\/images\/elmina-township-bg\.png'\)"/,
      'HomeView must reference the local high-resolution township background image'
    );

    // Single continuous photo canvas (no repeated or tiled background)
    assert.match(
      homeViewContent,
      /bg-cover\s+bg-top\s+bg-no-repeat/,
      'Home background must use bg-cover bg-top bg-no-repeat for single continuous coverage'
    );

    // Artificial upper backdrop blur removed from HomeView
    assert.doesNotMatch(
      homeViewContent,
      /backdrop-blur-\[5px\]/,
      'Artificial backdrop-blur-[5px] must be removed from HomeView background'
    );

    // Top clearance ensures Welcome text sits comfortably below transparent header
    assert.match(
      homeViewContent,
      /pt-20\s+px-6/,
      'HomeView content container must have pt-20 for header clearance'
    );
  });

  // =========================================================================
  // 4. MAIN VIEW SHELL SEAMLESS FLOW
  // =========================================================================
  await t.test('4. Main View Shell allows HomeView to extend under transparent header', () => {
    // page.tsx main container has relative shell
    assert.match(
      pageContent,
      /Main View Shell[^>]*relative/,
      'Main View Shell must be relative to anchor the absolute header'
    );

    // Conditional padding for non-home views
    assert.match(
      pageContent,
      /activeTab === 'home' \? '' : 'pt-16'/,
      'page.tsx must provide pt-16 for non-home views while allowing home to flow to top: 0'
    );
  });
});
