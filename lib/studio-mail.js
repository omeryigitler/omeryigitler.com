const { failure } = require('./studio-policy');
const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
function address(value) {
  const s = String(value || '').trim();
  if (/[\r\n]/.test(s)) return '';
  const match = s.match(/<([^<>]+)>$/), email = match ? match[1] : s;
  return emailPattern.test(email) && email.length <= 160 ? s : '';
}
function createMail({ env = process.env, fetchImpl = fetch, smtpFactory } = {}) {
  function status() {
    const from = address(env.STUDIO_MAIL_FROM || env.CONTACT_RECEIPT_FROM || env.CONTACT_EMAIL_FROM) || 'Ömer Yiğitler <info@omeryigitler.com>';
    const replyTo = address(env.STUDIO_MAIL_REPLY_TO || env.CONTACT_EMAIL_TO) || 'info@omeryigitler.com';
    return { from, replyTo,
      smtpConfigured: Boolean(env.STUDIO_SMTP_HOST && ['465','587'].includes(String(env.STUDIO_SMTP_PORT || '465')) && env.STUDIO_SMTP_USER && env.STUDIO_SMTP_PASS && address(env.STUDIO_MAIL_FROM)),
      permissionedConfigured: Boolean(env.RESEND_API_KEY), dailyLimit: 10 };
  }
  function provider(contact) { return contact.basis === 'first_contact' ? 'smtp' : 'resend'; }
  function assertReady(name) {
    const s = status();
    if (name === 'smtp' && !s.smtpConfigured) throw failure('mail_connection_required', 'Connect your work mailbox on the server before first-contact emails can be sent. Your prepared work is saved.');
    if (name === 'resend' && !s.permissionedConfigured) throw failure('mail_connection_required', 'The permissioned email connection is not configured.');
  }
  async function send(payload, key, name) {
    assertReady(name);
    if (name === 'resend') {
      let response;
      try {
        response = await fetchImpl('https://api.resend.com/emails', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
          body: JSON.stringify({ from: payload.from, to: [payload.to], reply_to: payload.replyTo, subject: payload.subject, text: payload.text,
            attachments: payload.attachments.map(f => ({ filename: f.name, content: f.base64 })) }) });
      } catch { throw failure('mail_retryable', 'The email provider did not confirm acceptance. Retry the same reviewed message within 23 hours.', 503); }
      if (!response.ok) throw failure(response.status === 429 || response.status >= 500 ? 'mail_retryable' : 'mail_rejected', 'The email provider did not accept the message. Check the connection before retrying.', 503);
      const result = await response.json().catch(() => ({}));
      if (typeof result.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(result.id)) throw failure('mail_retryable', 'Email acceptance could not be verified. Retry the same message within 23 hours.', 503);
      return { id: result.id, accepted: true };
    }
    const make = smtpFactory || (options => require('nodemailer').createTransport(options));
    const port = Number(env.STUDIO_SMTP_PORT || 465);
    const transport = make({ host: env.STUDIO_SMTP_HOST, port, secure: port === 465, requireTLS: true,
      auth: { user: env.STUDIO_SMTP_USER, pass: env.STUDIO_SMTP_PASS }, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false });
    try {
      const result = await transport.sendMail({ from: payload.from, to: payload.to, replyTo: payload.replyTo, subject: payload.subject, text: payload.text,
        messageId: `<${key}@omeryigitler.com>`, disableFileAccess: true, disableUrlAccess: true,
        attachments: payload.attachments.map(f => ({ filename: f.name, content: Buffer.from(f.base64, 'base64'), contentType: f.type })) });
      if (!result.accepted?.some(e => String(e).toLowerCase() === payload.to.toLowerCase())) throw failure('mail_rejected', 'The mailbox did not accept this recipient.', 503);
      return { id: String(result.messageId || `<${key}@omeryigitler.com>`).slice(0, 200), accepted: true };
    } catch (error) {
      const beforeData = /^(CONN|CONNECT|EHLO|HELO|STARTTLS|AUTH|MAIL FROM|RCPT TO)$/i.test(error.command || '');
      if (error.code === 'mail_rejected' || Number(error.responseCode) >= 400 || ['EAUTH','EDNS','ECONNREFUSED','ETLS','EENVELOPE'].includes(error.code) || error.code === 'ECONNECTION' && beforeData) throw failure('mail_rejected', 'The work mailbox rejected the message. Check its connection and recipient before retrying.', 503);
      throw failure('delivery_unknown', 'The mailbox did not confirm the result. Check Sent mail before continuing; this message will not be resent automatically.', 503);
    } finally { transport.close?.(); }
  }
  return { status, provider, assertReady, send };
}
module.exports = { createMail, address, emailPattern };

