// Shared UI helpers: escaping, icons, toasts, confirm dialog, date conversion.
import { t } from './i18n.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const I = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  astronaut: '<svg class="emblem" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sx-marble" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FD8FF" stop-opacity=".28"/><stop offset="1" stop-color="#66CCFF" stop-opacity=".06"/></linearGradient><radialGradient id="sx-star"><stop offset="0" stop-color="#FFF8DC"/><stop offset=".5" stop-color="#FFD36B" stop-opacity=".55"/><stop offset="1" stop-color="#FFD36B" stop-opacity="0"/></radialGradient></defs><path d="M4 16H116" stroke="#66CCFF" stroke-opacity=".25" stroke-width="1" stroke-dasharray="2 3"/><path d="M103.1 64A96 96 0 0 1 20 112L20 98A82 82 0 0 0 91 57Z" fill="url(#sx-marble)"/><path d="M89.6 61.2L99.7 67.7M86.3 66L95.9 73.2M82.6 70.5L91.7 78.3M78.7 74.7L87.2 83.2M74.5 78.6L82.3 87.7M70 82.3L77.2 91.9M65.2 85.6L71.7 95.7M60.2 88.6L66.1 99.1M55.1 91.2L60.1 102.1M49.7 93.5L54 104.7M44.3 95.4L47.8 106.8M38.7 96.9L41.4 108.6M33 98L34.9 109.8M27.2 98.7L28.3 110.6M21.4 99L21.7 111" stroke="#9FD8FF" stroke-opacity=".35" stroke-width=".9"/><path d="M103.1 64A96 96 0 0 1 20 112" fill="none" stroke="#CFEAFF" stroke-width="3" stroke-linecap="round"/><path d="M91 57A82 82 0 0 1 20 98" fill="none" stroke="#CFEAFF" stroke-width="3" stroke-linecap="round"/><path d="M102.7 67.7L104.4 68.7M100.8 70.5L102.5 71.6M98.9 73.3L100.5 74.5M96.8 76L98.4 77.3M92.5 81.2L93.9 82.6M90.1 83.7L91.6 85.1M87.7 86.1L89.1 87.6M85.2 88.5L86.6 89.9M80 92.8L81.3 94.4M77.3 94.9L78.5 96.5M74.5 96.8L75.6 98.5M71.7 98.7L72.7 100.4M65.8 102.1L66.7 103.9M62.7 103.6L63.6 105.4M59.7 105.1L60.5 106.9M56.5 106.4L57.3 108.3M50.1 108.7L50.7 110.6M46.9 109.7L47.4 111.6M43.6 110.6L44.1 112.5M40.3 111.4L40.7 113.3M33.6 112.6L33.8 114.5M30.2 113L30.4 115M26.8 113.3L26.9 115.3M23.4 113.4L23.5 115.4" stroke="#F7D58B" stroke-opacity=".6" stroke-width=".8"/><path d="M104.4 64.8L108.3 67M94.7 78.7L98.1 81.6M82.7 90.7L85.6 94.1M68.8 100.4L71 104.3M53.3 107.6L54.9 111.8M36.9 112L37.7 116.5M20 113.5L20 118" stroke="#F7D58B" stroke-width="1.8" stroke-linecap="round"/><path d="M12 5.8L74.8 86.1" stroke="#FFD36B" stroke-width="1.5" stroke-dasharray="4 3" stroke-opacity=".9"/><circle cx="20" cy="16" r="3.2" fill="#060A15" stroke="#CFEAFF" stroke-width="1.8"/><circle cx="12" cy="5.8" r="8" fill="url(#sx-star)"/><path d="M12 0.3Q13 4.8 17.5 5.8Q13 6.7 12 11.3Q11 6.7 6.5 5.8Q11 4.8 12 0.3Z" fill="#FFE7A3"/><circle cx="74.8" cy="86.1" r="3.2" fill="#FFD36B"/><g fill="#E8EEF8"><circle cx="96" cy="8" r="1.4"/><circle cx="110" cy="26" r="1" fill-opacity=".7"/><circle cx="78" cy="30" r=".9" fill-opacity=".6"/><circle cx="62" cy="6" r="1" fill-opacity=".7"/></g></svg>',
};

