// Olympiad details and the registration window, set by the organisers in the admin panel
// (GET /api/meta/settings). Falls back to the built-in values if the API is unreachable.
import { api } from './api.js';
import { getLang } from './i18n.js';
import { humanDate, humanRange } from './ui.js';

const FALLBACK = {
  edition: 'XXX',
  year: 2026,
  name: { en: 'XXX International Astronomy Olympiad', ru: 'XXX Международная астрономическая олимпиада', uz: 'XXX Xalqaro astronomiya olimpiadasi' },
  city: { en: 'Andizhan', ru: 'Андижан', uz: 'Andijon' },
  country: { en: 'Uzbekistan', ru: 'Узбекистан', uz: 'Oʻzbekiston' },
  starts_on: '2026-12-06',
  ends_on: '2026-12-14',
  registration_opens_on: null,
  registration_closes_on: null,
  registration_status: 'open',
};

let current = { ...FALLBACK };
let loaded = null;

export function loadSettings(force = false) {
  if (!loaded || force) {
    loaded = api('/meta/settings', { auth: false })
      .then((s) => { current = { ...FALLBACK, ...s }; return current; })
      .catch(() => current);
  }
  return loaded;
}
export const settings = () => current;
export function setSettings(s) { current = { ...FALLBACK, ...s }; loaded = Promise.resolve(current); }

const pick = (obj) => (obj && (obj[getLang()] || obj.en)) || '';
export const olympiadName = () => pick(current.name);
export const olympiadPlace = () => `${pick(current.city)}, ${pick(current.country)}`;
export const olympiadDates = () => humanRange(current.starts_on, current.ends_on, getLang());
export const shortName = () => `IAO ${current.year}`;
export const registrationStatus = () => current.registration_status || 'open';
export const opensOn = () => humanDate(current.registration_opens_on, getLang());
export const closesOn = () => humanDate(current.registration_closes_on, getLang());
export const closesIso = () => current.registration_closes_on;
