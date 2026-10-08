// Organisers' panel: applications and teams, approval with login/password, archive,
// olympiad settings, and a clean Excel export (ExcelJS, styled .xlsx).
import { t, LANGS } from './i18n.js';
import { api, fetchBlobUrl, ApiError } from './api.js';
import { esc, $, I, note, spinner, errorBox, toast, confirmDialog, busy, fmtDateTime, download } from './ui.js';
import { fromParticipant, personName, roleLabel, visaIncomplete } from './fields.js';
import { renderSections, openFile } from './views-team.js';
import { setSettings, olympiadName, shortName } from './settings.js';

const TABS = ['active', 'pending', 'approved', 'completed', 'rejected', 'archived'];
let query = '';
let tab = 'active';

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
const fileSafe = (s) => String(s || 'Team').replace(/[^A-Za-z0-9]+/g, '_');

function failed(ctx, err, retry) {
  ctx.root.innerHTML = errorBox(t('dash.loadError'), err.message);
  ctx.root.querySelector('[data-action=retry]').addEventListener('click', retry);
}

// ---------------------------------------------------------------- actions (shared by list and detail)

function credentialsHtml(res) {
  const row = (label, value) => `<div class="cred-row"><span>${esc(label)}</span><code>${esc(value)}</code>
    <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(value)}">${esc(t('common.copy'))}</button></div>`;
  return `<div class="cred">${row(t('adm.login'), res.login)}${row(t('adm.password'), res.password)}</div>
    ${note(esc(t(res.email_sent ? 'adm.credSent' : 'adm.credNotSent')), res.email_sent ? 'ok' : 'warn')}`;
}

async function runAction(team, action, after) {
  const country = team.country;
  const email = team.user ? team.user.email : '';
  try {
    if (action === 'approve' || action === 'reset-password') {
      const approve = action === 'approve';
      const ok = await confirmDialog({
        title: t(approve ? 'adm.approveTitle' : 'adm.resetTitle', { country }),
        text: t(approve ? 'adm.approveText' : 'adm.resetText', { email }),
        ok: t(approve ? 'adm.approve' : 'adm.resetPassword'),
      });
      if (!ok) return;
      const res = await api(`/admin/teams/${team.id}/${action}`, { method: 'POST' });
      await confirmDialog({ title: t('adm.credTitle'), html: credentialsHtml(res), ok: t('common.close'), okOnly: true });
      if (approve) toast(t('adm.approved', { country }), 'ok');
    } else if (action === 'reject') {
      const reason = await confirmDialog({
        title: t('adm.rejectTitle', { country }), ok: t('adm.reject'), danger: true,
        input: { label: t('adm.rejectReason'), maxlength: 500 },
      });
      if (reason === false) return;
      await api(`/admin/teams/${team.id}/reject`, { method: 'POST', body: { reason } });
      toast(t('adm.rejected', { country }), 'ok');
    } else if (action === 'archive') {
      const ok = await confirmDialog({ title: t('adm.archiveTitle', { country }), text: t('adm.archiveText'), ok: t('adm.archive'), danger: true });
      if (!ok) return;
      await api(`/admin/teams/${team.id}/archive`, { method: 'POST' });
      toast(t('adm.archived', { country }), 'ok');
    } else if (action === 'unarchive') {
      await api(`/admin/teams/${team.id}/unarchive`, { method: 'POST' });
      toast(t('adm.unarchived', { country }), 'ok');
    } else if (action === 'reopen') {
      const ok = await confirmDialog({ title: t('admin.reopenTitle'), text: t('admin.reopenText', { country }), ok: t('admin.reopen') });
      if (!ok) return;
      await api(`/admin/teams/${team.id}/reopen`, { method: 'POST' });
      toast(t('admin.reopened'), 'ok');
    }
    after();
  } catch (err) {
    toast(err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length ? Object.values(err.fields).join(' ') : err.message, 'error');
  }
}

// ---------------------------------------------------------------- teams list

