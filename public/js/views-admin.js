// Organisers' panel: applications and teams, approval with login/password, archive,
// olympiad settings, and the Excel export in the organisers' application-form layout (ExcelJS, .xlsx).
//
// The list is a work queue: the action buttons sit in the row itself (no horizontal scrolling), the tabs and
// search stay on screen while the list scrolls, an action updates the list in place (no reload, the scroll
// position stays), several new applications can be approved at once, and there are keyboard shortcuts.
// A team page has a sticky action bar and walks through the queue ("next application").
import { t, LANGS } from './i18n.js';
import { api, fetchBlobUrl, ApiError } from './api.js';
import { esc, $, $$, I, note, spinner, errorBox, toast, confirmDialog, busy, fmtDateTime, download } from './ui.js';
import { fromParticipant, personName, roleLabel, visaIncomplete, quotaStatus, GROUP_SYMBOL } from './fields.js';
import { renderSections, openFile } from './views-team.js';
import { setSettings, settings, shortName } from './settings.js';
import { buildWorkbook, applicationFileName, iaoCodeOf } from './excel-form.js';
import { suggestIaoCode } from './iao-codes.js';

const TABS = ['pending', 'approved', 'completed', 'rejected', 'active', 'archived'];
const POLL_MS = (window.IAO_CONFIG && window.IAO_CONFIG.pollMs) || 60000;   // how often the list looks for new applications
let query = '';
let tab = '';                 // '' = automatic: "New applications" while there are some, otherwise "All active"
const picked = new Set();     // ids of new applications ticked for approval in one go

/** pending | approved | completed | rejected | archived */
export function teamState(team) {
  if (team.archived_at) return 'archived';
  if (team.status === 'rejected') return 'rejected';
  if (team.status === 'pending') return 'pending';
  return team.submitted_at ? 'completed' : 'approved';
}
const STATE_CLASS = { pending: 'warn', approved: 'neutral', completed: 'ok', rejected: 'bad', archived: 'neutral' };
const stateBadge = (team) => {
  const st = teamState(team);
  return `<span class="badge ${STATE_CLASS[st]}">${st === 'completed' ? I.check : st === 'pending' ? I.alert : ''}${esc(t(`adm.st.${st}`))}</span>`;
};
const inTab = (team, tb) => (tb === 'active' ? !team.archived_at : teamState(team) === tb);
const fileBase = () => shortName().replace(/\s+/g, '');
const byCountry = (a, b) => a.country.localeCompare(b.country);
const byApplied = (a, b) => String(a.created_at).localeCompare(String(b.created_at));   // oldest application first
/** IAO team code chip; a dashed one means the code is only suggested from the country name, an empty one means unknown */
const codeChip = (team) => {
  const code = iaoCodeOf(team);
  if (!code) return `<span class="code-chip none" title="${esc(t('adm.iaoCodeNone'))}">?</span>`;
  return `<span class="code-chip ${team.iao_code ? '' : 'auto'}" title="${esc(t(team.iao_code ? 'adm.iaoCode' : 'adm.iaoCodeAuto'))}">${esc(code)}</span>`;
};

async function loadTeams() {
  const r = await api('/admin/teams');
  return Array.isArray(r) ? r : (r && r.data) || [];
}
const pendingOf = (teams) => teams.filter((x) => teamState(x) === 'pending').sort(byApplied);

/** The header shows how many new applications are waiting, on every organiser page. */
function setPending(ctx, teams) {
  const n = pendingOf(teams).length;
  if (ctx.adminPending !== n) { ctx.adminPending = n; ctx.renderHeader(); }
}

function failed(ctx, err, retry) {
  ctx.root.innerHTML = errorBox(t('dash.loadError'), err.message);
  ctx.root.querySelector('[data-action=retry]').addEventListener('click', retry);
}

// ---------------------------------------------------------------- small widgets

function closeMenus(except = null) {
  $$('.menu-pop:not([hidden])').forEach((pop) => {
    if (pop === except) return;
    pop.hidden = true;
    const b = pop.closest('.menu').querySelector('[data-menu]');
    if (b) b.setAttribute('aria-expanded', 'false');
  });
}
function toggleMenu(btn) {
  const pop = btn.closest('.menu').querySelector('.menu-pop');
  const open = pop.hidden;
  closeMenus();
  pop.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (!open) return;
  pop.style.top = ''; pop.style.bottom = '';
  const r = pop.getBoundingClientRect();
  if (r.bottom > window.innerHeight - 8 && btn.getBoundingClientRect().top > r.height + 80) { pop.style.top = 'auto'; pop.style.bottom = 'calc(100% + 4px)'; }
  const first = pop.querySelector('button');
  if (first) first.focus();
}
/** "⋯" menu: [[action, label, className, icon], …] */
function menuHtml(team, items) {
  return `<div class="menu"><button type="button" class="icon-btn icon-neutral" data-menu aria-haspopup="menu" aria-expanded="false"
      aria-label="${esc(t('adm.more'))}: ${esc(team.country)}" title="${esc(t('adm.more'))}">${I.more}</button>
    <div class="menu-pop" role="menu" hidden>${items.map(([act, label, cls, ico]) => (act === 'xls'
      ? `<button type="button" role="menuitem" data-xls="${team.id}">${ico || ''}${esc(label)}</button>`
      : `<button type="button" role="menuitem" class="${cls || ''}" data-act="${act}" data-id="${team.id}">${ico || ''}${esc(label)}</button>`)).join('')}</div></div>`;
}
const menuItems = (team) => {
  const st = teamState(team);
  const del = ['delete', t('adm.delete'), 'danger', I.trash];
  const arc = ['archive', t('adm.archive'), '', I.archive];
  const xls = team.participants_count ? [['xls', 'Excel', '', I.download]] : [];
  if (st === 'pending') return [arc, del];
  if (st === 'approved') return [...xls, ['reset-password', t('adm.resetPassword'), '', I.key], arc, del];
  if (st === 'completed') return [['reopen', t('admin.reopen'), '', I.undo], ['reset-password', t('adm.resetPassword'), '', I.key], arc, del];
  if (st === 'rejected') return [arc, del];
  return [del];
};

/** A modal "please wait" with a progress bar (several approvals in a row). */
function progressDialog() {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialog';
  dlg.setAttribute('aria-live', 'polite');
  dlg.innerHTML = '<h2 id="prog-title"></h2><div class="progress"><i></i></div>';
  dlg.addEventListener('cancel', (e) => e.preventDefault());
  document.body.appendChild(dlg);
  dlg.showModal();
  return {
    update(text, share) { dlg.querySelector('h2').textContent = text; dlg.querySelector('.progress i').style.width = `${Math.round(share * 100)}%`; },
    close() { dlg.close(); dlg.remove(); },
  };
}

// ---------------------------------------------------------------- actions (shared by list and team page)

function credentialsHtml(res) {
  const row = (label, value) => `<div class="cred-row"><span>${esc(label)}</span><code>${esc(value)}</code>
    <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(value)}">${esc(t('common.copy'))}</button></div>`;
  return `<div class="cred">${row(t('adm.login'), res.login)}${row(t('adm.password'), res.password)}</div>
    ${note(esc(t(res.email_sent ? 'adm.credSent' : 'adm.credNotSent')), res.email_sent ? 'ok' : 'warn')}`;
}
const showCredentials = (res) => confirmDialog({ title: t('adm.credTitle'), html: credentialsHtml(res), ok: t('common.close'), okOnly: true });

