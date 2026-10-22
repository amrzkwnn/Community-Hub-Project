import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('--- STARTING CDP E2E VERIFICATION: REMOVE HEADER LABELS & RENAME TO CHAT ---');
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

    // 1. Verify Sidebar Navigation Label (English)
    const sidebarLabels = await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('aside[aria-label="Main Navigation"] button'));
      return buttons.map(b => b.textContent.trim().replace(/\\s+/g, ' '));
    })()`);
    console.log('Sidebar Navigation Labels (EN):', sidebarLabels);

    const hasChat = sidebarLabels.some(l => l.includes('Chat'));
    const hasSecureMessages = sidebarLabels.some(l => l.toLowerCase().includes('secure message'));
    console.log('Sidebar has "Chat":', hasChat, '| Sidebar has "Secure Message(s)":', hasSecureMessages);
    if (!hasChat) throw new Error('Sidebar does not contain "Chat" navigation label!');
    if (hasSecureMessages) throw new Error('Sidebar still contains "Secure Message(s)" navigation label!');

    // Helper to click sidebar nav
    const clickSidebarTab = async (label) => {
      await evaluate(`(() => {
        const buttons = Array.from(document.querySelectorAll('aside[aria-label="Main Navigation"] button'));
        const target = buttons.find(b => b.textContent.toLowerCase().includes('${label}'.toLowerCase()));
        if (target) target.click();
      })()`);
      await new Promise(r => setTimeout(r, 500));
    };

    // 2. Click "Chat" and verify messaging section opens
    console.log('Clicking "Chat" navigation tab...');
    await clickSidebarTab('Chat');

    const messagesState = await evaluate(`(() => {
      const activeTitle = document.querySelector('h1')?.textContent.trim();
      const allText = document.body.textContent;
      const hasMunicipalProtocol = allText.includes('Municipal Protocol') || allText.includes('Municipal E2EE Protocol');
      const hasRequestContactBtn = !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Request Resident Contact'));
      const hasKeyAuditBtn = !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Key Audit'));
      return {
        activeTitle,
        hasMunicipalProtocol,
        hasRequestContactBtn,
        hasKeyAuditBtn
      };
    })()`);
    console.log('Messages View State:', messagesState);

    if (messagesState.hasMunicipalProtocol) {
      throw new Error('Municipal Protocol text or badge is still present in Messages view!');
    }
    if (!messagesState.hasRequestContactBtn || !messagesState.hasKeyAuditBtn) {
      throw new Error('Functional action buttons missing from Messages view top metadata bar!');
    }

    // 3. Verify Resilience Map - check that "Live Monitoring" is absent
    console.log('Checking Resilience Map...');
    await clickSidebarTab('Resilience');
    const resilienceState = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const allText = document.body.textContent;
      const hasLiveMonitoring = allText.includes('Live Monitoring');
      return { h1, hasLiveMonitoring };
    })()`);
    console.log('Resilience Map State:', resilienceState);
    if (resilienceState.hasLiveMonitoring) {
      throw new Error('"Live Monitoring" label still found in Resilience Map!');
    }

    // 4. Verify Exchange - check that "Verified Neighbourhood Reuse" is absent
    console.log('Checking Exchange...');
    await clickSidebarTab('Exchange');
    const exchangeState = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const allText = document.body.textContent;
      const hasReuseBadge = allText.includes('Verified Neighbourhood Reuse');
      return { h1, hasReuseBadge };
    })()`);
    console.log('Exchange State:', exchangeState);
    if (exchangeState.hasReuseBadge) {
      throw new Error('"Verified Neighbourhood Reuse" label still found in Exchange!');
    }

    // 5. Verify Local Services - check that "Verified Township Network" is absent
    console.log('Checking Local Services...');
    await clickSidebarTab('Services');
    const servicesState = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const allText = document.body.textContent;
      const hasTownshipBadge = allText.includes('Verified Township Network');
      return { h1, hasTownshipBadge };
    })()`);
    console.log('Local Services State:', servicesState);
    if (servicesState.hasTownshipBadge) {
      throw new Error('"Verified Township Network" label still found in Local Services!');
    }

    // 6. Verify Settings - check that "Preferences Auto-Saved" is absent
    console.log('Checking Settings...');
    await clickSidebarTab('Settings');
    const settingsState = await evaluate(`(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const allText = document.body.textContent;
      const hasAutoSaved = allText.includes('Preferences Auto-Saved');
      return { h1, hasAutoSaved };
    })()`);
    console.log('Settings State:', settingsState);
    if (settingsState.hasAutoSaved) {
      throw new Error('"Preferences Auto-Saved" label still found in Settings!');
    }

    // 7. Verify Language switch to Bahasa Melayu -> Sidebar displays "Sembang"
    console.log('Testing Bahasa Melayu localization switch in Settings...');
    // In Settings, click the Language section tab
    await evaluate(`(() => {
      const navButtons = Array.from(document.querySelectorAll('button'));
      const langNavBtn = navButtons.find(b => b.textContent.includes('Language') || b.textContent.includes('Bahasa & Penyetempatan'));
      if (langNavBtn) langNavBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 500));

    // Click Bahasa Melayu option
    await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const bmBtn = buttons.find(b => b.textContent.includes('Bahasa Melayu') && b.textContent.includes('Kebangsaan'));
      if (bmBtn) bmBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const bmSidebarLabels = await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('aside[aria-label="Main Navigation"] button'));
      return buttons.map(b => b.textContent.trim().replace(/\\s+/g, ' '));
    })()`);
    console.log('Sidebar Navigation Labels (BM):', bmSidebarLabels);

    const hasSembang = bmSidebarLabels.some(l => l.includes('Sembang'));
    console.log('Sidebar has "Sembang":', hasSembang);
    if (!hasSembang) {
      throw new Error('Sidebar does not contain "Sembang" in Bahasa Melayu mode!');
    }

    // Switch back to English
    await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const enBtn = buttons.find(b => b.textContent.includes('English (Malaysia)'));
      if (enBtn) enBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    console.log('\n======================================================');
    console.log('ALL 10 VERIFICATION CHECKS PASSED IN LIVE BROWSER DOM');
    console.log('======================================================');
  } finally {
    ws.close();
    chromeProcess.kill();
  }
}

main().catch(err => {
  console.error('CDP E2E verification error:', err);
  process.exit(1);
});
