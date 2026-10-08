// Excel export in the organisers' layout.
//
// A team workbook contains, in this order:
//   1. the application form — an exact copy of the organisers' template (ia26appl_<Country>.xls):
//      Team Leaders, then Contestants of group a, b, g; same columns, headers (Russian + English),
//      merged cells, fonts, borders, column widths; the sheet is named by the team's IAO code;
//   2. "Personal data" — what the form does not hold (passport/visa, contacts, notes, emergency contact).
// The workbook for all teams starts with a "Teams" summary and has one form sheet per team.
//
// Everything here is plain functions that receive the ExcelJS module, so it runs in the browser and in Node tests.
import { WIDTHS, HEIGHTS, LEADERS_HEADER, CONTESTANTS_HEADER } from './template-layout.js';
import { suggestIaoCode } from './iao-codes.js';

const NCOLS = WIDTHS.length;                       // A..AH
const BLUE = 'FF0000FF';
const TEAL = 'FF008080';
const YELLOW = 'FFFFFF00';
const NAVY = 'FF13284A';
const ZEBRA = 'FFEEF4FB';
const GRID = 'FFC9D6E6';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SYMBOL = { alpha: 'α', beta: 'β', gamma: 'γ' };
const GROUP_LETTER = { alpha: 'a', beta: 'b', gamma: 'g' };
const GROUP_NAME = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };
const LEADER_STATUS = { team_leader: 'Team leader only', team_leader_jury: 'Team leader, Jury member', observer: 'Observer' };
const ROLE_ORDER = { team_leader: 0, team_leader_jury: 1, observer: 2 };
const ROLE_LABEL = { team_leader: 'Team leader', team_leader_jury: 'Team leader, Jury member', observer: 'Observer', student: 'Student' };
const LANGUAGE = { english: 'English', russian: 'Russian', both: 'English, Russian' };
const DIET_CODE = { standard: '', vegetarian: 'Ve', avoid_pork: 'AP' };
const DIET_LABEL = { standard: 'Standard', vegetarian: 'Vegetarian', avoid_pork: 'No pork' };

// ---------------------------------------------------------------- small helpers

export const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const firstWord = (s) => clean(s).split(' ')[0] || '';
const has = (s) => clean(s) !== '';
const HALIGN = { 0: undefined, 1: 'left', 2: 'center', 3: 'right' };
const VALIGN = { 0: 'top', 1: 'middle', 2: 'bottom' };
const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function borderOf(bits) {
  const side = (b) => (b && b !== '0' ? { style: 'thin', color: { argb: 'FF000000' } } : undefined);
  return { top: side(bits[0]), left: side(bits[1]), bottom: side(bits[2]), right: side(bits[3]) };
}
const ALL_SIDES = borderOf('1111');

/** dd.mm.yyyy from either "dd.mm.yyyy" or an ISO date */
export function dotDate(v) {
  const s = clean(v);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : s;
}

/** dd.mm.yyyy hh:mm in Tashkent time (the Olympiad's timezone) */
export function stamp(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}

/** "6–14. XII. 2026." — the date style of the form's title line */
export function romanDates(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  if (y1 === y2 && m1 === m2) return d1 === d2 ? `${d1}. ${ROMAN[m1 - 1]}. ${y1}.` : `${d1}–${d2}. ${ROMAN[m1 - 1]}. ${y1}.`;
  if (y1 === y2) return `${d1}. ${ROMAN[m1 - 1]} – ${d2}. ${ROMAN[m2 - 1]}. ${y1}.`;
  return `${d1}. ${ROMAN[m1 - 1]}. ${y1} – ${d2}. ${ROMAN[m2 - 1]}. ${y2}.`;
}

// ---------------------------------------------------------------- previous Olympiads (template columns R..AA)