/**
 * After a login/password was issued. When the email went out, the password is not shown again (a toast offers it);
 * when it did not, it is shown at once because nothing else carries it to the team.
 */
async function announceCredentials(team, res, approve) {
  if (!res.email_sent) { await showCredentials(res); return; }
  toast(t(approve ? 'adm.approvedMail' : 'adm.resetMail', { country: team.country, email: res.login }), 'ok',
    { actionLabel: t('adm.showCred'), onAction: () => showCredentials(res) });
}

/** Runs one action on a team, with its confirmation. Resolves to { res } when it happened, or null (cancelled / failed). */
async function runAction(team, action) {
  const country = team.country;
  const email = team.user ? team.user.email : '';
  try {
    if (action === 'approve' || action === 'reset-password') {
      const approve = action === 'approve';
      const ok = await confirmDialog({
        title: t(approve ? 'adm.approveTitle' : 'adm.resetTitle', { country }),
        text: t(approve ? 'adm.approveText' : 'adm.resetText', { email }),
        ok: t(approve ? 'adm.approve' : 'adm.resetPassword'),
        focusOk: true,
      });
      if (!ok) return null;
      const res = await api(`/admin/teams/${team.id}/${action}`, { method: 'POST' });
      await announceCredentials(team, res, approve);
      return { res };
    }
    if (action === 'reject') {
      const body = await rejectDialog(country);
      if (!body) return null;
      const res = await api(`/admin/teams/${team.id}/reject`, { method: 'POST', body });
      toast(t('adm.rejected', { country }), 'ok');
      return { res };
    }
    if (action === 'archive') {
      const ok = await confirmDialog({ title: t('adm.archiveTitle', { country }), text: t('adm.archiveText'), ok: t('adm.archive'), danger: true });
      if (!ok) return null;
      const res = await api(`/admin/teams/${team.id}/archive`, { method: 'POST' });
      toast(t('adm.archived', { country }), 'ok');
      return { res };
    }
    if (action === 'delete') {
      if (!(await deleteDialog(country))) return null;
      const res = await api(`/admin/teams/${team.id}`, { method: 'DELETE' });
      toast(t('adm.deleted', { country }), 'ok');
      return { res };
    }
    if (action === 'unarchive') {
      const res = await api(`/admin/teams/${team.id}/unarchive`, { method: 'POST' });
      toast(t('adm.unarchived', { country }), 'ok');
      return { res };
    }
    if (action === 'reopen') {
      const ok = await confirmDialog({ title: t('admin.reopenTitle'), text: t('admin.reopenText', { country }), ok: t('admin.reopen') });
      if (!ok) return null;
      const res = await api(`/admin/teams/${team.id}/reopen`, { method: 'POST' });
      toast(t('admin.reopened'), 'ok');
      return { res };
    }
  } catch (err) {
    toast(err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length ? Object.values(err.fields).join(' ') : err.message, 'error');
  }
  return null;
}

/** Brings the local copy of a team in line with what the server answered (the answers carry the team without its counts). */
function mergeTeam(teams, team, action, out) {
  if (action === 'delete') { const i = teams.indexOf(team); if (i >= 0) teams.splice(i, 1); return; }
  if (out.res && out.res.team) Object.assign(team, out.res.team);
}

const REJECT_REASONS = ['duplicate', 'not_official', 'wrong_country', 'contacts', 'late'];

/** Reasons (translated in the email) + a comment per language (one language at a time). Resolves to the request body or false. */
function rejectDialog(country) {
  return new Promise((resolve) => {
    const langs = ['en', 'ru', 'uz'];
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog dialog-wide';
    dlg.setAttribute('aria-labelledby', 'rej-title');
    dlg.innerHTML = `<h2 id="rej-title">${esc(t('adm.rejectTitle', { country }))}</h2>
      <fieldset class="rej-group"><legend>${esc(t('rej.reasons'))}</legend>
        <p class="hint">${esc(t('rej.reasonsHint'))}</p>
        ${REJECT_REASONS.map((r) => `<label class="checkbox"><input type="checkbox" value="${r}"><span>${esc(t(`rej.${r}`))}</span></label>`).join('')}
      </fieldset>
      <fieldset class="rej-group"><legend>${esc(t('rej.comment'))}</legend>
        <p class="hint">${esc(t('rej.commentHint'))}</p>
        <div class="lang-tabs" role="tablist" aria-label="${esc(t('adm.rejectLang'))}">
          ${langs.map((l, i) => `<button type="button" role="tab" data-l="${l}" aria-selected="${i === 0}">${l.toUpperCase()}</button>`).join('')}
        </div>
        ${langs.map((l, i) => `<textarea id="rej-${l}" class="input textarea" rows="3" maxlength="500" lang="${l}" aria-label="${esc(t(`rej.comment.${l}`))}" ${i ? 'hidden' : ''}></textarea>`).join('')}
      </fieldset>
      <p class="err" id="rej-err" role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" value="cancel">${esc(t('common.cancel'))}</button>
        <button type="button" class="btn btn-danger" value="ok">${esc(t('adm.reject'))}</button>
      </div>`;
    document.body.appendChild(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const mark = () => langs.forEach((l) => dlg.querySelector(`[data-l="${l}"]`).classList.toggle('filled', !!dlg.querySelector(`#rej-${l}`).value.trim()));
    dlg.addEventListener('input', mark);
    dlg.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-l]');
      if (tabBtn) {
        langs.forEach((l) => { dlg.querySelector(`#rej-${l}`).hidden = l !== tabBtn.dataset.l; dlg.querySelector(`[data-l="${l}"]`).setAttribute('aria-selected', String(l === tabBtn.dataset.l)); });
        dlg.querySelector(`#rej-${tabBtn.dataset.l}`).focus();
        return;
      }
      const b = e.target.closest('.dialog-actions button');
      if (!b) return;
      if (b.value !== 'ok') { done(false); return; }
      const reasons = [...dlg.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
      const comment = Object.fromEntries(langs.map((l) => [l, dlg.querySelector(`#rej-${l}`).value.trim()]).filter(([, v]) => v));
      if (!reasons.length && !Object.keys(comment).length) {
        const err = dlg.querySelector('#rej-err');
        err.textContent = t('rej.pickOne'); err.style.display = 'flex';
        return;
      }
      done({ reasons, comment });
    });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    dlg.showModal();
    dlg.querySelector('input[type=checkbox]').focus();
  });
}

/** Permanent deletion: the admin types the team name to confirm. */
function deleteDialog(country) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'del-title');
    dlg.innerHTML = `<h2 id="del-title">${esc(t('adm.deleteTitle', { country }))}</h2>
      ${note(esc(t('adm.deleteText')), 'error')}
      <label class="dlg-label" for="del-name">${esc(t('adm.deleteType', { country }))}</label>
      <input id="del-name" class="input" autocomplete="off" spellcheck="false">
      <p class="err" id="del-err" role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" value="cancel">${esc(t('common.cancel'))}</button>
        <button type="button" class="btn btn-danger" value="ok">${I.trash}${esc(t('adm.delete'))}</button>
      </div>`;
    document.body.appendChild(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const confirmDelete = () => {
      if (dlg.querySelector('#del-name').value.trim() !== country) {
        const err = dlg.querySelector('#del-err');
        err.textContent = t('adm.deleteMismatch'); err.style.display = 'flex';
        return;
      }
      done(true);
    };
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('.dialog-actions button');
      if (b) { if (b.value === 'ok') confirmDelete(); else done(false); }
    });
    dlg.querySelector('#del-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmDelete(); } });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    dlg.showModal();
    dlg.querySelector('#del-name').focus();
  });
}

