// Team dashboard, participant form, review & submit.
import { t } from './i18n.js';
import { api, fetchBlobUrl, ApiError } from './api.js';
import { esc, $, $$, I, note, spinner, errorBox, toast, confirmDialog, busy, fmtDateTime } from './ui.js';
import {
  SECTIONS, ALL_FIELDS, fieldDef, renderField, validateField, validateAll, isVisible, filterValue, rejectMessage,
  emptyDraft, fromParticipant, toFormData, checkImage, personName, roleLabel, visaIncomplete,
  birthYear, eligibleYear, groupCell, cellGroups, GROUP_SYMBOL, quotaStatus,
} from './fields.js';
import { closesOn } from './settings.js';

const GROUP_ORDER = ['alpha', 'beta', 'gamma'];
const initials = (p) => ((p.first_name_en || '?')[0] + (p.family_name_en || '')[0] || '').toUpperCase();

async function loadTeam() {
  const [team, parts] = await Promise.all([api('/team'), api('/participants')]);
  return { ...team, participants: parts.data || [] };
}
function statusBadge(team) {
  if (team.team && team.team.submitted_at) return `<span class="badge ok">${I.lock}${esc(t('status.submitted'))}</span>`;
  if (team.locked) return `<span class="badge warn">${I.lock}${esc(t('status.closed'))}</span>`;
  return `<span class="badge neutral">${esc(t('status.draft'))}</span>`;
}

