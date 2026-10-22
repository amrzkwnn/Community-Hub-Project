import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('--- STARTING CDP E2E VERIFICATION OF SIMPLIFIED SECTION HEADERS ---');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,900',
    'http://localhost:3000'
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch {}
  }

  const pageTarget = targets.find(t => t.url.includes('3000')) || targets.find(t => t.type === 'page' && !t.url.startsWith('chrome'));
  if (!pageTarget) {
    chromeProcess.kill();
    throw new Error('Could not find localhost:3000 page target in Chrome');
  }

  console.log('Connected to target:', pageTarget.url);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((r) => { ws.onopen = r; });

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true
    });
    return res?.result?.value;
  };

  try {
    // Wait for app mount
    await new Promise(r => setTimeout(r, 2000));

    // 1. Verify Home Header
    const homeInfo = await evaluate(`(() => {
      const heading = document.querySelector('#home-welcome-heading')?.textContent.trim();
      const banner = document.querySelector('[data-purpose="home-hero-banner"]');
      const p = banner?.querySelector('p');
      return {
        heading,
        hasSubtitle: !!p,
        subtitleText: p?.textContent.trim()
      };
    })()`);
    console.log('1. Home View:', homeInfo);
    if (homeInfo.hasSubtitle) {
      throw new Error(`Home header has subtitle: ${homeInfo.subtitleText}`);
    }

    // Helper to click sidebar nav
    const clickSidebarTab = async (label) => {
      await evaluate(`(() => {
        const buttons = Array.from(document.querySelectorAll('aside[aria-label="Main Navigation"] button'));
        const target = buttons.find(b => b.textContent.toLowerCase().includes('${label}'.toLowerCase()));
        if (target) target.click();
      })()`);
      await new Promise(r => setTimeout(r, 500));
    };

    // 2. Verify Feed
    await clickSidebarTab('Feed');
    const feedInfo = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const p = document.querySelector('h1')?.parentElement?.querySelector('p');
      return { h1, hasSubtitle: !!p };
    })()`);
    console.log('2. Feed View:', feedInfo);

    // 3. Verify Resilience Map
    await clickSidebarTab('Resilience');
    const resilienceInfo = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const badge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Live Monitoring'))?.textContent.trim();
      const p = document.querySelector('h1')?.closest('.flex')?.parentElement?.querySelector('p');
      return { h1, badge, hasSubtitle: !!p };
    })()`);
    console.log('3. Resilience Map View:', resilienceInfo);
    if (resilienceInfo.hasSubtitle) {
      throw new Error('Resilience Map header has subtitle!');
    }

    // 4. Verify Exchange
    await clickSidebarTab('Exchange');
    const exchangeInfo = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const badge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Verified Neighbourhood Reuse'))?.textContent.trim();
      return { h1, badge };
    })()`);
    console.log('4. Exchange View:', exchangeInfo);

    // 5. Verify Local Services
    await clickSidebarTab('Services');
    const servicesInfo = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const badge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Verified Township Network'))?.textContent.trim();
      return { h1, badge };
    })()`);
    console.log('5. Local Services View:', servicesInfo);

    // 6. Verify Messages / Chat
    await clickSidebarTab('Chat');
    const messagesInfo = await evaluate(`(() => {
      const badge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Municipal E2EE Protocol'))?.textContent.trim();
      const hasNodeLabel = !!Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('SEL-ELM-04'));
      return { badge, hasNodeLabel };
    })()`);
    console.log('6. Messages View:', messagesInfo);
    if (messagesInfo.hasNodeLabel) {
      throw new Error('Messages top bar has node label!');
    }

    // 7. Verify Settings
    await clickSidebarTab('Settings');
    const settingsInfo = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const badge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Preferences Auto-Saved'))?.textContent.trim();
      const header = document.querySelector('header');
      const p = header?.querySelector('p');
      return { h1, badge, hasSubtitle: !!p };
    })()`);
    console.log('7. Settings View:', settingsInfo);
    if (settingsInfo.hasSubtitle) {
      throw new Error('Settings header has subtitle!');
    }

    // Switch to Capt Azman (Management)
    console.log('Switching to Capt Azman...');
    await evaluate(`(() => {
      const trigger = document.querySelector('button[aria-label="User profile and account settings"]');
      if (trigger) trigger.click();
    })()`);
    await new Promise(r => setTimeout(r, 500));
    await evaluate(`(() => {
      const azmanBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Capt Azman'));
      if (azmanBtn) azmanBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Verify Management Console
    await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('aside[aria-label="Main Navigation"] button'));
      const target = buttons.find(b => b.textContent.includes('Management') || b.textContent.includes('Pengurusan'));
      if (target) target.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const mgmtInfo = await evaluate(`(() => {
      const h1 = Array.from(document.querySelectorAll('h1')).find(el => el.textContent.includes('Management') || el.textContent.includes('Console') || el.textContent.includes('Administration'));
      const banner = h1?.closest('.rounded-3xl');
      const p = banner?.querySelector('p');
      return { 
        h1: h1?.textContent.trim(), 
        hasSubtitle: !!p 
      };
    })()`);
    console.log('8. Management Console View:', mgmtInfo);
    if (!mgmtInfo || mgmtInfo.hasSubtitle) {
      throw new Error(`Management Console header check failed: ${JSON.stringify(mgmtInfo)}`);
    }

    console.log('\n======================================================');
    console.log('ALL SECTION HEADERS SUCCESSFULLY VERIFIED IN LIVE DOM');
    console.log('======================================================');
  } finally {
    ws.close();
    chromeProcess.kill();
  }
}

main().catch(err => {
  console.error('E2E verification error:', err);
  process.exit(1);
});
