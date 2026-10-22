import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('TESDH Community Hub — Content Fade-In & Community Feed Dark Mode Fix', async (t) => {
  const globalsCssPath = path.resolve('src/app/globals.css');
  const feedViewPath = path.resolve('src/components/feed/FeedView.tsx');
  const imageUploadPath = path.resolve('src/components/common/ImageUploadArea.tsx');
  const sectionTransitionPath = path.resolve('src/components/navigation/SectionTransition.tsx');

  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
  const feedView = fs.readFileSync(feedViewPath, 'utf8');
  const imageUpload = fs.readFileSync(imageUploadPath, 'utf8');
  const sectionTransition = fs.readFileSync(sectionTransitionPath, 'utf8');

  await t.test('1. Section-Switching Content Fade-In Animation', () => {
    // Both forward and backward keyframes must include opacity fade-in from 0 to 1
    assert.match(
      globalsCss,
      /@keyframes\s+sectionSlideForward\s*\{[\s\S]*?from\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?\}[\s\S]*?to\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?\}/,
      'sectionSlideForward must animate opacity from 0 to 1'
    );
    assert.match(
      globalsCss,
      /@keyframes\s+sectionSlideBackward\s*\{[\s\S]*?from\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?\}[\s\S]*?to\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?\}/,
      'sectionSlideBackward must animate opacity from 0 to 1'
    );

    // Timing should be between 180ms and 260ms (220ms chosen) with natural cubic bezier easing
    assert.match(
      globalsCss,
      /\.section-slide-forward\s*\{[\s\S]*?animation:\s*sectionSlideForward\s+(?:1[8-9]\d|2[0-6]\d)ms\s+cubic-bezier/,
      'Forward animation duration must be between 180ms and 260ms'
    );
    assert.match(
      globalsCss,
      /\.section-slide-backward\s*\{[\s\S]*?animation:\s*sectionSlideBackward\s+(?:1[8-9]\d|2[0-6]\d)ms\s+cubic-bezier/,
      'Backward animation duration must be between 180ms and 260ms'
    );

    // SectionTransition animates only the main content container
    assert.match(
      sectionTransition,
      /section-slide-forward|section-slide-backward/,
      'SectionTransition component applies the directional slide + fade animation'
    );

    // prefers-reduced-motion must disable transitions and force opacity 1 without transform
    assert.match(
      globalsCss,
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?opacity:\s*1\s*!important/,
      'Reduced motion query must ensure opacity: 1 !important'
    );
    assert.match(
      globalsCss,
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?transform:\s*none\s*!important/,
      'Reduced motion query must disable transform'
    );
  });

  await t.test('2. Community Feed Dark Mode: Core Cards, Composer, and Posts', () => {
    // Quick composer card has dark theme surface
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800/,
      'Quick composer card must feature dark background and border'
    );

    // Post composer trigger input button
    assert.match(
      feedView,
      /dark:bg-slate-800\/60[\s\S]*?dark:border-slate-700[\s\S]*?dark:text-slate-400/,
      'Composer trigger input button must adapt to dark mode'
    );

    // Civic Alert cards (both verified dynamic and fallback alert)
    assert.match(
      feedView,
      /dark:border-rose-950\/80/,
      'Civic Alert cards must have dark border styling'
    );
    assert.match(
      feedView,
      /dark:bg-stone-900\/60[\s\S]*?dark:border-stone-800[\s\S]*?dark:text-slate-300/,
      'Civic Alert operations inner highlight must have dark styling'
    );

    // Post cards have dark surface and border
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800[\s\S]*?dark:hover:border-slate-700/,
      'Post cards must feature dark surface and hover borders'
    );

    // Post dropdown menu
    assert.match(
      feedView,
      /dark:bg-\[#1C2025\][\s\S]*?dark:border-slate-700[\s\S]*?dark:text-slate-200/,
      'Post options dropdown menu must adapt to dark mode'
    );
  });

  await t.test('3. Community Feed Dark Mode: Comments, Reply Form, and Interactive Bench', () => {
    // Comments thread container and bubbles
    assert.match(
      feedView,
      /dark:bg-slate-900\/60[\s\S]*?dark:border-slate-800/,
      'Comments thread accordion wrapper must have dark surface'
    );
    assert.match(
      feedView,
      /dark:bg-\[#1C2025\][\s\S]*?dark:border-slate-800[\s\S]*?dark:text-slate-300|dark:text-slate-200/,
      'Comment bubble must have dark background and text'
    );

    // Reply form input
    assert.match(
      feedView,
      /dark:bg-\[#15181C\][\s\S]*?dark:border-slate-700[\s\S]*?dark:text-slate-100/,
      'Comment reply input must adapt to dark theme'
    );

    // Section 14 motion bench
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800/,
      'Section 14 motion bench container must adapt to dark theme'
    );
  });

  await t.test('4. Community Feed Dark Mode: Dialogs, Modals, and Image Uploads', () => {
    // Modals in FeedView
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800[\s\S]*?Publish to Elmina Community/,
      'Create Post modal dialog must have dark theme styling'
    );
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800[\s\S]*?Delete Post/,
      'Delete Post confirmation dialog must have dark theme styling'
    );
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800[\s\S]*?Delete Comment/,
      'Delete Comment confirmation dialog must have dark theme styling'
    );
    assert.match(
      feedView,
      /dark:bg-\[#17191C\][\s\S]*?dark:border-slate-800[\s\S]*?Report Post to Moderator/,
      'Report Content modal dialog must have dark theme styling'
    );

    // Image upload component
    assert.match(
      imageUpload,
      /dark:bg-slate-800\/40/,
      'ImageUploadArea dropzone must feature dark background styling'
    );
    assert.match(
      imageUpload,
      /dark:border-slate-700/,
      'ImageUploadArea dropzone must feature dark border styling'
    );
    assert.match(
      imageUpload,
      /dark:bg-emerald-950\/60[\s\S]*?dark:text-emerald-400/,
      'ImageUploadArea camera icon container must adapt to dark theme'
    );
  });

  await t.test('5. Global Theme System: Neutral Stone and Slate Surface Tokens in globals.css', () => {
    // Check that globals.css has dark mappings for stone and slate light variations
    assert.match(globalsCss, /\.dark\s+\.bg-stone-50/, 'globals.css must map .bg-stone-50 in dark mode');
    assert.match(globalsCss, /\.dark\s+\.bg-stone-100/, 'globals.css must map .bg-stone-100 in dark mode');
    assert.match(globalsCss, /\.dark\s+\.border-stone-200/, 'globals.css must map .border-stone-200 in dark mode');
    assert.match(globalsCss, /\.dark\s+\.bg-slate-50\\\/90/, 'globals.css must map .bg-slate-50/90 in dark mode');
    assert.match(globalsCss, /\.dark\s+\.border-slate-200\\\/90/, 'globals.css must map .border-slate-200/90 in dark mode');
  });
});