// ---------- Dashboard ----------
export async function dashboardView(ctx) {
  ctx.root.innerHTML = spinner();
  let data;
  try { data = await loadTeam(); } catch (err) {
    ctx.root.innerHTML = errorBox(t('dash.loadError'), err.message);
    ctx.root.querySelector('[data-action=retry]').addEventListener('click', () => dashboardView(ctx));
    return;
  }
  ctx.team = data;
  const locked = !!data.locked;
  const submitted = !!(data.team && data.team.submitted_at);
  const ps = data.participants;
  const leaders = ps.filter((p) => p.status !== 'student');
  const byGroup = Object.fromEntries(GROUP_ORDER.map((g) => [g, ps.filter((p) => p.status === 'student' && p.student_group === g)]));
  const q = quotaStatus(ps);
  const qs = (g) => {
    const x = q.groups[g]; const extra = x.all - x.inQuota;
    return `<span class="${x.inQuota > x.max ? 'over' : ''}">${GROUP_SYMBOL[g]} ${x.inQuota}/${x.max}${extra ? ` <span class="plus" title="${esc(t('quota.extra', { n: extra }))}">+${extra}</span>` : ''}</span>`;
  };
  const country = data.team ? data.team.country : '';

  const row = (p) => {
    const tags = [
      p.needs_visa_invitation ? `<span class="tag">${esc(t('badge.visa'))}</span>` : '',
      p.previous_prizewinner ? `<span class="tag">${esc(t('badge.prize'))}</span>` : '',
      visaIncomplete(p) ? `<span class="tag warn">${I.alert}${esc(t('badge.files'))}</span>` : '',
    ].join('');
    return `<li class="prow">
      <span class="avatar" aria-hidden="true">${esc(initials(p))}</span>
      <div class="prow-main">
        <a class="prow-name" href="/participants/${p.id}" data-link>${esc(personName(p))}</a>
        <span class="prow-meta">${esc(roleLabel(p))}${p.family_name_native ? ` · <span lang="">${esc([p.family_name_native, p.first_name_native].join(' '))}</span>` : ''}</span>
        ${tags ? `<span class="prow-tags">${tags}</span>` : ''}
      </div>
      <div class="prow-actions">
        <a class="btn btn-ghost btn-sm" href="/participants/${p.id}" data-link>${locked ? I.eye : I.edit}<span>${esc(t(locked ? 'p.view' : 'p.edit'))}</span></a>
        ${locked ? '' : `<button type="button" class="icon-btn" data-delete="${p.id}" aria-label="${esc(t('p.delete'))}: ${esc(personName(p))}" title="${esc(t('p.delete'))}">${I.trash}</button>`}
      </div>
    </li>`;
  };
  const block = (title, list) => (list.length ? `<section class="card plist"><h3 class="card-title">${esc(title)} <span class="opt">${list.length}</span></h3><ul>${list.map(row).join('')}</ul></section>` : '');

  ctx.root.innerHTML = `
    <div class="page-head row-between">
      <div>
        <div class="title-row"><h2 class="page-title">${esc(t('dash.title', { country }))}</h2>${statusBadge(data)}</div>
        <p class="page-lead">${esc(t('dash.lead'))}</p>
        <p class="meta-line">${closesOn() ? esc(t('dash.deadline', { date: closesOn() })) : ''}
          ${data.team && data.team.submitted_at ? esc(t('dash.submittedAt', { date: fmtDateTime(data.team.submitted_at) })) : ''}</p>
      </div>
      ${locked ? '' : `<div class="btn-row">
        <a class="btn btn-ghost" href="/review" data-link ${ps.length ? '' : 'aria-disabled="true" tabindex="-1"'}>${esc(t('dash.review'))}</a>
        <a class="btn btn-primary" href="/participants/new" data-link>${I.plus}${esc(t('dash.add'))}</a></div>`}
    </div>
    ${submitted ? `<div class="mb-24">${note(`<strong>${esc(t('dash.completedTitle'))}</strong><br>${esc(t('dash.lockedNote'))}`, 'ok')}</div>`
      : locked ? `<div class="mb-24">${note(`<strong>${esc(t('reg.closedTitle'))}</strong><br>${esc(t('dash.lockedNote'))}`, 'warn')}</div>` : ''}
    <dl class="kpis">
      <div class="kpi"><dt>${esc(t('count.leaders'))}</dt><dd>${leaders.filter((p) => p.status !== 'observer').length}</dd></div>
      <div class="kpi"><dt>${esc(t('count.observers'))}</dt><dd>${leaders.filter((p) => p.status === 'observer').length}</dd></div>
      <div class="kpi"><dt>${esc(t('count.students'))}</dt><dd>${ps.length - leaders.length}<small>${qs('alpha')} · ${qs('beta')} · ${qs('gamma')}</small></dd></div>
    </dl>
    ${q.issues.length ? `<div class="mb-24">${note(`<strong>${esc(t('quota.title'))}</strong><ul class="plain">${q.issues.map((m) => `<li>${esc(m)}</li>`).join('')}</ul><span class="small">${esc(t('quota.hint'))}</span>`, 'warn')}</div>` : ''}
    ${ps.length ? `<div class="stack-16">${block(t('group.leaders'), leaders)}${GROUP_ORDER.map((g) => block(t(`group.${g}`), byGroup[g])).join('')}
      ${locked ? '' : `<section class="card finish">
        <div><h3 class="card-title">${esc(t('dash.finishTitle'))}</h3><p class="card-sub" style="margin:0">${esc(t('dash.finishText'))}</p></div>
        <div class="btn-row"><a class="btn btn-ghost" href="/participants/new" data-link>${I.plus}${esc(t('dash.add'))}</a>
        <a class="btn btn-primary" href="/review" data-link>${I.lock}${esc(t('dash.finish'))}</a></div></section>`}</div>`
      : `<div class="empty">${I.astronaut}<h3>${esc(t('dash.emptyTitle'))}</h3><p>${esc(t('dash.emptyText'))}</p>
        ${locked ? '' : `<a class="btn btn-primary" href="/participants/new" data-link>${I.plus}${esc(t('dash.add'))}</a>`}</div>`}`;

  ctx.root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-delete]'); if (!b) return;
    const p = ps.find((x) => String(x.id) === b.dataset.delete);
    const ok = await confirmDialog({ title: t('p.deleteTitle'), text: t('p.deleteText', { name: personName(p) }), ok: t('p.delete'), danger: true });
    if (!ok) return;
    try { await api(`/participants/${p.id}`, { method: 'DELETE' }); toast(t('p.deleted'), 'ok'); dashboardView(ctx); }
    catch (err) { toast(err.message, 'error'); }
  }, { once: false, signal: ctx.signal });
}

