import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('TESDH Community Hub — Remove Header Labels & Rename Secure Message to Chat', () => {
  const rootDir = process.cwd();

  it('1. Resilience Map: decorative "Live Monitoring" header badge is removed', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'resilience', 'ResilienceView.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.strictEqual(content.includes('Resilience Map'), true, 'Resilience Map title must remain');
    assert.strictEqual(content.includes('Live Monitoring'), false, 'Live Monitoring badge must be removed');
  });

  it('2. Exchange: decorative "Verified Neighbourhood Reuse" header badge is removed', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'exchange', 'ExchangeView.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.strictEqual(content.includes('Exchange'), true, 'Exchange title must remain');
    assert.strictEqual(content.includes('Verified Neighbourhood Reuse'), false, 'Verified Neighbourhood Reuse badge must be removed');
  });

  it('3. Local Services: decorative "Verified Township Network" header badge is removed', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'services', 'ServicesView.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.strictEqual(content.includes('Local Services &amp; Mutual Aid'), true, 'Local Services title must remain');
    assert.strictEqual(content.includes('Verified Township Network'), false, 'Verified Township Network badge must be removed');
  });

  it('4. Settings: decorative "Preferences Auto-Saved" header badge is removed', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'settings', 'SettingsView.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.strictEqual(content.includes('Settings &amp; Preferences'), true, 'Settings title must remain');
    assert.strictEqual(content.includes('Preferences Auto-Saved'), false, 'Preferences Auto-Saved badge must be removed');
  });

  it('5. Secure Messages: "Municipal Protocol" text, icon, and badge are completely removed from upper UI', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'messages', 'MessagesView.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.strictEqual(content.includes('Municipal Protocol') || content.includes('Municipal E2EE Protocol'), false, 'Municipal Protocol text must be removed');
    assert.strictEqual(content.includes('Request Resident Contact'), true, 'Request Resident Contact action must remain');
    assert.strictEqual(content.includes('Key Audit'), true, 'Key Audit action must remain');
  });

  it('6. Left navigation sidebar displays "Chat" in English and "Sembang" in Bahasa Melayu', () => {
    const translationsPath = path.join(rootDir, 'src', 'lib', 'i18n', 'translations.ts');
    const content = fs.readFileSync(translationsPath, 'utf8');

    // English
    assert.match(
      content,
      /englishStrings[\s\S]*?navMessages:\s*'Chat'/,
      'English navigation must display Chat'
    );

    // Malay
    assert.match(
      content,
      /malayStrings[\s\S]*?navMessages:\s*'Sembang'/,
      'Bahasa Melayu navigation must display Sembang'
    );
  });

  it('7. Left navigation sidebar preserves messaging icon, tab target, and unread badge', () => {
    const sidebarPath = path.join(rootDir, 'src', 'components', 'navigation', 'Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    // Nav target remains 'messages'
    assert.strictEqual(content.includes("handleNavClick('messages')"), true, 'Navigation destination must remain "messages"');
    // Icon remains chat_bubble
    assert.strictEqual(content.includes('chat_bubble'), true, 'Chat icon must remain chat_bubble');
    // Consumes t('navMessages')
    assert.strictEqual(content.includes("{t('navMessages')}"), true, 'Sidebar must render t(navMessages)');
  });

  it('8. Functional status indicators, incident verification states, and message counters remain intact', () => {
    const messagesPath = path.join(rootDir, 'src', 'components', 'messages', 'MessagesView.tsx');
    const messagesContent = fs.readFileSync(messagesPath, 'utf8');
    assert.strictEqual(messagesContent.includes('{userConversations.length}'), true, 'Message conversation count must remain');
    assert.strictEqual(messagesContent.includes('Encrypted'), true, 'Encrypted security indicator must remain');

    const resiliencePath = path.join(rootDir, 'src', 'components', 'resilience', 'ResilienceView.tsx');
    const resilienceContent = fs.readFileSync(resiliencePath, 'utf8');
    assert.strictEqual(resilienceContent.includes('isVerified'), true, 'Incident verification logic must remain intact');
  });
});
