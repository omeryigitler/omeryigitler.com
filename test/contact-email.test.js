const test = require('node:test');
const assert = require('node:assert/strict');

const { sendResendEmail } = require('../api/contact')._test;

test('sendResendEmail sends an idempotent Resend request', async (t) => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;

  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    global.fetch = previousFetch;
  });

  process.env.RESEND_API_KEY = 're_test_key';
  let captured = null;
  global.fetch = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'email_test_123' })
    };
  };

  const payload = {
    from: 'Ömer Yiğitler <notifications@omeryigitler.com>',
    to: ['customer@example.com'],
    subject: 'We received your project request',
    text: 'Your request was received.'
  };

  const result = await sendResendEmail(payload, 'contact-receipt-request-123');

  assert.deepEqual(result, { sent: true, id: 'email_test_123' });
  assert.equal(captured.url, 'https://api.resend.com/emails');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, 'Bearer re_test_key');
  assert.equal(captured.options.headers['Idempotency-Key'], 'contact-receipt-request-123');
  assert.deepEqual(JSON.parse(captured.options.body), payload);
});

test('sendResendEmail reports a missing Resend key without making a request', async (t) => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;

  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    global.fetch = previousFetch;
  });

  delete process.env.RESEND_API_KEY;
  global.fetch = async () => {
    throw new Error('fetch must not be called');
  };

  const result = await sendResendEmail({ to: ['customer@example.com'] }, 'unused');
  assert.deepEqual(result, { sent: false, reason: 'not_configured' });
});

test('sendResendEmail includes the Resend error detail', async (t) => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;

  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    global.fetch = previousFetch;
  });

  process.env.RESEND_API_KEY = 're_test_key';
  global.fetch = async () => ({
    ok: false,
    status: 422,
    json: async () => ({ message: 'Domain is not verified' })
  });

  await assert.rejects(
    () => sendResendEmail({ to: ['customer@example.com'] }, 'request-422'),
    /422: Domain is not verified/
  );
});
