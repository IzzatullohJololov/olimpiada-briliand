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
  more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  astronaut: '<img class="emblem logo" src="/img/logo.webp" width="960" height="837" alt="" decoding="async">',
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
export function toast(msg, kind = '', { actionLabel = '', onAction = null, ms = 4500 } = {}) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button type="button" class="toast-action">${esc(actionLabel)}</button>` : ''}`;
  if (actionLabel) el.querySelector('.toast-action').addEventListener('click', () => { el.remove(); if (onAction) onAction(); });
  box.appendChild(el);
  setTimeout(() => el.remove(), actionLabel ? Math.max(ms, 12000) : ms);
}

// ---------- Dialogs (accessible, translated buttons) ----------
// confirmDialog({ title, text, html, ok, cancel, danger, input: { label, maxlength }, okOnly, focusOk })
// resolves to false when cancelled, true when confirmed, or the typed text when `input` is given.
export function confirmDialog({ title, text = '', html = '', ok, cancel, danger = false, input = null, okOnly = false, focusOk = false }) {
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
    (dlg.querySelector('#dlg-input') || (focusOk ? null : dlg.querySelector('button[value="cancel"]')) || dlg.querySelector('button[value="ok"]')).focus();
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