export const note = (html, kind = '') => `<div class="note ${kind}" ${kind === 'error' ? 'role="alert"' : ''}>${kind === 'warn' || kind === 'error' ? I.alert : kind === 'ok' ? I.check : I.info}<div>${html}</div></div>`;
export const spinner = () => `<div class="state-box"><div class="spinner" aria-hidden="true"></div><p>${esc(t('common.loading'))}</p></div>`;
export const errorBox = (title, msg) => `<div class="card state-box">${I.alert}<h2>${esc(title)}</h2><p>${esc(msg)}</p><button type="button" class="btn btn-primary" data-action="retry">${esc(t('err.retry'))}</button></div>`;

// ---------- Dates: API uses DD.MM.YYYY, <input type=date> uses YYYY-MM-DD ----------
export function toApiDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; }
export function toIsoDate(v) {
  if (!v) return '';
  const s = String(v);
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}
export const todayIso = () => new Date().toISOString().slice(0, 10);

// ---------- Human dates in the three interface languages ----------
const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
};
const parts = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return { y, m: m - 1, d }; };
/** "October 10, 2026" / "10 октября 2026 г." / "2026-yil 10-oktabr" */
export function humanDate(iso, lang) {
  if (!iso) return '';
  const { y, m, d } = parts(iso);
  if (lang === 'ru') return `${d} ${MONTHS.ru[m]} ${y} г.`;
  if (lang === 'uz') return `${y}-yil ${d}-${MONTHS.uz[m]}`;
  return `${MONTHS.en[m]} ${d}, ${y}`;
}
/** "December 6–14, 2026" / "6–14 декабря 2026 г." / "2026-yil 6–14-dekabr" (and cross-month / cross-year forms) */
export function humanRange(a, b, lang) {
  if (!a || !b) return humanDate(a || b, lang);
  const s = parts(a); const e = parts(b);
  if (s.y !== e.y) return `${humanDate(a, lang)} – ${humanDate(b, lang)}`;
  if (lang === 'ru') return s.m === e.m ? `${s.d}–${e.d} ${MONTHS.ru[e.m]} ${e.y} г.` : `${s.d} ${MONTHS.ru[s.m]} – ${e.d} ${MONTHS.ru[e.m]} ${e.y} г.`;
  if (lang === 'uz') return s.m === e.m ? `${e.y}-yil ${s.d}–${e.d}-${MONTHS.uz[e.m]}` : `${e.y}-yil ${s.d}-${MONTHS.uz[s.m]} – ${e.d}-${MONTHS.uz[e.m]}`;
  return s.m === e.m ? `${MONTHS.en[e.m]} ${s.d}–${e.d}, ${e.y}` : `${MONTHS.en[s.m]} ${s.d} – ${MONTHS.en[e.m]} ${e.d}, ${e.y}`;
}
export function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- Toasts ----------
export function toast(msg, kind = '') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ---------- Dialogs (accessible, translated buttons) ----------
// confirmDialog({ title, text, html, ok, cancel, danger, input: { label, maxlength }, okOnly })
// resolves to false when cancelled, true when confirmed, or the typed text when `input` is given.
export function confirmDialog({ title, text = '', html = '', ok, cancel, danger = false, input = null, okOnly = false }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'dlg-title');
    dlg.innerHTML = `<h2 id="dlg-title">${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${html}
      ${input ? `<label class="dlg-label" for="dlg-input">${esc(input.label)}</label><textarea id="dlg-input" class="input textarea" rows="3" maxlength="${input.maxlength || 500}"></textarea>` : ''}
      <div class="dialog-actions">
        ${okOnly ? '' : `<button type="button" class="btn btn-ghost" value="cancel">${esc(cancel || t('common.cancel'))}</button>`}
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" value="ok">${esc(ok || t('common.confirm'))}</button>
      </div>`;
    document.body.appendChild(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.addEventListener('click', async (e) => {
      const copy = e.target.closest('[data-copy]');
      if (copy) {
        try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = t('common.copied'); } catch (er) { /* ignore */ }
        return;
      }
      const b = e.target.closest('.dialog-actions button');
      if (b) done(b.value === 'ok' ? (input ? dlg.querySelector('#dlg-input').value.trim() : true) : false);
      else if (e.target === dlg && !okOnly) done(false);
    });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!okOnly) done(false); });
    dlg.showModal();
    (dlg.querySelector('#dlg-input') || dlg.querySelector('button[value="cancel"]') || dlg.querySelector('button[value="ok"]')).focus();
  });
}

// ---------- Busy buttons ----------
export function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="btn-spin" aria-hidden="true"></span>${esc(label)}`; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

export function download(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
