// Router, layout and session handling for the IAO 2026 registration SPA.
import { t, getLang, setLang, LANGS } from './i18n.js';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';
import { esc, $, confirmDialog, toast } from './ui.js';
import { loginView, registerView, forgotView, resetView, verifyView, verifiedView } from './views-auth.js';
import { dashboardView, participantView, reviewView } from './views-team.js';
import { loadSettings, olympiadName, olympiadPlace, olympiadDates, shortName } from './settings.js';

// ---------- Team site ----------
// access: public = anyone; guest = only signed-out users; user = verified team account
const ROUTES = [
  ['/login', loginView, 'guest'],
  ['/register', registerView, 'guest'],
  ['/forgot-password', forgotView, 'guest'],
  ['/reset-password', resetView, 'public'],
  ['/email-verified', verifiedView, 'public'],
  ['/verify-email', verifyView, 'unverified'],
  ['/', dashboardView, 'user'],
  ['/participants/:id', participantView, 'user'],
  ['/review', reviewView, 'user'],
];

// ---------- Organisers' panel ----------
// Lives only under a secret first path segment whose SHA-256 hash is in config.js.
// The code is loaded on demand, so team visitors never download it.
const adminView = (name) => async (c, params) => (await import('./views-admin.js'))[name](c, params);
const ADMIN_ROUTES = [
  ['/', adminView('adminTeamsView')],
  ['/teams/:id', adminView('adminTeamView')],
  ['/teams/:id/participants/:pid', adminView('adminParticipantView')],
  ['/settings', adminView('adminSettingsView')],
];
const ADMIN_HASH = (window.IAO_CONFIG && window.IAO_CONFIG.adminKeyHash) || '';
const ADMIN_BASE_KEY = 'iao-admin-base';
const hashCache = new Map();
async function isAdminSegment(seg) {
  if (!seg || !ADMIN_HASH || !window.crypto || !crypto.subtle) return false;
  if (!hashCache.has(seg)) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seg));
    hashCache.set(seg, [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') === ADMIN_HASH);
  }
  return hashCache.get(seg);
}
const storedAdminBase = () => { try { return localStorage.getItem(ADMIN_BASE_KEY) || ''; } catch (e) { return ''; } };

const ctx = {
  root: $('#view'),
  user: null,
  team: null,
  cache: {},
  guard: null,
  signal: null,
  adminBase: storedAdminBase(),
  adminPending: 0,
  token: getToken,
  setUser(u) { ctx.user = u; renderHeader(); },
  async refreshUser() { const u = await api('/auth/me'); ctx.setUser(u); return u; },
  rememberAdmin() { try { localStorage.setItem(ADMIN_BASE_KEY, ctx.adminBase); } catch (e) { /* ignore */ } },
  navigate,
  renderHeader: () => renderHeader(),
};

