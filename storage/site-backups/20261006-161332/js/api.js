// Thin client for the IAO 2026 Laravel API (Sanctum bearer tokens).
import { t, has } from './i18n.js';

export const API_BASE = (window.IAO_CONFIG && window.IAO_CONFIG.apiBase) || 'https://register.easypos.uz/api';
const TOKEN_KEY = 'iao-token';

export function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
export function setToken(tok) { try { tok ? localStorage.setItem(TOKEN_KEY, tok) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }

export class ApiError extends Error {
  constructor(status, message, fields = {}, list = [], code = '') {
    super(message);
    this.status = status;
    this.fields = fields; // { field: 'localised message' }
    this.list = list;     // array of messages (team/submit 422)
    this.code = code;     // machine-readable reason from the API, e.g. 'account_pending'
  }
}

// Server validation messages arrive in English or Uzbek regardless of the UI
// language, so known patterns are mapped to our own translated messages.
export function localiseServerMessage(msg, field = '') {
  const m = String(msg || '').toLowerCase();
  if (/required|majburiy/.test(m)) return t('err.required');
  if (/valid email|email address/.test(m)) return t('err.email');
  if (/confirmation does not match/.test(m)) return t('err.passwordMatch');
  if (/at least 8/.test(m)) return t('err.minPassword');
  if (/already registered a team/.test(m)) return t('err.countryTaken');
  if (/already has this iao code/.test(m)) return t('adm.iaoCodeTaken');
  if (/iao code is two or three/.test(m)) return t('adm.iaoCodeFormat');
  if (/already been taken|band|mavjud/.test(m)) return field === 'email' ? t('err.emailTaken') : t('err.taken');
  if (/country code/.test(m)) return t('err.phone');
  if (/bosh harf|capital|upper/.test(m)) return t('err.caps');
  if (/latin|lotin|26 ta/.test(m)) return field.endsWith('_en') || field.startsWith('emergency_') ? t('err.latinName') : t('err.latinText');
  if (/must be a date before|before today|oldin/.test(m)) return t('err.datePast');
  if (/after today|kelajak/.test(m)) return t('err.dateFuture');
  if (/jpg|jpeg|mimes/.test(m)) return t('err.jpg');
  if (/5120|kilobytes|5 mb/.test(m)) return t('err.size5');
  if (/dimensions|900/.test(m)) return t('err.photoSize', { w: '?', h: '?' });
  if (/may not be greater than|must not be greater than/.test(m)) return t('err.invalid');
  if (/noto.g.ri|incorrect|credentials/.test(m) && field === 'email') return t('err.loginFailed');
  return msg; // unknown: show the server text as is
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

export async function api(path, { method = 'GET', body, form, raw = false, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  const tok = getToken();
  if (auth && tok) headers.Authorization = `Bearer ${tok}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: payload });
  } catch (e) {
    throw new ApiError(0, t('err.network'));
  }
  if (raw && res.ok) return res;
  let data = null;
  if (res.status !== 204) data = await res.json().catch(() => null);
  if (res.ok) return data;

  const msg = data && data.message;
  const code = (data && data.code) || '';
  if (code && has(`code.${code}`)) throw new ApiError(res.status, t(`code.${code}`), {}, [], code);
  switch (res.status) {
    case 401:
      if (auth && tok) { setToken(null); onUnauthorized(); }
      throw new ApiError(401, t('err.session'));
    case 403: throw new ApiError(403, t('err.forbidden'));
    case 404: throw new ApiError(404, t('err.notFound'));
    case 409: throw new ApiError(409, t('err.unverified'));
    case 423: throw new ApiError(423, t('err.locked'));
    case 429: throw new ApiError(429, t('err.tooMany'));
    case 422: {
      const fields = {};
      let list = [];
      if (data && data.errors && !Array.isArray(data.errors)) {
        for (const [k, v] of Object.entries(data.errors)) fields[k] = localiseServerMessage(Array.isArray(v) ? v[0] : v, k);
      } else if (data && Array.isArray(data.errors)) list = data.errors;
      throw new ApiError(422, msg || t('err.invalid'), fields, list);
    }
    default: throw new ApiError(res.status, t('err.server'));
  }
}

// Fetch a protected file (passport scan / photo / CSV) and return an object URL.
export async function fetchBlobUrl(path) {
  const res = await api(path, { raw: true });
  return URL.createObjectURL(await res.blob());
}
