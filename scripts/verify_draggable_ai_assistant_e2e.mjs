import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('--- STARTING CDP E2E VERIFICATION: DRAGGABLE AI ASSISTANT WITH MAGNETIC EDGE SNAPPING ---');
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

    // 1. Initial State Check
    const initialLauncherInfo = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      const parent = btn.parentElement;
      return {
        exists: true,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        parentLeft: parent.style.left,
        parentTop: parent.style.top,
        storage: localStorage.getItem('tesdh_ai_bubble_position')
      };
    })()`);
    console.log('1. Initial Launcher Position:', initialLauncherInfo);
    if (!initialLauncherInfo) {
      throw new Error('AI Assistant launcher button not found in live DOM!');
    }

    // 2. Click to open verification
    console.log('2. Testing Click to Open...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const openState = await evaluate(`(() => {
      const dialog = document.querySelector('div[role="dialog"][aria-label="AI Assistant"]');
      return {
        isOpen: !!dialog,
        display: dialog ? window.getComputedStyle(dialog).display : 'none',
        hasInput: !!document.querySelector('textarea')
      };
    })()`);
    console.log('Modal Opened State:', openState);
    if (!openState.isOpen || !openState.hasInput) {
      throw new Error('Click did not open AI Assistant chat modal!');
    }

    // 3. Close the modal
    console.log('3. Closing Modal...');
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close AI Assistant"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const closedState = await evaluate(`(() => {
      const dialog = document.querySelector('div[role="dialog"][aria-label="AI Assistant"]');
      const launcher = document.querySelector('button[aria-label="Open AI Assistant"]');
      return {
        isOpen: !!dialog,
        launcherVisible: !!launcher
      };
    })()`);
    console.log('Modal Closed State:', closedState);
    if (closedState.isOpen || !closedState.launcherVisible) {
      throw new Error('Modal did not close properly back to launcher!');
    }

    const dragMouse = async (fromX, fromY, toX, toY, steps = 10) => {
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: Math.round(fromX),
        y: Math.round(fromY),
        button: 'left',
        buttons: 1,
        clickCount: 1
      });
      await new Promise(r => setTimeout(r, 40));
      for (let i = 1; i <= steps; i++) {
        const currX = fromX + ((toX - fromX) * i) / steps;
        const currY = fromY + ((toY - fromY) * i) / steps;
        await send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: Math.round(currX),
          y: Math.round(currY),
          button: 'left',
          buttons: 1
        });
        await new Promise(r => setTimeout(r, 25));
      }
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: Math.round(toX),
        y: Math.round(toY),
        button: 'left',
        buttons: 0
      });
    };

    // 4. Test Dragging towards Left Edge (Native Mouse Events)
    console.log('4. Testing Dragging toward Left Edge via native mouse events...');
    const startPos = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    await dragMouse(startPos.x, startPos.y, 60, 400, 15);
    // Wait for 350ms snap transition
    await new Promise(r => setTimeout(r, 600));

    const leftSnappedInfo = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      const rect = btn.getBoundingClientRect();
      const storage = JSON.parse(localStorage.getItem('tesdh_ai_bubble_position') || '{}');
      const dialog = document.querySelector('div[role="dialog"][aria-label="AI Assistant"]');
      return {
        left: rect.left,
        top: rect.top,
        storageEdge: storage.edge,
        dialogOpenedDuringDrag: !!dialog
      };
    })()`);
    console.log('Left Snapped Info:', leftSnappedInfo);
    if (leftSnappedInfo.dialogOpenedDuringDrag) {
      throw new Error('Dragging accidentally triggered opening of chat modal!');
    }
    if (leftSnappedInfo.storageEdge !== 'left' || leftSnappedInfo.left > 60) {
      throw new Error(`Bubble did not snap to left edge! Got left=${leftSnappedInfo.left}, edge=${leftSnappedInfo.storageEdge}`);
    }

    // 5. Test Dragging towards Top Edge
    console.log('5. Testing Dragging toward Top Edge via native mouse events...');
    const curPos = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    await dragMouse(curPos.x, curPos.y, 500, 90, 15);
    await new Promise(r => setTimeout(r, 600));

    const topSnappedInfo = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      const rect = btn.getBoundingClientRect();
      const storage = JSON.parse(localStorage.getItem('tesdh_ai_bubble_position') || '{}');
      return {
        left: rect.left,
        top: rect.top,
        storageEdge: storage.edge
      };
    })()`);
    console.log('Top Snapped Info:', topSnappedInfo);
    if (topSnappedInfo.storageEdge !== 'top' || topSnappedInfo.top < 75) {
      throw new Error(`Bubble did not snap safely to top edge! Got top=${topSnappedInfo.top}, edge=${topSnappedInfo.storageEdge}`);
    }

    // 6. Test Keyboard Repositioning (ArrowRight -> snap to right)
    console.log('6. Testing Keyboard Repositioning (ArrowRight)...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      btn.focus();
      btn.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        code: 'ArrowRight',
        bubbles: true
      }));
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const rightSnappedInfo = await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      const rect = btn.getBoundingClientRect();
      const storage = JSON.parse(localStorage.getItem('tesdh_ai_bubble_position') || '{}');
      return {
        left: rect.left,
        top: rect.top,
        storageEdge: storage.edge
      };
    })()`);
    console.log('Right Snapped Info (via ArrowRight):', rightSnappedInfo);
    if (rightSnappedInfo.storageEdge !== 'right') {
      throw new Error(`ArrowRight did not snap bubble to right edge! Got edge=${rightSnappedInfo.storageEdge}`);
    }

    // 7. Test Opening and Closing from newly positioned spot
    console.log('7. Testing Modal Morph from new location...');
    await evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Open AI Assistant"]');
      btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const secondOpenState = await evaluate(`(() => {
      const dialog = document.querySelector('div[role="dialog"][aria-label="AI Assistant"]');
      return {
        isOpen: !!dialog
      };
    })()`);
    console.log('Second Open State:', secondOpenState);
    if (!secondOpenState.isOpen) {
      throw new Error('Could not open modal from custom snapped location!');
    }

    // Close again
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close AI Assistant"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    console.log('\n======================================================');
    console.log('ALL DRAGGABLE AI ASSISTANT E2E CHECKS PASSED IN LIVE DOM');
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