/** Columns of the previous Olympiads, read from the template header: [{ col, label, year }] */
function historyColumns(header) {
  const labels = header.cells.filter((c) => c[0] === 2 && c[1] >= 17 && c[1] <= 26 && /IAO|IRAO/.test(c[4]));
  return labels.map((c) => {
    const y = header.cells.find((x) => x[0] === 3 && x[1] === c[1]);
    return { col: c[1], label: c[4], year: y ? Number(y[4]) : 0 };
  });
}
const LEADER_EVENTS = historyColumns(LEADERS_HEADER);
const CONTESTANT_EVENTS = historyColumns(CONTESTANTS_HEADER);

const YEARS = /\b(?:19|20)\d{2}\b/g;

function leaderCode(d) {
  const jury = /jury/.test(d);
  const tl = /team\s*leader|\bleader\b|\btl\b/.test(d);
  const obs = /observer|\bobs\b/.test(d);
  if (tl && jury) return 'TL-Jury';
  if (obs && jury) return 'Obs-Jury';
  if (jury) return 'Jury';
  if (tl) return 'TL';
  if (obs) return 'Obs';
  if (/contestant|student|particip|diploma|\bcnts\b|\bpart\b/.test(d)) return 'Cnts';
  return '';
}
const DEGREE = { i: 'I', 1: 'I', ii: 'II', 2: 'II', iii: 'III', 3: 'III' };
function contestantCode(d) {
  const m = d.match(/diploma\s*(?:of\s*)?(?:the\s*)?(?:degree\s*)?(iii|ii|i|3|2|1)\b/) || d.match(/\b(iii|ii|i|3|2|1)\s*(?:st|nd|rd)?\s*(?:degree\s*)?diploma/);
  if (m) return DEGREE[m[1]];
  if (/particip|\bpart\b|contestant|student|took part/.test(d)) return 'part';
  return '';
}

/** Free text such as "IAO-2025: Diploma II; 2024 participated" -> { year: code } for the years the form has columns for */
export function parseHistory(text, isLeader) {
  const out = {};
  for (const seg of String(text || '').split(/[;\n]+/)) {
    const years = seg.match(YEARS);
    if (!years) continue;
    const d = seg.toLowerCase();
    const code = isLeader ? leaderCode(d) : contestantCode(d);
    if (code) years.forEach((y) => { out[Number(y)] = code; });
  }
  return out;
}

/** "Out of quota - II Diploma on XI IAO": the latest I or II Diploma named in the free text */
function outOfQuotaStatus(p) {
  let best = null;
  for (const seg of String(p.previous_olympiads || '').split(/[;\n]+/)) {
    const years = (seg.match(YEARS) || []).map(Number);
    const degree = contestantCode(seg.toLowerCase());
    const named = seg.match(/\b([IVXL]+)\s*(IAO|IRAO)\b/);
    if ((degree === 'I' || degree === 'II') && (years.length || named)) {
      const year = Math.max(0, ...years);
      if (!best || year > best.year) best = { degree, year, named: named ? `${named[1]} ${named[2]}` : '' };
    }
  }
  if (!best) return 'Out of quota - I or II Diploma at the last IAO/IRAO';
  const event = best.named || (CONTESTANT_EVENTS.find((e) => e.year === best.year) || {}).label || (best.year ? `IAO ${best.year}` : '');
  return `Out of quota - ${best.degree} Diploma${event ? ` on ${event}` : ''}`;
}

export function parseGraduation(text) {
  const s = clean(text);
  if (!s) return { month: '', year: '' };
  const y = s.match(/\b(20\d{2})\b/);
  let month = (MONTHS.find((m) => new RegExp(`\\b${m.slice(0, 3)}`, 'i').test(s)) || '');
  if (!month) {
    const n = s.match(/\b(0?[1-9]|1[0-2])\s*[./-]\s*20\d{2}\b/) || s.match(/\b20\d{2}\s*[./-]\s*(0?[1-9]|1[0-2])\b/);
    if (n) month = MONTHS[Number(n[1]) - 1];
  }
  return { month, year: y ? Number(y[1]) : '' };
}

// ---------------------------------------------------------------- the form's cells

