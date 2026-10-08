// Participant form definition — mirrors ParticipantInput in iao-openapi.yaml.
import { t } from './i18n.js';
import { esc, I, toApiDate, toIsoDate, todayIso } from './ui.js';

export const STATUSES = ['team_leader', 'team_leader_jury', 'observer', 'student'];
export const GROUPS = ['alpha', 'beta', 'gamma'];
const SEXES = ['male', 'female'];
const OFFICIAL = ['english', 'russian', 'both'];
const DIETS = ['standard', 'vegetarian', 'avoid_pork'];
const TSHIRTS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const enumOpts = (name, list) => list.map((v) => [v, t(`enum.${name}.${v}`)]);

const isStudent = (d) => d.status === 'student';
const needsVisa = (d) => !!d.needs_visa_invitation;

// rule: name = Latin A–Z only (as in passport), latin = any ASCII text (no Cyrillic etc.), native = any script
export const SECTIONS = [
  { id: 'role', fields: [
    { k: 'status', type: 'select', req: true, opts: () => enumOpts('status', STATUSES) },
    { k: 'student_group', type: 'seg', req: true, show: isStudent, opts: () => enumOpts('student_group', GROUPS) },
    { k: 'previous_prizewinner', type: 'check', show: isStudent, full: true, hint: true },
    { k: 'needs_visa_invitation', type: 'check', hint: true, full: true },
  ] },
  { id: 'name', note: 'sec.nameNote', fields: [
    { k: 'family_name_en', type: 'text', rule: 'name', req: true, max: 100, ac: 'family-name' },
    { k: 'first_name_en', type: 'text', rule: 'name', req: true, max: 100, ac: 'given-name' },
    { k: 'family_name_native', type: 'text', rule: 'native', req: true, max: 100, hint: 'h.native' },
    { k: 'first_name_native', type: 'text', rule: 'native', req: true, max: 100, hint: 'h.native' },
  ] },
  { id: 'personal', fields: [
    { k: 'birth_date', type: 'date', req: true, date: 'past' },
    { k: 'birth_place', type: 'text', rule: 'latin', req: true, max: 255, hint: true },
    { k: 'sex', type: 'seg', req: true, opts: () => enumOpts('sex', SEXES) },
    { k: 'citizenship', type: 'text', rule: 'latin', req: true, max: 255, hint: true },
    { k: 'other_citizenships', type: 'text', rule: 'latin', max: 255 },
    { k: 'ethnicity', type: 'text', rule: 'latin', max: 255 },
    { k: 'previous_visits_uz', type: 'textarea', rule: 'latin', max: 1000, hint: true, full: true },
  ] },
  { id: 'passport', show: needsVisa, fields: [
    { k: 'passport_number', type: 'text', rule: 'latin', req: needsVisa, max: 50 },
    { k: 'passport_issued_by', type: 'text', rule: 'latin', req: needsVisa, max: 255 },
    { k: 'passport_issue_date', type: 'date', req: needsVisa, date: 'notFuture' },
    { k: 'passport_expiry_date', type: 'date', req: needsVisa, date: 'future' },
    { k: 'passport_scan', type: 'file', req: (d) => needsVisa(d) && !d.has_passport_scan, reqMark: needsVisa, hint: true, fileType: 'passport' },
    { k: 'face_photo', type: 'file', req: (d) => needsVisa(d) && !d.has_face_photo, reqMark: needsVisa, hint: true, fileType: 'face', minW: 900, minH: 1200 },
  ] },
  { id: 'org', fields: [
    { k: 'position', type: 'text', rule: 'latin', req: true, max: 255, hint: true },
    { k: 'org_name', type: 'text', rule: 'latin', req: true, max: 255 },
    { k: 'org_location', type: 'text', rule: 'latin', req: true, max: 255 },
    { k: 'graduation_date', type: 'text', rule: 'latin', max: 50, hint: true, show: isStudent },
    { k: 'org_address', type: 'textarea', rule: 'latin', req: needsVisa, max: 500, full: true },
    { k: 'org_contacts', type: 'textarea', rule: 'latin', req: needsVisa, max: 500, full: true },
    { k: 'previous_olympiads', type: 'textarea', rule: 'latin', max: 1000, hint: true, full: true },
  ] },
  { id: 'contacts', fields: [
    { k: 'home_location', type: 'text', rule: 'latin', req: true, max: 255 },
    { k: 'email', type: 'email', rule: 'email', req: true, max: 255, ac: 'email' },
    { k: 'mobile_phone', type: 'tel', rule: 'phone', req: true, max: 100, hintKey: 'h.phone', ac: 'tel' },
    { k: 'home_phone', type: 'tel', rule: 'phone', max: 100, hintKey: 'h.phone' },
    { k: 'home_address', type: 'textarea', rule: 'latin', req: true, max: 500, full: true },
  ] },
  { id: 'lang', fields: [
    { k: 'official_language', type: 'seg', req: true, opts: () => enumOpts('official_language', OFFICIAL), hint: true },
    { k: 'native_languages', type: 'text', rule: 'latin', req: true, max: 255, hint: true },
  ] },
  { id: 'food', fields: [
    { k: 'diet', type: 'seg', req: true, opts: () => enumOpts('diet', DIETS), hint: true, full: true },
    { k: 'tshirt_size', type: 'select', opts: () => [['', t('enum.tshirt.none')], ...TSHIRTS.map((s) => [s, s])] },
    { k: 'food_notes', type: 'textarea', rule: 'latin', max: 1000, full: true },
    { k: 'medical_notes', type: 'textarea', rule: 'latin', max: 1000, hint: true, full: true },
  ] },
  { id: 'emergency', note: 'sec.emergencyNote', fields: [
    { k: 'emergency_family_name', type: 'text', rule: 'name', req: true, max: 100 },
    { k: 'emergency_first_name', type: 'text', rule: 'name', req: true, max: 100 },
    { k: 'emergency_relation', type: 'text', rule: 'latin', req: true, max: 100, hint: true },
    { k: 'emergency_age', type: 'number', rule: 'age' },
    { k: 'emergency_phones', type: 'tel', rule: 'phones', req: true, max: 255, hintKey: 'h.phone' },
    { k: 'emergency_email', type: 'email', rule: 'email', max: 255 },
    { k: 'emergency_languages', type: 'text', rule: 'latin', max: 255 },
    { k: 'emergency_telegram', type: 'text', rule: 'latin', max: 100, hintKey: 'h.telegram' },
  ] },
];
export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields.map((f) => ({ ...f, section: s })));
export const fieldDef = (k) => ALL_FIELDS.find((f) => f.k === k);

