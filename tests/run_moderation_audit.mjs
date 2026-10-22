import { evaluateFastDeterministicRules, processModerationJob } from '../src/lib/server/aiModeration.ts';
import { 
  addManualReport, 
  getManualReports, 
  getUnifiedCases, 
  recordAiModerationItem, 
  enqueueModerationJob,
  getModerationJobs,
  updateModerationJob,
  getModerationHealth,
  executeUnifiedCaseAction,
  resetStoreForTesting
} from '../src/lib/server/moderationStore.ts';

async function runAudit() {
  console.log('================================================================');
  console.log('   TESDH COMMUNITY HUB — MODERATION & MANAGEMENT VERIFICATION   ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, name, details = '') {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${name}`);
      if (details) console.log(`       ${details}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${name}`);
      if (details) console.error(`       ${details}`);
    }
  }

  resetStoreForTesting();

  // -------------------------------------------------------------
  // TEST A: Profanity & "Fuck Everyone (Test)" Analysis
  // -------------------------------------------------------------
  console.log('--- TEST A: AI Profanity & "Fuck Everyone (Test)" Handling ---');
  
  const testPostContent = "Fuck Everyone (Test)";
  const evalResult = evaluateFastDeterministicRules('post', testPostContent, testPostContent);
  
  assert(
    evalResult !== null && evalResult.isViolation === true,
    'Fast deterministic detection flags "Fuck Everyone (Test)"',
    `Violated: ${evalResult?.isViolation}, Category: ${evalResult?.category}, Risk: ${evalResult?.riskLevel}`
  );

  assert(
    evalResult?.category === 'harassment',
    'Categorized as harassment/profanity policy violation',
    `Category: ${evalResult?.category}`
  );

  assert(
    evalResult?.riskLevel === 'medium',
    'Risk level is medium (does NOT trigger autonomous instant deletion)',
    `Risk: ${evalResult?.riskLevel}`
  );

  // Enqueue as durable background job
  const job = enqueueModerationJob({
    contentType: 'post',
    contentId: 'test-post-fuck-everyone',
    contentTitle: 'Fuck Everyone (Test)',
    contentText: 'Fuck Everyone (Test)',
    authorId: 'resident-user-1',
    authorName: 'Test Resident'
  });

  assert(
    job && job.status === 'pending',
    'Durable moderation job created and persisted in pending state',
    `Job ID: ${job.id}, Status: ${job.status}`
  );

  // Process job
  const processedJob = await processModerationJob(job);
  assert(
    processedJob.status === 'completed' && processedJob.result?.flaggedCategory === 'harassment',
    'Moderation job processed successfully with violation flag recorded',
    `Result ID: ${processedJob.resultId}, Flagged Category: ${processedJob.result?.flaggedCategory}`
  );

  // Verify in Unified Cases
  const casesAfterAi = getUnifiedCases();
  const caseItem = casesAfterAi.find(c => c.targetId === 'test-post-fuck-everyone');
  assert(
    caseItem !== undefined && caseItem.aiFlag !== undefined,
    'AI Flag appears in Unified Moderation Case queue for human management review',
    `Case ID: ${caseItem?.id}, Status: ${caseItem?.overallStatus}, Risk: ${caseItem?.highestRisk}`
  );

  // -------------------------------------------------------------
  // TEST B: Manual Reporting Flow & Persistence
  // -------------------------------------------------------------
  console.log('\n--- TEST B: Manual Resident Report Flow ---');

  const reportRes = addManualReport({
    reporterId: 'resident-nurul',
    reporterName: 'Nurul Huda',
    targetType: 'post',
    targetId: 'test-post-fuck-everyone',
    targetTitle: 'Fuck Everyone (Test)',
    targetContent: 'Fuck Everyone (Test)',
    reason: 'offensive_language',
    details: 'This post is using vulgar profanity directed at all residents.'
  });
  const manualReport = reportRes.report;

  assert(
    manualReport && manualReport.id.startsWith('rep-'),
    'Manual resident report successfully saved with unique ID',
    `Report ID: ${manualReport.id}`
  );

  // Duplicate submission test (debouncing within 5m)
  const dupRes = addManualReport({
    reporterId: 'resident-nurul',
    reporterName: 'Nurul Huda',
    targetType: 'post',
    targetId: 'test-post-fuck-everyone',
    targetTitle: 'Fuck Everyone (Test)',
    targetContent: 'Fuck Everyone (Test)',
    reason: 'offensive_language',
    details: 'Spamming the button again'
  });
  const dupReport = dupRes.report;

  assert(
    dupReport.id === manualReport.id && dupRes.isDuplicate === true,
    'Duplicate reporting debounce prevents spamming duplicate database records',
    `Original: ${manualReport.id}, Dup: ${dupReport.id}, IsDuplicate: ${dupRes.isDuplicate}`
  );

  // Unified case aggregation
  const casesAfterReport = getUnifiedCases();
  const aggregatedCase = casesAfterReport.find(c => c.targetId === 'test-post-fuck-everyone');
  assert(
    aggregatedCase !== undefined && aggregatedCase.reports.length === 1 && aggregatedCase.aiFlag !== undefined,
    'Unified review case merges both AI Flag and Resident Manual Report on same target',
    `Reports count: ${aggregatedCase?.reports.length}, Has AI Flag: ${Boolean(aggregatedCase?.aiFlag)}`
  );

  // -------------------------------------------------------------
  // TEST C: Independent Operation (AI Failure Resiliency)
  // -------------------------------------------------------------
  console.log('\n--- TEST C: AI & Manual Reporting Independence ---');

  // Enqueue a job and simulate failure
  const failingJob = enqueueModerationJob({
    contentType: 'post',
    contentId: 'gemini-fail-test',
    contentTitle: 'Content with Simulated Network Outage',
    contentText: 'Something completely benign that causes network timeout',
    authorId: 'resident-user-2',
    authorName: 'Resident Two'
  });

  // Mark job as failed
  updateModerationJob(failingJob.id, {
    status: 'failed',
    lastError: 'Gemini upstream API 503 Service Unavailable timeout'
  });

  const jobsList = getModerationJobs();
  const failedJobEntry = jobsList.find(j => j.id === failingJob.id);
  assert(
    failedJobEntry?.status === 'failed',
    'Failed AI moderation job is captured in durable job queue with failure reason',
    `Status: ${failedJobEntry?.status}, Error: ${failedJobEntry?.lastError}`
  );

  // Submit manual report on the same post where AI failed
  const manualReportOnFailedAi = addManualReport({
    reporterId: 'resident-farhan',
    reporterName: 'Farhan',
    targetType: 'post',
    targetId: 'gemini-fail-test',
    targetTitle: 'Content with Simulated Network Outage',
    targetContent: 'Something that citizen reports anyway',
    reason: 'spam',
    details: 'Looks like spam advert'
  });

  const failReportObj = manualReportOnFailedAi.report;
  assert(
    failReportObj !== null && failReportObj.status === 'pending',
    'Manual resident reporting remains 100% operational even when AI moderation fails',
    `Report ID: ${failReportObj?.id}, Status: ${failReportObj?.status}`
  );

  const health = getModerationHealth();
  assert(
    health.failedJobs >= 1,
    'Management health telemetry accurately tracks failed jobs for administrative retry',
    `Failed jobs count: ${health.failedJobs}`
  );

  // -------------------------------------------------------------
  // TEST D: Management Action & Audit Trail
  // -------------------------------------------------------------
  console.log('\n--- TEST D: Management Officer Review & Audit Execution ---');

  if (aggregatedCase) {
    const actionResult = executeUnifiedCaseAction(
      aggregatedCase.id,
      'removed',
      'Duty Officer Capt Azman: Confirmed profanity policy violation, content taken down.',
      'user-azman',
      'Capt. Azman (Rtd.)'
    );

    assert(
      actionResult.success === true,
      'Management officer executes consequential action (Take Down)',
      `Success: ${actionResult.success}, Action: removed`
    );

    const postActionCase = getUnifiedCases().find(c => c.id === aggregatedCase.id);
    assert(
      postActionCase?.overallStatus === 'removed' && postActionCase.reviewedBy === 'Capt. Azman (Rtd.)',
      'Case status updated to "removed" with officer identification and notes',
      `Status: ${postActionCase?.overallStatus}, Auditor: ${postActionCase?.reviewedBy}`
    );
  }

  // -------------------------------------------------------------
  // TEST E: Policy Accuracy & False Positive Protection
  // -------------------------------------------------------------
  console.log('\n--- TEST E: Language Accuracy & Management Criticism Protection ---');

  // 1. Malay profanity
  const malayProfanity = evaluateFastDeterministicRules('post', 'Kurang ajar', 'pukimak kau sial');
  assert(
    malayProfanity?.isViolation === true && malayProfanity?.category === 'harassment',
    'Detects Bahasa Melayu profanity ("pukimak kau sial")',
    `Category: ${malayProfanity?.category}, Risk: ${malayProfanity?.riskLevel}`
  );

  // 2. Manglish / mixed abuse
  const manglishAbuse = evaluateFastDeterministicRules('post', 'Hey bastard', 'bodoh idiot waste of space');
  assert(
    manglishAbuse?.isViolation === true,
    'Detects Manglish / English mixed abusive language ("bodoh idiot")',
    `Violated: ${manglishAbuse?.isViolation}`
  );

  // 3. Management Criticism (Must be SAFE!)
  const managementCriticism = evaluateFastDeterministicRules(
    'post',
    'Late security boom gate repair',
    'The Sime Darby management office and JMB are being too slow to fix the boom gate at Elmina Green 3 entrance. Maintenance fees should be spent properly!'
  );
  assert(
    managementCriticism === null || managementCriticism.isViolation === false,
    'Management criticism is strictly PROTECTED as civic feedback (Zero False Flag)',
    `Result: ${managementCriticism ? 'Flagged' : 'Passed as Safe'}`
  );

  // 4. Benign neighborhood inquiry
  const benignInquiry = evaluateFastDeterministicRules(
    'post',
    'Cardboard boxes giveaway',
    'Hi neighbors, I have 10 clean moving boxes from my relocation. Free to pick up at EV2!'
  );
  assert(
    benignInquiry === null || benignInquiry.isViolation === false,
    'Benign neighborhood activity is passed without flagging',
    `Result: ${benignInquiry ? 'Flagged' : 'Passed as Safe'}`
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   AUDIT COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