// ---------- Participant form (shared with the admin read-only view) ----------
export function renderSections(d, opts = {}) {
  return SECTIONS.map((s) => `
    <section class="card form-sec" id="sec-${s.id}" data-sec="${s.id}" ${s.show && !s.show(d) ? 'hidden' : ''}>
      <h3 class="card-title">${esc(t(`sec.${s.id}`))}</h3>
      ${s.note ? `<p class="card-sub">${esc(t(s.note))}</p>` : ''}
      <div class="grid">${s.fields.map((f) => `<div class="cell ${f.full ? 'span-all' : ''}" data-cell="${f.k}" ${f.show && !f.show(d) ? 'hidden' : ''}>${renderField({ ...f, section: s }, d, opts)}</div>`).join('')}</div>
      ${s.id === 'role' ? `<div class="group-help" id="group-help">${groupHelp(d)}</div>` : ''}
    </section>`).join('');
}

// Which groups are open to a student, by year of birth (official IAO 2026 table).
export function groupHelp(d) {
  if (d.status !== 'student') return '';
  const y = birthYear(d);
  if (!y) return note(esc(t('grp.enterBirth')));
  if (!eligibleYear(y)) return note(esc(t('grp.notEligible', { year: y })), 'warn');
  const rows = ['info.rowNever', 'info.rowOnce', 'info.rowTwice'].map((label, k) => {
    const gs = cellGroups(groupCell(y, k)).map((g) => GROUP_SYMBOL[g]);
    return `<li>${esc(t('grp.line', { row: t(label), groups: gs.length ? gs.join(` ${t('grp.or')} `) : t('grp.none') }))}</li>`;
  }).join('');
  return note(`<strong>${esc(t('grp.title', { year: y }))}</strong><br><span class="small">${esc(t('info.colPrev'))}:</span><ul>${rows}</ul>`);
}

