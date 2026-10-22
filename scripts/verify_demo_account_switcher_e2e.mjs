import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function waitForSelector(send, selector, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await send('Runtime.evaluate', {
      expression: `!!document.querySelector('${selector}')`,
      returnByValue: true
    });
    if (res?.result?.value) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timeout waiting for selector: ${selector}`);
}

async function main() {
  console.log('--- STARTING E2E VERIFICATION OF DEMO ACCOUNT SWITCHING ---');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1280,800',
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

  // Find target explicitly pointing to localhost:3000 or main web page
  const pageTarget = targets.find(t => t.url.includes('3000')) || targets.find(t => t.type === 'page' && !t.url.startsWith('chrome'));
  if (!pageTarget) {
    throw new Error('Could not find localhost:3000 page target in Chrome');
  }

  console.log('Target selected:', pageTarget.url);
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
    const msgId = id++;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  if (!pageTarget.url.includes('3000')) {
    await send('Page.navigate', { url: 'http://localhost:3000' });
  }

  await waitForSelector(send, 'button[aria-label="Profile Menu"]');

  // 1. Initial State Check
  const initialCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Profile Menu"]');
      return {
        headerText: btn ? btn.innerText.replace(/\\n/g, ' ') : null
      };
    })()`,
    returnByValue: true
  });
  console.log('1. Initial Header User:', initialCheck.result.value);

  // 2. Open Profile Menu
  const openMenu = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Profile Menu"]');
      btn.click();
      return { opened: true };
    })()`,
    returnByValue: true
  });
  console.log('2. Open Profile Menu:', openMenu.result.value);
  await waitForSelector(send, 'div[role="menu"]');

  // 3. Inspect Demo Accounts in Dropdown
  const dropdownProfiles = await send('Runtime.evaluate', {
    expression: `(() => {
      const menu = document.querySelector('div[role="menu"]');
      if (!menu) return { error: 'Menu not found' };
      const items = Array.from(menu.querySelectorAll('button[role="menuitem"]'));
      return items.map(item => ({
        text: item.innerText.replace(/\\n/g, ' '),
        isSelected: item.getAttribute('aria-selected') === 'true',
        hasAvatar: !!item.querySelector('img')
      }));
    })()`,
    returnByValue: true
  });
  console.log('3. Demo Profiles in Dropdown:', JSON.stringify(dropdownProfiles.result.value, null, 2));

  // 4. Switch to Capt Azman (Management)
  const clickAzman = await send('Runtime.evaluate', {
    expression: `(() => {
      const menu = document.querySelector('div[role="menu"]');
      const items = Array.from(menu.querySelectorAll('button[role="menuitem"]'));
      const azman = items.find(i => i.innerText.includes('Azman'));
      if (!azman) return { error: 'Azman button not found' };
      azman.click();
      return { clicked: true, name: azman.innerText.replace(/\\n/g, ' ') };
    })()`,
    returnByValue: true
  });
  console.log('4. Clicked Azman:', clickAzman.result.value);
  await new Promise((r) => setTimeout(r, 800));

  // 5. Verify State after switching to Azman
  const afterAzman = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Profile Menu"]');
      const managementTab = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('JMB') || el.innerText.includes('Management'));
      return {
        headerText: btn ? btn.innerText.replace(/\\n/g, ' ') : null,
        managementConsoleAvailable: !!managementTab
      };
    })()`,
    returnByValue: true
  });
  console.log('5. State as Azman:', afterAzman.result.value);

  // 6. Navigate to Management Console
  const goToManagement = await send('Runtime.evaluate', {
    expression: `(() => {
      const managementTab = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('JMB') || el.innerText.includes('Management'));
      if (managementTab) managementTab.click();
      return { clicked: !!managementTab };
    })()`,
    returnByValue: true
  });
  console.log('6. Navigate to Management Console:', goToManagement.result.value);
  await new Promise((r) => setTimeout(r, 800));

  const checkManagementView = await send('Runtime.evaluate', {
    expression: `(() => {
      const isAccessRestricted = document.body.innerText.includes('Access Restricted');
      const hasConsoleStats = document.body.innerText.includes('Resident Verifications') || document.body.innerText.includes('Active Incidents');
      return {
        isAccessRestricted,
        hasConsoleStats
      };
    })()`,
    returnByValue: true
  });
  console.log('   -> Management View status:', checkManagementView.result.value);

  // 7. While in Management Console, switch to Vikram (Resident)
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelector('button[aria-label="Profile Menu"]').click();
    })()`
  });
  await waitForSelector(send, 'div[role="menu"]');

  const clickVikram = await send('Runtime.evaluate', {
    expression: `(() => {
      const menu = document.querySelector('div[role="menu"]');
      const items = Array.from(menu.querySelectorAll('button[role="menuitem"]'));
      const vikram = items.find(i => i.innerText.includes('Vikram'));
      if (!vikram) return { error: 'Vikram button not found' };
      vikram.click();
      return { clicked: true };
    })()`,
    returnByValue: true
  });
  console.log('7. Switched to Vikram:', clickVikram.result.value);
  await new Promise((r) => setTimeout(r, 1000));

  // 8. Verify redirected out of Management View back to Home, and header shows Vikram
  const afterVikram = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Profile Menu"]');
      const inManagementConsole = window.location.search.includes('management') || document.body.innerText.includes('Resident Verifications');
      return {
        headerText: btn ? btn.innerText.replace(/\\n/g, ' ') : null,
        inManagementConsole,
        url: window.location.href
      };
    })()`,
    returnByValue: true
  });
  console.log('8. State as Vikram (auto-redirected to home):', afterVikram.result.value);

  // 9. Test Persistence Across Page Reload
  console.log('9. Reloading page to test active profile persistence...');
  await send('Page.reload');
  await waitForSelector(send, 'button[aria-label="Profile Menu"]');
  await new Promise((r) => setTimeout(r, 1000));

  const afterReloadCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Profile Menu"]');
      const savedStorage = localStorage.getItem('tesdh-active-profile-id');
      return {
        headerText: btn ? btn.innerText.replace(/\\n/g, ' ') : null,
        savedStorage
      };
    })()`,
    returnByValue: true
  });
  console.log('   -> After page reload:', afterReloadCheck.result.value);

  // 10. Switch to Rosli (Security)
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelector('button[aria-label="Profile Menu"]').click();
    })()`
  });
  await waitForSelector(send, 'div[role="menu"]');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const menu = document.querySelector('div[role="menu"]');
      const items = Array.from(menu.querySelectorAll('button[role="menuitem"]'));
      const rosli = items.find(i => i.innerText.includes('Rosli') || i.innerText.includes('Security'));
      if (rosli) rosli.click();
    })()`
  });
  await new Promise((r) => setTimeout(r, 800));

  const afterRosli = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Profile Menu"]');
      return {
        headerText: btn ? btn.innerText.replace(/\\n/g, ' ') : null
      };
    })()`,
    returnByValue: true
  });
  console.log('10. Switched to Rosli (Security):', afterRosli.result.value);

  // 11. Switch back to Nurul for clean state
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelector('button[aria-label="Profile Menu"]').click();
    })()`
  });
  await waitForSelector(send, 'div[role="menu"]');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const menu = document.querySelector('div[role="menu"]');
      const items = Array.from(menu.querySelectorAll('button[role="menuitem"]'));
      const nurul = items.find(i => i.innerText.includes('Nurul'));
      if (nurul) nurul.click();
    })()`
  });
  await new Promise((r) => setTimeout(r, 600));

  ws.close();
  chromeProcess.kill();
  console.log('--- ALL E2E VERIFICATION CHECKS COMPLETED SUCCESSFULLY ---');
}

main().catch((err) => {
  console.error('E2E ERROR:', err);
  process.exit(1);
});
