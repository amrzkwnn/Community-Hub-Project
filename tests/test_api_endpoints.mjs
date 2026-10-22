/**
 * HTTP Integration Test Suite for TESDH Moderation & Management Endpoints
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testApi() {
  console.log(`Connecting to ${BASE_URL}...`);
  let passed = 0;
  let total = 0;

  function assert(cond, name, details = '') {
    total++;
    if (cond) {
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       ${details}`);
    }
  }

  // 1. Report without auth -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/moderation/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'post',
        targetId: 'test-unauth-post',
        reason: 'spam',
      }),
    });
    assert(res.status === 401, 'POST /api/moderation/report unauthenticated -> 401 Unauthorized');
  } catch (e) {
    console.warn('Server may not be running locally:', e.message);
    return;
  }

  // 2. Report with Resident Auth -> 200
  const residentRes = await fetch(`${BASE_URL}/api/moderation/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tesdh-session': 'user-nurul', // Resident profile ID
    },
    body: JSON.stringify({
      targetType: 'post',
      targetId: 'test-resident-post-1',
      targetTitle: 'Questionable Post',
      targetContent: 'Is anyone selling fireworks?',
      reason: 'dangerous_content',
      details: 'Illegal fireworks selling inquiry.',
    }),
  });
  const residentData = await residentRes.json();
  assert(
    residentRes.status === 200 && residentData.success === true && residentData.report?.id,
    'POST /api/moderation/report with resident auth -> 200 OK and returns persisted report',
    `Report ID: ${residentData.report?.id}`
  );

  // 3. Debounce repeated report
  const dupRes = await fetch(`${BASE_URL}/api/moderation/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tesdh-session': 'user-nurul',
    },
    body: JSON.stringify({
      targetType: 'post',
      targetId: 'test-resident-post-1',
      targetTitle: 'Questionable Post',
      targetContent: 'Is anyone selling fireworks?',
      reason: 'dangerous_content',
      details: 'Clicking button again',
    }),
  });
  const dupData = await dupRes.json();
  assert(
    dupRes.status === 200 && dupData.isDuplicate === true,
    'POST /api/moderation/report debounces repeat submissions within 5m',
    `isDuplicate: ${dupData.isDuplicate}`
  );

  // 4. Resident tries to access Management Cases -> 403 Forbidden
  const forbiddenCasesRes = await fetch(`${BASE_URL}/api/moderation/cases`, {
    headers: { 'x-tesdh-session': 'user-nurul' },
  });
  assert(
    forbiddenCasesRes.status === 403,
    'GET /api/moderation/cases by resident -> 403 Forbidden (Strict Server-Side Guard)'
  );

  // 5. Management accesses Cases -> 200 OK
  const mgmtCasesRes = await fetch(`${BASE_URL}/api/moderation/cases`, {
    headers: { 'x-tesdh-session': 'user-azman' }, // Management profile ID
  });
  const mgmtCasesData = await mgmtCasesRes.json();
  assert(
    mgmtCasesRes.status === 200 && Array.isArray(mgmtCasesData.cases),
    'GET /api/moderation/cases by management -> 200 OK with unified cases array',
    `Cases count: ${mgmtCasesData.cases?.length}, Total reports: ${mgmtCasesData.manualReports?.length}`
  );

  // 6. Resident tries to execute moderation decision -> 403 Forbidden
  const forbiddenActionRes = await fetch(`${BASE_URL}/api/moderation/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tesdh-session': 'user-nurul',
    },
    body: JSON.stringify({
      targetId: 'test-resident-post-1',
      action: 'removed',
    }),
  });
  assert(
    forbiddenActionRes.status === 403,
    'POST /api/moderation/action by resident -> 403 Forbidden (Unauthorized Take Down Blocked)'
  );

  // 7. Management executes action -> 200 OK
  const mgmtActionRes = await fetch(`${BASE_URL}/api/moderation/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tesdh-session': 'user-azman',
    },
    body: JSON.stringify({
      targetId: 'test-resident-post-1',
      targetType: 'post',
      action: 'kept',
      note: 'Verified harmless community question.',
    }),
  });
  const mgmtActionData = await mgmtActionRes.json();
  assert(
    mgmtActionRes.status === 200 && mgmtActionData.success === true,
    'POST /api/moderation/action by management -> 200 OK and decision logged',
    `Decision: ${mgmtActionData.action}`
  );

  // 8. Management inspects and retries jobs
  const jobsRes = await fetch(`${BASE_URL}/api/moderation/jobs`, {
    headers: { 'x-tesdh-session': 'user-azman' },
  });
  const jobsData = await jobsRes.json();
  assert(
    jobsRes.status === 200 && Array.isArray(jobsData.jobs),
    'GET /api/moderation/jobs by management -> 200 OK with job outbox list',
    `Jobs count: ${jobsData.jobs?.length}`
  );

  console.log(`\nHTTP Integration Summary: ${passed} / ${total} passed.`);
}

testApi().catch(console.error);
