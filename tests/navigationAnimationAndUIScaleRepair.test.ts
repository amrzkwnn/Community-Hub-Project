import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('TESDH Community Hub — Smooth Navigation Animations & UI Scale Repair', async (t) => {
  const rootDir = process.cwd();
  const sidebarPath = path.join(rootDir, 'src/components/navigation/Sidebar.tsx');
  const transitionPath = path.join(rootDir, 'src/components/navigation/SectionTransition.tsx');
  const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
  const appContextPath = path.join(rootDir, 'src/lib/context/AppContext.tsx');
  const globalsCssPath = path.join(rootDir, 'src/app/globals.css');

  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const transitionContent = fs.readFileSync(transitionPath, 'utf8');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  const appContextContent = fs.readFileSync(appContextPath, 'utf8');
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');

  await t.test('1. Left Navigation: Single shared sliding active indicator pill', () => {
    // Shared sliding indicator element
    assert.match(
      sidebarContent,
      /data-testid="nav-active-indicator"/,
      'Sidebar must render a single shared active indicator pill with testid'
    );
    assert.match(
      sidebarContent,
      /bg-rose-50\s+dark:bg-rose-950\/40\s+border-l-\[3px\]\s+border-\[#9E1315\]/,
      'Sidebar indicator pill must use brand-approved Sime Darby red accent and container styling'
    );
    assert.match(
      sidebarContent,
      /transform:\s*`translate3d\(0,\s*\$\{indicator\.top\}px,\s*0\)`/,
      'Sidebar indicator must animate vertical position using GPU-accelerated translate3d'
    );
    assert.match(
      sidebarContent,
      /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/,
      'Sidebar indicator must use natural fluid easing cubic-bezier'
    );
    assert.match(
      sidebarContent,
      /240ms/,
      'Sidebar indicator slide duration must be tuned within the 200-300ms window'
    );
    assert.match(
      sidebarContent,
      /scrollIntoView\(\{\s*block:\s*'nearest',\s*behavior:\s*'smooth'\s*\}\)/,
      'Sidebar indicator must ensure active item is scrolled into view when sidebar scrolls'
    );
  });

  await t.test('2. Left Navigation: Accessibility, reduced-motion, and active state truth', () => {
    assert.match(
      sidebarContent,
      /aria-current=\{activeTab === 'home' \? 'page' : undefined\}/,
      'Home button must maintain correct aria-current based on activeTab'
    );
    assert.match(
      sidebarContent,
      /aria-current=\{activeTab === 'feed' \? 'page' : undefined\}/,
      'Community Feed button must maintain correct aria-current based on activeTab'
    );
    assert.match(
      sidebarContent,
      /aria-current=\{activeTab === 'resilience' \? 'page' : undefined\}/,
      'Resilience Map button must maintain correct aria-current based on activeTab'
    );
    assert.match(
      sidebarContent,
      /prefers-reduced-motion/,
      'Sidebar must detect and respect prefers-reduced-motion'
    );
    assert.match(
      sidebarContent,
      /aria-hidden="true"/,
      'Sliding indicator pill must be aria-hidden for assistive screen readers'
    );
  });

  await t.test('3. Section-Switching Animation: Subtle horizontal slide + opacity (180-260ms)', () => {
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
    assert.match(
      transitionContent,
      /key=\{activeTab\}/,
      'SectionTransition must be keyed cleanly by activeTab'
    );

    // CSS keyframes
    assert.match(
      globalsCssContent,
      /@keyframes sectionSlideForward\s*\{\s*from\s*\{\s*opacity:\s*(?:0|0\.85);\s*transform:\s*translateX\(10px\);/i,
      'globals.css must define subtle horizontal forward slide (10px) with smooth fade-in opacity'
    );
    assert.match(
      globalsCssContent,
      /@keyframes sectionSlideBackward\s*\{\s*from\s*\{\s*opacity:\s*(?:0|0\.85);\s*transform:\s*translateX\(-10px\);/i,
      'globals.css must define subtle horizontal backward slide (-10px) with smooth fade-in opacity'
    );
    assert.match(
      globalsCssContent,
      /\.section-slide-forward\s*\{\s*animation:\s*sectionSlideForward\s*(?:210|220)ms/i,
      'Section transition duration must be calibrated within the 180-260ms range'
    );
    assert.match(
      globalsCssContent,
      /\.section-slide-backward\s*\{\s*animation:\s*sectionSlideBackward\s*(?:210|220)ms/i,
      'Section transition duration must be calibrated within the 180-260ms range'
    );
  });

  await t.test('4. UI Scale Repair: Pre-hydration initialization in layout.tsx', () => {
    assert.match(
      layoutContent,
      /localStorage\.getItem\('tesdh-ui-scale'\)/,
      'layout.tsx pre-hydration script must read tesdh-ui-scale from localStorage'
    );
    assert.match(
      layoutContent,
      /document\.documentElement\.setAttribute\('data-ui-scale',\s*scale\)/,
      'layout.tsx pre-hydration script must set data-ui-scale before paint to prevent flashing'
    );
  });

  await t.test('5. UI Scale Repair: Synchronous state & persistence in AppContext', () => {
    assert.match(
      appContextContent,
      /localStorage\.setItem\('tesdh-ui-scale',\s*newScale\)/,
      'AppContext must persist uiScale to localStorage'
    );
    assert.match(
      appContextContent,
      /document\.documentElement\.setAttribute\('data-ui-scale',\s*newScale\)/,
      'setUIScale in AppContext must synchronously set data-ui-scale on documentElement'
    );
  });

  await t.test('6. UI Scale Repair: Universal scaling tokens & arbitrary pixel font rules in globals.css', () => {
    // Presets
    assert.match(
      globalsCssContent,
      /html\[data-ui-scale="compact"\]\s*\{\s*font-size:\s*90%;\s*--ui-scale:\s*0\.9;/i,
      'globals.css must define Compact preset at 90% font-size and --ui-scale: 0.9'
    );
    assert.match(
      globalsCssContent,
      /html\[data-ui-scale="default"\]\s*\{\s*font-size:\s*100%;\s*--ui-scale:\s*1;/i,
      'globals.css must define Default preset at 100% font-size and --ui-scale: 1'
    );
    assert.match(
      globalsCssContent,
      /html\[data-ui-scale="large"\]\s*\{\s*font-size:\s*110%;\s*--ui-scale:\s*1\.1;/i,
      'globals.css must define Large preset at 110% font-size and --ui-scale: 1.1'
    );

    // Arbitrary pixel typography scaling rules
    const keySizes = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '19px', '20px'];
    for (const size of keySizes) {
      assert.ok(
        globalsCssContent.includes(`html[data-ui-scale] .text-\\[${size}\\] { font-size: calc(${size} * var(--ui-scale)) !important; }`),
        `globals.css must scale arbitrary font utility text-[${size}] with var(--ui-scale)`
      );
    }

    // Material symbols icon scaling
    assert.match(
      globalsCssContent,
      /html\[data-ui-scale\]\s*\.material-symbols-outlined\s*\{\s*font-size:\s*calc\(1em\s*\*\s*var\(--ui-scale\)\);/i,
      'globals.css must scale Material Symbols icons proportionally'
    );

    // GIS Leaflet map geometry protection
    assert.match(
      globalsCssContent,
      /\.leaflet-container,\s*\.leaflet-pane,\s*\.leaflet-tile-pane/i,
      'globals.css must safeguard Leaflet map container and panes from geometric distortion'
    );
  });
});