export async function participantView(ctx, { id }) {
  const isNew = id === 'new';
  const cacheKey = `p-${id}`;
  ctx.root.innerHTML = spinner();
  let d = ctx.cache[cacheKey];
  let locked = false;
  try {
    const team = ctx.team || await api('/team');
    locked = !!team.locked;
    if (!d) {
      d = isNew ? emptyDraft() : fromParticipant((await api(`/participants/${id}`)).data);
      d._dirty = false;
      ctx.cache[cacheKey] = d;
    }
  } catch (err) {
    ctx.root.innerHTML = errorBox(t('err.notFound'), err.message);
    ctx.root.querySelector('[data-action=retry]').addEventListener('click', () => participantView(ctx, { id }));
    return;
  }
  if (isNew && locked) { ctx.navigate('/', { replace: true }); return; }
  d._files = d._files || {};
  d._fileErrors = d._fileErrors || {};
  const touched = new Set(d._touched || []);
  d._touched = touched;
  const readonly = locked;

  const title = isNew ? t('form.newTitle') : locked ? t('form.viewTitle') : t('form.editTitle');
  const visibleSecs = () => SECTIONS.filter((s) => !s.show || s.show(d));
  ctx.root.innerHTML = `
    <a class="back-link" href="/" data-link>${I.back}${esc(t('form.back'))}</a>
    <div class="page-head"><h2 class="page-title">${esc(title)}</h2>
      ${isNew ? '' : `<p class="page-lead">${esc(personName(d))}</p>`}</div>
    <div class="form-layout">
      <nav class="sec-nav" aria-label="${esc(t('form.sections'))}"><ol id="sec-nav"></ol></nav>
      <form id="pform" novalidate>
        ${readonly ? note(esc(t('dash.lockedNote')), 'warn') : note(esc(t('form.latinNote')))}
        <div id="form-error"></div>
        ${renderSections(d, { readonly, fileLinks: !isNew })}
        ${readonly ? '' : `<div class="form-actions">
          <a class="btn btn-ghost" href="/" data-link>${esc(t('common.cancel'))}</a>
          <button class="btn btn-primary" type="submit">${I.check}${esc(t('form.save'))}</button></div>`}
      </form>
    </div>`;
  const form = $('#pform');

  function renderNav() {
    const errs = validateAll(d);
    $('#sec-nav').innerHTML = visibleSecs().map((s) => {
      const n = s.fields.filter((f) => errs[f.k] && (touched.has(f.k) || d._attempted)).length;
      return `<li><a href="#sec-${s.id}" data-sec-link="${s.id}">${esc(t(`sec.${s.id}`))}${n ? `<span class="nav-err" aria-label="${n}">${n}</span>` : ''}</a></li>`;
    }).join('');
  }
  function showError(k) {
    const box = form.querySelector(`[data-field="${k}"]`); if (!box) return;
    const f = fieldDef(k);
    const msg = (touched.has(k) || d._attempted) ? (d._serverErrors && d._serverErrors[k]) || validateField(f, d) : '';
    box.classList.toggle('invalid', !!msg);
    box.querySelector('.err').textContent = msg || '';
    box.querySelectorAll('input, select, textarea').forEach((c) => c.setAttribute('aria-invalid', msg ? 'true' : 'false'));
  }
  function applyVisibility() {
    SECTIONS.forEach((s) => {
      const sec = form.querySelector(`[data-sec="${s.id}"]`);
      if (sec) sec.hidden = !!(s.show && !s.show(d));
      s.fields.forEach((f) => {
        const cell = form.querySelector(`[data-cell="${f.k}"]`);
        if (cell) cell.hidden = !isVisible({ ...f, section: s }, d);
      });
    });
    // Required markers depend on other fields (e.g. visa) — refresh them
    ALL_FIELDS.forEach((f) => {
      const box = form.querySelector(`[data-field="${f.k}"]`);
      if (!box || f.type === 'check') return;
      const lab = box.querySelector(':scope > label, :scope > legend');
      const rq = f.reqMark || f.req;
      const req = typeof rq === 'function' ? rq(d) : !!rq;
      const mark = lab.querySelector('.req, .opt');
      if (mark) mark.outerHTML = req ? '<span class="req" aria-hidden="true">*</span>' : `<span class="opt">${esc(t('common.optional'))}</span>`;
    });
    renderNav();
  }
  const refreshAll = () => { ALL_FIELDS.forEach((f) => showError(f.k)); renderNav(); };

  applyVisibility();
  refreshAll();
  if (readonly) {
    form.addEventListener('click', (e) => openFile(e, `/participants/${id}/files/`));
    return;
  }

  // The "fix the red fields" banner shows the current number of invalid fields and disappears when none is left.
  function syncBanner() {
    const box = $('#form-error');
    if (!box || !box.dataset.fix) return;
    const n = form.querySelectorAll('.field.invalid').length;
    box.innerHTML = n
      ? note(esc(t('form.fixErrors', { n })) + (box.dataset.extra ? `<br>${esc(box.dataset.extra)}` : ''), 'error')
      : '';
    if (!n) { delete box.dataset.fix; delete box.dataset.extra; }
  }

  const onInput = (e) => {
    const el = e.target; const k = el.dataset.key; if (!k) return;
    const f = fieldDef(k);
    if (f.type === 'file') return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (f.rule) {
      const r = filterValue(f.rule, v);
      if (r.rejected) {
        const pos = Math.max(0, (el.selectionStart || 0) - (String(v).length - r.value.length));
        el.value = r.value; v = r.value;
        try { el.setSelectionRange(pos, pos); } catch (er) { /* number/email inputs */ }
        d._serverErrors = { ...(d._serverErrors || {}), [k]: rejectMessage(f.rule) };
        touched.add(k); showError(k); renderNav();
        d._serverErrors[k] = '';
        d[k] = v; d._dirty = true;
        syncBanner();
        return;
      }
    }
    d[k] = v; d._dirty = true;
    if (d._serverErrors) d._serverErrors[k] = '';
    if (['radio', 'checkbox', 'date'].includes(el.type) || el.tagName === 'SELECT') touched.add(k);
    if (k === 'status' || k === 'needs_visa_invitation') applyVisibility();
    if (['status', 'birth_date', 'student_group'].includes(k)) {
      const gh = $('#group-help'); if (gh) gh.innerHTML = groupHelp(d);
      ['birth_date', 'student_group'].forEach(showError);
    }
    showError(k); renderNav(); syncBanner();
  };
  form.addEventListener('input', onInput);
  form.addEventListener('change', async (e) => {
    const el = e.target; const k = el.dataset.key; if (!k) return;
    const f = fieldDef(k);
    if (f.type !== 'file') { onInput(e); return; }
    const file = el.files && el.files[0];
    touched.add(k);
    d._fileErrors[k] = '';
    delete d._files[k];
    if (file) {
      const err = await checkImage(file, f);
      if (err) d._fileErrors[k] = err; else d._files[k] = file;
      d._dirty = true;
    }
    const cell = form.querySelector(`[data-cell="${k}"]`);
    cell.innerHTML = renderField({ ...f }, d, { fileLinks: !isNew });
    showError(k); renderNav(); syncBanner();
  });
  form.addEventListener('focusout', (e) => { const k = e.target.dataset && e.target.dataset.key; if (k) { touched.add(k); showError(k); renderNav(); syncBanner(); } });
  form.addEventListener('click', (e) => openFile(e, `/participants/${id}/files/`));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    d._attempted = true;
    d._serverErrors = {};
    const errs = validateAll(d);
    refreshAll();
    const keys = Object.keys(errs);
    if (keys.length) {
      const box = $('#form-error');
      box.dataset.fix = '1'; delete box.dataset.extra;
      box.innerHTML = note(esc(t('form.fixErrors', { n: keys.length })), 'error');
      focusField(keys[0]);
      return;
    }
    $('#form-error').innerHTML = '';
    const btn = form.querySelector('button[type=submit]');
    busy(btn, true, t('form.saving'));
    try {
      if (isNew) await api('/participants', { method: 'POST', form: toFormData(d, false) });
      else await api(`/participants/${id}`, { method: 'POST', form: toFormData(d, true) });
      d._dirty = false;
      delete ctx.cache[cacheKey];
      toast(t('form.saved'), 'ok');
      ctx.navigate('/');
    } catch (err) {
      busy(btn, false);
      if (err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length) {
        d._serverErrors = err.fields;
        Object.keys(err.fields).forEach((k) => touched.add(k));
        refreshAll();
        const known = Object.keys(err.fields).filter((k) => fieldDef(k));
        const box = $('#form-error');
        box.dataset.fix = '1';
        box.dataset.extra = known.length < Object.keys(err.fields).length ? Object.values(err.fields).join(' ') : '';
        box.innerHTML = note(esc(t('form.fixErrors', { n: Object.keys(err.fields).length })) + (box.dataset.extra ? `<br>${esc(box.dataset.extra)}` : ''), 'error');
        if (known.length) focusField(known[0]);
      } else {
        $('#form-error').innerHTML = note(esc(err.message), 'error');
        $('#form-error').scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });

  function focusField(k) {
    const box = form.querySelector(`[data-field="${k}"]`); if (!box) return;
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (box.querySelector('input:not([type=file]):checked') || box.querySelector('input, select, textarea'))?.focus({ preventScroll: true });
  }
  ctx.guard = () => !!d._dirty;
}

