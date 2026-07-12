# Resend deliverability runbook

The contact endpoint sends two transactional messages:

- an owner notification
- a customer receipt after the request has been accepted by Firestore, Telegram, or the owner email channel

The code uses plain-text content, stable sender identities, request idempotency, and separate Resend tags for each message type.

## 1. Recommended sending domain

Use a dedicated subdomain such as `mail.omeryigitler.com` in Resend. This isolates transactional-mail reputation from the website/root domain while keeping the brand relationship clear.

1. Add `mail.omeryigitler.com` in Resend.
2. Copy the SPF and DKIM records shown by Resend exactly into the DNS provider.
3. Wait until Resend reports the domain as **Verified**.
4. Set these Vercel environment variables:

```text
CONTACT_NOTIFICATION_FROM=Ömer Yiğitler Website <notifications@mail.omeryigitler.com>
CONTACT_RECEIPT_FROM=Ömer Yiğitler <notifications@mail.omeryigitler.com>
CONTACT_EMAIL_TO=info@omeryigitler.com
```

Until the subdomain is verified, keep the current `@omeryigitler.com` sender values. Do not switch the application to an unverified domain.

## 2. SPF and DKIM

Resend generates the required SPF and DKIM records in the domain dashboard.

- Publish every record exactly as displayed.
- Do not create two separate SPF TXT records at the same hostname. If another provider also sends mail for that hostname, merge all authorized senders into one SPF policy.
- Re-run Resend verification after any DNS change.

## 3. DMARC

Create an aggregate-report mailbox or alias first, for example `dmarc@omeryigitler.com`, then publish this TXT record:

```text
Host: _dmarc.omeryigitler.com
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@omeryigitler.com; fo=1; adkim=r; aspf=r; pct=100
```

Keep `p=none` while monitoring reports. After SPF/DKIM alignment is consistently clean:

1. move to `p=quarantine; pct=25`
2. increase the percentage gradually
3. finish with `p=reject; pct=100`

Do not move directly to reject if Google Workspace, forwarding services, forms, or another provider also sends email for the domain.

## 4. Resend domain settings

For transactional contact receipts:

- Keep open tracking disabled.
- Keep click tracking disabled unless it is genuinely required.
- Configure a credible custom Return-Path such as `bounce` or `outbound` in the Resend domain settings.
- Use the same sender address consistently for the same email category.
- Avoid `no-reply@`; the application uses a replyable `notifications@` identity and `info@omeryigitler.com` as Reply-To.

## 5. Reputation and warm-up

For a new domain, subdomain, or new sending vendor:

- start at low volume
- increase gradually without sudden spikes
- send only requested transactional mail
- stop sending to addresses that bounce or complain
- avoid artificial warm-up services

Add the authenticated sending domain to Google Postmaster Tools and monitor domain reputation and spam rate.

## 6. Verification checklist

Send a real contact request to a Gmail account, then use **Show original** in Gmail. Confirm:

```text
SPF: PASS
DKIM: PASS
DMARC: PASS
```

Also check the sent email in Resend **Deliverability Insights**. Resolve warnings for:

- missing or invalid DMARC
- links that do not match the sending domain
- missing plain-text content
- `no-reply` sender addresses
- excessive body size
- tracking on sensitive/transactional messages

The application now sends concise plain-text receipts with one matching-domain URL and no promotional language.

## 7. When Gmail still places mail in spam

- Mark a legitimate test message as **Not spam**.
- Reply to it and add the sender to contacts during the initial reputation-building period.
- Check Google Postmaster Tools for domain/IP reputation and spam complaints.
- Confirm that the Resend domain remains verified and that no DNS record was removed or duplicated.
- Check whether a corporate recipient uses Mimecast, Proofpoint, Barracuda, or another quarantine layer.

DNS authentication and sender reputation cannot be fixed only in application code. The code changes reduce avoidable signals; SPF, DKIM, DMARC, domain verification, and gradual reputation building complete the deliverability work.