function matchIn(routes, path) {
  for (const [pattern, view, access] of routes) {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (m, k) => { keys.push(k); return '([^/]+)'; })}/?$`);
    const m = path.match(re);
    if (m) return { view, access, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}
// Resolve a path to a route of the team site or of the organisers' panel.
async function resolve(path) {
  const seg = path.split('/')[1] || '';
  if (await isAdminSegment(seg)) {
    const base = `/${seg}`;
    const r = matchIn(ADMIN_ROUTES, path.slice(base.length) || '/');
    return r ? { ...r, access: 'admin', base } : { ...matchIn(ADMIN_ROUTES, '/'), access: 'admin', base, redirect: base };
  }
  return matchIn(ROUTES, path);
}

async function navigate(to, { replace = false, force = false } = {}) {
  if (!force && ctx.guard && ctx.guard()) {
    const leave = await confirmDialog({ title: t('form.unsaved'), text: '', ok: t('form.leave'), cancel: t('form.stay'), danger: true });
    if (!leave) return;
  }
  ctx.guard = null;
  Object.keys(ctx.cache).forEach((k) => delete ctx.cache[k]);
  if (replace) history.replaceState({}, '', to); else history.pushState({}, '', to);
  // Olympiad name, dates and the registration window come from the admin settings.
loadSettings().then(() => { renderHeader(); route(); });
}

async function signOut() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (err) { /* token may already be invalid */ }
  setToken(null); ctx.user = null; ctx.team = null; ctx.guard = null;
  try { localStorage.removeItem(ADMIN_BASE_KEY); } catch (e) { /* ignore */ }
}

let controller = null;
let current = null;
async function route() {
  const path = location.pathname;
  if (controller) controller.abort();
  controller = new AbortController();
  ctx.signal = controller.signal;
  ctx.guard = null;

  if (getToken() && !ctx.user) {
    try { await ctx.refreshUser(); } catch (e) { if (!getToken()) ctx.user = null; }
  }
  const u = ctx.user;
  const verified = u && u.email_verified_at;
  const r = await resolve(path);

  // ----- Organisers' panel -----
  if (r && r.access === 'admin') {
    ctx.adminBase = r.base;
    if (r.redirect) return navigate(r.redirect, { replace: true, force: true });
    if (!u || !u.is_admin) return show({ view: (c) => loginView(c, { admin: true }), params: {}, area: 'admin-login' });
    ctx.rememberAdmin();
    return show({ ...r, area: 'admin' });
  }

  // ----- Team site -----
  // An organiser account never uses team pages: send it back to its panel,
  // or sign it out if this browser does not know the panel address.
  if (u && u.is_admin) {
    if (ctx.adminBase) return navigate(ctx.adminBase, { replace: true, force: true });
    await signOut();
    return navigate('/register', { replace: true, force: true });
  }
  if (!r) return navigate(u ? '/' : '/register', { replace: true, force: true });
  if (r.access === 'guest' && u) return navigate(verified ? '/' : '/verify-email', { replace: true, force: true });
  if ((r.access === 'user' || r.access === 'unverified') && !u) {
    // Visitors opening the site see the registration form; deep links go to sign-in.
    if (path === '/') return navigate('/register', { replace: true, force: true });
    return navigate(`/login?next=${encodeURIComponent(path)}`, { replace: true, force: true });
  }
  if (r.access === 'unverified' && verified) return navigate('/', { replace: true, force: true });
  if (r.access === 'user' && !verified) return navigate('/verify-email', { replace: true, force: true });
  return show({ ...r, area: ['guest', 'public', 'unverified'].includes(r.access) ? 'auth' : 'app' });
}

async function show(r) {
  current = r;
  document.body.dataset.area = r.area === 'admin-login' ? 'auth' : r.area;
  renderHeader();
  window.scrollTo(0, 0);
  await r.view(ctx, r.params);
  ctx.root.focus({ preventScroll: true });
}

// ---------- Header ----------
function renderHeader() {
  document.title = `${shortName()} — ${t('nav.register')}`;
  $('#skip').textContent = t('common.skip');
  $('#brand-kicker').textContent = t('brand.kicker');
  $('#brand-title').textContent = olympiadName();
  $('#meta').innerHTML = `<div><dt>${esc(t('meta.where'))}</dt><dd>${esc(olympiadPlace())}</dd></div><div><dt>${esc(t('meta.when'))}</dt><dd>${esc(olympiadDates())}</dd></div>`;
  const cur = getLang();
  $('#lang').setAttribute('aria-label', t('nav.language'));
  $('#lang').innerHTML = LANGS.map((l) => `<button type="button" data-lang="${l.code}" lang="${l.code}" aria-pressed="${l.code === cur}" title="${esc(l.label)}">${l.short}</button>`).join('');
  const u = ctx.user;
  const admin = u && u.is_admin;
  $('.brand').setAttribute('href', admin && ctx.adminBase ? ctx.adminBase : '/');
  const onLogin = location.pathname === '/login';
  $('#user').innerHTML = u ? `
    ${admin && ctx.adminBase ? `<a href="${esc(ctx.adminBase)}" data-link class="hdr-link">${esc(t('nav.teams'))}${ctx.adminPending ? ` <span class="pill hot" title="${esc(t('adm.tab.pending'))}">${ctx.adminPending}</span>` : ''}</a>
      <a href="${esc(ctx.adminBase)}/settings" data-link class="hdr-link">${esc(t('nav.settings'))}</a>` : ''}
    ${!admin && u.team && u.email_verified_at ? `<a href="/" data-link class="hdr-link">${esc(u.team.country || t('nav.myTeam'))}</a>` : ''}
    <button type="button" class="hdr-btn" id="btn-logout">${esc(t('nav.logout'))}</button>`
    : current && current.area === 'admin-login' ? ''
    : onLogin ? `<a href="/register" data-link class="hdr-btn hdr-cta">${esc(t('nav.register'))}</a>`
    : `<a href="/login" data-link class="hdr-btn hdr-cta">${esc(t('nav.signIn'))}</a>`;
}

// ---------- Global events ----------
document.addEventListener('click', async (e) => {
  const a = e.target.closest('a[data-link]');
  if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && a.getAttribute('aria-disabled') !== 'true') {
    e.preventDefault(); navigate(a.getAttribute('href')); return;
  }
  if (a && a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
  const pw = e.target.closest('[data-pw]');
  if (pw) {
    const field = document.getElementById(pw.dataset.pw);
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    pw.setAttribute('aria-pressed', String(show));
    const label = t(show ? 'auth.hidePassword' : 'auth.showPassword');
    pw.setAttribute('aria-label', label); pw.title = label;
    pw.classList.toggle('on', show);
    field.focus();
    return;
  }
  const lb = e.target.closest('[data-lang]');
  if (lb) {
    setLang(lb.dataset.lang);
    // Re-render the current page in the new language; form drafts are kept in ctx.cache.
    const keepGuard = ctx.guard;
    renderHeader();
    if (controller) controller.abort();
    controller = new AbortController(); ctx.signal = controller.signal;
    if (current) await current.view(ctx, current.params);
    if (keepGuard && !ctx.guard) ctx.guard = keepGuard;
    return;
  }
  if (e.target.closest('#btn-logout')) {
    if (ctx.guard && ctx.guard()) {
      const leave = await confirmDialog({ title: t('form.unsaved'), text: '', ok: t('form.leave'), cancel: t('form.stay'), danger: true });
      if (!leave) return;
    }
    const wasAdmin = ctx.user && ctx.user.is_admin;
    const base = ctx.adminBase;
    await signOut();
    // The organiser returns to its own sign-in page; teams go to the team sign-in.
    navigate(wasAdmin && base ? base : '/login', { replace: true, force: true });
  }
});
window.addEventListener('popstate', () => route());
window.addEventListener('beforeunload', (e) => { if (ctx.guard && ctx.guard()) { e.preventDefault(); e.returnValue = ''; } });
setUnauthorizedHandler(() => {
  const inAdmin = current && current.area === 'admin';
  ctx.user = null; ctx.team = null; ctx.guard = null;
  toast(t('err.session'), 'error');
  navigate(inAdmin ? ctx.adminBase : `/login?next=${encodeURIComponent(location.pathname)}`, { replace: true, force: true });
});

route();
