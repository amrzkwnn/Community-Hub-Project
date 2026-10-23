import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateInquiryInput,
  generateReferenceId,
  checkRateLimit,
  createContactInquiry,
  listContactInquiries,
  updateInquiryStatus,
} from '../src/lib/server/contactInquiries.ts';

test('Contact Inquiries: generates valid reference ID format', () => {
  const refId = generateReferenceId();
  assert.match(refId, /^INQ-\d{8}-[A-Z0-9]{4}$/, 'Reference ID should follow INQ-YYYYMMDD-XXXX format');
});

test('Contact Inquiries: validates required fields accurately', () => {
  // Empty inputs
  const emptyRes = validateInquiryInput({
    fullName: '',
    email: '',
    category: 'general',
    message: '',
  });
  assert.equal(emptyRes.isValid, false);
  assert.ok(emptyRes.errors.fullName, 'Should require fullName');
  assert.ok(emptyRes.errors.email, 'Should require email');
  assert.ok(emptyRes.errors.message, 'Should require message');

  // Invalid email format
  const invalidEmailRes = validateInquiryInput({
    fullName: 'Ahmad Albab',
    email: 'not-an-email',
    category: 'general',
    message: 'Valid message content of sufficient length.',
  });
  assert.equal(invalidEmailRes.isValid, false);
  assert.ok(invalidEmailRes.errors.email, 'Should reject invalid email format');

  // Short message (< 10 chars)
  const shortMsgRes = validateInquiryInput({
    fullName: 'Ahmad Albab',
    email: 'ahmad@example.com',
    category: 'maintenance',
    message: 'Too short',
  });
  assert.equal(shortMsgRes.isValid, false);
  assert.ok(shortMsgRes.errors.message, 'Should reject message shorter than 10 characters');

  // Valid input
  const validRes = validateInquiryInput({
    fullName: 'Puan Halimah',
    email: 'halimah@elmina.my',
    phone: '+60 12-345 6789',
    category: 'security',
    message: 'Requesting auxiliary police patrol near playground in evening.',
  });
  assert.equal(validRes.isValid, true);
  assert.equal(Object.keys(validRes.errors).length, 0);
});

test('Contact Inquiries: rate limiter blocks rapid duplicates', () => {
  const testId = `test-client-${Date.now()}`;
  
  // First request should succeed
  const first = checkRateLimit(testId);
  assert.equal(first.allowed, true);

  // Immediate second request within 5s cooldown should be blocked
  const second = checkRateLimit(testId);
  assert.equal(second.allowed, false);
  assert.ok(second.retryAfterSeconds! > 0);
});

test('Contact Inquiries: persists inquiry durably and allows management retrieval', async () => {
  const testInquiry = await createContactInquiry({
    fullName: 'Encik Razali',
    email: 'razali.test@elmina.my',
    phone: '017-999 8888',
    category: 'maintenance',
    message: 'Testing durable inquiry storage and retrieval by management.',
  });

  assert.ok(testInquiry.id);
  assert.ok(testInquiry.referenceId);
  assert.equal(testInquiry.status, 'new');

  // Retrieve inquiries
  const inquiries = await listContactInquiries();
  const found = inquiries.find((i) => i.referenceId === testInquiry.referenceId);
  assert.ok(found, 'Created inquiry must be retrievable from storage');
  assert.equal(found?.fullName, 'Encik Razali');
  assert.equal(found?.category, 'maintenance');

  // Update status
  const updated = await updateInquiryStatus(testInquiry.referenceId, 'in_review', 'Officer Salleh reviewing.');
  assert.ok(updated);
  assert.equal(updated?.status, 'in_review');
  assert.equal(updated?.adminNotes, 'Officer Salleh reviewing.');
});
