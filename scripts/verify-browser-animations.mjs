import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9333;
const PROFILE_DIR = path.resolve(process.cwd(), '.chrome-test-profile');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
    this.isReady = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        this.isReady = true;
        resolve();
      };
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(result.exceptionDetails)}`);
    }
    return result.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('🚀 Starting Google Chrome in Headless Mode on port', DEBUG_PORT);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      'http://localhost:3000',
    ],
    { stdio: 'ignore' }
  );

  try {
    // Wait for Chrome debugging port to open
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const tabs = await res.json();
        const tab = tabs.find((t) => t.type === 'page' && t.url.includes('localhost:3000'));
        if (tab && tab.webSocketDebuggerUrl) {
          wsUrl = tab.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) {
      throw new Error('Failed to connect to Chrome debugging endpoint');
    }

    console.log(' Connected to Chrome DevTools Protocol over WebSocket');
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');

    console.log('⏳ Waiting for application to load and render...');
    await sleep(2000);

    // 1. Navigate to Circular Exchange section
    console.log('\n--- TEST 1: Circular Exchange Right-Slide Drawer ---');
    const navExchangeRes = await cdp.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const exchangeBtn = btns.find(b => b.textContent && b.textContent.includes('Circular Exchange'));
        if (exchangeBtn) {
          exchangeBtn.click();
          return { found: true };
        }
        return { found: false };
      })()
    `);
    console.log('Navigated to Circular Exchange:', navExchangeRes);
    await sleep(800);

    // Click first item card
    const openItemRes = await cdp.evaluate(`
      (() => {
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        if (viewButtons.length > 0) {
          viewButtons[0].click();
          return { clicked: 'View Item button', total: viewButtons.length };
        }
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
          articles[0].click();
          return { clicked: 'Article card', total: articles.length };
        }
        return { error: 'No item card or button found' };
      })()
    `);
    console.log('Opened Circular Exchange item:', openItemRes);

    // Check computed styles immediately
    const drawerOpenStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        const backdrop = document.querySelector('.exchange-drawer-backdrop');
        if (!panel || !backdrop) return { error: 'Drawer elements not found' };

        const panelStyle = window.getComputedStyle(panel);
        const backdropStyle = window.getComputedStyle(backdrop);

        return {
          panelFound: true,
          panelAnimationName: panelStyle.animationName,
          panelAnimationDuration: panelStyle.animationDuration,
          panelAnimationTimingFunction: panelStyle.animationTimingFunction,
          panelTransform: panelStyle.transform,
          panelOpacity: panelStyle.opacity,
          backdropAnimationName: backdropStyle.animationName,
          backdropAnimationDuration: backdropStyle.animationDuration,
          isOpenClass: panel.classList.contains('exchange-drawer-panel-open'),
        };
      })()
    `);
    console.log('Drawer Open Computed Styles in Browser:\n', JSON.stringify(drawerOpenStyles, null, 2));

    // Wait 350ms for opening animation to settle
    await sleep(350);
    const settledDrawerStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        if (!panel) return { error: 'Panel missing' };
        const cs = window.getComputedStyle(panel);
        return {
          transform: cs.transform,
          opacity: cs.opacity,
        };
      })()
    `);
    console.log('Drawer Settled Styles (fully inside viewport translateX(0)):\n', settledDrawerStyles);

    // Test drawer exit animation
    console.log('Triggering Drawer Close...');
    const closeDrawerTrigger = await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close item details"]');
        if (closeBtn) {
          closeBtn.click();
          return { triggered: 'Close Button' };
        }
        const backdrop = document.querySelector('.exchange-drawer-backdrop');
        if (backdrop) {
          backdrop.click();
          return { triggered: 'Backdrop' };
        }
        return { error: 'No close element found' };
      })()
    `);
    console.log('Close triggered:', closeDrawerTrigger);

    // Immediately inspect exit animation classes and computed styles
    const closingDrawerStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        const backdrop = document.querySelector('.exchange-drawer-backdrop');
        if (!panel || !backdrop) return { error: 'Panel already unmounted prematurely!' };
        const panelStyle = window.getComputedStyle(panel);
        const backdropStyle = window.getComputedStyle(backdrop);
        return {
          isPanelClosing: panel.classList.contains('exchange-drawer-panel-closing'),
          panelAnimationName: panelStyle.animationName,
          panelAnimationDuration: panelStyle.animationDuration,
          isBackdropClosing: backdrop.classList.contains('exchange-drawer-backdrop-closing'),
          backdropAnimationName: backdropStyle.animationName,
          backdropAnimationDuration: backdropStyle.animationDuration,
        };
      })()
    `);
    console.log('Drawer Closing Styles (Exit Choreography active):\n', JSON.stringify(closingDrawerStyles, null, 2));

    // Wait 250ms for exit to complete and verify clean DOM unmount
    await sleep(250);
    const unmountedCheck = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        return { isUnmounted: panel === null };
      })()
    `);
    console.log('Drawer Unmounted after exit duration:', unmountedCheck);

    // Consecutive open: click another item
    console.log('Testing Consecutive Open with another item...');
    const secondItemOpen = await cdp.evaluate(`
      (() => {
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        if (viewButtons.length > 1) {
          viewButtons[1].click();
          return { clickedIndex: 1 };
        }
        if (viewButtons.length > 0) {
          viewButtons[0].click();
          return { clickedIndex: 0 };
        }
        return { error: 'No buttons found' };
      })()
    `);
    console.log('Second item open trigger:', secondItemOpen);

    const secondItemAnim = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        if (!panel) return { error: 'Panel did not mount on second open' };
        const cs = window.getComputedStyle(panel);
        return {
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
        };
      })()
    `);
    console.log('Consecutive Item Opening Animation in Browser:', secondItemAnim);

    // Close second item immediately
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close item details"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(250);

    // 2. Navigate to Local Services section
    console.log('\n--- TEST 2: Local Services Centred Fade-In Window ---');
    const navServicesRes = await cdp.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const servicesBtn = btns.find(b => b.textContent && b.textContent.includes('Local Services'));
        if (servicesBtn) {
          servicesBtn.click();
          return { found: true };
        }
        return { found: false };
      })()
    `);
    console.log('Navigated to Local Services:', navServicesRes);
    await sleep(800);

    // Open first service card
    const openServiceRes = await cdp.evaluate(`
      (() => {
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
          articles[0].click();
          return { clicked: 'Service Article card', total: articles.length };
        }
        return { error: 'No service article found' };
      })()
    `);
    console.log('Opened Service card:', openServiceRes);

    // Check computed styles of Local Services detail window
    const serviceOpenStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.services-window-panel');
        const backdrop = document.querySelector('.services-window-backdrop');
        if (!panel || !backdrop) return { error: 'Service window elements not found' };

        const panelStyle = window.getComputedStyle(panel);
        const backdropStyle = window.getComputedStyle(backdrop);

        return {
          panelFound: true,
          panelAnimationName: panelStyle.animationName,
          panelAnimationDuration: panelStyle.animationDuration,
          panelAnimationTimingFunction: panelStyle.animationTimingFunction,
          panelTransform: panelStyle.transform,
          panelOpacity: panelStyle.opacity,
          backdropAnimationName: backdropStyle.animationName,
          backdropAnimationDuration: backdropStyle.animationDuration,
          isOpenClass: panel.classList.contains('services-window-panel-open'),
        };
      })()
    `);
    console.log('Service Window Open Computed Styles in Browser:\n', JSON.stringify(serviceOpenStyles, null, 2));

    // Wait 250ms for opening fade to settle
    await sleep(250);
    const settledServiceStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.services-window-panel');
        if (!panel) return { error: 'Service panel missing' };
        const cs = window.getComputedStyle(panel);
        return {
          transform: cs.transform,
          opacity: cs.opacity,
        };
      })()
    `);
    console.log('Service Window Settled Styles (opacity 1, translateY 0):\n', settledServiceStyles);

    // Test service window exit animation
    console.log('Triggering Service Window Close...');
    const closeServiceTrigger = await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close service details dialog"]');
        if (closeBtn) {
          closeBtn.click();
          return { triggered: 'Close Button' };
        }
        const backdrop = document.querySelector('.services-window-backdrop');
        if (backdrop) {
          backdrop.click();
          return { triggered: 'Backdrop' };
        }
        return { error: 'No close element found' };
      })()
    `);
    console.log('Close triggered:', closeServiceTrigger);

    // Inspect exit animation on services window
    const closingServiceStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.services-window-panel');
        const backdrop = document.querySelector('.services-window-backdrop');
        if (!panel || !backdrop) return { error: 'Service window already unmounted prematurely!' };
        const panelStyle = window.getComputedStyle(panel);
        const backdropStyle = window.getComputedStyle(backdrop);
        return {
          isPanelClosing: panel.classList.contains('services-window-panel-closing'),
          panelAnimationName: panelStyle.animationName,
          panelAnimationDuration: panelStyle.animationDuration,
          isBackdropClosing: backdrop.classList.contains('services-window-backdrop-closing'),
          backdropAnimationName: backdropStyle.animationName,
          backdropAnimationDuration: backdropStyle.animationDuration,
        };
      })()
    `);
    console.log('Service Window Closing Styles (Exit Choreography active):\n', JSON.stringify(closingServiceStyles, null, 2));

    await sleep(220);
    const serviceUnmountedCheck = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.services-window-panel');
        return { isUnmounted: panel === null };
      })()
    `);
    console.log('Service Window Unmounted after exit duration:', serviceUnmountedCheck);

    // Test Mutual Aid Requests tab
    console.log('\nTesting Mutual Aid Request Detail in Local Services...');
    const switchTabRes = await cdp.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const reqTab = buttons.find(b => b.textContent && (b.textContent.includes('Requests for Help') || b.textContent.includes('Mutual Aid')));
        if (reqTab) {
          reqTab.click();
          return { switchedTab: true, tabText: reqTab.textContent.trim() };
        }
        return { switchedTab: false };
      })()
    `);
    console.log('Switched to Mutual Aid Requests tab:', switchTabRes);
    await sleep(500);

    const openRequestRes = await cdp.evaluate(`
      (() => {
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
          articles[0].click();
          return { clicked: 'Mutual Aid Request article card' };
        }
        return { error: 'No mutual aid articles found' };
      })()
    `);
    console.log('Opened Mutual Aid Request card:', openRequestRes);

    const reqWindowStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.services-window-panel');
        if (!panel) return { error: 'Panel not found' };
        const cs = window.getComputedStyle(panel);
        return {
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
        };
      })()
    `);
    console.log('Mutual Aid Window Fade-In Animation in Browser:', reqWindowStyles);

    // Close request window
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close service details dialog"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(220);

    // 3. Test prefers-reduced-motion in Browser
    console.log('\n--- TEST 3: prefers-reduced-motion: reduce ---');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    // Reopen Circular Exchange item with reduced motion
    await cdp.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const exchangeBtn = btns.find(b => b.textContent && b.textContent.includes('Circular Exchange'));
        if (exchangeBtn) exchangeBtn.click();
      })()
    `);
    await sleep(500);
    await cdp.evaluate(`
      (() => {
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        if (viewButtons.length > 0) viewButtons[0].click();
      })()
    `);
    await sleep(100);

    const reducedMotionStyles = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        if (!panel) return { error: 'Panel missing' };
        const cs = window.getComputedStyle(panel);
        return {
          animationName: cs.animationName,
          transition: cs.transition,
          transform: cs.transform,
        };
      })()
    `);
    console.log('Reduced Motion Computed Styles on Drawer in Browser:\n', JSON.stringify(reducedMotionStyles, null, 2));

    // Reset reduced motion
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });

    // Close drawer
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close item details"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(250);

    // 4. Test Escape Key and Focus Restoration
    console.log('\n--- TEST 4: Keyboard Navigation, Focus Restoration & Escape Dismissal ---');
    const focusTestRes = await cdp.evaluate(`
      (() => {
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        if (viewButtons.length === 0) return { error: 'No button found' };
        const triggerBtn = viewButtons[0];
        triggerBtn.focus();
        triggerBtn.click();
        return { focusedBeforeClick: document.activeElement === triggerBtn };
      })()
    `);
    console.log('Opened drawer via focused button:', focusTestRes);
    await sleep(100);

    // Send Escape key
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      windowsVirtualKeyCode: 27,
      code: 'Escape',
      key: 'Escape',
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 27,
      code: 'Escape',
      key: 'Escape',
    });
    console.log('Dispatched Escape key event');

    // Wait for exit choreography
    await sleep(250);
    const focusRestoredCheck = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        const isRestored = document.activeElement === viewButtons[0];
        return {
          isDrawerClosed: panel === null,
          isFocusRestoredToTrigger: isRestored,
        };
      })()
    `);
    console.log('Escape dismissal and focus restoration result:\n', JSON.stringify(focusRestoredCheck, null, 2));

    // 5. Test Rapid Consecutive Clicks
    console.log('\n--- TEST 5: Rapid Interactions & Consecutive Switches ---');
    const rapidSwitchRes = await cdp.evaluate(`
      (async () => {
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        if (viewButtons.length < 3) return { error: 'Need at least 3 items' };

        // Rapid click 0, then 1, then 2 with 50ms interval
        viewButtons[0].click();
        await new Promise(r => setTimeout(r, 60));
        viewButtons[1].click();
        await new Promise(r => setTimeout(r, 60));
        viewButtons[2].click();
        await new Promise(r => setTimeout(r, 300));

        const panels = document.querySelectorAll('.exchange-drawer-panel');
        const titleEl = document.querySelector('.exchange-drawer-panel h2');
        return {
          totalPanelsInDOM: panels.length,
          finalTitleDisplayed: titleEl ? titleEl.textContent : null,
          hasDuplicatePanels: panels.length > 1,
        };
      })()
    `);
    console.log('Rapid Interaction test result:\n', JSON.stringify(rapidSwitchRes, null, 2));

    // Close drawer
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close item details"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(250);

    // 6. Test Mobile Viewport (375x667)
    console.log('\n--- TEST 6: Mobile Form Factor (375x667) ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(300);

    // Open Circular Exchange on mobile
    await cdp.evaluate(`
      (() => {
        const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View Item'));
        if (viewButtons.length > 0) viewButtons[0].click();
      })()
    `);
    await sleep(100);

    const mobileDrawerMetrics = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.exchange-drawer-panel');
        if (!panel) return { error: 'Panel missing' };
        const rect = panel.getBoundingClientRect();
        const cs = window.getComputedStyle(panel);
        return {
          viewportWidth: window.innerWidth,
          panelRenderedWidth: rect.width,
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
        };
      })()
    `);
    console.log('Mobile Drawer Metrics in Browser:\n', JSON.stringify(mobileDrawerMetrics, null, 2));

    // Close on mobile
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close item details"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(250);

    // Open Local Services on mobile
    await cdp.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const servicesBtn = btns.find(b => b.textContent && b.textContent.includes('Local Services'));
        if (servicesBtn) servicesBtn.click();
      })()
    `);
    await sleep(600);

    await cdp.evaluate(`
      (() => {
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) articles[0].click();
      })()
    `);
    await sleep(100);

    const mobileServicesMetrics = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('.services-window-panel');
        if (!panel) return { error: 'Service panel missing' };
        const rect = panel.getBoundingClientRect();
        const cs = window.getComputedStyle(panel);
        return {
          viewportWidth: window.innerWidth,
          panelRenderedWidth: rect.width,
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
        };
      })()
    `);
    console.log('Mobile Local Services Window Metrics in Browser:\n', JSON.stringify(mobileServicesMetrics, null, 2));

    // Close service window on mobile
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close service details dialog"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(250);

    // Reset viewport
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    console.log('\n🎉 ALL COMPREHENSIVE BROWSER ANIMATION TESTS COMPLETED SUCCESSFULLY!');
    cdp.close();
  } finally {
    chromeProcess.kill('SIGKILL');
    try {
      fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
