/* Presentation never authorizes access: Firebase admin claims and the server session do. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('vault-stage');
  const passkey = $('passkey-btn');
  const telegram = $('telegram-fallback-btn');
  const status = $('status-desc');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let busy = false;
  let attempt = 0;
  let timer;
  let booted = false;
  let supportsPasskey = false;
  const requestId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
  const setStatus = (text, error = false) => { status.textContent = text; status.classList.toggle('is-error', error); };
  function motion() {
    document.documentElement.classList.toggle('motion-paused', paused || reduced.matches || document.hidden);
    $('motion-toggle').setAttribute('aria-pressed', String(paused || reduced.matches));
    $('motion-toggle').textContent = reduced.matches ? 'Reduced motion' : paused ? 'Enable motion' : 'Pause motion';
    $('motion-toggle').disabled = reduced.matches;
  }
  $('motion-toggle').addEventListener('click', () => { paused = !paused; motion(); });
  document.addEventListener('visibilitychange', motion);
  reduced.addEventListener('change', () => { paused = reduced.matches; motion(); });
  motion();
  async function api(action, body = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/gateway?action=${action}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many attempts. Please wait before trying again.' : data.error || 'Connection unavailable. Please try again.');
      return data;
    } finally { clearTimeout(timeout); }
  }
  function setBusy(value) {
    busy = value; passkey.disabled = value; telegram.disabled = value;
    $('challenge-container').setAttribute('aria-busy', String(value));
    stage.classList.toggle('is-verifying', value);
  }
  function methods() {
    passkey.classList.toggle('hidden', !supportsPasskey);
    telegram.classList.remove('hidden');
    $('telegram-code-box').classList.add('hidden');
    $('cancel-auth').classList.add('hidden');
    $('error-container').classList.add('hidden');
    $('challenge-container').classList.remove('hidden');
    setBusy(false);
  }
  function fail(message) {
    clearTimeout(timer); ++attempt; setBusy(false);
    $('challenge-container').classList.add('hidden');
    $('cancel-auth').classList.add('hidden');
    $('error-container').classList.remove('hidden');
    $('error-msg').textContent = message;
    setStatus('Verification incomplete', true);
    $('retry-auth').focus();
  }
  async function init() {
    setBusy(true);
    setStatus('Preparing secure access…');
    try {
      if (!window.firebase?.auth) throw new Error('Secure sign-in could not load. Check your connection and retry.');
      await api('bootstrap');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let data;
      try {
        const response = await fetch('/api/gateway?action=passkey_status', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Verification service unavailable.');
        data = await response.json();
      } finally { clearTimeout(timeout); }
      supportsPasskey = Boolean(data.enabled && window.SimpleWebAuthnBrowser?.browserSupportsWebAuthn?.());
      booted = true; methods();
      setStatus(supportsPasskey ? 'Your secure workspace awaits.' : 'Continue with Telegram verification.');
    } catch (error) { booted = false; fail(error.message || 'Connection unavailable. Please try again.'); }
  }
  async function grant(customToken, current) {
    if (current !== attempt) return;
    if (!customToken) throw new Error('Verification could not be completed. Please try again.');
    clearTimeout(timer);
    $('cancel-auth').classList.add('hidden');
    const session = await firebase.auth().signInWithCustomToken(customToken);
    const token = await session.user.getIdTokenResult(true);
    if (token.claims.admin !== true || token.claims.role !== 'admin') {
      await firebase.auth().signOut(); throw new Error('Admin authorization required.');
    }
    await api('session', { idToken: token.token });
    if (current !== attempt) return;
    try { sessionStorage.setItem('authToken', 'valid'); localStorage.removeItem('authToken'); } catch (_) { /* Server session is authoritative. */ }
    setStatus('Access verified. Welcome back.');
    $('cancel-auth').classList.add('hidden');
    stage.classList.remove('is-verifying'); stage.classList.add('is-unlocking');
    document.documentElement.classList.add('access-granted');
    const finish = () => {
      if (new URLSearchParams(location.search).get('target') === 'startpage' && parent !== window) {
        parent.postMessage({ type: 'taurus-vault-complete' }, location.origin);
      } else { location.assign('/admin.html'); }
    };
    if (paused || reduced.matches) finish(); else setTimeout(finish, 2700);
  }
  passkey.addEventListener('click', async () => {
    if (busy || !booted) return;
    setBusy(true); const current = ++attempt; const reqId = requestId();
    setStatus('Confirm with your device.');
    try {
      const optionsJSON = await api('passkey_challenge', { reqId });
      const response = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON });
      const verified = await api('passkey_verify', { reqId, response });
      if (!verified.verified) throw new Error('Verification failed.');
      await grant(verified.customToken, current);
    } catch (error) {
      if (current !== attempt) return;
      methods(); setStatus(error.name === 'NotAllowedError' ? 'Cancelled. Try again or use Telegram.' : error.message, true);
    }
  });
  telegram.addEventListener('click', async () => {
    if (busy || !booted) return;
    setBusy(true); const current = ++attempt; const reqId = requestId();
    setStatus('Sending your verification request…');
    try {
      const data = await api('auth_init', { reqId, userAgent: navigator.userAgent });
      if (current !== attempt) return;
      if (!Number.isInteger(data.challengeCode)) throw new Error('Verification request unavailable.');
      $('challenge-code').textContent = String(data.challengeCode);
      $('telegram-code-box').classList.remove('hidden');
      $('cancel-auth').classList.remove('hidden');
      setStatus('Choose this number in your Telegram message.');
      const expiresAt = Date.now() + Math.min(Number(data.expiresInMs) || 300000, 300000);
      const poll = async () => {
        if (current !== attempt) return;
        if (Date.now() >= expiresAt) return fail('This request expired. Start a new verification.');
        try {
          const result = await api('check_status', { reqId });
          if (current !== attempt) return;
          if (result.status === 'approved') { await grant(result.customToken, current); return; }
          if (['denied', 'expired', 'consumed', 'cancelled'].includes(result.status)) return fail('This request is no longer available. Start a new verification.');
        } catch (error) {
          if (current !== attempt) return;
          // A consumed approval is never replayed after a lost response.
          if (stage.classList.contains('is-unlocking')) return;
          setStatus('Reconnecting to verification…');
        }
        timer = setTimeout(poll, 2000);
      };
      timer = setTimeout(poll, 2000);
    } catch (error) { if (current === attempt) fail(error.message); }
  });
  $('cancel-auth').addEventListener('click', () => { ++attempt; clearTimeout(timer); methods(); setStatus('Choose a verification method.'); });
  $('retry-auth').addEventListener('click', () => { if (!booted) init(); else { methods(); setStatus('Choose a verification method.'); } });
  window.addEventListener('pagehide', () => { ++attempt; clearTimeout(timer); });
  init();
})();
