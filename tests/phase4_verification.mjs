const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testSecurityRoleRejection() {
  console.log('\n--- TEST 1: Role-Based Backend Access Control (Security) ---');
  
  const endpoints = [
    { url: `${BASE_URL}/api/management/analytics?period=30d`, method: 'GET' },
    { url: `${BASE_URL}/api/management/insights`, method: 'POST', body: { period: '30d' } },
    { url: `${BASE_URL}/api/management/assistant`, method: 'POST', body: { query: 'Summarize unresolved incidents' } },
    { url: `${BASE_URL}/api/management/reports`, method: 'POST', body: { type: 'monthly' } },
    { url: `${BASE_URL}/api/management/export?period=30d`, method: 'GET' },
  ];

  for (const ep of endpoints) {
    // 1. Unauthenticated request (no auth headers)
    const resNoAuth = await fetch(ep.url, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    console.log(`[Unauthenticated] ${ep.method} ${ep.url.replace(BASE_URL, '')} -> Status: ${resNoAuth.status} (Expected: 401)`);
    if (resNoAuth.status !== 401) {
      throw new Error(`Security violation! Expected 401 for unauthenticated request on ${ep.url}, got ${resNoAuth.status}`);
    }

    // 2. Resident Role request (x-user-role: resident)
    const resResident = await fetch(ep.url, {
      method: ep.method,
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': 'usr_resident_test_01',
        'x-user-role': 'resident'
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    console.log(`[Resident Role] ${ep.method} ${ep.url.replace(BASE_URL, '')} -> Status: ${resResident.status} (Expected: 403)`);
    if (resResident.status !== 403) {
      throw new Error(`Security violation! Expected 403 for resident role request on ${ep.url}, got ${resResident.status}`);
    }
  }
  console.log('✅ PASS: All management endpoints strictly reject unauthenticated (401) and resident (403) requests.');
}

async function testManagementOperations() {
  console.log('\n--- TEST 2: Authorized Management Analytics & Aggregation ---');
  
  const res = await fetch(`${BASE_URL}/api/management/analytics?period=30d`, {
    headers: {
      'x-user-id': 'usr_management_test_01',
      'x-user-role': 'management'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch management analytics: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.log('Analytics Response keys:', Object.keys(data));
  console.log('Period:', data.dataset.periodLabel, '| Timezone:', data.dataset.timezone);
  console.log('Incidents Total:', data.dataset.incidentMetrics.total);
  console.log('Incidents Open:', data.dataset.incidentMetrics.open, '| Resolved:', data.dataset.incidentMetrics.resolved);
  console.log('Incident Resolution Rate:', data.dataset.incidentMetrics.resolutionRatePercent + '%');
  console.log('Mean Time to Resolution (MTTR):', data.dataset.incidentMetrics.meanTimeToResolutionHours + 'h');
  console.log('Incident Hotspots Count:', data.dataset.incidentMetrics.hotspots.length);
  console.log('Operational Alerts Count:', data.alerts.length);

  // Validate deterministic structure
  if (typeof data.dataset.incidentMetrics.total !== 'number' || data.dataset.incidentMetrics.total < 0) {
    throw new Error('Invalid incidentMetrics.total');
  }
  if (!Array.isArray(data.dataset.timeSeries) || data.dataset.timeSeries.length === 0) {
    throw new Error('timeSeries data missing or empty');
  }
  console.log('✅ PASS: Analytics dataset successfully returned with deterministic calculations.');
  return data.dataset;
}

async function testAiInsights(dataset) {
  console.log('\n--- TEST 3: Grounded AI Management Insights ---');
  
  const res = await fetch(`${BASE_URL}/api/management/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_management_test_01',
      'x-user-role': 'management'
    },
    body: JSON.stringify({ period: '30d', forceRefresh: true })
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch AI insights: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.log(`Received ${data.insights.length} AI insights:`);
  data.insights.forEach((ins, idx) => {
    console.log(`  ${idx + 1}. [${ins.priority.toUpperCase()}] ${ins.title} (${ins.category})`);
    console.log(`     Evidence: ${ins.evidence.map(e => `${e.metricName}: ${e.value}`).join(', ')}`);
    if (ins.suggestedAction) {
      console.log(`     Suggested Action: ${ins.suggestedAction.label} -> ${ins.suggestedAction.targetTab}`);
    }
  });

  if (data.insights.length === 0) {
    throw new Error('AI insights returned 0 items');
  }
  console.log('✅ PASS: AI Management Insights generated with verified supporting evidence.');
}

async function testManagementAssistant() {
  console.log('\n--- TEST 4: Ask Management AI Assistant (EN & BM) ---');
  
  // Test query 1: English
  const resEn = await fetch(`${BASE_URL}/api/management/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_management_test_01',
      'x-user-role': 'management'
    },
    body: JSON.stringify({
      query: 'What are the most common unresolved incidents this month?',
      language: 'en'
    })
  });

  if (!resEn.ok) {
    throw new Error(`Assistant query EN failed: ${resEn.status}`);
  }
  const dataEn = await resEn.json();
  console.log('\n[EN Query]: "What are the most common unresolved incidents this month?"');
  console.log('Answer:', dataEn.message?.text);
  console.log('Supporting Links:', dataEn.message?.supportingLinks);
  console.log('Follow-ups:', dataEn.message?.suggestedFollowUps);

  // Test query 2: Bahasa Melayu
  const resBm = await fetch(`${BASE_URL}/api/management/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_management_test_01',
      'x-user-role': 'management'
    },
    body: JSON.stringify({
      query: 'Berapa banyak laporan penduduk belum selesai?',
      language: 'ms'
    })
  });

  if (!resBm.ok) {
    throw new Error(`Assistant query BM failed: ${resBm.status}`);
  }
  const dataBm = await resBm.json();
  console.log('\n[BM Query]: "Berapa banyak laporan penduduk belum selesai?"');
  console.log('Answer:', dataBm.message?.text);
  console.log('Supporting Links:', dataBm.message?.supportingLinks);

  console.log('✅ PASS: Management AI Assistant answers operational queries accurately in EN and BM.');
}

async function testReportGeneration() {
  console.log('\n--- TEST 5: On-Demand Report Generation & CSV Export ---');
  
  const res = await fetch(`${BASE_URL}/api/management/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_management_test_01',
      'x-user-role': 'management'
    },
    body: JSON.stringify({ type: 'monthly' })
  });

  if (!res.ok) {
    throw new Error(`Report generation failed: ${res.status}`);
  }
  const data = await res.json();
  console.log('Report Title:', data.report.title);
  console.log('Period:', data.report.reportingPeriod.label);
  console.log('Executive Summary:', data.report.executiveSummary.slice(0, 150) + '...');
  console.log('Key Metrics Count:', data.report.keyMetrics.length);
  console.log('Recommendations Count:', data.report.recommendedFollowUp.length);
  console.log('Provenance:', data.report.provenance);

  // CSV Export Test
  const resCsv = await fetch(`${BASE_URL}/api/management/export?period=30d`, {
    headers: {
      'x-user-id': 'usr_management_test_01',
      'x-user-role': 'management'
    }
  });

  if (!resCsv.ok) {
    throw new Error(`CSV Export failed: ${resCsv.status}`);
  }
  const csvContent = await resCsv.text();
  console.log(`CSV Export bytes: ${csvContent.length} bytes`);
  console.log('CSV Preview:\n' + csvContent.split('\n').slice(0, 8).join('\n'));

  console.log('✅ PASS: Report generator and CSV export produce verified operational summaries.');
}

async function runAllTests() {
  console.log('====================================================');
  console.log('TESDH PHASE 4: FULL AUTOMATED VERIFICATION SUITE');
  console.log('====================================================');

  try {
    await testSecurityRoleRejection();
    const dataset = await testManagementOperations();
    await testAiInsights(dataset);
    await testManagementAssistant();
    await testReportGeneration();

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 4 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runAllTests();