/** Badge name, at most 18 characters including spaces, the family name is obligatory */
export function badgeName(family, given) {
  const fam = clean(family);
  const g = firstWord(given);
  const full = [fam, g].filter(Boolean).join(' ');
  if (full.length <= 18) return full;
  const short = g ? `${fam} ${g[0].toUpperCase()}.` : fam;
  return short.length <= 18 ? short : fam.slice(0, 18).trim();
}

/** Name for minutes and diploma: leaders — all given names + family name; contestants — first given name + family name */
export function minutesName(p, isLeader) {
  const given = isLeader ? clean(p.first_name_en) : firstWord(p.first_name_en);
  return [given, clean(p.family_name_en)].filter(Boolean).join(' ');
}

const RU33 = /^[А-Яа-яЁё][А-Яа-яЁё .'-]*$/;
const cyrillic = (s) => (RU33.test(clean(s)) ? clean(s) : '');

function personValues(p, i, team, code) {
  const isLeader = p.status !== 'student';
  const v = new Array(NCOLS).fill(null);
  v[0] = i;
  v[1] = isLeader ? code : `${code}-${SYMBOL[p.student_group] || ''}-`;
  v[2] = clean(p.family_name_en);
  v[3] = clean(p.first_name_en);
  v[4] = minutesName(p, isLeader);
  v[5] = badgeName(p.family_name_en, p.first_name_en);
  v[6] = p.sex === 'male' ? 'M' : p.sex === 'female' ? 'F' : '';
  v[7] = dotDate(p.birth_date);
  v[8] = clean(team.country);
  v[10] = isLeader ? LEADER_STATUS[p.status] || '' : p.previous_prizewinner ? outOfQuotaStatus(p) : `Regular group ${GROUP_NAME[p.student_group] || ''} participant`;
  v[12] = LANGUAGE[p.official_language] || '';
  v[13] = clean(p.native_languages);
  v[14] = DIET_CODE[p.diet] ?? '';
  v[15] = clean(p.tshirt_size);
  const history = parseHistory(p.previous_olympiads, isLeader);
  (isLeader ? LEADER_EVENTS : CONTESTANT_EVENTS).forEach((e) => { if (history[e.year]) v[e.col] = history[e.year]; });
  if (!isLeader) {
    const g = parseGraduation(p.graduation_date);
    v[25] = g.month || null;
    v[26] = g.year || null;
  }
  v[28] = cyrillic(p.family_name_native) || null;
  v[29] = cyrillic(p.first_name_native) || null;
  v[31] = clean(p.family_name_native) || null;
  v[32] = clean(p.first_name_native) || null;
  return v.map((x) => (x === '' ? null : x));
}

// [horizontal, vertical, wrap] of the data cells, as in the template
const C = ['center', 'bottom', false];
const M = ['center', 'middle', false];
const DATA_ALIGN = [
  [undefined, 'bottom', false], C, C, C, C, C, C, C, C, ['left', 'middle', true], ['left', 'bottom', true], M,
  C, C, C, C, M, M, M, M, M, M, M, M, M, M, M, M, C, C, M, C, C, M,
];

export function iaoCodeOf(team) {
  return clean(team.iao_code).toUpperCase() || suggestIaoCode(team.country);
}

// ---------------------------------------------------------------- the application form sheet

function drawHeader(ws, startRow, block) {
  block.heights.forEach((h, i) => { ws.getRow(startRow + i).height = h; });
  const merges = [];
  for (const [r, c, rs, cs, text, size, bold, italic, color, h, v, wrap, bits] of block.cells) {
    const cell = ws.getCell(startRow + r, c + 1);
    cell.value = text === '' ? null : /^\d{4}$/.test(text) ? Number(text) : text;
    cell.font = { name: 'Arial', size, bold: !!bold, italic: !!italic, color: color ? { argb: `FF${color}` } : undefined };
    cell.alignment = { horizontal: HALIGN[h], vertical: VALIGN[v], wrapText: !!wrap };
    cell.border = borderOf(bits);
    if (rs > 1 || cs > 1) merges.push([startRow + r, c + 1, startRow + r + rs - 1, c + cs]);
  }
  merges.forEach((m) => ws.mergeCells(...m));   // after styling: merged cells take the style of the first cell
}

function drawTitle(ws, row, text, { to, size = 14, bold = false, italic = false, v = 'bottom', height }) {
  ws.mergeCells(row, 1, row, to);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { name: 'Arial', size, bold, italic, color: { argb: BLUE } };
  cell.alignment = { horizontal: 'center', vertical: v, wrapText: true };
  ws.getRow(row).height = height;
}

function drawPerson(ws, row, values, person) {
  const r = ws.getRow(row);
  r.height = HEIGHTS.data;
  for (let c = 0; c < NCOLS; c += 1) {
    const cell = r.getCell(c + 1);
    cell.value = values[c];
    const [h, v, wrap] = DATA_ALIGN[c];
    cell.font = { name: 'Arial', size: 12, color: c === 14 || c === 15 ? { argb: TEAL } : undefined };
    cell.alignment = { horizontal: h, vertical: v, wrapText: wrap };
    cell.border = ALL_SIDES;
    if (c === 7) cell.numFmt = '@';
  }
  // "Colour the food cell in yellow if there are comments about food or medical requirements" (they are on the Personal data sheet)
  if (person && (has(person.food_notes) || has(person.medical_notes))) r.getCell(15).fill = solid(YELLOW);
}

const ROLE_RANK = (p) => ROLE_ORDER[p.status] ?? 9;
const byRegistration = (a, b) => (a.id ?? 0) - (b.id ?? 0);

function sheetNameFor(team, code, used) {
  const base = (code || clean(team.country)).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Team';
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base.slice(0, 28)}-${n}`;
  used.add(name.toLowerCase());
  return name;
}

/** One team's application form, laid out exactly like the organisers' template */
export function addApplicationSheet(wb, det, { olympiad, code, used = new Set() }) {
  const team = det.team;
  const people = det.participants || [];
  const ws = wb.addWorksheet(sheetNameFor(team, code, used));
  WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const o = olympiad;
  const gap = ' '.repeat(41);
  let row = 1;
  drawTitle(ws, row++, 'Euro-Asian Astronomical Society', { to: 10, italic: true, v: 'top', height: HEIGHTS.org });
  drawTitle(ws, row++, `${o.city.en}, ${o.country.en}${gap}${o.name.en}${gap}${romanDates(o.starts_on, o.ends_on)}`, { to: 10, bold: true, v: 'middle', height: HEIGHTS.olympiad });
  ws.getRow(row++).height = HEIGHTS.gap;

  // --- Team leaders and observers
  drawTitle(ws, row++, `Application form${' '.repeat(10)}Team Leaders`, { to: 9, bold: true, height: HEIGHTS.section });
  ws.getRow(row++).height = HEIGHTS.gap;
  drawHeader(ws, row, LEADERS_HEADER);
  row += LEADERS_HEADER.heights.length;
  const leaders = people.filter((p) => p.status !== 'student').sort((a, b) => ROLE_RANK(a) - ROLE_RANK(b) || byRegistration(a, b));
  leaders.forEach((p, i) => { drawPerson(ws, row, personValues(p, i + 1, team, code), p); row += 1; });
  ws.getRow(row++).height = HEIGHTS.blank;

  // --- Contestants of group a, b, g (every table is always there, as in the template)
  for (const g of ['alpha', 'beta', 'gamma']) {
    drawTitle(ws, row++, `Application form${' '.repeat(10)}Contestants, Group ${GROUP_LETTER[g]}`, { to: 9, bold: true, height: HEIGHTS.section });
    ws.getRow(row++).height = HEIGHTS.gap;
    drawHeader(ws, row, CONTESTANTS_HEADER);
    row += CONTESTANTS_HEADER.heights.length;
    const students = people.filter((p) => p.status === 'student' && p.student_group === g)
      .sort((a, b) => (!!a.previous_prizewinner - !!b.previous_prizewinner) || byRegistration(a, b));
    students.forEach((p, i) => { drawPerson(ws, row, personValues(p, i + 1, team, code), p); row += 1; });
    ws.getRow(row++).height = HEIGHTS.blank;
  }
  return ws;
}

// ---------------------------------------------------------------- "Personal data" sheet

const PERSONAL_COLUMNS = [
  ['No.', 6, (p, t, i) => i],
  ['Team', 18, (p, t) => clean(t.country)],
  ['Role', 24, (p) => ROLE_LABEL[p.status] || ''],
  ['Group', 8, (p) => SYMBOL[p.student_group] || ''],
  ['Family name', 18, (p) => clean(p.family_name_en)],
  ['Given name(s)', 22, (p) => clean(p.first_name_en)],
  ['Native family name', 20, (p) => clean(p.family_name_native)],
  ['Native given name(s)', 22, (p) => clean(p.first_name_native)],
  ['Sex', 6, (p) => (p.sex === 'male' ? 'M' : p.sex === 'female' ? 'F' : '')],
  ['Date of birth', 13, (p) => dotDate(p.birth_date)],
  ['Place of birth', 24, (p) => clean(p.birth_place)],
  ['Citizenship', 16, (p) => clean(p.citizenship)],
  ['Other citizenships', 18, (p) => clean(p.other_citizenships)],
  ['Nationality', 14, (p) => clean(p.ethnicity)],
  ['Previous visits to Uzbekistan', 24, (p) => clean(p.previous_visits_uz)],
  ['Out of quota (I–II Diploma)', 14, (p) => (p.status === 'student' ? (p.previous_prizewinner ? 'Yes' : 'No') : '')],
  ['Visa invitation', 10, (p) => (p.needs_visa_invitation ? 'Yes' : 'No')],
  ['Passport number', 16, (p) => clean(p.passport_number)],
  ['Passport issued', 13, (p) => dotDate(p.passport_issue_date)],
  ['Passport expires', 13, (p) => dotDate(p.passport_expiry_date)],
  ['Issued by', 24, (p) => clean(p.passport_issued_by)],
  ['Passport scan uploaded', 11, (p) => (p.needs_visa_invitation ? (p.has_passport_scan ? 'Yes' : 'NO') : '')],
  ['Face photo uploaded', 11, (p) => (p.needs_visa_invitation ? (p.has_face_photo ? 'Yes' : 'NO') : '')],
  ['Position', 16, (p) => clean(p.position)],
  ['School / organisation', 28, (p) => clean(p.org_name)],
  ['City, country of the organisation', 24, (p) => clean(p.org_location)],
  ['Address of the organisation', 32, (p) => clean(p.org_address)],
  ['Contacts of the organisation', 28, (p) => clean(p.org_contacts)],
  ['School graduation', 14, (p) => clean(p.graduation_date)],
  ['Previous IAO / APAO', 28, (p) => clean(p.previous_olympiads)],
  ['City, country of residence', 24, (p) => clean(p.home_location)],
  ['Home address', 30, (p) => clean(p.home_address)],
  ['Home phone', 16, (p) => clean(p.home_phone)],
  ['Mobile phone', 18, (p) => clean(p.mobile_phone)],
  ['Email', 28, (p) => clean(p.email)],
  ['Official language', 16, (p) => LANGUAGE[p.official_language] || ''],
  ['Native languages / translates into', 24, (p) => clean(p.native_languages)],
  ['Diet', 12, (p) => DIET_LABEL[p.diet] || ''],
  ['T-shirt', 8, (p) => clean(p.tshirt_size)],
  ['Notes on food', 28, (p) => clean(p.food_notes)],
  ['Medical information', 28, (p) => clean(p.medical_notes)],
  ['Emergency contact', 22, (p) => [p.emergency_contact?.family_name, p.emergency_contact?.first_name].filter(Boolean).join(' ')],
  ['Relationship', 14, (p) => clean(p.emergency_contact?.relation)],
  ['Age', 6, (p) => p.emergency_contact?.age ?? ''],
  ['Languages', 16, (p) => clean(p.emergency_contact?.languages)],
  ['Phone(s)', 18, (p) => clean(p.emergency_contact?.phones)],
  ['Email', 24, (p) => clean(p.emergency_contact?.email)],
  ['Telegram', 14, (p) => clean(p.emergency_contact?.telegram)],
];
const WRAP_COLUMNS = new Set(['Previous visits to Uzbekistan', 'Address of the organisation', 'Contacts of the organisation', 'Previous IAO / APAO', 'Notes on food', 'Medical information', 'Home address']);

function sheetHeading(ws, title, subtitle, span) {
  ws.mergeCells(1, 1, 1, Math.min(span, 8));
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { name: 'Arial', bold: true, size: 14, color: { argb: NAVY } };
  ws.getRow(1).height = 24;
  ws.mergeCells(2, 1, 2, Math.min(span, 8));
  ws.getCell(2, 1).value = subtitle;
  ws.getCell(2, 1).font = { name: 'Arial', size: 10, color: { argb: 'FF687891' } };
}
function tableHeader(ws, rowNo, labels) {
  const r = ws.getRow(rowNo);
  labels.forEach((label, i) => {
    const c = r.getCell(i + 1);
    c.value = label;
    c.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = solid(NAVY);
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { top: { style: 'thin', color: { argb: GRID } }, left: { style: 'thin', color: { argb: GRID } }, bottom: { style: 'thin', color: { argb: GRID } }, right: { style: 'thin', color: { argb: GRID } } };
  });
  r.height = 38;
}
function tableRow(ws, rowNo, values, { fill, center = [], wrap = [] } = {}) {
  const r = ws.getRow(rowNo);
  values.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v === '' || v === undefined ? null : v;
    c.font = { name: 'Arial', size: 10 };
    c.alignment = { vertical: wrap.includes(i) ? 'top' : 'middle', horizontal: center.includes(i) ? 'center' : 'left', wrapText: wrap.includes(i) };
    c.border = { top: { style: 'thin', color: { argb: GRID } }, left: { style: 'thin', color: { argb: GRID } }, bottom: { style: 'thin', color: { argb: GRID } }, right: { style: 'thin', color: { argb: GRID } } };
    if (fill) c.fill = solid(fill);
  });
  return r;
}

export function addPersonalDataSheet(wb, details, { olympiad, generated }) {
  const ws = wb.addWorksheet('Personal data', { views: [{ state: 'frozen', xSplit: 5, ySplit: 4 }] });
  sheetHeading(ws, `${olympiad.name.en}: personal data`, `Supplement to the application forms — passport and visa details, contacts, notes. Exported ${generated}.`, PERSONAL_COLUMNS.length);
  PERSONAL_COLUMNS.forEach(([, width], i) => { ws.getColumn(i + 1).width = width; });
  tableHeader(ws, 4, PERSONAL_COLUMNS.map((c) => c[0]));
  const wrapIdx = PERSONAL_COLUMNS.map((c, i) => (WRAP_COLUMNS.has(c[0]) ? i : -1)).filter((i) => i >= 0);
  const centerIdx = [0, 3, 8, 9, 15, 16, 18, 19, 21, 22, 38, 43];
  let row = 5; let n = 0;
  details.forEach((det, ti) => {
    const people = [...(det.participants || [])].sort((a, b) => (ROLE_ORDER[a.status] ?? 3) - (ROLE_ORDER[b.status] ?? 3)
      || ({ alpha: 0, beta: 1, gamma: 2 }[a.student_group] ?? 9) - ({ alpha: 0, beta: 1, gamma: 2 }[b.student_group] ?? 9) || byRegistration(a, b));
    people.forEach((p) => {
      n += 1;
      const r = tableRow(ws, row, PERSONAL_COLUMNS.map(([, , fn]) => fn(p, det.team, n)), { fill: ti % 2 ? ZEBRA : null, center: centerIdx, wrap: wrapIdx });
      // a visa participant without the files is flagged
      [21, 22].forEach((c) => { if (r.getCell(c + 1).value === 'NO') r.getCell(c + 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFC33838' } }; });
      row += 1;
    });
  });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, row - 1), column: PERSONAL_COLUMNS.length } };
  return ws;
}

// ---------------------------------------------------------------- "Teams" summary sheet

export function addTeamsSheet(wb, details, { olympiad, statusOf, generated }) {
  const cols = [['No.', 6], ['Country', 22], ['IAO code', 9], ['Responsible person', 26], ['Email', 30], ['Phone', 18], ['Status', 20],
    ['Applied', 17], ['Completed', 17], ['Team leaders', 12], ['Observers', 11], ['α', 6], ['β', 6], ['γ', 6], ['Total', 8]];
  const ws = wb.addWorksheet('Teams', { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] });
  sheetHeading(ws, `${olympiad.name.en}: teams`, `Exported ${generated}.`, cols.length);
  cols.forEach(([, w], i) => { ws.getColumn(i + 1).width = w; });
  tableHeader(ws, 4, cols.map((c) => c[0]));
  const total = new Array(6).fill(0);
  details.forEach((det, i) => {
    const t = det.team; const u = t.user || {}; const ps = det.participants || [];
    const g = (k) => ps.filter((p) => p.status === 'student' && p.student_group === k).length;
    const counts = [ps.filter((p) => p.status === 'team_leader' || p.status === 'team_leader_jury').length, ps.filter((p) => p.status === 'observer').length, g('alpha'), g('beta'), g('gamma'), ps.length];
    counts.forEach((n, k) => { total[k] += n; });
    tableRow(ws, 5 + i, [i + 1, clean(t.country), iaoCodeOf(t), clean(u.name), clean(u.email), clean(u.phone), statusOf(t), stamp(t.created_at), stamp(t.submitted_at), ...counts],
      { fill: i % 2 ? ZEBRA : null, center: [0, 2, 9, 10, 11, 12, 13, 14] });
  });
  if (details.length > 1) {
    tableRow(ws, 5 + details.length, ['', 'Total', '', '', '', '', '', '', '', ...total], { fill: 'FFDCE6F2', center: [9, 10, 11, 12, 13, 14] }).font = { name: 'Arial', size: 10, bold: true };
  }
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + details.length, column: cols.length } };
  return ws;
}

// ---------------------------------------------------------------- workbook

/**
 * @param ExcelJS   the ExcelJS module
 * @param details   [{ team, participants }] as returned by GET /api/admin/teams/{id}
 * @param opts      { olympiad, statusOf(team) -> English label, now? }
 * @returns { wb, missingCodes: [country, ...] }
 */
export function buildWorkbook(ExcelJS, details, { olympiad, statusOf = () => '', now = new Date() }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `IAO ${olympiad.year}`;
  wb.created = now;
  const generated = stamp(now);
  const missingCodes = [];
  if (details.length > 1) addTeamsSheet(wb, details, { olympiad, statusOf, generated });
  const used = new Set(['teams', 'personal data']);
  details.forEach((det) => {
    const code = iaoCodeOf(det.team);
    if (!code) missingCodes.push(det.team.country);
    addApplicationSheet(wb, det, { olympiad, code, used });
  });
  addPersonalDataSheet(wb, details, { olympiad, generated });
  return { wb, missingCodes };
}

/** ia26appl_Australia.xlsx — the template's own naming: "ia26appl_" + country */
export function applicationFileName(olympiad, details) {
  const yy = String(olympiad.year).slice(-2);
  const safe = (s) => clean(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Team';
  const stamp10 = new Date().toISOString().slice(0, 10);
  return details.length === 1 ? `ia${yy}appl_${safe(details[0].team.country)}.xlsx` : `ia${yy}appl_ALL_${stamp10}.xlsx`;
}
