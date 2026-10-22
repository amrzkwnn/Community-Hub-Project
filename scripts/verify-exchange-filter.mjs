import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9334;
const PROFILE_DIR = path.resolve(process.cwd(), '.chrome-filter-profile');
const SCREENSHOT_PATH = path.resolve(process.cwd(), 'exchange-verification-screenshot.png');

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

async function main() {
  console.log('Starting Chrome for Exchange Filter & Renaming Verification...');
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,900',
      'http://localhost:3000',
    ],
    { stdio: 'ignore' }
  );

  let targetWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      if (res.ok) {
        const tabs = await res.json();
        const tab = tabs.find((t) => t.type === 'page' && t.url.includes('localhost:3000'));
        if (tab && tab.webSocketDebuggerUrl) {
          targetWsUrl = tab.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!targetWsUrl) {
    console.error('Failed to connect to Chrome debug port');
    chromeProcess.kill();
    process.exit(1);
  }

  const client = new CDPClient(targetWsUrl);
  await client.connect();
  console.log('Connected to Chrome via CDP');

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  try {
    console.log('Waiting for application to load and render...');
    for (let i = 0; i < 20; i++) {
      const isLoaded = await client.evaluate(`(() => {
        return !!document.querySelector('button');
      })()`);
      if (isLoaded) break;
      await sleep(500);
    }
    await sleep(1500);

    // ========================================================================
    // TEST 1: Check Sidebar navigation labels
    // ========================================================================
    console.log('\n--- TEST 1: Check Global Navigation (Sidebar) ---');
    const navCheck = await client.evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('button.nav-link, nav button'));
      const texts = links.map(l => l.textContent.trim());
      const hasExchange = texts.some(t => t.includes('Exchange') && !t.includes('Circular'));
      const hasCircularExchange = texts.some(t => t.includes('Circular Exchange'));
      return { texts, hasExchange, hasCircularExchange };
    })()`);
    console.log('Navigation links found:', navCheck.texts);
    console.log('Has "Exchange":', navCheck.hasExchange);
    console.log('Has "Circular Exchange":', navCheck.hasCircularExchange);
    if (!navCheck.hasExchange || navCheck.hasCircularExchange) {
      throw new Error('Sidebar failed: Expected "Exchange" without "Circular" prefix');
    }

    // ========================================================================
    // TEST 2: Check Home View Feature Card
    // ========================================================================
    console.log('\n--- TEST 2: Check Home View Feature Card ---');
    const homeCardCheck = await client.evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('[role="button"]'));
      const exchangeCard = cards.find(c => {
        const text = c.textContent || '';
        return text.includes('Give useful items a second life');
      });
      if (!exchangeCard) return { found: false };
      const h2 = exchangeCard.querySelector('h2');
      const ariaLabel = exchangeCard.getAttribute('aria-label') || '';
      return {
        found: true,
        heading: h2 ? h2.textContent.trim() : '',
        ariaLabel,
      };
    })()`);
    console.log('Home card check:', homeCardCheck);
    if (!homeCardCheck.found || homeCardCheck.heading !== 'Exchange' || !homeCardCheck.ariaLabel.includes('Open Exchange')) {
      throw new Error(`Home card failed: Expected heading "Exchange" and aria-label "Open Exchange", got: ${JSON.stringify(homeCardCheck)}`);
    }

    // ========================================================================
    // TEST 3: Navigate to Exchange View
    // ========================================================================
    console.log('\n--- TEST 3: Navigate to Exchange View ---');
    const navResult = await client.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exchangeNav = buttons.find(b => b.textContent && b.textContent.includes('Exchange') && !b.textContent.includes('Circular'));
      if (exchangeNav) {
        exchangeNav.click();
        return { success: true };
      }
      return { success: false };
    })()`);
    console.log('Navigated to Exchange:', navResult);
    await sleep(600);

    // ========================================================================
    // TEST 4: Check Exchange Section Heading and Initial Count
    // ========================================================================
    console.log('\n--- TEST 4: Section Heading & Initial Items ---');
    const exchangeHeaderCheck = await client.evaluate(`(() => {
      const h1 = document.querySelector('h1');
      const articles = document.querySelectorAll('article');
      const allPill = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button')).find(b => b.textContent.trim() === 'All');
      return {
        h1Text: h1 ? h1.textContent.trim() : '',
        itemCount: articles.length,
        allPillPressed: allPill ? allPill.getAttribute('aria-pressed') : null,
      };
    })()`);
    console.log('Exchange Header & Initial State:', exchangeHeaderCheck);
    if (exchangeHeaderCheck.h1Text !== 'Exchange') {
      throw new Error(`Expected <h1>Exchange</h1>, got "${exchangeHeaderCheck.h1Text}"`);
    }
    if (exchangeHeaderCheck.itemCount !== 7) {
      throw new Error(`Expected 7 initial items, got ${exchangeHeaderCheck.itemCount}`);
    }
    if (exchangeHeaderCheck.allPillPressed !== 'true') {
      throw new Error(`Expected "All" pill aria-pressed="true", got ${exchangeHeaderCheck.allPillPressed}`);
    }

    // ========================================================================
    // TEST 5: Filter by Specific Category ("Furniture")
    // ========================================================================
    console.log('\n--- TEST 5: Filter by Specific Category ("Furniture") ---');
    const clickFurniture = await client.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button'));
      const furnitureBtn = buttons.find(b => b.textContent.trim() === 'Furniture');
      if (furnitureBtn) {
        furnitureBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('Clicked Furniture pill:', clickFurniture);
    await sleep(250);

    const furnitureState = await client.evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const titles = articles.map(a => a.querySelector('h3')?.textContent?.trim() || '');
      const allBtn = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button')).find(b => b.textContent.trim() === 'All');
      const furnBtn = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button')).find(b => b.textContent.trim() === 'Furniture');
      return {
        count: articles.length,
        titles,
        allPressed: allBtn?.getAttribute('aria-pressed'),
        furnPressed: furnBtn?.getAttribute('aria-pressed'),
      };
    })()`);
    console.log('Furniture filter state:', furnitureState);
    if (furnitureState.count !== 2 || !furnitureState.titles[0].includes('Solid Teak 4-Seater Dining Chairs')) {
      throw new Error(`Expected 2 furniture items, got: ${JSON.stringify(furnitureState)}`);
    }
    if (furnitureState.furnPressed !== 'true' || furnitureState.allPressed !== 'false') {
      throw new Error('Aria-pressed states incorrect on Furniture click');
    }

    // ========================================================================
    // TEST 6: THE CRITICAL BUG FIX — Click "All" Category Pill
    // ========================================================================
    console.log('\n--- TEST 6: Click "All" Category Pill (Must Show All 7 Items) ---');
    const clickAll = await client.evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button'));
      const allBtn = buttons.find(b => b.textContent.trim() === 'All');
      if (allBtn) {
        allBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('Clicked "All" category pill:', clickAll);
    await sleep(250);

    const allCategoryState = await client.evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const titles = articles.map(a => a.querySelector('h3')?.textContent?.trim() || '');
      const allBtn = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button')).find(b => b.textContent.trim() === 'All');
      const furnBtn = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button')).find(b => b.textContent.trim() === 'Furniture');
      return {
        count: articles.length,
        titles,
        allPressed: allBtn?.getAttribute('aria-pressed'),
        furnPressed: furnBtn?.getAttribute('aria-pressed'),
      };
    })()`);
    console.log('After clicking "All" pill state:', allCategoryState);
    if (allCategoryState.count !== 7) {
      throw new Error(`CRITICAL BUG DETECTED: Expected all 7 listings after clicking "All", but got ${allCategoryState.count}!`);
    }
    if (allCategoryState.allPressed !== 'true' || allCategoryState.furnPressed !== 'false') {
      throw new Error('"All" pill not marked aria-pressed="true"');
    }
    console.log('>>> SUCCESS: Clicking "All" category restored all 7 listings perfectly!');

    // ========================================================================
    // TEST 7: Combine Category Filter with Listing Type (Free vs Exchange)
    // ========================================================================
    console.log('\n--- TEST 7: Combine Category with Type Filter ---');
    const typeCombineCheck = await client.evaluate(`(() => {
      // 1. Select "Free (Gift)"
      const typeBtns = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by listing type"] button'));
      const freeBtn = typeBtns.find(b => b.textContent.includes('Free'));
      if (freeBtn) freeBtn.click();
      return { clicked: true };
    })()`);
    await sleep(250);

    const freeState = await client.evaluate(`(() => {
      const articles = document.querySelectorAll('article');
      return { count: articles.length };
    })()`);
    console.log('Count with Free (Gift) filter:', freeState.count);
    if (freeState.count !== 3) {
      throw new Error(`Expected 3 Free items, got ${freeState.count}`);
    }

    // Now select Baby Items category while Free is active
    await client.evaluate(`(() => {
      const catBtns = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button'));
      const babyBtn = catBtns.find(b => b.textContent.trim() === 'Baby Items');
      if (babyBtn) babyBtn.click();
    })()`);
    await sleep(250);

    const freeAndBabyState = await client.evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const titles = articles.map(a => a.querySelector('h3')?.textContent?.trim() || '');
      return { count: articles.length, titles };
    })()`);
    console.log('Count with Free + Baby Items:', freeAndBabyState);
    if (freeAndBabyState.count !== 2) {
      throw new Error(`Expected 2 items for Free + Baby Items, got ${freeAndBabyState.count}`);
    }

    // Switch type filter to "Exchange (Barter)"
    await client.evaluate(`(() => {
      const typeBtns = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by listing type"] button'));
      const exBtn = typeBtns.find(b => b.textContent.includes('Exchange'));
      if (exBtn) exBtn.click();
    })()`);
    await sleep(250);

    // Select Home & Kitchen
    await client.evaluate(`(() => {
      const catBtns = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button'));
      const hkBtn = catBtns.find(b => b.textContent.trim() === 'Home & Kitchen');
      if (hkBtn) hkBtn.click();
    })()`);
    await sleep(250);

    const exchangeAndHkState = await client.evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const titles = articles.map(a => a.querySelector('h3')?.textContent?.trim() || '');
      return { count: articles.length, titles };
    })()`);
    console.log('Count with Exchange + Home & Kitchen:', exchangeAndHkState);
    if (exchangeAndHkState.count !== 2) {
      throw new Error(`Expected 2 items for Exchange + Home & Kitchen, got: ${JSON.stringify(exchangeAndHkState)}`);
    }

    // ========================================================================
    // TEST 8: Test Reset Filters
    // ========================================================================
    console.log('\n--- TEST 8: Reset Filters ---');
    const resetResult = await client.evaluate(`(() => {
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Reset'));
      if (resetBtn) {
        resetBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('Clicked Reset Filters:', resetResult);
    await sleep(300);

    const afterResetState = await client.evaluate(`(() => {
      const articles = document.querySelectorAll('article');
      const allPill = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by item category"] button')).find(b => b.textContent.trim() === 'All');
      const allType = Array.from(document.querySelectorAll('div[role="group"][aria-label="Filter by listing type"] button')).find(b => b.textContent.trim() === 'All');
      return {
        count: articles.length,
        categoryAllPressed: allPill?.getAttribute('aria-pressed'),
        typeAllPressed: allType?.getAttribute('aria-pressed'),
      };
    })()`);
    console.log('State after Reset:', afterResetState);
    if (afterResetState.count !== 7 || afterResetState.categoryAllPressed !== 'true') {
      throw new Error(`Reset filters failed: expected 7 items and All pill pressed, got ${JSON.stringify(afterResetState)}`);
    }

    // ========================================================================
    // TEST 9: Detail Drawer Slide-in Animation & Verification
    // ========================================================================
    console.log('\n--- TEST 9: Detail Drawer Slide-in Animation ---');
    const openDrawer = await client.evaluate(`(() => {
      const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'View Item');
      if (viewButtons.length > 0) {
        viewButtons[0].click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('Clicked View Item:', openDrawer);
    await sleep(350);

    const drawerCheck = await client.evaluate(`(() => {
      const drawer = document.querySelector('aside[aria-label="Item Details Dossier"]');
      if (!drawer) return { open: false };
      const style = window.getComputedStyle(drawer);
      const h2 = drawer.querySelector('h2');
      const photos = drawer.querySelectorAll('img');
      return {
        open: true,
        title: h2 ? h2.textContent.trim() : '',
        transform: style.transform,
        photoCount: photos.length,
      };
    })()`);
    console.log('Drawer check:', drawerCheck);
    if (!drawerCheck.open || !drawerCheck.title) {
      throw new Error('Drawer failed to open');
    }

    // Close drawer
    const closeDrawer = await client.evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close item details"]');
      if (closeBtn) {
        closeBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('Clicked Close Drawer:', closeDrawer);
    await sleep(350);

    // ========================================================================
    // TEST 10: Global Search Results Label Check
    // ========================================================================
    console.log('\n--- TEST 10: Global Search Label Check ---');
    const searchCheck = await client.evaluate(`(() => {
      // Find search input or button
      const searchInput = document.querySelector('input[type="text"], input[type="search"]');
      if (!searchInput) return { foundInput: false };
      searchInput.value = 'Table';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      return { foundInput: true };
    })()`);
    console.log('Searched for "Table":', searchCheck);
    await sleep(300);

    // Capture screenshot
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved verification screenshot to ${SCREENSHOT_PATH}`);

    console.log('\n======================================================');
    console.log('>>> ALL BROWSER VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
    console.log('======================================================\n');
  } finally {
    client.close();
    chromeProcess.kill();
  }
}

main().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