// ---------------------------------------------------------------- payment (paid / not paid per participant)

/** The paid / not-paid tag; as a button (`clickable`) it opens the payment dialog. */
function paymentTag(p, clickable = false) {
  const cls = `tag ${p.is_paid ? 'ok' : 'muted'}${clickable ? ' pay-btn' : ''}`;
  const label = `${p.is_paid ? I.check : ''}${esc(t(p.is_paid ? 'pay.paid' : 'pay.unpaid'))}`;
  const title = p.is_paid && p.paid_at ? t('pay.paidAt', { date: fmtDateTime(p.paid_at) }) : t('pay.status');
  return clickable
    ? `<button type="button" class="${cls}" data-pay="${p.id}" title="${esc(title)}" aria-label="${esc(t('pay.edit', { name: personName(p) }))}">${label}</button>`
    : `<span class="${cls}" title="${esc(title)}">${label}</span>`;
}
const paymentCell = (p) => `${paymentTag(p, true)}${p.payment_note ? `<span class="pay-note" title="${esc(p.payment_note)}">${esc(p.payment_note)}</span>` : ''}`;
const paidOf = (ps) => ps.filter((p) => p.is_paid).length;
const paymentChip = (ps) => `<span class="qchip ${ps.length && paidOf(ps) === ps.length ? '' : 'over'}" id="pay-chip" title="${esc(t('pay.title'))}">${esc(t('pay.summary', { paid: paidOf(ps), total: ps.length }))}</span>`;

/** Paid / not paid + a note for one participant. Resolves to { is_paid, payment_note } or null. */
function paymentDialog(p) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'pay-title');
    dlg.innerHTML = `<h2 id="pay-title">${esc(t('pay.edit', { name: personName(p) }))}</h2>
      <p class="muted small">${esc(roleLabel(p))}${p.is_paid && p.paid_at ? ` · ${esc(t('pay.paidAt', { date: fmtDateTime(p.paid_at) }))}` : ''}</p>
      <fieldset class="dlg-field"><legend class="dlg-label">${esc(t('pay.status'))}</legend>
        <label class="checkbox"><input type="radio" name="pay" value="1" ${p.is_paid ? 'checked' : ''}><span>${esc(t('pay.paid'))}</span></label>
        <label class="checkbox"><input type="radio" name="pay" value="0" ${p.is_paid ? '' : 'checked'}><span>${esc(t('pay.unpaid'))}</span></label>
      </fieldset>
      <div class="dlg-field"><label class="dlg-label" for="pay-note">${esc(t('pay.note'))}</label>
        <input id="pay-note" class="input" maxlength="255" autocomplete="off" value="${esc(p.payment_note || '')}"></div>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" value="cancel">${esc(t('common.cancel'))}</button>
        <button type="button" class="btn btn-primary" value="ok">${I.check}${esc(t('form.save'))}</button>
      </div>`;
    document.body.appendChild(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const save = () => done({ is_paid: dlg.querySelector('input[name=pay]:checked').value === '1', payment_note: dlg.querySelector('#pay-note').value.trim() || null });
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('.dialog-actions button');
      if (b) { if (b.value === 'ok') save(); else done(null); }
      else if (e.target === dlg) done(null);
    });
    dlg.querySelector('#pay-note').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
    dlg.showModal();
    dlg.querySelector('input[name=pay]:checked').focus();
  });
}

/** Opens the dialog and saves one participant's payment; resolves to the updated participant or null. */
async function editPayment(p) {
  const body = await paymentDialog(p);
  if (!body) return null;
  try {
    const res = await api(`/admin/participants/${p.id}/payment`, { method: 'PATCH', body });
    toast(t('pay.saved'), 'ok');
    return res.participant;
  } catch (err) {
    toast(err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length ? Object.values(err.fields).join(' ') : err.message, 'error');
    return null;
  }
}

/** Rejection details for the team page, in the admin's interface language. */
function rejectionHtml(team) {
  const r = team.rejection || {};
  const reasons = (r.reasons || []).map((k) => `<li>${esc(t(`rej.${k}`))}</li>`).join('');
  const comment = Object.entries(r.comment || {}).map(([l, v]) => `<li><span class="muted">${esc(t(`rej.comment.${l}`))}:</span> ${esc(v)}</li>`).join('');
  if (!reasons && !comment) return team.rejection_reason ? esc(team.rejection_reason) : '';
  return `<ul class="plain">${reasons}${comment}</ul>`;
}

/** Result of approving several teams: who got the email and, where it failed, the login to pass on. */
function bulkResultHtml(results) {
  return `<ul class="bulk-results">${results.map(({ team, res, error }) => {
    if (error) return `<li class="bad"><strong>${esc(team.country)}</strong> — ${esc(t('adm.bulkFail'))}: ${esc(error)}</li>`;
    if (res.email_sent) return `<li class="ok"><strong>${esc(team.country)}</strong> — ${esc(t('adm.bulkOk'))} (${esc(res.login)})</li>`;
    return `<li class="warn"><strong>${esc(team.country)}</strong> — ${esc(t('adm.bulkNoMail'))}${credentialsHtml(res)}</li>`;
  }).join('')}</ul>`;
}

// ---------------------------------------------------------------- teams list (the work queue)