async function openFile(e, base) {
  const b = e.target.closest('[data-open-file]'); if (!b) return;
  e.preventDefault();
  const w = window.open('', '_blank');
  try { const url = await fetchBlobUrl(base + b.dataset.openFile); if (w) w.location = url; else location.href = url; }
  catch (err) { if (w) w.close(); toast(err.message, 'error'); }
}
export { openFile };

// ---------- Review & submit ----------
export async function reviewView(ctx) {
  ctx.root.innerHTML = spinner();
  let data;
  try { data = await loadTeam(); } catch (err) {
    ctx.root.innerHTML = errorBox(t('dash.loadError'), err.message);
    ctx.root.querySelector('[data-action=retry]').addEventListener('click', () => reviewView(ctx));
    return;
  }
  ctx.team = data;
  if (data.locked) { ctx.navigate('/', { replace: true }); return; }
  const ps = data.participants;
  const hasLeader = ps.some((p) => p.status === 'team_leader' || p.status === 'team_leader_jury');
  const visaBad = ps.filter(visaIncomplete);
  const ready = hasLeader && !visaBad.length;
  const quota = quotaStatus(ps);
  const check = (ok, label, extra = '') => `<li class="check ${ok ? 'ok' : 'bad'}">${ok ? I.check : I.alert}<div><span>${esc(label)}</span>${extra}</div></li>`;
  const sorted = [...ps].sort((a, b) => (a.status === 'student') - (b.status === 'student') || String(a.student_group).localeCompare(String(b.student_group)));

  ctx.root.innerHTML = `
    <a class="back-link" href="/" data-link>${I.back}${esc(t('form.back'))}</a>
    <div class="page-head"><h2 class="page-title">${esc(t('review.title'))}</h2><p class="page-lead">${esc(t('review.lead'))}</p></div>
    <section class="card">
      <h3 class="card-title">${esc(t('review.checks'))}</h3>
      <ul class="checks">
        ${check(hasLeader, t('check.leader'))}
        ${quota.issues.length
          ? `<li class="check warn">${I.alert}<div><span>${esc(t('quota.title'))}</span><p class="check-extra">${quota.issues.map(esc).join('<br>')}<br>${esc(t('quota.hint'))}</p></div></li>`
          : check(true, t('quota.ok'), quota.extra ? `<p class="check-extra">${esc(t('quota.extra', { n: quota.extra }))}</p>` : '')}
        ${check(!visaBad.length, t('check.visa'), visaBad.length ? `<p class="check-extra">${esc(t('review.missingFor', { names: '' }))}${visaBad.map((p) => `<a href="/participants/${p.id}" data-link>${esc(personName(p))}</a>`).join(', ')}</p>` : '')}
      </ul>
    </section>
    <section class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>${esc(t('col.name'))}</th><th>${esc(t('col.role'))}</th><th>${esc(t('col.birth'))}</th><th>${esc(t('col.citizenship'))}</th><th>${esc(t('col.visa'))}</th></tr></thead>
        <tbody>${sorted.map((p, i) => `<tr><td class="muted">${i + 1}</td><td><a href="/participants/${p.id}" data-link>${esc(personName(p))}</a></td><td>${esc(roleLabel(p))}</td><td>${esc(p.birth_date || '')}</td><td>${esc(p.citizenship || '')}</td><td>${esc(t(p.needs_visa_invitation ? 'common.yes' : 'common.no'))}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="card">
      <div id="submit-msg">${ready ? '' : note(esc(t('review.notReady')), 'warn')}</div>
      <div class="btn-row" style="margin-top:${ready ? 0 : 16}px">
        <button type="button" class="btn btn-primary" id="btn-submit" ${ready ? '' : 'disabled'}>${I.lock}${esc(t('review.submit'))}</button>
      </div>
    </section>`;

  $('#btn-submit').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const ok = await confirmDialog({ title: t('review.confirmTitle'), text: t('review.confirmText'), ok: t('review.submit') });
    if (!ok) return;
    busy(btn, true, t('review.submitting'));
    try {
      await api('/team/submit', { method: 'POST' });
      ctx.team = null;
      toast(t('review.done'), 'ok');
      ctx.navigate('/', { replace: true });
    } catch (err) {
      busy(btn, false);
      const list = err.list && err.list.length ? `<ul class="plain">${err.list.map((m) => `<li>${esc(/rahbar/i.test(m) ? t('check.leader') : m)}</li>`).join('')}</ul>` : '';
      $('#submit-msg').innerHTML = note(esc(err.status === 422 ? t('review.notReady') : err.message) + list, 'error');
    }
  });
}
