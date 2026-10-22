import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Detail Window Animation Refinement', () => {
  const globalsCssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const exchangeViewPath = path.resolve(process.cwd(), 'src/components/exchange/ExchangeView.tsx');
  const servicesViewPath = path.resolve(process.cwd(), 'src/components/services/ServicesView.tsx');

  const globalsCss = fs.readFileSync(globalsCssPath, 'utf-8');
  const exchangeView = fs.readFileSync(exchangeViewPath, 'utf-8');
  const servicesView = fs.readFileSync(servicesViewPath, 'utf-8');

  describe('1. Circular Exchange: Right-Slide Drawer Motion Design', () => {
    it('defines horizontal right-slide translateX(100%) to translateX(0) with ease-out easing (240-320ms open, 180-240ms exit)', () => {
      // Keyframe definitions for entrance and exit
      assert.ok(
        globalsCss.includes('@keyframes exchangeDrawerSlideIn') &&
        globalsCss.includes('transform: translateX(100%);') &&
        globalsCss.includes('transform: translateX(0);'),
        'globals.css must define @keyframes exchangeDrawerSlideIn moving translateX(100%) to translateX(0)'
      );
      assert.ok(
        globalsCss.includes('@keyframes exchangeDrawerSlideOut') &&
        globalsCss.includes('transform: translateX(100%);'),
        'globals.css must define @keyframes exchangeDrawerSlideOut moving to translateX(100%)'
      );

      // Panel starting position and animation binding
      assert.ok(
        globalsCss.includes('.exchange-drawer-panel {'),
        'globals.css must define .exchange-drawer-panel'
      );
      assert.ok(
        globalsCss.includes('transform: translateX(100%);'),
        'exchange-drawer-panel must start with translateX(100%)'
      );

      // Panel open state (slid into view)
      assert.ok(
        globalsCss.includes('.exchange-drawer-panel-open {') &&
        globalsCss.includes('transform: translateX(0);'),
        'exchange-drawer-panel-open must ensure translateX(0)'
      );

      // Panel closing state (reverses horizontal slide out to right)
      assert.ok(
        globalsCss.includes('.exchange-drawer-panel-closing {') &&
        globalsCss.includes('exchangeDrawerSlideOut 210ms cubic-bezier(0.4, 0, 0.2, 1)'),
        'exchange-drawer-panel-closing must trigger exchangeDrawerSlideOut 210ms'
      );

      // Verify timing within required specification (240-320ms open, 180-240ms exit)
      assert.ok(
        globalsCss.includes('280ms cubic-bezier(0.16, 1, 0.3, 1)'),
        'exchange-drawer-panel must use smooth ease-out opening timing (280ms within 240-320ms)'
      );
      assert.ok(
        globalsCss.includes('210ms cubic-bezier(0.4, 0, 0.2, 1)'),
        'exchange-drawer-panel must use slightly faster exit timing (210ms within 180-240ms)'
      );
    });

    it('defines smooth backdrop fade-in and fade-out matching drawer open/close durations', () => {
      assert.ok(
        globalsCss.includes('@keyframes exchangeBackdropFadeIn') &&
        globalsCss.includes('.exchange-drawer-backdrop {') &&
        globalsCss.includes('exchangeBackdropFadeIn 280ms'),
        'exchange-drawer-backdrop must fade in over 280ms'
      );
      assert.ok(
        globalsCss.includes('@keyframes exchangeBackdropFadeOut') &&
        globalsCss.includes('.exchange-drawer-backdrop-closing {') &&
        globalsCss.includes('exchangeBackdropFadeOut 210ms'),
        'exchange-drawer-backdrop-closing must fade out over 210ms'
      );
    });

    it('ExchangeView preserves drawer in DOM during exit choreography until animation completes', () => {
      // Must not unmount immediately when closing begins
      assert.ok(
        exchangeView.includes('displayedDrawerItem') &&
        exchangeView.includes('isDrawerClosing'),
        'ExchangeView must track displayedDrawerItem and isDrawerClosing state'
      );
      assert.ok(
        exchangeView.includes('setTimeout(') &&
        exchangeView.includes('210'),
        'ExchangeView must wait 210ms for exit animation before unmounting displayedDrawerItem'
      );
      assert.ok(
        exchangeView.includes('lastTriggerElementRef.current?.focus()'),
        'ExchangeView must restore keyboard focus to the triggering card/button on close'
      );
    });

    it('ExchangeView applies exchange-drawer classes to backdrop and panel', () => {
      assert.ok(
        exchangeView.includes('exchange-drawer-backdrop') &&
        exchangeView.includes('exchange-drawer-panel'),
        'ExchangeView markup must use exchange-drawer animation classes'
      );
      assert.ok(
        exchangeView.includes('exchange-drawer-panel-open') &&
        exchangeView.includes('exchange-drawer-panel-closing'),
        'ExchangeView markup must toggle open and closing classes'
      );
      assert.ok(
        exchangeView.includes('drawerSessionId') &&
        exchangeView.includes('key={`${displayedDrawerItem.id}-${drawerSessionId}`}'),
        'ExchangeView must use drawerSessionId key to force re-animation on consecutive opens'
      );
    });
  });

  describe('2. Local Services: Centred Fade-In Detail Window Motion Design', () => {
    it('defines smooth fade-in (opacity 0 -> 1) with subtle upward movement translateY(8px -> 0) and natural ease-out (180-240ms open, 140-200ms exit)', () => {
      // Keyframe definitions
      assert.ok(
        globalsCss.includes('@keyframes servicesWindowFadeIn') &&
        globalsCss.includes('translateY(8px)') &&
        globalsCss.includes('translateY(0)'),
        'globals.css must define @keyframes servicesWindowFadeIn with translateY(8px) to translateY(0)'
      );
      assert.ok(
        globalsCss.includes('@keyframes servicesWindowFadeOut') &&
        globalsCss.includes('translateY(8px)'),
        'globals.css must define @keyframes servicesWindowFadeOut with translateY(8px)'
      );

      // Panel starting position (fade-in, subtle 8px upward movement)
      assert.ok(
        globalsCss.includes('.services-window-panel {'),
        'globals.css must define .services-window-panel'
      );
      assert.ok(
        globalsCss.includes('transform: translateY(8px);') &&
        globalsCss.includes('opacity: 0;'),
        'services-window-panel must start with opacity: 0 and subtle translateY(8px)'
      );

      // Panel open state
      assert.ok(
        globalsCss.includes('.services-window-panel-open {') &&
        globalsCss.includes('transform: translateY(0);') &&
        globalsCss.includes('opacity: 1;'),
        'services-window-panel-open must animate to opacity: 1 and translateY(0)'
      );

      // Panel closing state (reverses subtle movement and fades out)
      assert.ok(
        globalsCss.includes('.services-window-panel-closing {') &&
        globalsCss.includes('servicesWindowFadeOut 170ms cubic-bezier(0.4, 0, 0.2, 1)'),
        'services-window-panel-closing must trigger servicesWindowFadeOut 170ms'
      );

      // Timing in required range (180-240ms open, 140-200ms exit)
      assert.ok(
        globalsCss.includes('210ms cubic-bezier(0.16, 1, 0.3, 1)'),
        'services-window-panel must use 210ms natural ease-out transition (within 180-240ms)'
      );
      assert.ok(
        globalsCss.includes('170ms cubic-bezier(0.4, 0, 0.2, 1)'),
        'services-window-panel must use 170ms exit transition (within 140-200ms)'
      );
    });

    it('avoids noticeable zooming, bouncing or excessive scaling in Local Services detail window', () => {
      // Ensure Modal 3 in ServicesView no longer uses zoom-in-95
      const modal3Match = servicesView.match(/MODAL 3: SERVICE DETAIL DOSSIER[\s\S]*?MODAL 4/);
      assert.ok(modal3Match, 'Modal 3 must be present in ServicesView');
      assert.ok(
        !modal3Match[0].includes('zoom-in-95'),
        'Modal 3 must NOT use zoom-in-95, preserving stable size and layout'
      );
      assert.ok(
        !modal3Match[0].includes('slide-in-from-right'),
        'Modal 3 must NOT use horizontal slide'
      );
    });

    it('ServicesView preserves detail window in DOM during exit choreography until animation completes', () => {
      assert.ok(
        servicesView.includes('displayedDetailService') &&
        servicesView.includes('isDetailClosing'),
        'ServicesView must track displayedDetailService and isDetailClosing'
      );
      assert.ok(
        servicesView.includes('setTimeout(') &&
        servicesView.includes('170'),
        'ServicesView must wait 170ms for exit animation before unmounting displayedDetailService'
      );
      assert.ok(
        servicesView.includes('lastDetailTriggerRef.current?.focus()'),
        'ServicesView must restore focus to triggering element on close'
      );
    });

    it('ServicesView applies services-window classes to backdrop and panel', () => {
      assert.ok(
        servicesView.includes('services-window-backdrop') &&
        servicesView.includes('services-window-panel'),
        'ServicesView markup must use services-window animation classes'
      );
      assert.ok(
        servicesView.includes('services-window-panel-open') &&
        servicesView.includes('services-window-panel-closing'),
        'ServicesView markup must toggle open and closing classes'
      );
      assert.ok(
        servicesView.includes('detailSessionId') &&
        servicesView.includes('key={`${displayedDetailService.id}-${detailSessionId}`}'),
        'ServicesView must use detailSessionId key to force re-animation on consecutive opens'
      );
    });
  });

  describe('3. Shared Animation Quality, Accessibility & Reduced Motion', () => {
    it('disables transitions and transforms under prefers-reduced-motion: reduce', () => {
      const reducedMotionBlock = globalsCss.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?}/g);
      assert.ok(reducedMotionBlock && reducedMotionBlock.length > 0, 'globals.css must contain prefers-reduced-motion block');

      assert.ok(
        globalsCss.includes('.exchange-drawer-panel') &&
        globalsCss.includes('.services-window-panel'),
        'All drawer and detail window classes must be covered in globals.css'
      );
      assert.ok(
        globalsCss.includes('transition: none !important;') &&
        globalsCss.includes('transform: none !important;'),
        'prefers-reduced-motion must set transition and transform to none'
      );
    });

    it('locks background scroll when drawer/window is open and restores upon close', () => {
      assert.ok(
        exchangeView.includes("document.body.style.overflow = 'hidden'") &&
        exchangeView.includes("document.body.style.overflow = ''"),
        'ExchangeView must lock and restore document.body.style.overflow'
      );
      assert.ok(
        servicesView.includes("document.body.style.overflow = 'hidden'") &&
        servicesView.includes("document.body.style.overflow = ''"),
        'ServicesView must lock and restore document.body.style.overflow'
      );
    });

    it('supports Escape key and backdrop dismissal on both modules', () => {
      assert.ok(
        exchangeView.includes("e.key === 'Escape'") &&
        exchangeView.includes('handleCloseDrawer()'),
        'ExchangeView must close drawer on Escape key'
      );
      assert.ok(
        servicesView.includes("e.key === 'Escape'") &&
        servicesView.includes('handleCloseDetail()'),
        'ServicesView must close detail window on Escape key'
      );
    });

    it('maintains responsive layouts (right-slide drawer on exchange, centred dialog on services)', () => {
      // Circular Exchange drawer layout: anchored to right
      assert.ok(
        exchangeView.includes('fixed inset-0 z-50 flex justify-end'),
        'Exchange drawer container must be anchored to right with flex justify-end'
      );
      assert.ok(
        exchangeView.includes('w-full max-w-lg'),
        'Exchange drawer panel must have responsive max-w-lg sizing'
      );

      // Local Services detail window layout: centred
      assert.ok(
        servicesView.includes('fixed inset-0 z-50 flex items-center justify-center p-4'),
        'Services detail container must be centred with items-center justify-center'
      );
      assert.ok(
        servicesView.includes('max-w-lg rounded-3xl'),
        'Services detail panel must have max-w-lg rounded-3xl styling'
      );
    });
  });
});