export async function adminTeamsView(ctx) {
  ctx.root.innerHTML = spinner();
  let teams;
  try { teams = await loadTeams(); } catch (err) { failed(ctx, err, () => adminTeamsView(ctx)); return; }
  const base = ctx.adminBase;
  let activeId = null;                          // the row the keyboard works on

  const find = (id) => teams.find((x) => String(x.id) === String(id));
  const curTab = () => tab || (pendingOf(teams).length ? 'pending' : 'active');
  const count = (tb) => teams.filter((x) => inTab(x, tb)).length;
  const matches = (x) => {
    const q = query.trim().toLowerCase();
    return !q || [x.country, x.iao_code, x.user && x.user.email, x.user && x.user.name].some((v) => String(v || '').toLowerCase().includes(q));
  };
  const shown = () => teams.filter((x) => inTab(x, curTab()) && matches(x)).sort((a, b) => {
    const pa = teamState(a) === 'pending'; const pb = teamState(b) === 'pending';
    return (pb - pa) || (pa ? byApplied(a, b) : byCountry(a, b));
  });

  const btn = (act, x, label, cls = 'btn-ghost', ico = '') => `<button type="button" class="btn ${cls} btn-sm" data-act="${act}" data-id="${x.id}">${ico}${esc(label)}</button>`;
  const openLink = (x) => `<a class="btn btn-ghost btn-sm" href="${base}/teams/${x.id}" data-link>${esc(t('admin.open'))}</a>`;
  const actionsFor = (x) => {
    const st = teamState(x);
    const more = menuHtml(x, menuItems(x));
    if (st === 'pending') return `${btn('approve', x, t('adm.approve'), 'btn-primary', I.check)}${btn('reject', x, t('adm.reject'))}${more}`;
    if (st === 'rejected') return `${btn('approve', x, t('adm.approve'), 'btn-primary', I.check)}${openLink(x)}${more}`;
    if (st === 'archived') return `${btn('unarchive', x, t('adm.unarchive'))}${openLink(x)}${more}`;
    if (st === 'completed' && x.participants_count) return `${openLink(x)}<button type="button" class="btn btn-ghost btn-sm" data-xls="${x.id}">${I.download}Excel</button>${more}`;
    return `${openLink(x)}${more}`;
  };
  const peopleLine = (x) => `<span class="people" title="${esc(`${t('count.leaders')}: ${x.leaders_count ?? 0} · ${t('count.observers')}: ${x.observers_count ?? 0} · ${t('count.students')}: ${x.students_count ?? 0} · ${t('count.paid')}: ${x.paid_count ?? 0}/${x.participants_count ?? 0}`)}">
    <b>${x.leaders_count ?? 0}</b> ${esc(t('adm.abbr.leaders'))} · <b>${x.observers_count ?? 0}</b> ${esc(t('adm.abbr.observers'))} · <b>${x.students_count ?? 0}</b> ${esc(t('adm.abbr.students'))}${x.participants_count
    ? ` · <b class="${(x.paid_count ?? 0) === x.participants_count ? 'ok' : ''}">${x.paid_count ?? 0}/${x.participants_count}</b> ${esc(t('adm.abbr.paid'))}` : ''}</span>`;
  const rowHtml = (x) => {
    const pending = teamState(x) === 'pending';
    return `<div class="trow ${pending ? 'hot' : ''} ${String(activeId) === String(x.id) ? 'is-active' : ''}" data-row="${x.id}">
      <div class="tcheck">${pending ? `<input type="checkbox" data-pick="${x.id}" ${picked.has(x.id) ? 'checked' : ''} aria-label="${esc(t('adm.pick', { country: x.country }))}">` : ''}</div>
      <div class="tmain"><span><a class="strong tname" href="${base}/teams/${x.id}" data-link>${esc(x.country)}</a>${codeChip(x)}</span>
        <span class="muted small">${esc(fmtDateTime(x.created_at))}</span></div>
      <div class="tcontact"><span class="strong">${esc(x.user ? x.user.name : '')}</span>
        <span class="muted small">${esc(x.user ? x.user.email : '')}${x.user && x.user.phone ? ` · ${esc(x.user.phone)}` : ''}</span></div>
      <div class="tstatus">${stateBadge(x)}${peopleLine(x)}</div>
      <div class="tactions">${actionsFor(x)}</div>
    </div>`;
  };

  const renderTabs = () => {
    $('#tabs').innerHTML = TABS.map((tb) => `<button type="button" class="tab" role="tab" aria-selected="${tb === curTab()}" data-tab="${tb}">
      ${esc(t(`adm.tab.${tb}`))}<span class="count ${tb === 'pending' && count(tb) ? 'hot' : ''}">${count(tb)}</span></button>`).join('');
  };
  const renderBulk = (list) => {
    const pend = list.filter((x) => teamState(x) === 'pending');
    const ticked = pend.filter((x) => picked.has(x.id));
    const bar = $('#bulk');
    bar.classList.toggle('on', pend.length > 0);
    $('#pick-all').checked = pend.length > 0 && ticked.length === pend.length;
    $('#pick-all').indeterminate = ticked.length > 0 && ticked.length < pend.length;
    $('#picked-n').textContent = ticked.length ? t('adm.picked', { n: ticked.length }) : '';
    const go = $('#btn-approve-picked');
    go.disabled = !ticked.length;
    go.querySelector('span').textContent = ticked.length ? t('adm.approveN', { n: ticked.length }) : t('adm.approve');
    $('#btn-clear-pick').hidden = !ticked.length;
  };
  const render = () => {
    const q = query.trim();
    const list = shown();
    ctx.adminQueue = list.map((x) => x.id);
    setPending(ctx, teams);
    const active = teams.filter((x) => !x.archived_at);
    const sum = (k) => active.reduce((n, x) => n + (x[k] || 0), 0);
    $('#sumline').innerHTML = `<span>${esc(t('adm.tab.active'))} <b>${active.length}</b></span><span>${esc(t('adm.tab.completed'))} <b>${count('completed')}</b></span>
      <span>${esc(t('admin.kpiParticipants'))} <b>${sum('participants_count')}</b></span><span>${esc(t('admin.kpiStudents'))} <b>${sum('students_count')}</b></span>
      <span>${esc(t('admin.kpiPaid'))} <b>${sum('paid_count')}/${sum('participants_count')}</b></span>`;
    renderTabs();
    renderBulk(list);
    const exportable = list.filter((x) => x.participants_count);
    $('#btn-xls-all').disabled = !exportable.length;
    $('#btn-xls-all span').textContent = `Excel (${exportable.length})`;
    $('#teams').innerHTML = !list.length
      ? `<div class="empty"><h3>${esc(q ? t('admin.nothingFound', { q: query }) : t(curTab() === 'pending' ? 'adm.nothingPending' : teams.length ? 'adm.noneInTab' : 'admin.empty'))}</h3></div>`
      : `<div class="tlist">${list.map(rowHtml).join('')}</div>`;
  };

  const scrollTo = (id) => { const el = $(`[data-row="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
  const setActive = (id) => { activeId = id; $$('.trow.is-active').forEach((el) => el.classList.remove('is-active')); const el = $(`[data-row="${id}"]`); if (el) { el.classList.add('is-active'); scrollTo(id); } };
  /** The row that takes the place of `id` once it leaves the list (the keyboard keeps going from there). */
  const neighbour = (id) => { const list = shown(); const i = list.findIndex((x) => String(x.id) === String(id)); return i < 0 ? null : (list[i + 1] || list[i - 1] || {}).id ?? null; };

  /** Quietly re-reads the list so it matches the server; nothing jumps, picks of teams that are no longer new are dropped. */
  const reload = async () => {
    try {
      teams = await loadTeams();
      const pend = new Set(pendingOf(teams).map((x) => x.id));
      [...picked].forEach((id) => { if (!pend.has(id)) picked.delete(id); });
      render();
    } catch (e) { /* keep what is on screen */ }
  };

  const perform = async (team, action) => {
    if (!team) return;
    const next = neighbour(team.id);
    const out = await runAction(team, action);
    if (!out) return;
    mergeTeam(teams, team, action, out);
    picked.delete(team.id);
    activeId = next;
    render();
    if (next !== null) scrollTo(next);
    reload();
  };

  const approvePicked = async () => {
    const list = teams.filter((x) => picked.has(x.id) && teamState(x) === 'pending').sort(byApplied);
    if (!list.length) return;
    const ok = await confirmDialog({
      title: t('adm.bulkTitle', { n: list.length }),
      html: `<p>${esc(t('adm.bulkText'))}</p><ul class="plain">${list.map((x) => `<li><strong>${esc(x.country)}</strong> — ${esc(x.user ? x.user.email : '')}</li>`).join('')}</ul>`,
      ok: t('adm.approveN', { n: list.length }),
      focusOk: true,
    });
    if (!ok) return;
    const prog = progressDialog();
    const results = [];
    for (const [i, team] of list.entries()) {
      prog.update(t('adm.bulkProgress', { i: i + 1, n: list.length, country: team.country }), i / list.length);
      try {
        const res = await api(`/admin/teams/${team.id}/approve`, { method: 'POST' });
        if (res.team) Object.assign(team, res.team);
        results.push({ team, res });
      } catch (err) { results.push({ team, error: err.message }); }
    }
    prog.close();
    picked.clear();
    render();
    reload();
    await confirmDialog({ title: t('adm.bulkResultTitle'), html: bulkResultHtml(results), ok: t('common.close'), okOnly: true });
  };

  ctx.root.innerHTML = `
    <div class="worktop">
      <div class="title-block"><h2 class="page-title">${esc(t('admin.title'))}</h2><p class="sumline" id="sumline"></p></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost btn-sm" id="btn-csv">${I.download}${esc(t('admin.csv'))}</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-xls-all">${I.download}<span>Excel</span></button>
      </div>
    </div>
    <div class="worknav">
      <div class="worknav-row">
        <div class="tabs" role="tablist" id="tabs"></div>
        <label class="search">${I.search}<span class="sr-only">${esc(t('admin.search'))}</span>
          <input class="input" id="search" type="search" placeholder="${esc(t('admin.search'))}" value="${esc(query)}"></label>
      </div>
      <div class="bulkbar" id="bulk">
        <label class="checkbox"><input type="checkbox" id="pick-all"><span>${esc(t('adm.pickAll'))}</span></label>
        <span class="muted small" id="picked-n"></span>
        <button type="button" class="btn btn-primary btn-sm" id="btn-approve-picked" disabled>${I.check}<span>${esc(t('adm.approve'))}</span></button>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-pick" hidden>${esc(t('adm.clearPick'))}</button>
      </div>
    </div>
    <div id="teams"></div>
    <p class="keys muted small">${esc(t('adm.keys'))}</p>`;
  render();

  $('#search').addEventListener('input', (e) => { query = e.target.value; render(); });
  $('#btn-csv').addEventListener('click', async (e) => {
    const b = e.currentTarget; busy(b, true, t('admin.preparing'));
    try { download(await fetchBlobUrl('/admin/export/participants.csv'), `${fileBase()}_participants_${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
  });
  $('#btn-xls-all').addEventListener('click', async (e) => {
    const b = e.currentTarget; busy(b, true, t('admin.preparing'));
    try {
      const list = shown().filter((x) => x.participants_count).sort(byCountry);
      await exportXlsx(await fetchDetails(list));
    } catch (err) { toast(err.message, 'error'); } finally { busy(b, false); render(); }
  });
  $('#pick-all').addEventListener('change', (e) => {
    const pend = shown().filter((x) => teamState(x) === 'pending');
    pend.forEach((x) => (e.target.checked ? picked.add(x.id) : picked.delete(x.id)));
    render();
  });
  $('#btn-approve-picked').addEventListener('click', approvePicked);
  $('#btn-clear-pick').addEventListener('click', () => { picked.clear(); render(); });

  ctx.root.addEventListener('change', (e) => {
    const c = e.target.closest('[data-pick]');
    if (!c) return;
    const id = Number(c.dataset.pick);
    if (c.checked) picked.add(id); else picked.delete(id);
    renderBulk(shown());
  }, { signal: ctx.signal });
  ctx.root.addEventListener('click', async (e) => {
    const menu = e.target.closest('[data-menu]');
    if (menu) { toggleMenu(menu); return; }
    const inMenu = e.target.closest('.menu-pop');
    if (!inMenu) closeMenus();
    const tb = e.target.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; render(); return; }
    const act = e.target.closest('[data-act]');
    if (act) { closeMenus(); await perform(find(act.dataset.id), act.dataset.act); return; }
    const b = e.target.closest('[data-xls]');
    if (b) {
      closeMenus(); busy(b, true, '');
      try { const det = await api(`/admin/teams/${b.dataset.xls}`); await exportXlsx([det]); }
      catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
      return;
    }
    // anywhere else on a row: select it; a plain click on the empty part opens the team
    const row = e.target.closest('.trow');
    if (row && !e.target.closest('a, button, input, label, .menu')) { activeId = row.dataset.row; ctx.navigate(`${base}/teams/${row.dataset.row}`); }
  }, { signal: ctx.signal });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); }, { signal: ctx.signal });

  // keyboard: J/K move, A approve, R reject, X tick, Enter open, / search (never while typing or with a dialog open)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenus(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
    if (document.querySelector('dialog[open]')) return;
    const list = shown();
    const at = list.findIndex((x) => String(x.id) === String(activeId));
    const cur = at >= 0 ? list[at] : null;
    if (e.key === 'j' || e.key === 'k') {
      if (!list.length) return;
      const to = e.key === 'j' ? Math.min(at + 1, list.length - 1) : Math.max(at - 1, 0);
      setActive(list[at < 0 ? 0 : to].id);
    } else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
    else if (!cur) return;
    else if (e.key === 'Enter' && !e.target.closest('a, button')) ctx.navigate(`${base}/teams/${cur.id}`);
    else if (e.key === 'a' && ['pending', 'rejected'].includes(teamState(cur))) perform(cur, 'approve');
    else if (e.key === 'r' && teamState(cur) === 'pending') perform(cur, 'reject');
    else if (e.key === 'x' && teamState(cur) === 'pending') { if (picked.has(cur.id)) picked.delete(cur.id); else picked.add(cur.id); render(); }
  }, { signal: ctx.signal });

  // new applications appear by themselves; the list is only touched while nothing is being done
  const timer = setInterval(async () => {
    if (document.hidden || document.querySelector('dialog[open]') || $('.menu-pop:not([hidden])')) return;
    const before = new Set(pendingOf(teams).map((x) => x.id));
    await reload();
    pendingOf(teams).filter((x) => !before.has(x.id)).forEach((x) => toast(t('adm.newApp', { country: x.country }), 'ok'));
  }, POLL_MS);
  ctx.signal.addEventListener('abort', () => clearInterval(timer));
}

