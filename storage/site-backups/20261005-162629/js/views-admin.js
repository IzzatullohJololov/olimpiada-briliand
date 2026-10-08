// Admin panel: teams list, team detail, participant detail, CSV and IAO-template .xls export.
import { t } from './i18n.js';
import { api, fetchBlobUrl } from './api.js';
import { esc, $, I, spinner, errorBox, toast, confirmDialog, busy, fmtDateTime, download } from './ui.js';
import { fromParticipant, personName, roleLabel, visaIncomplete } from './fields.js';
import { renderSections, openFile } from './views-team.js';

const GROUPS = { alpha: { sym: 'α', name: 'Alpha', letter: 'a' }, beta: { sym: 'β', name: 'Beta', letter: 'b' }, gamma: { sym: 'γ', name: 'Gamma', letter: 'g' } };
let query = '';

function failed(ctx, err, retry) {
  ctx.root.innerHTML = errorBox(t('dash.loadError'), err.message);
  ctx.root.querySelector('[data-action=retry]').addEventListener('click', retry);
}
const statusTag = (team) => (team.submitted_at
  ? `<span class="badge ok">${I.lock}${esc(t('status.submitted'))}</span>`
  : `<span class="badge neutral">${esc(t('status.draft'))}</span>`);

// ---------- Teams list ----------
export async function adminTeamsView(ctx) {
  ctx.root.innerHTML = spinner();
  let teams;
  try { teams = await api('/admin/teams'); } catch (err) { failed(ctx, err, () => adminTeamsView(ctx)); return; }
  if (!Array.isArray(teams)) teams = teams.data || [];
  ctx.adminTeams = teams;
  const sum = (k) => teams.reduce((n, x) => n + (x[k] || 0), 0);

  const render = () => {
    const q = query.trim().toLowerCase();
    const shown = teams.filter((x) => !q || [x.country, x.user && x.user.email, x.user && x.user.name].some((v) => String(v || '').toLowerCase().includes(q)));
    $('#teams').innerHTML = !teams.length ? `<div class="empty">${I.astronaut}<h3>${esc(t('admin.empty'))}</h3></div>`
      : !shown.length ? `<div class="empty"><h3>${esc(t('admin.nothingFound', { q: query }))}</h3></div>`
      : `<div class="table-wrap card-table"><table>
          <thead><tr><th>${esc(t('admin.colCountry'))}</th><th>${esc(t('admin.colContact'))}</th><th class="num">${esc(t('count.leaders'))}</th><th class="num">${esc(t('count.observers'))}</th><th class="num">${esc(t('count.students'))}</th><th>${esc(t('admin.colStatus'))}</th><th></th></tr></thead>
          <tbody>${shown.map((x) => `<tr>
            <td><a class="strong" href="${ctx.adminBase}/teams/${x.id}" data-link>${esc(x.country)}</a></td>
            <td>${esc(x.user ? x.user.name : '')}<br><span class="muted small">${esc(x.user ? x.user.email : '')}</span></td>
            <td class="num">${x.leaders_count ?? 0}</td><td class="num">${x.observers_count ?? 0}</td><td class="num">${x.students_count ?? 0}</td>
            <td>${statusTag(x)}${x.submitted_at ? `<br><span class="muted small">${esc(fmtDateTime(x.submitted_at))}</span>` : ''}</td>
            <td><div class="row-actions">
              <a class="btn btn-ghost btn-sm" href="${ctx.adminBase}/teams/${x.id}" data-link>${esc(t('admin.open'))}</a>
              <button type="button" class="btn btn-ghost btn-sm" data-xls="${x.id}">${I.download}.xls</button>
            </div></td></tr>`).join('')}</tbody></table></div>`;
  };

  ctx.root.innerHTML = `
    <div class="page-head row-between">
      <div><h2 class="page-title">${esc(t('admin.title'))}</h2><p class="page-lead">${esc(t('admin.lead'))}</p></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="btn-csv">${I.download}${esc(t('admin.csv'))}</button>
        <button type="button" class="btn btn-primary" id="btn-xls-all" ${teams.length ? '' : 'disabled'}>${I.download}${esc(t('admin.xlsAll'))}</button>
      </div>
    </div>
    <dl class="kpis kpis-4">
      <div class="kpi"><dt>${esc(t('admin.kpiTeams'))}</dt><dd>${teams.length}</dd></div>
      <div class="kpi"><dt>${esc(t('admin.kpiSubmitted'))}</dt><dd>${teams.filter((x) => x.submitted_at).length}</dd></div>
      <div class="kpi"><dt>${esc(t('admin.kpiParticipants'))}</dt><dd>${sum('participants_count')}</dd></div>
      <div class="kpi"><dt>${esc(t('admin.kpiStudents'))}</dt><dd>${sum('students_count')}</dd></div>
    </dl>
    <label class="search">${I.search}<span class="sr-only">${esc(t('admin.search'))}</span>
      <input class="input" id="search" type="search" placeholder="${esc(t('admin.search'))}" value="${esc(query)}"></label>
    <div id="teams"></div>`;
  render();
  $('#search').addEventListener('input', (e) => { query = e.target.value; render(); });
  $('#btn-csv').addEventListener('click', async (e) => {
    const btn = e.currentTarget; busy(btn, true, t('admin.preparing'));
    try { download(await fetchBlobUrl('/admin/export/participants.csv'), `iao2026_participants_${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (err) { toast(err.message, 'error'); } finally { busy(btn, false); }
  });
  $('#btn-xls-all').addEventListener('click', async (e) => {
    const btn = e.currentTarget; busy(btn, true, t('admin.preparing'));
    try {
      const details = [];
      for (const x of [...teams].sort((a, b) => a.country.localeCompare(b.country))) details.push(await api(`/admin/teams/${x.id}`));
      await exportXls(details, `ia26appl_ALL_${new Date().toISOString().slice(0, 10)}.xls`);
    } catch (err) { toast(err.message, 'error'); } finally { busy(btn, false); }
  });
  ctx.root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-xls]'); if (!b) return;
    busy(b, true, '');
    try { const det = await api(`/admin/teams/${b.dataset.xls}`); await exportXls([det], `ia26appl_${fileSafe(det.team.country)}.xls`); }
    catch (err) { toast(err.message, 'error'); } finally { busy(b, false); }
  }, { signal: ctx.signal });
}

// ---------- One team ----------
export async function adminTeamView(ctx, { id }) {
  ctx.root.innerHTML = spinner();
  let det;
  try { det = await api(`/admin/teams/${id}`); } catch (err) { failed(ctx, err, () => adminTeamView(ctx, { id })); return; }
  ctx.adminTeam = det;
  const team = det.team; const ps = det.participants || [];
  const sorted = [...ps].sort((a, b) => (a.status === 'student') - (b.status === 'student') || String(a.student_group).localeCompare(String(b.student_group)));
  ctx.root.innerHTML = `
    <a class="back-link" href="${ctx.adminBase}" data-link>${I.back}${esc(t('admin.back'))}</a>
    <div class="page-head row-between">
      <div><div class="title-row"><h2 class="page-title">${esc(team.country)}</h2>${statusTag(team)}</div>
        <p class="meta-line">${team.user ? `${esc(team.user.name)} · <a href="mailto:${esc(team.user.email)}">${esc(team.user.email)}</a>` : ''}
        ${team.submitted_at ? ` · ${esc(t('dash.submittedAt', { date: fmtDateTime(team.submitted_at) }))}` : ''}</p></div>
      <div class="btn-row">
        ${team.submitted_at ? `<button type="button" class="btn btn-ghost" id="btn-reopen">${esc(t('admin.reopen'))}</button>` : ''}
        <button type="button" class="btn btn-primary" id="btn-xls" ${ps.length ? '' : 'disabled'}>${I.download}${esc(t('admin.xlsTeam'))}</button>
      </div>
    </div>
    ${ps.length ? `<div class="table-wrap card-table"><table>
      <thead><tr><th>#</th><th>${esc(t('col.name'))}</th><th>${esc(t('col.role'))}</th><th>${esc(t('col.birth'))}</th><th>${esc(t('col.citizenship'))}</th><th>${esc(t('col.visa'))}</th><th>${esc(t('admin.files'))}</th></tr></thead>
      <tbody>${sorted.map((p, i) => `<tr>
        <td class="muted">${i + 1}</td>
        <td><a class="strong" href="${ctx.adminBase}/teams/${id}/participants/${p.id}" data-link>${esc(personName(p))}</a><br><span class="muted small">${esc([p.family_name_native, p.first_name_native].filter(Boolean).join(' '))}</span></td>
        <td>${esc(roleLabel(p))}</td><td>${esc(p.birth_date || '')}</td><td>${esc(p.citizenship || '')}</td>
        <td>${esc(t(p.needs_visa_invitation ? 'common.yes' : 'common.no'))}${visaIncomplete(p) ? ` <span class="tag warn">${esc(t('badge.files'))}</span>` : ''}</td>
        <td><div class="row-actions left">
          ${p.has_passport_scan ? `<button type="button" class="btn btn-ghost btn-sm" data-file="${p.id}/files/passport">${esc(t('admin.passport'))}</button>` : ''}
          ${p.has_face_photo ? `<button type="button" class="btn btn-ghost btn-sm" data-file="${p.id}/files/face">${esc(t('admin.photo'))}</button>` : ''}
        </div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><h3>${esc(t('admin.noParticipants'))}</h3></div>`}`;

  $('#btn-xls')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; busy(btn, true, t('admin.preparing'));
    try { await exportXls([det], `ia26appl_${fileSafe(team.country)}.xls`); } catch (err) { toast(err.message, 'error'); } finally { busy(btn, false); }
  });
  $('#btn-reopen')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const ok = await confirmDialog({ title: t('admin.reopenTitle'), text: t('admin.reopenText', { country: team.country }), ok: t('admin.reopen') });
    if (!ok) return;
    busy(btn, true, t('form.saving'));
    try { await api(`/admin/teams/${id}/reopen`, { method: 'POST' }); toast(t('admin.reopened'), 'ok'); adminTeamView(ctx, { id }); }
    catch (err) { busy(btn, false); toast(err.message, 'error'); }
  });
  ctx.root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-file]'); if (!b) return;
    const w = window.open('', '_blank');
    try { const url = await fetchBlobUrl(`/admin/participants/${b.dataset.file}`); if (w) w.location = url; }
    catch (err) { if (w) w.close(); toast(err.message, 'error'); }
  }, { signal: ctx.signal });
}

