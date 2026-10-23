import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9336;
const PROFILE_DIR = path.resolve(os.tmpdir(), 'chrome-stitch-profile');
const OUTPUT_DIR = path.resolve(process.cwd(), 'scratch', 'stitch-screenshots');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
  console.log('Launching headless Chrome for Stitch visual verification...');
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=390,844',
      'http://localhost:3000/?tab=home',
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
    console.error('Could not connect to Chrome CDP port');
    chromeProcess.kill();
    process.exit(1);
  }

  const client = new CDPClient(targetWsUrl);
  await client.connect();
  console.log('Connected to Chrome via CDP.');

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  // Helper to set viewport
  async function setViewport(width, height, isMobile = true) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
      screenWidth: width,
      screenHeight: height,
    });
  }

  // Helper to capture and save screenshot
  async function capture(filename) {
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  }

  // Helper to navigate and wait
  async function navigate(url, waitMs = 2500) {
    await client.send('Page.navigate', { url });
    await sleep(waitMs);
  }

  try {
    console.log('\n--- VERIFYING AT 390px MOBILE VIEWPORT ---');
    await setViewport(390, 844, true);

    // 1. Mobile Home
    console.log('1. Capturing Mobile Home (390px)...');
    await navigate('http://localhost:3000/?tab=home');
    await capture('1_mobile_home_390.png');

    // 2. Mobile Community Feed
    console.log('2. Capturing Mobile Community Feed (390px)...');
    await navigate('http://localhost:3000/?tab=feed');
    await capture('2_mobile_feed_390.png');

    // 2b. Discussion Detail Modal with Title Fix
    console.log('2b. Opening individual discussion post to verify Discussion Title Fix...');
    await client.evaluate(`(() => {
      // Find and click on the first post title or post card
      const postCard = document.querySelector('article');
      if (postCard) {
        const titleOrContent = postCard.querySelector('h2') || postCard.querySelector('h3') || postCard.querySelector('p');
        if (titleOrContent) titleOrContent.click();
      }
    })()`);
    await sleep(1500);
    await capture('2b_mobile_discussion_detail_title_390.png');

    // Close modal
    await client.evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close post view"]') || document.querySelector('button[aria-label="Back to Community Feed"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(800);

    // 3. Mobile Resilience Map
    console.log('3. Capturing Mobile Resilience Map (390px)...');
    await navigate('http://localhost:3000/?tab=resilience');
    await capture('3_mobile_map_390.png');

    // 4. Mobile Exchange
    console.log('4. Capturing Mobile Exchange (390px)...');
    await navigate('http://localhost:3000/?tab=exchange');
    await capture('4_mobile_exchange_390.png');

    // 5. Mobile Local Services
    console.log('5. Capturing Mobile Local Services (390px)...');
    await navigate('http://localhost:3000/?tab=services');
    await capture('5_mobile_services_390.png');

    // 6. Mobile Messages
    console.log('6. Capturing Mobile Messages (390px)...');
    await navigate('http://localhost:3000/?tab=messages');
    await capture('6_mobile_messages_390.png');

    // 7. Mobile Settings
    console.log('7. Capturing Mobile Settings (390px)...');
    await navigate('http://localhost:3000/?tab=settings');
    await capture('7_mobile_settings_390.png');

    console.log('\n--- VERIFYING AT 360px & 430px MOBILE VIEWPORTS ---');
    // 360px viewport check
    await setViewport(360, 740, true);
    await navigate('http://localhost:3000/?tab=home');
    await capture('mobile_home_360.png');
    await navigate('http://localhost:3000/?tab=feed');
    await capture('mobile_feed_360.png');

    // 430px viewport check
    await setViewport(430, 932, true);
    await navigate('http://localhost:3000/?tab=home');
    await capture('mobile_home_430.png');
    await navigate('http://localhost:3000/?tab=feed');
    await capture('mobile_feed_430.png');

    console.log('\n--- VERIFYING DESKTOP (1440px) UNCHANGED ---');
    await setViewport(1440, 900, false);
    await navigate('http://localhost:3000/?tab=home');
    await capture('desktop_home_1440.png');

    await navigate('http://localhost:3000/?tab=feed');
    await capture('desktop_feed_1440.png');

    // Desktop Discussion Detail with Title
    console.log('Opening desktop discussion detail modal...');
    await client.evaluate(`(() => {
      const postCard = document.querySelector('article');
      if (postCard) {
        const titleOrContent = postCard.querySelector('h3') || postCard.querySelector('p');
        if (titleOrContent) titleOrContent.click();
      }
    })()`);
    await sleep(1500);
    await capture('desktop_discussion_detail_title_1440.png');

    console.log('\nAll visual verification screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    client.close();
    chromeProcess.kill();
  }
}

main().catch(console.error);
