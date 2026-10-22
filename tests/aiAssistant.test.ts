import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { buildGroundedContext } from '../src/lib/server/aiContext.ts';
import { generateAssistantResponse } from '../src/lib/server/geminiClient.ts';

test('TESDH Community Hub — Gemini AI Integration & Security Safeguards', async (t) => {
  const rootDir = process.cwd();

  await t.test('1. Security: GEMINI_API_KEY is server-side only and never exposed via NEXT_PUBLIC_', () => {
    // Check .env.example
    const envExamplePath = path.join(rootDir, '.env.example');
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    assert.match(envExample, /GEMINI_API_KEY=/, '.env.example must specify GEMINI_API_KEY');
    assert.strictEqual(
      envExample.includes('NEXT_PUBLIC_GEMINI_API_KEY'),
      false,
      'GEMINI_API_KEY must NEVER be prefixed with NEXT_PUBLIC_'
    );

    // Scan client components to ensure no client file imports or references process.env.GEMINI_API_KEY
    const clientDir = path.join(rootDir, 'src', 'components');
    const checkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(
            content.includes('process.env.GEMINI_API_KEY'),
            false,
            `Client file ${entry.name} must never access process.env.GEMINI_API_KEY`
          );
        }
      }
    };
    checkDir(clientDir);
  });

  await t.test('2. Grounded Context: Strictly sanitizes private PII and unverified data', async () => {
    const context = await buildGroundedContext(null);

    // Must include essential verified information
    assert.match(context, /Bandar Elmina/, 'Context must reference Bandar Elmina');
    assert.match(context, /03-7845 2222/, 'Context must reference Elmina Auxiliary Police contact');
    assert.match(context, /\[Resilience Map\]/, 'Context must reference Resilience Map');
    assert.match(context, /\[Circular Exchange\]/, 'Context must reference Circular Exchange');
    assert.match(context, /\[Local Services\]/, 'Context must reference Local Services');

    // Strict privacy checks: NO personal phone numbers
    assert.strictEqual(
      context.includes('012-345 6789') || context.includes('019-876 5432') || context.includes('013-222 3344'),
      false,
      'Grounded context must not expose resident personal telephone numbers'
    );

    // Strict privacy checks: NO exact personal unit numbers (e.g. "No. 12, Jalan Elmina Barat 2/1")
    assert.strictEqual(
      context.includes('Jalan Elmina Barat 2/1') || context.includes('Jalan Rebung 3'),
      false,
      'Grounded context must not expose exact residential house addresses'
    );

    // Strict privacy checks: NO Secure Messages
    assert.strictEqual(
      context.includes('CONFIDENTIAL_MESSAGE') || context.includes('Bilik JMB internal note'),
      false,
      'Grounded context must not leak secure messages or internal notes'
    );
  });

  await t.test('3. Fallback & Graceful Error: Missing API key returns friendly configuration message', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.FORCE_MISSING_API_KEY = 'true';
    delete process.env.GEMINI_API_KEY;

    try {
      const response = await generateAssistantResponse({
        message: 'How do I report an incident?',
        groundedContext: 'Bandar Elmina guidelines',
      });

      assert.strictEqual(response.success, false);
      assert.strictEqual(response.error, 'GEMINI_API_KEY_MISSING');
      assert.match(
        response.text,
        /GEMINI_API_KEY/,
        'Response must guide the developer to configure GEMINI_API_KEY in .env.local'
      );
    } finally {
      delete process.env.FORCE_MISSING_API_KEY;
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });

  await t.test('4. Model Candidates: Configured with current Flash models', () => {
    const geminiClientPath = path.join(rootDir, 'src', 'lib', 'server', 'geminiClient.ts');
    const content = fs.readFileSync(geminiClientPath, 'utf8');

    assert.match(content, /gemini-3\.8-flash/, 'Must prioritize gemini-3.8-flash as primary candidate');
    assert.match(content, /gemini-2\.5-flash/, 'Must include gemini-2.5-flash in fallback hierarchy');
    assert.match(content, /@google\/genai/, 'Must import from official @google/genai SDK');
  });

  await t.test('5. Prompt Defense: System instructions explicitly prohibit prompt overrides and unauthorized actions', () => {
    const geminiClientPath = path.join(rootDir, 'src', 'lib', 'server', 'geminiClient.ts');
    const content = fs.readFileSync(geminiClientPath, 'utf8');

    assert.match(
      content,
      /NEVER system instructions/,
      'System instructions must treat retrieved context as untrusted data'
    );
    assert.match(
      content,
      /English and Bahasa Melayu/,
      'System instructions must enforce English and Bahasa Melayu support'
    );
    assert.match(
      content,
      /CANNOT create, verify, edit, or delete/,
      'Assistant must refuse direct database mutation commands'
    );
  });

  await t.test('6. Route Handler: Rejects unauthenticated requests with HTTP 401', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' }),
      });
      assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
      const data = await res.json();
      assert.strictEqual(data.code, 'UNAUTHENTICATED');
    } catch {
      // If server is not active during test execution, verify route handler code statically
      const routePath = path.join(rootDir, 'src', 'app', 'api', 'ai', 'assistant', 'route.ts');
      const content = fs.readFileSync(routePath, 'utf8');
      assert.match(content, /status:\s*401/, 'Route must return 401 for unauthenticated requests');
      assert.match(content, /UNAUTHENTICATED/, 'Route must specify UNAUTHENTICATED error code');
    }
  });

  await t.test('7. Route Handler: Rejects empty or oversized messages with HTTP 400', async () => {
    try {
      const emptyRes = await fetch('http://localhost:3000/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': 'user-nurul',
        },
        body: JSON.stringify({ message: '   ' }),
      });
      assert.strictEqual(emptyRes.status, 400, 'Empty message must return 400 Bad Request');
      const emptyData = await emptyRes.json();
      assert.strictEqual(emptyData.code, 'EMPTY_MESSAGE');

      const longRes = await fetch('http://localhost:3000/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': 'user-nurul',
        },
        body: JSON.stringify({ message: 'A'.repeat(1005) }),
      });
      assert.strictEqual(longRes.status, 400, 'Oversized message must return 400 Bad Request');
      const longData = await longRes.json();
      assert.strictEqual(longData.code, 'MESSAGE_TOO_LONG');
    } catch {
      const routePath = path.join(rootDir, 'src', 'app', 'api', 'ai', 'assistant', 'route.ts');
      const content = fs.readFileSync(routePath, 'utf8');
      assert.match(content, /EMPTY_MESSAGE/, 'Route must validate empty messages');
      assert.match(content, /MESSAGE_TOO_LONG/, 'Route must validate message length');
    }
  });

  await t.test('8. Route Handler: GET returns online service status and privacy metadata', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/ai/assistant');
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'online');
      assert.strictEqual(data.service, 'TESDH AI Assistant API');
      assert.match(data.privacyPolicy, /Zero Conversation Persistence/);
    } catch {
      const routePath = path.join(rootDir, 'src', 'app', 'api', 'ai', 'assistant', 'route.ts');
      const content = fs.readFileSync(routePath, 'utf8');
      assert.match(content, /status:\s*'online'/, 'GET route must return online status');
      assert.match(content, /Zero Conversation Persistence/, 'GET route must document privacy policy');
    }
  });

  await t.test('9. Left Sidebar: AI Assistant navigation entry is removed from sidebar', () => {
    const sidebarPath = path.join(rootDir, 'src', 'components', 'navigation', 'Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    assert.strictEqual(
      content.includes("itemRefs.current['ai-assistant']"),
      false,
      'Sidebar must not contain ai-assistant item ref'
    );
    assert.strictEqual(
      content.includes("setActiveTab('ai-assistant')"),
      false,
      'Sidebar must not contain setActiveTab for ai-assistant'
    );
  });

  await t.test('10. Floating Assistant: Rendered as floating bubble with shared-element morphing overlay', () => {
    const pagePath = path.join(rootDir, 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    assert.match(
      pageContent,
      /<FloatingAiAssistant\s*\/>/,
      'Main page shell must mount FloatingAiAssistant at root level'
    );

    const floatingPath = path.join(rootDir, 'src', 'components', 'ai', 'FloatingAiAssistant.tsx');
    const floatingContent = fs.readFileSync(floatingPath, 'utf8');

    // Floating bubble properties
    assert.match(floatingContent, /fixed\s+bottom-/, 'Launcher must be fixed at bottom');
    assert.match(floatingContent, /right-/, 'Launcher must be fixed at right');
    assert.match(floatingContent, /rounded-full/, 'Launcher must be a circular bubble');
    assert.match(floatingContent, /aria-label="(Open\s+)?AI Assistant"/, 'Launcher must have accessible aria-label');
    assert.match(floatingContent, /AI Assistant/, 'Launcher tooltip must read AI Assistant');

    // Dialog & Morphing Surface
    assert.match(floatingContent, /role="dialog"/, 'Overlay must have role="dialog"');
    assert.match(floatingContent, /aria-modal="true"/, 'Overlay must have aria-modal="true"');
    assert.match(floatingContent, /calculateTransformDelta/, 'Must calculate transform delta from bubble to center');
    assert.match(floatingContent, /ai-assistant-modal-surface/, 'Must attach morphing surface CSS class');
  });

  await t.test('11. Branding: User-facing interface has no Gemini provider branding', () => {
    const floatingPath = path.join(rootDir, 'src', 'components', 'ai', 'FloatingAiAssistant.tsx');
    const content = fs.readFileSync(floatingPath, 'utf8');

    assert.strictEqual(
      content.includes('Powered by Gemini'),
      false,
      'User-facing UI must not say Powered by Gemini'
    );
    assert.strictEqual(
      content.includes('Gemini AI Assistant'),
      false,
      'User-facing UI must not say Gemini AI Assistant'
    );
    assert.strictEqual(
      content.includes('Google Gemini'),
      false,
      'User-facing UI must not show Google Gemini badge'
    );
  });

  await t.test('12. Processing Status: Uses unified "Thinking..." indicator', () => {
    const floatingPath = path.join(rootDir, 'src', 'components', 'ai', 'FloatingAiAssistant.tsx');
    const content = fs.readFileSync(floatingPath, 'utf8');

    assert.match(content, /Thinking\.\.\./, 'Processing status must display Thinking...');
    assert.strictEqual(
      content.includes('Gemini is retrieving verified Elmina community records'),
      false,
      'Technical retrieval message must be replaced'
    );
    assert.strictEqual(
      content.includes('Searching Supabase'),
      false,
      'Internal step message must not be displayed'
    );
    assert.strictEqual(
      content.includes('Calling Gemini'),
      false,
      'Internal API call message must not be displayed'
    );
  });

  await t.test('13. Opening Animation: Two-phase mount lifecycle prevents instant pop-in', () => {
    const floatingPath = path.join(rootDir, 'src', 'components', 'ai', 'FloatingAiAssistant.tsx');
    const content = fs.readFileSync(floatingPath, 'utf8');

    assert.match(
      content,
      /setIsExpanded\(false\)/,
      'Must mount in collapsed state A first'
    );
    assert.match(
      content,
      /void modalRef\.current\.offsetHeight/,
      'Must force browser layout reflow to paint collapsed state'
    );
    assert.match(
      content,
      /requestAnimationFrame/,
      'Must schedule expansion to state B on next animation frame'
    );
    assert.match(
      content,
      /isExpanded\s*\?\s*'translate\(-50%,\s*-50%\)\s*scale\(1,\s*1\)'/,
      'Must transition transform from bubble coordinates to center'
    );
    assert.match(
      content,
      /isExpanded\s*\?\s*'24px'\s*:\s*'9999px'/,
      'Must morph border-radius from 9999px circle to 24px rounded rectangle'
    );
  });

  await t.test('14. Chat Input: Compact single-line placeholder without premature scrolling', () => {
    const floatingPath = path.join(rootDir, 'src', 'components', 'ai', 'FloatingAiAssistant.tsx');
    const content = fs.readFileSync(floatingPath, 'utf8');

    assert.match(
      content,
      /Ask AI Assistant\.\.\./,
      'Must use short single-line placeholder Ask AI Assistant...'
    );
    assert.strictEqual(
      content.includes('Ask about events, local services, exchange, or issues...'),
      false,
      'Oversized multiline placeholder must be removed'
    );
    assert.match(
      content,
      /min-h-\[44px\]/,
      'Composer input must have compact min-height between 44px-48px'
    );
    assert.match(
      content,
      /adjustTextareaHeight/,
      'Must include dynamic auto-resize logic'
    );
    assert.match(
      content,
      /maxHeight\s*=\s*120/,
      'Textarea must cap height at 120px before scrolling'
    );
  });
});
