// Sign in, register, forgot/reset password, email verification.
import { t } from './i18n.js';
import { api, setToken, ApiError } from './api.js';
import { esc, $, note, busy, toast, I } from './ui.js';
import { infoPanel } from './info.js';
import { loadSettings, registrationStatus, opensOn, closesOn } from './settings.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COUNTRY_RE = /^[A-Za-z]+(?:[ '.-]+[A-Za-z]+)*$/;
// Team names that have taken part in the IAO (suggestions only; any Latin name is accepted).
const COUNTRIES = ['Armenia', 'Australia', 'Bangladesh', 'Belarus', 'Bolivia', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'China',
  'Crimean Peninsula', 'Croatia', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'Georgia', 'Ghana', 'Greece', 'India', 'Indonesia',
  'Iran', 'Ireland', 'Italy', 'Japan', 'Kazakhstan', 'Korea', 'Kuwait', 'Kyrgyzstan', 'Latvia', 'Lithuania', 'Malaysia', 'Mexico',
  'Moldova', 'Mongolia', 'Moscow Land', 'Nepal', 'North Macedonia', 'Pakistan', 'Poland', 'Romania', 'Russia', 'Serbia', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'Sri Lanka', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine', 'USA', 'Uzbekistan', 'Vietnam'];

function input(id, label, { type = 'text', hint = '', ac = 'off', value = '' } = {}) {
  return `<div class="field" data-field="${id}">
    <label for="a-${id}">${esc(label)}</label>
    ${hint ? `<p class="hint" id="a-${id}-hint">${esc(hint)}</p>` : ''}
    ${type === 'password' ? '<div class="pw-wrap">' : ''}<input class="input" id="a-${id}" name="${id}" type="${type}" autocomplete="${ac}" value="${esc(value)}" ${id === 'country' ? 'list="countries"' : ''} aria-describedby="${hint ? `a-${id}-hint ` : ''}a-${id}-err" ${type === 'email' || id === 'country' ? 'lang="en" spellcheck="false"' : ''}>${type === 'password'
      ? `<button type="button" class="pw-toggle" data-pw="a-${id}" aria-controls="a-${id}" aria-pressed="false" aria-label="${esc(t('auth.showPassword'))}" title="${esc(t('auth.showPassword'))}">${I.eye}</button></div>` : ''}
    <p class="err" id="a-${id}-err"></p>
  </div>`;
}
function shell(title, lead, body, foot = '') {
  return `<div class="auth"><div class="card auth-card">
    <h2 class="page-title">${esc(title)}</h2>
    ${lead ? `<p class="page-lead">${esc(lead)}</p>` : ''}
    ${body}
  </div>${foot ? `<p class="auth-foot">${foot}</p>` : ''}</div>`;
}
function showErrors(form, errs) {
  form.querySelectorAll('[data-field]').forEach((box) => {
    const k = box.dataset.field;
    const msg = errs[k] || '';
    box.classList.toggle('invalid', !!msg);
    const e = box.querySelector('.err'); if (e) e.textContent = msg;
    box.querySelector('input')?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  });
  const first = form.querySelector('.field.invalid input');
  if (first) first.focus();
}
function formError(form, msg) {
  let box = form.querySelector('.form-error');
  if (!box) { box = document.createElement('div'); box.className = 'form-error'; form.prepend(box); }
  box.innerHTML = msg ? note(esc(msg), 'error') : '';
}
const values = (form) => Object.fromEntries(new FormData(form).entries());
const link = (href, text) => `<a href="${href}" data-link>${esc(text)}</a>`;

// ---------- Sign in ----------
// Team sign-in at /login; organiser sign-in only at the secret admin link (admin: true).
// Each page accepts only its own kind of account and answers "incorrect email or
// password" otherwise, so the team page never reveals that an admin area exists.
export function loginView(ctx, { admin = false } = {}) {
  const next = admin ? '' : new URLSearchParams(location.search).get('next') || '';
  ctx.root.innerHTML = shell(t(admin ? 'auth.adminTitle' : 'auth.loginTitle'), t(admin ? 'auth.adminLead' : 'auth.loginLead'), `
    <form id="form" novalidate>
      ${input('email', t('auth.email'), { type: 'email', ac: 'username' })}
      ${input('password', t('auth.password'), { type: 'password', ac: 'current-password' })}
      ${admin ? '' : `<p class="auth-inline">${link('/forgot-password', t('auth.forgot'))}</p>`}
      <button class="btn btn-primary btn-block" type="submit">${esc(t('auth.signIn'))}</button>
    </form>`, admin ? '' : `${esc(t('auth.noAccount'))} ${link('/register', t('auth.registerLink'))}`);
  const form = $('#form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = values(form);
    const errs = {};
    if (!EMAIL_RE.test(v.email.trim())) errs.email = t('err.email');
    if (!v.password) errs.password = t('err.required');
    showErrors(form, errs); formError(form, '');
    if (Object.keys(errs).length) return;
    const btn = form.querySelector('button[type=submit]');
    busy(btn, true, t('auth.signingIn'));
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email: v.email.trim(), password: v.password }, auth: false });
      setToken(res.token);
      if (!!res.user.is_admin !== admin) {
        // Correct email and password, but the account belongs to the other sign-in page:
        // revoke the new token and say where to sign in (the admin address itself is never shown).
        try { await api('/auth/logout', { method: 'POST' }); } catch (er) { /* ignore */ }
        setToken(null);
        busy(btn, false);
        formError(form, admin ? t('auth.teamAccount') : t('auth.adminAccount'));
        if (admin) form.querySelector('.form-error .note div').insertAdjacentHTML('beforeend', ` <a href="/login" data-link>${esc(t('auth.toLogin'))}</a>`);
        return;
      }
      ctx.setUser(res.user);
      if (admin) ctx.rememberAdmin();
      ctx.navigate(admin ? ctx.adminBase : next && next.startsWith('/') ? next : '/', { replace: true });
    } catch (err) {
      busy(btn, false);
      if (err instanceof ApiError && err.status === 422) formError(form, t('err.loginFailed'));
      else formError(form, err.message);
    }
  });
  $('#a-email').focus();
}