// ---------- One participant (read-only) ----------
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

// ---------- Excel export in the official IAO application layout (columns A..AG) ----------
const fileSafe = (s) => String(s || 'Team').replace(/[^A-Za-z0-9]+/g, '_');
let xlsxPromise = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve();
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = () => { xlsxPromise = null; reject(new Error(t('err.network'))); };
      document.head.appendChild(s);
    });
  }
  return xlsxPromise;
}
const row = (cells) => Array.from({ length: 33 }, (_, i) => cells[i] ?? '');
const CYR = /[Ѐ-ӿ]/;
function headerRows(isLeader) {
  const who = isLeader ? 'team leader' : 'participant';
  const r1 = { 0: '№', 1: 'Код', 2: isLeader ? 'Ф. И. О. руководителя' : 'Ф. И. О. участника', 4: `Names of ${who} for minutes and diploma`, 5: `Names of ${who} for badge`, 8: 'Страна', 12: isLeader ? 'Перевод для туров' : 'Языки на турах', 14: 'Мед &', 15: '.', 17: isLeader ? 'Руководитель или наблюдатель на:' : 'Участие и полученные дипломы на:', 28: isLeader ? 'Ф. И. О. руководителя' : 'Ф. И. О. Участника', 31: isLeader ? 'Ф. И. О. руководителя на своём языке' : 'Ф. И. О. участника на своём языке' };
  const r2 = { 1: 'страны', 2: `Name of ${who} (official)`, 4: '26 standard Latin symbols only', 5: '26 standard Latin symbols only', 6: 'Пол', 7: 'Дата рождения', 8: '(Команда)', 10: 'Статус', 12: isLeader ? 'Перевод с' : 'Печатный', 13: 'Перевод на', 14: 'Пища', 17: isLeader ? 'Team Leader or observer at:' : 'Participation or degree of Diploma at:', 28: 'на кириллице (только 33 русские буквы)', 31: `Native name of ${who}` };
  const r3 = { 1: 'Country', 2: 'Latin name (26 standard Latin symbols only)', 5: 'It should be not more than 18 symbols including spacers, family name is obligatory', 8: 'Country', 12: isLeader ? 'Translation for the Rounds' : 'Laguages at the Rounds', 14: 'Med &', 15: 'T-', 17: 'Previous IAO / APAO', 28: `Name of ${who} if any official`, 31: 'Native language (with additional symbols)' };
  const r4 = { 1: 'Code', 6: 'Sex', 7: 'Date of birth', 8: '(Team)', 10: 'Status', 12: 'Printed form', 13: 'Translation to', 14: 'Food', 15: '-shirt', 28: 'in Cyrillic (33 standard Russian symbols only)', 31: 'if the National script is alphabetical' };
  if (!isLeader) { r2[25] = 'Graduating'; r3[25] = 'from school'; r4[25] = 'Month'; r4[26] = 'Year'; }
  const r5 = { 2: 'Family name(s)', 3: 'Given name(s)', 12: '( Eng  or  Rus )', 13: '( any )', 28: 'Фамилия', 29: 'Имя, Отчество', 31: 'Family name(s)', 32: 'Given name(s)' };
  return [r1, r2, r3, r4, r5].map(row);
}
const LEADER_STATUS = { team_leader: 'Team leader only', team_leader_jury: 'Team leader, Jury member', observer: 'Observer' };
const OFFICIAL = { english: 'English', russian: 'Russian', both: 'English, Russian' };
const DIET = { standard: '', vegetarian: 'Ve', avoid_pork: 'AP' };
function badgeName(p) {
  const fam = (p.family_name_en || '').trim(); const g = (p.first_name_en || '').trim().split(/\s+/)[0] || '';
  let b = [fam, g].filter(Boolean).join(' ');
  if (b.length > 18 && g) b = `${fam} ${g[0]}.`;
  return b.slice(0, 18);
}
function personRow(p, i, country) {
  const isLeader = p.status !== 'student';
  const g = GROUPS[p.student_group];
  const grad = String(p.graduation_date || '').trim().split(/\s+/);
  const nativeFam = p.family_name_native || ''; const nativeGiven = p.first_name_native || '';
  const c = {
    0: i + 1, 1: isLeader ? '' : `-${g ? g.sym : ''}-`, 2: p.family_name_en, 3: p.first_name_en,
    4: [p.first_name_en, p.family_name_en].filter(Boolean).join(' '), 5: badgeName(p),
    6: p.sex === 'male' ? 'M' : p.sex === 'female' ? 'F' : '', 7: p.birth_date || '', 8: country,
    10: isLeader ? LEADER_STATUS[p.status] || p.status : p.previous_prizewinner ? 'Out of quota - Diploma I/II at a previous IAO' : `Regular group ${g ? g.name : ''} participant`,
    12: OFFICIAL[p.official_language] || '', 13: p.native_languages || '', 14: DIET[p.diet] ?? '', 15: p.tshirt_size || '',
    17: p.previous_olympiads || '',
    28: CYR.test(nativeFam) ? nativeFam : '', 29: CYR.test(nativeGiven) ? nativeGiven : '', 31: nativeFam, 32: nativeGiven,
  };
  if (!isLeader && grad.length >= 2) { c[25] = grad.slice(0, -1).join(' '); c[26] = /^\d{4}$/.test(grad[grad.length - 1]) ? +grad[grad.length - 1] : grad[grad.length - 1]; }
  return row(c);
}
function sheetFor(det) {
  const team = det.team; const ps = det.participants || [];
  const aoa = [
    row({ 0: 'Euro-Asian Astronomical Society' }),
    row({ 0: 'Andizhan, Uzbekistan                                         XXX  International Astronomy Olympiad                                         6–14. XII. 2026.' }),
    row({}), row({ 0: 'Application form          Team Leaders' }), row({}),
    ...headerRows(true),
    ...ps.filter((p) => p.status !== 'student').map((p, i) => personRow(p, i, team.country)),
  ];
  ['alpha', 'beta', 'gamma'].forEach((k) => {
    const list = ps.filter((p) => p.status === 'student' && p.student_group === k);
    if (!list.length) return;
    aoa.push(row({}), row({ 0: `Application form          Contestants, Group ${GROUPS[k].letter}` }), row({}), ...headerRows(false), ...list.map((p, i) => personRow(p, i, team.country)));
  });
  aoa.push(row({}), row({ 0: 'Submitted:', 2: team.submitted_at ? fmtDateTime(team.submitted_at) : 'not submitted (draft)' }));
  const ws = window.XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [4, 7, 16, 20, 26, 20, 5, 12, 12, 2, 30, 2, 14, 14, 6, 6, 2, 30, 9, 9, 9, 9, 9, 9, 9, 12, 8, 2, 16, 22, 2, 16, 22].map((w) => ({ wch: w }));
  return ws;
}
async function exportXls(details, filename) {
  await loadXlsx();
  const wb = window.XLSX.utils.book_new();
  const used = new Set();
  details.forEach((det) => {
    let name = (det.team.country || 'Team').replace(/[\\/?*[\]:]/g, '').slice(0, 28);
    let n = 2; const base = name;
    while (used.has(name)) name = `${base}-${n++}`;
    used.add(name);
    window.XLSX.utils.book_append_sheet(wb, sheetFor(det), name);
  });
  window.XLSX.writeFile(wb, filename, { bookType: 'biff8' });
}
