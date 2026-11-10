import type { AddonService, Country, PricingRules } from './types';
let knownPricingVersion: string | undefined;
export const isAgencyPlugin = () => new URLSearchParams(location.search).get('plugin') === 'agency';
export function parentOrigin() {
  if (parent === window) return null;
  try { const origin = new URL(document.referrer).origin; return [location.origin, 'https://start.omeryigitler.com'].includes(origin) ? origin : null; } catch { return null; }
}
export function sendHost(data: unknown) { const origin = parentOrigin(); if (origin) parent.postMessage(data, origin); }
export function isHostEvent(event: MessageEvent) { return event.source === parent && Boolean(parentOrigin()) && event.origin === parentOrigin(); }
export async function moduleApi(action: string, body?: unknown) {
  const response = await fetch(`/api/agent?action=studio-${action}`, { method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) throw new Error(response.status === 401 ? 'Renew your Gateway session before saving.' : result.error || 'The pricing service is unavailable. Your inputs are still here.');
  if (action === 'pricing-config' || action === 'pricing-settings') {
    if (!result.config?.TR || !result.config?.MT || !Array.isArray(result.addons)) throw new Error('The pricing configuration is invalid. Retry the connection.');
    knownPricingVersion = result.version;
  }
  return result;
}
export async function saveProposal(payload: any) {
  if (!isAgencyPlugin()) { sendHost({ type: 'SAVE_QUOTE_FULL', payload }); return null; }
  const request = payload.request || payload;
  const bytes = new TextEncoder().encode(JSON.stringify(request));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const requestId = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2,'0')).join('');
  const result = await moduleApi('pricing-save', { requestId, request, pricingVersion: knownPricingVersion, projectId: request.projectId, messageId: request.messageId });
  sendHost({ type: 'TAURUS_PRICING_SAVED', projectId: result.projectId, quoteId: result.quoteId });
  return result;
}
export const saveSettings = (config: Record<Country,PricingRules>, addons: AddonService[]) => moduleApi('pricing-settings', { config, addons });