// ---------- Register (team application) ----------
// No password here: the organisers approve the application and the login/password are emailed.
export async function registerView(ctx) {
  await loadSettings();
  const status = registrationStatus();
  const closedBox = status === 'not_open'
    ? note(`<strong>${esc(t('reg.notOpenTitle'))}</strong><br>${esc(t('reg.notOpen', { date: opensOn() }))}`, 'warn')
    : note(`<strong>${esc(t('reg.closedTitle'))}</strong><br>${esc(closesOn() ? t('reg.closed', { date: closesOn() }) : t('reg.closedNoDate'))}`, 'warn');

  const form = `
    <form id="form" novalidate>
      ${input('country', t('auth.country'), { hint: t('auth.countryHint'), ac: 'country-name' })}
      <datalist id="countries">${COUNTRIES.map((c) => `<option value="${c}">`).join('')}</datalist>
      ${input('name', t('auth.name'), { ac: 'name' })}
      ${input('email', t('auth.email'), { type: 'email', ac: 'email', hint: t('auth.emailHint') })}
      ${input('phone', t('auth.phone'), { type: 'tel', ac: 'tel' })}
      <button class="btn btn-primary btn-block" type="submit">${esc(t('auth.submitApplication'))}</button>
    </form>`;
  const body = status === 'open' ? form : `${closedBox}<a class="btn btn-ghost btn-block" style="margin-top:16px" href="/login" data-link>${esc(t('nav.signIn'))}</a>`;

  ctx.root.innerHTML = `<div class="landing">${shell(t('auth.registerTitle'), t('auth.registerLead'), body,
    `${esc(t('auth.haveAccount'))} ${link('/login', t('nav.signIn'))}`)}${infoPanel()}</div>`;
  if (status !== 'open') return;

  const f = $('#form');
  // Country name: Latin letters only (it becomes the team name in the official documents)
  $('#a-country').addEventListener('input', (e) => {
    const clean = e.target.value.replace(/[^A-Za-z '.-]/g, '');
    if (clean !== e.target.value) { e.target.value = clean; showErrors(f, { country: t('err.latinName') }); }
  });
  $('#a-phone').addEventListener('input', (e) => {
    const clean = e.target.value.replace(/[^0-9+()\s-]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = values(f);
    const errs = {};
    if (!v.country.trim()) errs.country = t('err.required');
    else if (!COUNTRY_RE.test(v.country.trim())) errs.country = t('err.latinName');
    if (!v.name.trim()) errs.name = t('err.required');
    else if (/[^\x20-\x7E]/.test(v.name)) errs.name = t('err.latinText');
    if (!EMAIL_RE.test(v.email.trim())) errs.email = t('err.email');
    if (!/^\+\d[\d\s()-]{5,}$/.test(v.phone.trim())) errs.phone = t('err.phone');
    showErrors(f, errs); formError(f, '');
    if (Object.keys(errs).length) return;
    const btn = f.querySelector('button[type=submit]');
    busy(btn, true, t('auth.sending'));
    try {
      const body = { country: v.country.trim(), name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim() };
      await api('/auth/register', { method: 'POST', auth: false, body });
      appliedView(ctx, body);
    } catch (err) {
      busy(btn, false);
      if (err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length) showErrors(f, err.fields);
      else formError(f, err.message);
      if (err.code === 'registration_closed' || err.code === 'registration_not_open') { await loadSettings(true); registerView(ctx); }
    }
  });
  $('#a-country').focus();
}

function appliedView(ctx, { country, email }) {
  ctx.root.innerHTML = `<div class="auth"><div class="card auth-card">
    <div class="big-icon">${I.check}</div>
    <h2 class="page-title" style="text-align:center">${esc(t('auth.appliedTitle'))}</h2>
    <p class="page-lead" style="text-align:center">${esc(t('auth.appliedLead', { country }))}</p>
    <h3 class="card-title">${esc(t('auth.nextTitle'))}</h3>
    <ol class="steps">
      <li>${esc(t('auth.next1'))}</li>
      <li>${esc(t('auth.next2', { email }))}</li>
      <li>${esc(t('auth.next3'))}</li>
    </ol>
    <a class="btn btn-primary btn-block" style="margin-top:24px" href="/login" data-link>${esc(t('auth.toLogin'))}</a>
  </div></div>`;
  window.scrollTo(0, 0);
}

// ---------- Forgot password ----------
export function forgotView(ctx) {
  ctx.root.innerHTML = shell(t('auth.forgotTitle'), t('auth.forgotLead'), `
    <form id="form" novalidate>
      ${input('email', t('auth.email'), { type: 'email', ac: 'email' })}
      <button class="btn btn-primary btn-block" type="submit">${esc(t('auth.sendLink'))}</button>
    </form>`, link('/login', t('auth.backToLogin')));
  const form = $('#form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = values(form).email.trim();
    if (!EMAIL_RE.test(email)) { showErrors(form, { email: t('err.email') }); return; }
    showErrors(form, {});
    const btn = form.querySelector('button[type=submit]');
    busy(btn, true, t('auth.sending'));
    try {
      await api('/auth/forgot-password', { method: 'POST', auth: false, body: { email } });
      form.innerHTML = note(esc(t('auth.linkSent')), 'ok');
    } catch (err) { busy(btn, false); formError(form, err.message); }
  });
  $('#a-email').focus();
}

// ---------- Reset password (link from the email) ----------
export function resetView(ctx) {
  const q = new URLSearchParams(location.search);
  const token = q.get('token') || '';
  const email = q.get('email') || '';
  if (!token || !email) {
    ctx.root.innerHTML = shell(t('auth.resetTitle'), '', `${note(esc(t('auth.resetInvalid')), 'warn')}<p style="margin-top:16px">${link('/forgot-password', t('auth.forgotTitle'))}</p>`);
    return;
  }
  ctx.root.innerHTML = shell(t('auth.resetTitle'), email, `
    <form id="form" novalidate>
      ${input('password', t('auth.newPassword'), { type: 'password', hint: t('auth.passwordHint'), ac: 'new-password' })}
      ${input('password_confirmation', t('auth.password2'), { type: 'password', ac: 'new-password' })}
      <button class="btn btn-primary btn-block" type="submit">${esc(t('auth.savePassword'))}</button>
    </form>`, link('/login', t('auth.backToLogin')));
  const form = $('#form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = values(form);
    const errs = {};
    if (v.password.length < 8) errs.password = t('err.minPassword');
    if (v.password_confirmation !== v.password) errs.password_confirmation = t('err.passwordMatch');
    showErrors(form, errs); formError(form, '');
    if (Object.keys(errs).length) return;
    const btn = form.querySelector('button[type=submit]');
    busy(btn, true, t('form.saving'));
    try {
      await api('/auth/reset-password', { method: 'POST', auth: false, body: { token, email, password: v.password, password_confirmation: v.password_confirmation } });
      form.innerHTML = `${note(esc(t('auth.resetDone')), 'ok')}<a class="btn btn-primary btn-block" style="margin-top:16px" href="/login" data-link>${esc(t('auth.signIn'))}</a>`;
    } catch (err) {
      busy(btn, false);
      if (err.status === 422 && (err.fields.password || err.fields.password_confirmation)) showErrors(form, err.fields);
      else formError(form, err.status === 422 ? t('auth.resetInvalid') : err.message);
    }
  });
  $('#a-password').focus();
}

// ---------- Waiting for email confirmation ----------
export function verifyView(ctx) {
  const email = ctx.user ? ctx.user.email : '';
  ctx.root.innerHTML = `<div class="auth"><div class="card auth-card center">
    <div class="big-icon">${I.mail}</div>
    <h2 class="page-title">${esc(t('verify.title'))}</h2>
    <p class="page-lead">${esc(t('verify.lead', { email: '⁨' + email + '⁩' }))}</p>
    <div id="msg" aria-live="polite"></div>
    <div class="stack">
      <button type="button" class="btn btn-primary btn-block" id="btn-check">${esc(t('verify.check'))}</button>
      <button type="button" class="btn btn-ghost btn-block" id="btn-resend">${esc(t('verify.resend'))}</button>
    </div>
    <p class="hint" style="margin-top:16px">${esc(t('verify.spam'))}</p>
  </div></div>`;
  const msg = $('#msg');
  $('#btn-check').addEventListener('click', async (e) => {
    busy(e.currentTarget, true, t('verify.checking'));
    try {
      const user = await ctx.refreshUser();
      if (user && user.email_verified_at) ctx.navigate('/', { replace: true });
      else { busy(e.currentTarget, false); msg.innerHTML = note(esc(t('verify.notYet')), 'warn'); }
    } catch (err) { busy(e.currentTarget, false); msg.innerHTML = note(esc(err.message), 'error'); }
  });
  $('#btn-resend').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    busy(btn, true, t('auth.sending'));
    try { await api('/auth/email/resend', { method: 'POST' }); msg.innerHTML = note(esc(t('verify.resent')), 'ok'); }
    catch (err) { msg.innerHTML = note(esc(err.message), 'error'); }
    finally { busy(btn, false); }
  });
}

// ---------- Landing page after clicking the link in the email ----------
export async function verifiedView(ctx) {
  if (ctx.token()) { try { await ctx.refreshUser(); } catch (e) { /* ignore */ } }
  const loggedIn = !!ctx.user;
  ctx.root.innerHTML = `<div class="auth"><div class="card auth-card center">
    ${I.astronaut}
    <h2 class="page-title">${esc(t('verified.title'))}</h2>
    <p class="page-lead">${esc(t('verified.lead'))}</p>
    <a class="btn btn-primary btn-block" style="margin-top:24px" href="${loggedIn ? '/' : '/login'}" data-link>${esc(t(loggedIn ? 'verified.go' : 'verified.signIn'))}</a>
  </div></div>`;
  if (loggedIn) toast(t('verified.title'), 'ok');
}