const call = (v, d) => (typeof v === 'function' ? v(d) : !!v);
export const isVisible = (f, d) => (!f.section.show || f.section.show(d)) && (!f.show || f.show(d));
export const isRequired = (f, d) => isVisible(f, d) && call(f.req, d);

// ---------- Character filters (applied while typing) ----------
const BAD = {
  name: /[^A-Za-z '-]/g,
  latin: /[^\x20-\x7E\r\n]/g,
  email: /[^\x21-\x7E]/g,
  phone: /[^0-9+()\s-]/g,
  phones: /[^0-9+()\s,;-]/g,
};
export function filterValue(rule, v) {
  const re = BAD[rule];
  if (!re || typeof v !== 'string') return { value: v, rejected: false };
  const clean = v.replace(re, '');
  return { value: clean, rejected: clean !== v };
}
export const rejectMessage = (rule) => (rule === 'name' ? t('err.latinName') : t('err.latinText'));

// ---------- Validation ----------
const NAME_RE = /^[A-Za-z]+(?:[ '-]+[A-Za-z]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+\d[\d\s()-]{5,}$/;
const PHONES_RE = /^[+\d][\d\s()+,;-]{5,}$/;
export const allCaps = (s) => { const l = s.replace(/[^A-Za-z]/g, ''); return l.length >= 2 && l === l.toUpperCase(); };

// ---------- Groups of contestants (www.issp.ac.ru/iao/2026/ia26ag_e.html) ----------
// Cell for a birth year and the number of previous IAO/IRAO participations (0, 1, 2+):
// 'ab' = α or β, 'b' = β only, 'g' = γ only, 'no' = not permitted, 'x' = impossible situation.
const GROUP_TABLE = {
  2007: ['g', 'g', 'g'],
  2008: ['b', 'g', 'g'],
  2009: ['b', 'b', 'g'],
  2010: ['b', 'b', 'b'],
  2011: ['ab', 'b', 'x'],
  2012: ['ab', 'x', 'x'],
};
export const GROUP_YEARS = [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013];
export function groupCell(year, k) {
  if (year <= 2006) return 'no';
  if (year >= 2013) return k === 0 ? 'no' : 'x';
  return GROUP_TABLE[year][k];
}
const CELL_GROUPS = { ab: ['alpha', 'beta'], b: ['beta'], g: ['gamma'], no: [], x: [] };
export const cellGroups = (cell) => CELL_GROUPS[cell];
export const GROUP_SYMBOL = { alpha: 'α', beta: 'β', gamma: 'γ' };
export const birthYear = (d) => (d.birth_date ? Number(String(d.birth_date).slice(0, 4)) : null);
export const eligibleYear = (y) => y > 2006 && y < 2013;
export function allowedGroups(year) {
  const set = new Set();
  [0, 1, 2].forEach((k) => cellGroups(groupCell(year, k)).forEach((g) => set.add(g)));
  return ['alpha', 'beta', 'gamma'].filter((g) => set.has(g));
}
function groupError(f, d) {
  if (d.status !== 'student') return '';
  const y = birthYear(d);
  if (!y) return '';
  if (f.k === 'birth_date' && !eligibleYear(y)) return t('grp.notEligible', { year: y });
  if (f.k === 'student_group' && d.student_group && eligibleYear(y)) {
    const allowed = allowedGroups(y);
    if (!allowed.includes(d.student_group)) {
      return t('grp.wrong', { g: GROUP_SYMBOL[d.student_group], year: y, allowed: allowed.map((g) => GROUP_SYMBOL[g]).join(` ${t('grp.or')} `) });
    }
  }
  return '';
}

// Quota for IAO/IRAO 2024–2026: up to 6 students (α ≤ 4, β ≤ 3, γ ≤ 2);
// I–II Diploma winners of the last IAO/IRAO do not count.
export const QUOTA = { total: 6, alpha: 4, beta: 3, gamma: 2 };
export function quotaStatus(participants) {
  const students = participants.filter((p) => p.status === 'student');
  const inQuota = students.filter((p) => !p.previous_prizewinner);
  const by = (list, g) => list.filter((p) => p.student_group === g).length;
  const res = { total: inQuota.length, extra: students.length - inQuota.length, groups: {}, issues: [] };
  ['alpha', 'beta', 'gamma'].forEach((g) => {
    res.groups[g] = { all: by(students, g), inQuota: by(inQuota, g), max: QUOTA[g] };
    if (res.groups[g].inQuota > QUOTA[g]) res.issues.push(t('quota.group', { g: GROUP_SYMBOL[g], n: res.groups[g].inQuota, max: QUOTA[g] }));
  });
  if (inQuota.length > QUOTA.total) res.issues.push(t('quota.total', { n: inQuota.length }));
  return res;
}

export function validateField(f, d) {
  const v = d[f.k];
  if (!isVisible(f, d)) return '';
  if (f.type === 'check') return '';
  if (f.type === 'file') {
    if (d._fileErrors && d._fileErrors[f.k]) return d._fileErrors[f.k];
    return isRequired(f, d) && !(d._files && d._files[f.k]) ? t('err.required') : '';
  }
  const s = typeof v === 'string' ? v.trim() : v;
  if (s === '' || s === null || s === undefined) return isRequired(f, d) ? t('err.required') : '';
  if (f.max && String(s).length > f.max) return t('err.tooLong', { n: f.max });
  switch (f.rule) {
    case 'name':
      if (!NAME_RE.test(s)) return t('err.latinName');
      if (allCaps(s)) return t('err.caps');
      break;
    case 'latin': if (/[^\x20-\x7E\r\n]/.test(s)) return t('err.latinText'); break;
    case 'email': if (!EMAIL_RE.test(s)) return t('err.email'); break;
    case 'phone': if (!PHONE_RE.test(s)) return t('err.phone'); break;
    case 'phones': if (!PHONES_RE.test(s)) return t('err.phone'); break;
    case 'age': { const n = Number(s); if (!Number.isInteger(n) || n < 1 || n > 120) return t('err.age'); break; }
    default: break;
  }
  const ge = groupError(f, d);
  if (ge) return ge;
  if (f.date) {
    const today = todayIso();
    if (f.date === 'past' && !(s < today)) return t('err.datePast');
    if (f.date === 'notFuture' && s > today) return t('err.dateNotFuture');
    if (f.date === 'future' && !(s > today)) return t('err.dateFuture');
  }
  return '';
}
export function validateAll(d) {
  const errs = {};
  for (const f of ALL_FIELDS) { const e = validateField(f, d); if (e) errs[f.k] = e; }
  return errs;
}

// ---------- Rendering ----------
function labelFor(f) { return t(`f.${f.k}`); }
function hintFor(f) {
  if (f.hintKey) return t(f.hintKey);
  if (f.hint === true) return t(`h.${f.k}`);
  if (typeof f.hint === 'string') return t(f.hint);
  return '';
}
export function renderField(f, d, { readonly = false, fileLinks = null } = {}) {
  const id = `f-${f.k}`;
  const v = d[f.k] ?? '';
  const hint = hintFor(f);
  const req = call(f.req, d) || f.req === true;
  const markReq = f.reqMark ? call(f.reqMark, d) : req;   // a stored file satisfies the rule but the field stays mandatory
  const mark = f.type === 'check' ? '' : markReq ? '<span class="req" aria-hidden="true">*</span>' : `<span class="opt">${esc(t('common.optional'))}</span>`;
  const dis = readonly ? 'disabled' : '';
  const describedBy = `${hint ? `${id}-hint ` : ''}${id}-err`;
  const hintHtml = hint ? `<p class="hint" id="${id}-hint">${esc(hint)}</p>` : '';
  const common = `id="${id}" data-key="${f.k}" aria-describedby="${describedBy}" ${req ? 'aria-required="true"' : ''} ${dis}`;
  let control = '';
  let group = false;

  switch (f.type) {
    case 'select':
      control = `<select class="select" ${common}>${f.k === 'status' ? `<option value="">${esc(t('select.choose'))}</option>` : ''}${f.opts().map(([o, l]) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      break;
    case 'seg':
      group = true;
      control = `<div class="seg" role="radiogroup" aria-describedby="${describedBy}">${f.opts().map(([o, l]) => `<label class="seg-opt"><input type="radio" name="${id}" value="${esc(o)}" data-key="${f.k}" ${String(o) === String(v) ? 'checked' : ''} ${dis}><span>${esc(l)}</span></label>`).join('')}</div>`;
      break;
    case 'check':
      return `<div class="field ${f.full ? 'span-all' : ''}" data-field="${f.k}">
        <label class="checkbox"><input type="checkbox" ${common} ${v ? 'checked' : ''}><span>${esc(labelFor(f))}${hint ? `<small id="${id}-hint">${esc(hint)}</small>` : ''}</span></label>
        <p class="err" id="${id}-err"></p></div>`;
    case 'textarea':
      control = `<textarea class="input textarea" rows="3" ${common} ${f.max ? `maxlength="${f.max}"` : ''} spellcheck="false">${esc(v)}</textarea>`;
      break;
    case 'file': {
      const has = d[f.fileType === 'passport' ? 'has_passport_scan' : 'has_face_photo'];
      const picked = d._files && d._files[f.k];
      const status = picked ? `<span class="file-status ok">${I.check}${esc(t('file.selected', { name: picked.name }))}</span>`
        : has ? `<span class="file-status ok">${I.check}${esc(t('file.uploaded'))}</span>`
        : `<span class="file-status">${esc(t('file.notUploaded'))}</span>`;
      const open = has && fileLinks ? `<button type="button" class="btn btn-ghost btn-sm" data-open-file="${f.fileType}">${I.eye}${esc(t('file.open'))}</button>` : '';
      control = `<div class="file-box">
        ${readonly ? '' : `<input type="file" accept=".jpg,.jpeg,image/jpeg" class="file-input" ${common}>
        <label for="${id}" class="btn btn-ghost btn-sm">${I.upload}${esc(t(has || picked ? 'file.replace' : 'file.choose'))}</label>`}
        ${status}${open}</div>`;
      break;
    }
    default: {
      const type = f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'number' ? 'number' : 'text';
      let extra = '';
      if (f.type === 'date') {
        const today = todayIso();
        if (f.date === 'past' || f.date === 'notFuture') extra = `max="${today}" min="1920-01-01"`;
        if (f.date === 'future') extra = `min="${today}" max="2060-12-31"`;
      }
      if (f.type === 'number') extra = 'min="1" max="120" inputmode="numeric"';
      const lang = f.rule === 'native' ? '' : 'lang="en"';
      control = `<input class="input" type="${type}" ${common} value="${esc(v)}" ${f.max ? `maxlength="${f.max}"` : ''} ${extra} ${lang} autocomplete="${f.ac || 'off'}" spellcheck="false">`;
    }
  }
  const tag = group ? 'fieldset' : 'div';
  const lab = group ? `<legend>${esc(labelFor(f))} ${mark}</legend>` : `<label for="${id}">${esc(labelFor(f))} ${mark}</label>`;
  return `<${tag} class="field ${f.full ? 'span-all' : ''}" data-field="${f.k}">${lab}${hintHtml}${control}<p class="err" id="${id}-err"></p></${tag}>`;
}

// ---------- Data mapping ----------
export function emptyDraft() {
  return { status: '', student_group: '', previous_prizewinner: false, needs_visa_invitation: false, diet: 'standard', tshirt_size: '', _files: {}, _fileErrors: {} };
}
export function fromParticipant(p) {
  const d = emptyDraft();
  for (const f of ALL_FIELDS) {
    if (f.type === 'file') continue;
    let v = p[f.k];
    if (f.k.startsWith('emergency_') && p.emergency_contact) v = p.emergency_contact[f.k.replace('emergency_', '')];
    if (f.type === 'date') v = toIsoDate(v);
    if (f.type === 'check') v = !!v;
    d[f.k] = v === null || v === undefined ? (f.type === 'check' ? false : '') : v;
  }
  d.has_passport_scan = !!p.has_passport_scan;
  d.has_face_photo = !!p.has_face_photo;
  return d;
}
export function toFormData(d, isUpdate) {
  const fd = new FormData();
  for (const f of ALL_FIELDS) {
    if (f.type === 'file') {
      if (isVisible(f, d) && d._files[f.k]) fd.append(f.k, d._files[f.k]);
      continue;
    }
    if (f.type === 'check') { fd.append(f.k, isVisible(f, d) && d[f.k] ? '1' : '0'); continue; }
    let v = isVisible(f, d) ? d[f.k] : '';
    if (typeof v === 'string') v = v.trim().replace(/\s{2,}/g, ' ');
    if (f.type === 'date') v = toApiDate(v);
    fd.append(f.k, v ?? '');
  }
  if (isUpdate) fd.append('_method', 'PATCH');
  return fd;
}

// Check an image file before upload: type, size, and (for the photo) dimensions.
export async function checkImage(file, f) {
  if (!/\.(jpe?g)$/i.test(file.name) && file.type !== 'image/jpeg') return t('err.jpg');
  if (file.size > 5 * 1024 * 1024) return t('err.size5');
  if (f.minW) {
    const dim = await new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
      img.src = url;
    });
    if (!dim) return t('err.jpg');
    if (dim.w < f.minW || dim.h < f.minH) return t('err.photoSize', { w: dim.w, h: dim.h });
  }
  return '';
}

export const personName = (p) => [p.family_name_en, p.first_name_en].filter(Boolean).join(' ') || '—';
export const roleLabel = (p) => (p.status === 'student' && p.student_group ? `${t('enum.status.student')} · ${t(`enum.student_group.${p.student_group}`)}` : t(`enum.status.${p.status}`));
// Visa participants must have passport data and both files before the team can submit.
export function visaIncomplete(p) {
  if (!p.needs_visa_invitation) return false;
  return !(p.passport_number && p.passport_issue_date && p.passport_expiry_date && p.passport_issued_by && p.org_address && p.org_contacts && p.has_passport_scan && p.has_face_photo);
}