async function fetchDetails(list) {
  const out = new Array(list.length);
  let i = 0;
  const worker = async () => { while (i < list.length) { const k = i++; out[k] = await api(`/admin/teams/${list[k].id}`); } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

// ---------------------------------------------------------------- one team

export async function adminTeamView(ctx, { id }) {
  ctx.root.innerHTML = spinner();
  let det;
  try { det = await api(`/admin/teams/${id}`); } catch (err) { failed(ctx, err, () => adminTeamView(ctx, { id })); return; }
  ctx.adminTeam = det;
  const base = ctx.adminBase;
  const team = det.team; const ps = det.participants || [];
  const st = teamState(team);
  const u = team.user || {};
  const sorted = [...ps].sort((a, b) => (a.status === 'student') - (b.status === 'student') || String(a.student_group).localeCompare(String(b.student_group)));
  const fact = (label, value) => (value ? `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>` : '');

  // the queue the organiser came from (list order), for "previous / next"
  const queue = (ctx.adminQueue || []).map(String);
  const at = queue.indexOf(String(team.id));
  const nav = (dir, to) => `<a class="icon-btn" href="${to ? `${base}/teams/${to}` : '#'}" data-link ${to ? '' : 'aria-disabled="true"'}
    aria-label="${esc(t(dir === 'prev' ? 'adm.prevTeam' : 'adm.nextTeam'))}" title="${esc(t(dir === 'prev' ? 'adm.prevTeam' : 'adm.nextTeam'))}">${dir === 'prev' ? I.back : I.next}</a>`;

  const act = (a, label, kind = 'ghost', ico = '') => `<button type="button" class="btn btn-${kind}" data-act="${a}">${ico}${esc(t(label))}</button>`;
  const actions = {
    pending: act('approve', 'adm.approve', 'primary', I.check) + act('reject', 'adm.reject'),
    approved: act('reset-password', 'adm.resetPassword', 'ghost', I.key),
    completed: act('reopen', 'admin.reopen', 'ghost', I.undo) + act('reset-password', 'adm.resetPassword', 'ghost', I.key),
    rejected: act('approve', 'adm.approve', 'primary', I.check),
    archived: act('unarchive', 'adm.unarchive', 'primary'),
  }[st];
  const more = `<div class="menu"><button type="button" class="icon-btn icon-neutral" data-menu aria-haspopup="menu" aria-expanded="false" aria-label="${esc(t('adm.more'))}" title="${esc(t('adm.more'))}">${I.more}</button>
    <div class="menu-pop" role="menu" hidden>
      ${st === 'archived' ? '' : `<button type="button" role="menuitem" data-act="archive">${I.archive}${esc(t('adm.archive'))}</button>`}
      <button type="button" role="menuitem" class="danger" data-act="delete">${I.trash}${esc(t('adm.delete'))}</button></div></div>`;

  const q = quotaStatus(ps);
  const qchip = (g) => {
    const x = q.groups[g]; const extra = x.all - x.inQuota;
    return `<span class="qchip ${x.inQuota > x.max ? 'over' : ''}">${GROUP_SYMBOL[g]} ${x.inQuota}/${x.max}${extra ? ` <span class="plus" title="${esc(t('quota.extra', { n: extra }))}">+${extra}</span>` : ''}</span>`;
  };

  ctx.root.innerHTML = `
    <div class="admin-bar">
      <a class="icon-btn back" href="${base}" data-link aria-label="${esc(t('admin.back'))}" title="${esc(t('admin.back'))}">${I.back}</a>
      <div class="bar-title"><h2 class="page-title">${esc(team.country)}</h2>${codeChip(team)}${stateBadge(team)}</div>
      ${at >= 0 ? `<div class="queue-nav">${nav('prev', at > 0 ? queue[at - 1] : '')}<span>${esc(t('adm.queue', { i: at + 1, n: queue.length }))}</span>${nav('next', at < queue.length - 1 ? queue[at + 1] : '')}</div>` : ''}
      <div class="bar-actions">${actions}
        ${ps.length ? `<button type="button" class="btn btn-ghost" id="btn-xls">${I.download}Excel</button>` : ''}${more}</div>
    </div>
    <div class="detail-grid">
      <section class="card facts-card">
        <dl class="facts">
          ${fact(t('adm.iaoCode'), `<form id="code-form" class="code-form" novalidate>
            <input id="iao-code" class="input" maxlength="3" autocomplete="off" spellcheck="false" aria-label="${esc(t('adm.iaoCode'))}"
              value="${esc(team.iao_code || '')}" placeholder="${esc(suggestIaoCode(team.country) || '—')}">
            <button type="submit" class="btn btn-ghost btn-sm">${esc(t('form.save'))}</button></form>
            <p class="hint" id="code-hint">${esc(suggestIaoCode(team.country) ? t('adm.iaoCodeHint', { code: suggestIaoCode(team.country) }) : t('adm.iaoCodeNone'))}</p>
            <p class="err" id="code-err" role="alert"></p>`)}
          ${fact(t('admin.colContact'), esc(u.name || ''))}
          ${fact(t('auth.email'), u.email ? `<a href="mailto:${esc(u.email)}">${esc(u.email)}</a>` : '')}
          ${fact(t('adm.phone'), u.phone ? `<a href="tel:${esc(u.phone.replace(/\s/g, ''))}">${esc(u.phone)}</a>` : '')}
          ${fact(t('adm.colApplied'), esc(fmtDateTime(team.created_at)))}
          ${fact(t('adm.st.completed'), esc(fmtDateTime(team.submitted_at)))}
          ${st === 'rejected' ? fact(t('rej.reasons'), rejectionHtml(team)) : ''}
        </dl>
      </section>
      <div class="detail-main">
        ${ps.length ? `<div class="detail-head"><h3>${esc(t('adm.participantsTitle'))} <span class="muted">${ps.length}</span></h3>
          <div class="qchips" title="${esc(t('adm.quotaTitle'))}">${['alpha', 'beta', 'gamma'].map(qchip).join('')}<span class="qchip ${q.total > 6 ? 'over' : ''}">Σ ${q.total}/6${q.extra ? ` <span class="plus">+${q.extra}</span>` : ''}</span></div></div>
        <div class="pay-row" id="pay-row">${paymentChip(ps)}
          <button type="button" class="btn btn-ghost btn-sm" data-pay-all="1" ${paidOf(ps) === ps.length ? 'disabled' : ''}>${I.check}${esc(t('pay.allPaid'))}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-pay-all="0" ${paidOf(ps) ? '' : 'disabled'}>${esc(t('pay.allUnpaid'))}</button></div>
        <div class="table-wrap card-table"><table>
        <thead><tr><th>#</th><th>${esc(t('col.name'))}</th><th>${esc(t('col.role'))}</th><th>${esc(t('col.birth'))}</th><th>${esc(t('col.citizenship'))}</th><th>${esc(t('col.visa'))}</th><th>${esc(t('col.payment'))}</th><th>${esc(t('admin.files'))}</th></tr></thead>
        <tbody>${sorted.map((p, i) => `<tr data-pid="${p.id}">
          <td class="muted">${i + 1}</td>
          <td><a class="strong" href="${base}/teams/${id}/participants/${p.id}" data-link>${esc(personName(p))}</a><br><span class="muted small">${esc([p.family_name_native, p.first_name_native].filter(Boolean).join(' '))}</span></td>
          <td>${esc(roleLabel(p))}</td><td>${esc(p.birth_date || '')}</td><td>${esc(p.citizenship || '')}</td>
          <td>${esc(t(p.needs_visa_invitation ? 'common.yes' : 'common.no'))}${visaIncomplete(p) ? ` <span class="tag warn">${esc(t('badge.files'))}</span>` : ''}</td>
          <td class="pay-cell">${paymentCell(p)}</td>
          <td><div class="row-actions left">
            ${p.has_passport_scan ? `<button type="button" class="btn btn-ghost btn-sm" data-file="${p.id}/files/passport">${esc(t('admin.passport'))}</button>` : ''}
            ${p.has_face_photo ? `<button type="button" class="btn btn-ghost btn-sm" data-file="${p.id}/files/face">${esc(t('admin.photo'))}</button>` : ''}
          </div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><h3>${esc(t('admin.noParticipants'))}</h3></div>`}
      </div>
    </div>`;

  // Where to go after a decision: the next new application (oldest first), or back to the list.
  const afterDecision = async () => {
    let list = [];
    try { list = await loadTeams(); } catch (e) { /* fall through to the list */ }
    setPending(ctx, list);
    const nxt = pendingOf(list).find((x) => x.id !== team.id);
    if (nxt) { toast(t('adm.goNext', { country: nxt.country })); ctx.navigate(`${base}/teams/${nxt.id}`); return; }
    toast(t('adm.allDone'), 'ok');
    ctx.navigate(base);
  };
  const perform = async (a) => {
    const out = await runAction(team, a);
    if (!out) return;
    if (a === 'delete') { ctx.navigate(base, { replace: true }); return; }
    if (a === 'approve' || a === 'reject') { await afterDecision(); return; }
    adminTeamView(ctx, { id });
  };

  $('#code-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#iao-code'); const err = $('#code-err'); const b = e.currentTarget.querySelector('button');
    const value = input.value.trim().toUpperCase();
    err.style.display = 'none';
    if (value && !/^[A-Z]{2,3}$/.test(value)) { err.textContent = t('adm.iaoCodeFormat'); err.style.display = 'flex'; return; }
    busy(b, true, t('form.saving'));
    try {
      const res = await api(`/admin/teams/${id}`, { method: 'PATCH', body: { iao_code: value || null } });
      team.iao_code = res.team.iao_code;
      input.value = team.iao_code || '';
      toast(t('adm.iaoCodeSaved'), 'ok');
    } catch (er) {
      err.textContent = (er.fields && er.fields.iao_code) || er.message; err.style.display = 'flex';
    } finally { busy(b, false); }
  });
  $('#btn-xls')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; busy(b, true, t('admin.preparing'));
    try { await exportXlsx([det]); } catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
  });

  // payment: the row, the "paid x of n" chip and the bulk buttons are refreshed in place (no reload, no scroll jump)
  const applyPayment = (updated) => {
    updated.forEach((np) => { const p = ps.find((x) => String(x.id) === String(np.id)); if (p) Object.assign(p, np); });
    updated.forEach((np) => { const cell = ctx.root.querySelector(`tr[data-pid="${np.id}"] .pay-cell`); if (cell) cell.innerHTML = paymentCell(np); });
    const chip = $('#pay-chip'); if (chip) chip.outerHTML = paymentChip(ps);
    const allBtn = (v) => ctx.root.querySelector(`[data-pay-all="${v}"]`);
    if (allBtn('1')) allBtn('1').disabled = paidOf(ps) === ps.length;
    if (allBtn('0')) allBtn('0').disabled = !paidOf(ps);
  };
  const payAll = async (btn, paid) => {
    const ok = await confirmDialog({ title: t(paid ? 'pay.allPaidTitle' : 'pay.allUnpaidTitle', { n: ps.length }), text: t('pay.allText'), ok: t(paid ? 'pay.allPaid' : 'pay.allUnpaid'), danger: !paid, focusOk: paid });
    if (!ok) return;
    busy(btn, true, t('form.saving'));
    try {
      const res = await api(`/admin/teams/${id}/payments`, { method: 'POST', body: { is_paid: paid } });
      applyPayment(res.participants || []);
      toast(t('pay.savedN', { n: res.updated }), 'ok');
    } catch (err) { toast(err.message, 'error'); } finally { busy(btn, false); applyPayment([]); }
  };

  ctx.root.addEventListener('click', async (e) => {
    const menu = e.target.closest('[data-menu]');
    if (menu) { toggleMenu(menu); return; }
    if (!e.target.closest('.menu-pop')) closeMenus();
    const a = e.target.closest('[data-act]');
    if (a) { closeMenus(); await perform(a.dataset.act); return; }
    const pay = e.target.closest('[data-pay]');
    if (pay) {
      const p = ps.find((x) => String(x.id) === pay.dataset.pay);
      const np = p && await editPayment(p);
      if (np) applyPayment([np]);
      return;
    }
    const all = e.target.closest('[data-pay-all]');
    if (all) { await payAll(all, all.dataset.payAll === '1'); return; }
    const b = e.target.closest('[data-file]'); if (!b) return;
    const w = window.open('', '_blank');
    try { const url = await fetchBlobUrl(`/admin/participants/${b.dataset.file}`); if (w) w.location = url; }
    catch (err) { if (w) w.close(); toast(err.message, 'error'); }
  }, { signal: ctx.signal });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); }, { signal: ctx.signal });

  // keyboard: A approve, R reject, [ and ] previous / next team, Esc back to the list
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!e.repeat && !$('.menu-pop:not([hidden])') && !document.querySelector('dialog[open]')) ctx.navigate(base); closeMenus(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'a' && ['pending', 'rejected'].includes(st)) perform('approve');
    else if (e.key === 'r' && st === 'pending') perform('reject');
    else if (e.key === ']' && at >= 0 && at < queue.length - 1) ctx.navigate(`${base}/teams/${queue[at + 1]}`);
    else if (e.key === '[' && at > 0) ctx.navigate(`${base}/teams/${queue[at - 1]}`);
  }, { signal: ctx.signal });

  // the header badge and the queue need the list even when this page was opened directly
  if (!ctx.adminQueue || !ctx.adminQueue.length) {
    loadTeams().then((list) => { setPending(ctx, list); }).catch(() => {});
  }
}

// ---------------------------------------------------------------- one participant (read-only)

export async function adminParticipantView(ctx, { id, pid }) {
  ctx.root.innerHTML = spinner();
  let det = ctx.adminTeam && String(ctx.adminTeam.team.id) === String(id) ? ctx.adminTeam : null;
  try { if (!det) det = await api(`/admin/teams/${id}`); } catch (err) { failed(ctx, err, () => adminParticipantView(ctx, { id, pid })); return; }
  ctx.adminTeam = det;
  loadTeams().then((list) => setPending(ctx, list)).catch(() => {});
  const p = (det.participants || []).find((x) => String(x.id) === String(pid));
  if (!p) { ctx.root.innerHTML = `<div class="card state-box"><h2>${esc(t('err.notFound'))}</h2></div>`; return; }
  const d = fromParticipant(p);
  const payBlock = () => `<div class="pay-row" id="pay-block">${paymentTag(p, true)}
    ${p.is_paid && p.paid_at ? `<span class="muted small">${esc(t('pay.paidAt', { date: fmtDateTime(p.paid_at) }))}</span>` : ''}
    ${p.payment_note ? `<span class="muted small">${esc(p.payment_note)}</span>` : ''}</div>`;
  ctx.root.innerHTML = `
    <a class="back-link" href="${ctx.adminBase}/teams/${id}" data-link>${I.back}${esc(det.team.country)}</a>
    <div class="page-head"><h2 class="page-title">${esc(personName(p))}</h2><p class="page-lead">${esc(roleLabel(p))}</p>${payBlock()}</div>
    <form class="readonly-form" onsubmit="return false">${renderSections(d, { readonly: true, fileLinks: true })}</form>`;
  ctx.root.querySelector('form').addEventListener('click', (e) => openFile(e, `/admin/participants/${pid}/files/`));
  ctx.root.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-pay]')) return;
    const np = await editPayment(p);
    if (np) { Object.assign(p, np); $('#pay-block').outerHTML = payBlock(); }
  }, { signal: ctx.signal });
}

// ---------------------------------------------------------------- settings

export async function adminSettingsView(ctx) {
  ctx.root.innerHTML = spinner();
  let s;
  try { s = await api('/admin/settings'); } catch (err) { failed(ctx, err, () => adminSettingsView(ctx)); return; }
  loadTeams().then((list) => setPending(ctx, list)).catch(() => {});
  const langs = ['en', 'ru', 'uz'].map((c) => LANGS.find((l) => l.code === c));
  const field = (name, label, value, { type = 'text', attrs = '' } = {}) => `
    <div class="field" data-field="${name}">
      <label for="s-${name}">${esc(label)}</label>
      <input class="input" id="s-${name}" name="${name}" type="${type}" value="${esc(value ?? '')}" ${attrs}>
      <p class="err"></p>
    </div>`;
  const multi = (key, label) => langs.map((l) => field(`${key}.${l.code}`, `${label} · ${l.label}`, (s[key] || {})[l.code],
    { attrs: `lang="${l.code}" maxlength="${key === 'name' ? 200 : 100}"` })).join('');

  const draw = () => {
    ctx.root.innerHTML = `
      <div class="page-head"><h2 class="page-title">${esc(t('set.title'))}</h2><p class="page-lead">${esc(t('set.lead'))}</p></div>
      <form id="sform" novalidate class="stack-16">
        <section class="card">
          <h3 class="card-title">${esc(t('set.olympiad'))}</h3>
          <div class="grid grid-3">
            ${field('edition', t('set.edition'), s.edition, { attrs: 'maxlength="20" lang="en"' })}
            ${field('year', t('set.year'), s.year, { type: 'number', attrs: 'min="2000" max="2100"' })}
          </div>
          <div class="grid grid-3 mt-16">${multi('name', t('set.name'))}</div>
          <div class="grid grid-3 mt-16">${multi('city', t('set.city'))}</div>
          <div class="grid grid-3 mt-16">${multi('country', t('set.country'))}</div>
        </section>
        <section class="card">
          <h3 class="card-title">${esc(t('set.dates'))}</h3>
          <div class="grid mt-16">
            ${field('starts_on', t('set.startsOn'), s.starts_on, { type: 'date' })}
            ${field('ends_on', t('set.endsOn'), s.ends_on, { type: 'date' })}
          </div>
        </section>
        <section class="card">
          <h3 class="card-title">${esc(t('set.registration'))}</h3>
          <p class="card-sub">${esc(t('set.registrationLead'))}</p>
          <div class="grid">
            ${field('registration_opens_on', t('set.opensOn'), s.registration_opens_on, { type: 'date' })}
            ${field('registration_closes_on', t('set.closesOn'), s.registration_closes_on, { type: 'date' })}
          </div>
          <p class="mt-16"><span class="badge ${s.registration_status === 'open' ? 'ok' : 'warn'}">${esc(t('set.status', { status: t(`set.st.${s.registration_status}`) }))}</span></p>
        </section>
        <div id="s-error"></div>
        <div class="form-actions"><button class="btn btn-primary" type="submit">${I.check}${esc(t('set.save'))}</button></div>
      </form>
      <section class="card danger-zone mt-16">
        <h3 class="card-title">${esc(t('set.season'))}</h3>
        <p class="card-sub">${esc(t('set.seasonLead'))}</p>
        <button type="button" class="btn btn-danger" id="btn-archive-all">${esc(t('set.archiveAll'))}</button>
      </section>`;

    const form = $('#sform');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form).entries());
      const body = {
        edition: v.edition.trim(), year: Number(v.year), name: {}, city: {}, country: {},
        starts_on: v.starts_on, ends_on: v.ends_on,
        registration_opens_on: v.registration_opens_on || null, registration_closes_on: v.registration_closes_on || null,
      };
      ['name', 'city', 'country'].forEach((k) => langs.forEach((l) => { body[k][l.code] = (v[`${k}.${l.code}`] || '').trim(); }));
      const errs = {};
      ['edition', 'year', 'starts_on', 'ends_on'].forEach((k) => { if (!v[k]) errs[k] = t('err.required'); });
      ['name', 'city', 'country'].forEach((k) => langs.forEach((l) => { if (!body[k][l.code]) errs[`${k}.${l.code}`] = t('err.required'); }));
      if (v.starts_on && v.ends_on && v.ends_on < v.starts_on) errs.ends_on = t('err.datesOrder');
      if (v.registration_opens_on && v.registration_closes_on && v.registration_closes_on < v.registration_opens_on) errs.registration_closes_on = t('err.datesOrder');
      showErrs(form, errs);
      if (Object.keys(errs).length) return;
      const b = form.querySelector('button[type=submit]');
      busy(b, true, t('form.saving'));
      try {
        s = await api('/admin/settings', { method: 'PUT', body });
        setSettings(s);
        ctx.renderHeader();
        toast(t('set.saved'), 'ok');
        draw();
      } catch (err) {
        busy(b, false);
        if (err.status === 422 && Object.keys(err.fields).length) showErrs(form, err.fields);
        else $('#s-error').innerHTML = note(esc(err.message), 'error');
      }
    });
    $('#btn-archive-all').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      let teams;
      try { teams = await api('/admin/teams'); } catch (err) { toast(err.message, 'error'); return; }
      const n = (Array.isArray(teams) ? teams : []).filter((x) => !x.archived_at).length;
      const ok = await confirmDialog({ title: t('set.archiveAllTitle', { n }), text: t('set.archiveAllText'), ok: t('set.archiveAll'), danger: true });
      if (!ok) return;
      busy(b, true, t('form.saving'));
      try { const res = await api('/admin/teams/archive-all', { method: 'POST' }); toast(t('set.archivedAll', { n: res.archived }), 'ok'); }
      catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
    });
  };
  draw();
}
function showErrs(form, errs) {
  form.querySelectorAll('[data-field]').forEach((box) => {
    const msg = errs[box.dataset.field] || '';
    box.classList.toggle('invalid', !!msg);
    box.querySelector('.err').textContent = msg;
  });
  form.querySelector('.field.invalid input')?.focus();
}

// ---------------------------------------------------------------- Excel (.xlsx) in the organisers' layout

let excelPromise = null;
function loadExcelJs() {
  if (window.ExcelJS) return Promise.resolve();
  if (!excelPromise) {
    excelPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      el.onload = resolve; el.onerror = () => { excelPromise = null; reject(new Error(t('err.network'))); };
      document.head.appendChild(el);
    });
  }
  return excelPromise;
}

const STATUS_EN = { pending: 'Awaiting approval', approved: 'Filling in', completed: 'Completed', rejected: 'Rejected', archived: 'Archived' };

/** One workbook: the application form of every team (the organisers' template) + "Personal data" (+ "Teams" for several teams). */
async function exportXlsx(details) {
  await loadExcelJs();
  const olympiad = settings();
  const { wb, missingCodes } = buildWorkbook(window.ExcelJS, details, { olympiad, statusOf: (tm) => STATUS_EN[teamState(tm)] });
  const buffer = await wb.xlsx.writeBuffer();
  download(URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), applicationFileName(olympiad, details));
  if (missingCodes.length) toast(t('adm.codeMissing', { list: missingCodes.join(', ') }), 'error');
}