export async function adminTeamsView(ctx) {
  ctx.root.innerHTML = spinner();
  let teams;
  try { teams = await api('/admin/teams'); } catch (err) { failed(ctx, err, () => adminTeamsView(ctx)); return; }
  if (!Array.isArray(teams)) teams = teams.data || [];
  const base = ctx.adminBase;
  const count = (tb) => teams.filter((x) => inTab(x, tb)).length;
  const active = teams.filter((x) => !x.archived_at);
  const sum = (k) => active.reduce((n, x) => n + (x[k] || 0), 0);
  const pendingN = count('pending');

  const actionsFor = (x) => {
    const st = teamState(x);
    if (st === 'pending') return `<button type="button" class="btn btn-primary btn-sm" data-act="approve" data-id="${x.id}">${I.check}${esc(t('adm.approve'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="reject" data-id="${x.id}">${esc(t('adm.reject'))}</button>`;
    if (st === 'archived') return `<button type="button" class="btn btn-ghost btn-sm" data-act="unarchive" data-id="${x.id}">${esc(t('adm.unarchive'))}</button>`;
    return `<a class="btn btn-ghost btn-sm" href="${base}/teams/${x.id}" data-link>${esc(t('admin.open'))}</a>
      ${x.participants_count ? `<button type="button" class="btn btn-ghost btn-sm" data-xls="${x.id}">${I.download}Excel</button>` : ''}`;
  };

  const render = () => {
    const q = query.trim().toLowerCase();
    const shown = teams.filter((x) => inTab(x, tab))
      .filter((x) => !q || [x.country, x.user && x.user.email, x.user && x.user.name].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (teamState(b) === 'pending') - (teamState(a) === 'pending') || a.country.localeCompare(b.country));
    $('#tabs').innerHTML = TABS.map((tb) => `<button type="button" class="tab" role="tab" aria-selected="${tb === tab}" data-tab="${tb}">
      ${esc(t(`adm.tab.${tb}`))}<span class="count ${tb === 'pending' && count(tb) ? 'hot' : ''}">${count(tb)}</span></button>`).join('');
    const exportable = shown.filter((x) => x.participants_count);
    $('#btn-xls-all').disabled = !exportable.length;
    $('#btn-xls-all span').textContent = `Excel (${exportable.length})`;
    $('#teams').innerHTML = !shown.length
      ? `<div class="empty"><h3>${esc(q ? t('admin.nothingFound', { q: query }) : t(teams.length ? 'adm.noneInTab' : 'admin.empty'))}</h3></div>`
      : `<div class="table-wrap card-table"><table>
          <thead><tr><th>${esc(t('admin.colCountry'))}</th><th>${esc(t('admin.colContact'))}</th><th>${esc(t('adm.colApplied'))}</th><th>${esc(t('admin.colStatus'))}</th>
            <th class="num">${esc(t('count.leaders'))}</th><th class="num">${esc(t('count.observers'))}</th><th class="num">${esc(t('count.students'))}</th><th></th></tr></thead>
          <tbody>${shown.map((x) => `<tr class="${teamState(x) === 'pending' ? 'row-hot' : ''}">
            <td><a class="strong" href="${base}/teams/${x.id}" data-link>${esc(x.country)}</a></td>
            <td>${esc(x.user ? x.user.name : '')}<br><span class="muted small">${esc(x.user ? x.user.email : '')}${x.user && x.user.phone ? ` · ${esc(x.user.phone)}` : ''}</span></td>
            <td class="muted small">${esc(fmtDateTime(x.created_at))}</td>
            <td>${stateBadge(x)}${x.submitted_at ? `<br><span class="muted small">${esc(fmtDateTime(x.submitted_at))}</span>` : ''}</td>
            <td class="num">${x.leaders_count ?? 0}</td><td class="num">${x.observers_count ?? 0}</td><td class="num">${x.students_count ?? 0}</td>
            <td><div class="row-actions">${actionsFor(x)}</div></td></tr>`).join('')}</tbody></table></div>`;
  };

  ctx.root.innerHTML = `
    <div class="page-head row-between">
      <div><h2 class="page-title">${esc(t('admin.title'))}</h2><p class="page-lead">${esc(t('admin.lead'))}</p></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="btn-csv">${I.download}${esc(t('admin.csv'))}</button>
        <button type="button" class="btn btn-primary" id="btn-xls-all">${I.download}<span>Excel</span></button>
      </div>
    </div>
    ${pendingN ? `<div class="mb-24">${note(`<strong>${esc(t('adm.pendingHint', { n: pendingN }))}</strong>`, 'warn')}</div>` : ''}
    <dl class="kpis kpis-4">
      <div class="kpi"><dt>${esc(t('admin.kpiTeams'))}</dt><dd>${active.length}</dd></div>
      <div class="kpi"><dt>${esc(t('adm.tab.completed'))}</dt><dd>${count('completed')}</dd></div>
      <div class="kpi"><dt>${esc(t('admin.kpiParticipants'))}</dt><dd>${sum('participants_count')}</dd></div>
      <div class="kpi"><dt>${esc(t('admin.kpiStudents'))}</dt><dd>${sum('students_count')}</dd></div>
    </dl>
    <div class="tabs" role="tablist" id="tabs"></div>
    <label class="search">${I.search}<span class="sr-only">${esc(t('admin.search'))}</span>
      <input class="input" id="search" type="search" placeholder="${esc(t('admin.search'))}" value="${esc(query)}"></label>
    <div id="teams"></div>`;
  render();

  $('#search').addEventListener('input', (e) => { query = e.target.value; render(); });
  $('#btn-csv').addEventListener('click', async (e) => {
    const btn = e.currentTarget; busy(btn, true, t('admin.preparing'));
    try { download(await fetchBlobUrl('/admin/export/participants.csv'), `${fileBase()}_participants_${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (err) { toast(err.message, 'error'); } finally { busy(btn, false); }
  });
  $('#btn-xls-all').addEventListener('click', async (e) => {
    const btn = e.currentTarget; busy(btn, true, t('admin.preparing'));
    try {
      const list = teams.filter((x) => inTab(x, tab) && x.participants_count).sort((a, b) => a.country.localeCompare(b.country));
      const details = await fetchDetails(list);
      await exportXlsx(details, `${fileBase()}_${fileSafe(t(`adm.tab.${tab}`))}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) { toast(err.message, 'error'); } finally { busy(btn, false); render(); }
  });
  ctx.root.addEventListener('click', async (e) => {
    const tb = e.target.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; render(); return; }
    const act = e.target.closest('[data-act]');
    if (act) { runAction(teams.find((x) => String(x.id) === act.dataset.id), act.dataset.act, () => adminTeamsView(ctx)); return; }
    const b = e.target.closest('[data-xls]'); if (!b) return;
    busy(b, true, '');
    try { const det = await api(`/admin/teams/${b.dataset.xls}`); await exportXlsx([det], `${fileBase()}_${fileSafe(det.team.country)}.xlsx`); }
    catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
  }, { signal: ctx.signal });
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
  const btn = (act, label, kind = 'ghost') => `<button type="button" class="btn btn-${kind}" data-act="${act}">${esc(t(label))}</button>`;
  const actions = {
    pending: btn('approve', 'adm.approve', 'primary') + btn('reject', 'adm.reject'),
    approved: btn('reset-password', 'adm.resetPassword') + btn('archive', 'adm.archive'),
    completed: btn('reopen', 'admin.reopen') + btn('reset-password', 'adm.resetPassword') + btn('archive', 'adm.archive'),
    rejected: btn('approve', 'adm.approve', 'primary') + btn('archive', 'adm.archive'),
    archived: btn('unarchive', 'adm.unarchive', 'primary'),
  }[st];
  const fact = (label, value) => (value ? `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>` : '');

  ctx.root.innerHTML = `
    <a class="back-link" href="${base}" data-link>${I.back}${esc(t('admin.back'))}</a>
    <div class="page-head row-between">
      <div class="title-row"><h2 class="page-title">${esc(team.country)}</h2>${stateBadge(team)}</div>
      <div class="btn-row">${actions}
        ${ps.length ? `<button type="button" class="btn btn-ghost" id="btn-xls">${I.download}Excel</button>` : ''}</div>
    </div>
    <section class="card mb-24">
      <dl class="facts">
        ${fact(t('admin.colContact'), esc(u.name || ''))}
        ${fact(t('auth.email'), u.email ? `<a href="mailto:${esc(u.email)}">${esc(u.email)}</a>` : '')}
        ${fact(t('adm.phone'), u.phone ? `<a href="tel:${esc(u.phone.replace(/\s/g, ''))}">${esc(u.phone)}</a>` : '')}
        ${fact(t('adm.colApplied'), esc(fmtDateTime(team.created_at)))}
        ${fact(t('adm.st.completed'), esc(fmtDateTime(team.submitted_at)))}
        ${team.rejection_reason ? fact(t('adm.st.rejected'), esc(team.rejection_reason)) : ''}
      </dl>
    </section>
    ${ps.length ? `<div class="table-wrap card-table"><table>
      <thead><tr><th>#</th><th>${esc(t('col.name'))}</th><th>${esc(t('col.role'))}</th><th>${esc(t('col.birth'))}</th><th>${esc(t('col.citizenship'))}</th><th>${esc(t('col.visa'))}</th><th>${esc(t('admin.files'))}</th></tr></thead>
      <tbody>${sorted.map((p, i) => `<tr>
        <td class="muted">${i + 1}</td>
        <td><a class="strong" href="${base}/teams/${id}/participants/${p.id}" data-link>${esc(personName(p))}</a><br><span class="muted small">${esc([p.family_name_native, p.first_name_native].filter(Boolean).join(' '))}</span></td>
        <td>${esc(roleLabel(p))}</td><td>${esc(p.birth_date || '')}</td><td>${esc(p.citizenship || '')}</td>
        <td>${esc(t(p.needs_visa_invitation ? 'common.yes' : 'common.no'))}${visaIncomplete(p) ? ` <span class="tag warn">${esc(t('badge.files'))}</span>` : ''}</td>
        <td><div class="row-actions left">
          ${p.has_passport_scan ? `<button type="button" class="btn btn-ghost btn-sm" data-file="${p.id}/files/passport">${esc(t('admin.passport'))}</button>` : ''}
          ${p.has_face_photo ? `<button type="button" class="btn btn-ghost btn-sm" data-file="${p.id}/files/face">${esc(t('admin.photo'))}</button>` : ''}
        </div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><h3>${esc(t('admin.noParticipants'))}</h3></div>`}`;

  $('#btn-xls')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; busy(b, true, t('admin.preparing'));
    try { await exportXlsx([det], `${fileBase()}_${fileSafe(team.country)}.xlsx`); } catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
  });
  ctx.root.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (act) { runAction(team, act.dataset.act, () => adminTeamView(ctx, { id })); return; }
    const b = e.target.closest('[data-file]'); if (!b) return;
    const w = window.open('', '_blank');
    try { const url = await fetchBlobUrl(`/admin/participants/${b.dataset.file}`); if (w) w.location = url; }
    catch (err) { if (w) w.close(); toast(err.message, 'error'); }
  }, { signal: ctx.signal });
}

// ---------------------------------------------------------------- one participant (read-only)

export async function adminParticipantView(ctx, { id, pid }) {
  ctx.root.innerHTML = spinner();
  let det = ctx.adminTeam && String(ctx.adminTeam.team.id) === String(id) ? ctx.adminTeam : null;
  try { if (!det) det = await api(`/admin/teams/${id}`); } catch (err) { failed(ctx, err, () => adminParticipantView(ctx, { id, pid })); return; }
  ctx.adminTeam = det;
  const p = (det.participants || []).find((x) => String(x.id) === String(pid));
  if (!p) { ctx.root.innerHTML = `<div class="card state-box"><h2>${esc(t('err.notFound'))}</h2></div>`; return; }
  const d = fromParticipant(p);
  ctx.root.innerHTML = `
    <a class="back-link" href="${ctx.adminBase}/teams/${id}" data-link>${I.back}${esc(det.team.country)}</a>
    <div class="page-head"><h2 class="page-title">${esc(personName(p))}</h2><p class="page-lead">${esc(roleLabel(p))}</p></div>
    <form class="readonly-form" onsubmit="return false">${renderSections(d, { readonly: true, fileLinks: true })}</form>`;
  ctx.root.querySelector('form').addEventListener('click', (e) => openFile(e, `/admin/participants/${pid}/files/`));
}

// ---------------------------------------------------------------- settings

export async function adminSettingsView(ctx) {
  ctx.root.innerHTML = spinner();
  let s;
  try { s = await api('/admin/settings'); } catch (err) { failed(ctx, err, () => adminSettingsView(ctx)); return; }
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

// ---------------------------------------------------------------- Excel (.xlsx, styled)

let excelPromise = null;
function loadExcelJs() {
  if (window.ExcelJS) return Promise.resolve();
  if (!excelPromise) {
    excelPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload = resolve; s.onerror = () => { excelPromise = null; reject(new Error(t('err.network'))); };
      document.head.appendChild(s);
    });
  }
  return excelPromise;
}

const NAVY = 'FF13284A'; const ZEBRA = 'FFEEF4FB'; const LINE = 'FFC9D6E6';
const GROUP_FILL = { alpha: 'FFE3F2FD', beta: 'FFE6F6EC', gamma: 'FFFFF3DC' };
const thin = { style: 'thin', color: { argb: LINE } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const ROLE_ORDER = { team_leader: 0, team_leader_jury: 1, observer: 2, student: 3 };
const GROUP_ORDER = { alpha: 0, beta: 1, gamma: 2 };
const SYMBOL = { alpha: 'α', beta: 'β', gamma: 'γ' };
const yesNo = (v) => t(v ? 'common.yes' : 'common.no');
const enumLabel = (name, v) => (v ? t(`enum.${name}.${v}`) : '');

/** One workbook: a "Teams" summary sheet and a "Participants" sheet with one row per person. */
async function exportXlsx(details, filename) {
  await loadExcelJs();
  const wb = new window.ExcelJS.Workbook();
  wb.creator = shortName();
  wb.created = new Date();
  const today = fmtDateTime(new Date().toISOString());

  // ---- sheet 1: teams
  const teamCols = [
    [t('xls.no'), 6], [t('xls.country'), 22], [t('xls.responsible'), 26], [t('auth.email'), 30], [t('adm.phone'), 18],
    [t('xls.status'), 18], [t('xls.applied'), 17], [t('xls.submittedAt'), 17],
    [t('count.leaders'), 12], [t('count.observers'), 13], ['α', 6], ['β', 6], ['γ', 6], [t('xls.total'), 8],
  ];
  const ws1 = wb.addWorksheet(t('xls.sheetTeams'), { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] });
  sheetTitle(ws1, t('xls.title', { name: olympiadName() }), today, teamCols.length);
  headerRow(ws1, 4, teamCols);
  const teamRows = details.map((det, i) => {
    const ps = det.participants || []; const tm = det.team; const u = tm.user || {};
    const g = (k) => ps.filter((p) => p.status === 'student' && p.student_group === k).length;
    return [i + 1, tm.country, u.name || '', u.email || '', u.phone || '', t(`adm.st.${teamState(tm)}`),
      fmtDateTime(tm.created_at), fmtDateTime(tm.submitted_at),
      ps.filter((p) => p.status === 'team_leader' || p.status === 'team_leader_jury').length,
      ps.filter((p) => p.status === 'observer').length, g('alpha'), g('beta'), g('gamma'), ps.length];
  });
  teamRows.forEach((r, i) => dataRow(ws1, 5 + i, r, i % 2 ? ZEBRA : null, [0, 8, 9, 10, 11, 12, 13]));
  if (teamRows.length > 1) {
    const total = ['', t('xls.total'), '', '', '', '', '', '', ...[8, 9, 10, 11, 12, 13].map((c) => teamRows.reduce((n, r) => n + r[c], 0))];
    dataRow(ws1, 5 + teamRows.length, total, 'FFDCE6F2', [8, 9, 10, 11, 12, 13]).font = { bold: true };
  }
  ws1.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + teamRows.length, column: teamCols.length } };

  // ---- sheet 2: participants (one row per person, teams separated by shading)
  const pCols = [
    [t('xls.no'), 6], [t('xls.country'), 18], [t('xls.role'), 26], [t('xls.group'), 8],
    [t('f.family_name_en'), 18], [t('f.first_name_en'), 20], [t('f.family_name_native'), 18], [t('f.first_name_native'), 20],
    [t('f.sex'), 9], [t('f.birth_date'), 12], [t('f.birth_place'), 22], [t('f.citizenship'), 16],
    [t('badge.prize'), 11], [t('col.visa'), 8], [t('f.passport_number'), 15], [t('f.passport_issue_date'), 12], [t('f.passport_expiry_date'), 12], [t('f.passport_issued_by'), 22],
    [t('f.position'), 16], [t('f.org_name'), 26], [t('f.org_location'), 20], [t('f.graduation_date'), 13],
    [t('f.mobile_phone'), 18], [t('f.email'), 28], [t('f.official_language'), 13], [t('f.native_languages'), 18],
    [t('f.diet'), 15], [t('f.tshirt_size'), 9], [t('f.food_notes'), 26], [t('f.medical_notes'), 26], [t('f.previous_olympiads'), 26],
    [t('xls.emergencyName'), 24], [t('f.emergency_relation'), 14], [t('f.emergency_phones'), 18],
  ];
  const ws2 = wb.addWorksheet(t('xls.sheetParticipants'), { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] });
  sheetTitle(ws2, t('xls.titleParticipants', { name: olympiadName() }), today, pCols.length);
  headerRow(ws2, 4, pCols);
  let row = 5; let n = 0;
  details.forEach((det, ti) => {
    const people = [...(det.participants || [])].sort((a, b) => (ROLE_ORDER[a.status] - ROLE_ORDER[b.status])
      || ((GROUP_ORDER[a.student_group] ?? 9) - (GROUP_ORDER[b.student_group] ?? 9))
      || String(a.family_name_en).localeCompare(String(b.family_name_en)));
    people.forEach((p) => {
      n += 1;
      const ec = p.emergency_contact || {};
      const values = [
        n, det.team.country, t(`enum.status.${p.status}`), SYMBOL[p.student_group] || '',
        p.family_name_en, p.first_name_en, p.family_name_native, p.first_name_native,
        enumLabel('sex', p.sex), p.birth_date, p.birth_place, p.citizenship,
        p.status === 'student' ? yesNo(p.previous_prizewinner) : '', yesNo(p.needs_visa_invitation),
        p.passport_number, p.passport_issue_date, p.passport_expiry_date, p.passport_issued_by,
        p.position, p.org_name, p.org_location, p.graduation_date,
        p.mobile_phone, p.email, enumLabel('official_language', p.official_language), p.native_languages,
        enumLabel('diet', p.diet), p.tshirt_size, p.food_notes, p.medical_notes, p.previous_olympiads,
        [ec.family_name, ec.first_name].filter(Boolean).join(' '), ec.relation, ec.phones,
      ].map((v) => (v === null || v === undefined ? '' : v));
      const r = dataRow(ws2, row, values, ti % 2 ? ZEBRA : null, [0, 3, 8, 9, 12, 13, 15, 16, 24, 27]);
      if (p.student_group) r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_FILL[p.student_group] } };
      [29, 30, 31].forEach((c) => { r.getCell(c).alignment = { wrapText: true, vertical: 'top' }; });
      row += 1;
    });
  });
  ws2.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, row - 1), column: pCols.length } };

  const buf = await wb.xlsx.writeBuffer();
  download(URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), filename);
}

function sheetTitle(ws, title, date, cols) {
  const span = Math.min(cols, 8);
  ws.mergeCells(1, 1, 1, span);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.getRow(1).height = 24;
  ws.mergeCells(2, 1, 2, span);
  ws.getCell(2, 1).value = t('xls.generated', { date });
  ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF687891' } };
}
function headerRow(ws, rowNo, cols) {
  cols.forEach(([, width], i) => { ws.getColumn(i + 1).width = width; });
  const r = ws.getRow(rowNo);
  cols.forEach(([label], i) => {
    const c = r.getCell(i + 1);
    c.value = label;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = BORDER;
  });
  r.height = 36;
}
function dataRow(ws, rowNo, values, fill, centered = []) {
  const r = ws.getRow(rowNo);
  values.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v;
    c.border = BORDER;
    c.alignment = { vertical: 'middle', horizontal: centered.includes(i) ? 'center' : 'left' };
    if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  });
  return r;
}
