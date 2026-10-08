// Olympiad information panel shown next to the registration form.
// Source: the official IAO 2026 pages at www.issp.ac.ru/iao/2026/.
import { t } from './i18n.js';
import { esc, I } from './ui.js';
import { GROUP_YEARS, groupCell } from './fields.js';

const OFFICIAL_URL = 'http://www.issp.ac.ru/iao/2026/';
const CONTACT_EMAIL = 'gavrilov@issp.ac.ru';
const ico = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;vertical-align:-2px"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};


// Background star chart for the hero: celestial coordinate grid (declination circles,
// hour lines around the pole) and the Big Dipper asterism of Ursa Major.
const STAR_CHART = `<svg class="starchart" viewBox="0 0 480 220" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
  <g fill="none" stroke="#66CCFF" stroke-opacity=".14" stroke-width="1">
    <circle cx="430" cy="-20" r="80"/><circle cx="430" cy="-20" r="150"/><circle cx="430" cy="-20" r="220"/><circle cx="430" cy="-20" r="290"/>
    <path d="M430 -20 L130 220M430 -20 L250 240M430 -20 L370 250M430 -20 L490 250M430 -20 L60 120M430 -20 L40 20"/>
  </g>
  <g transform="translate(200 -50) scale(.6)">
  <g stroke="#9FD8FF" stroke-opacity=".45" stroke-width="1.1" fill="none">
    <path d="M262 150 L296 128 L330 122 L356 132 L362 164 L404 172 L412 140 L356 132"/>
  </g>
  <g fill="#E8EEF8">
    <circle cx="262" cy="150" r="2.4"/><circle cx="296" cy="128" r="2.2"/><circle cx="330" cy="122" r="2.3"/><circle cx="356" cy="132" r="1.8"/>
    <circle cx="362" cy="164" r="2.3"/><circle cx="404" cy="172" r="2.5"/><circle cx="412" cy="140" r="2.6"/>
  </g>
  </g>
  <g fill="#E8EEF8">
<circle cx="180" cy="60" r="1.2" fill-opacity=".6"/><circle cx="300" cy="190" r="1" fill-opacity=".5"/><circle cx="455" cy="130" r="1.3" fill-opacity=".6"/>
  </g>
</svg>`;

const CELL = { ab: ['g-ab', 'α/β'], b: ['g-b', 'β'], g: ['g-g', 'γ'], no: ['g-no', '—'], x: ['g-x', '·'] };
const CELL_LABEL = { ab: 'info.legendAB', b: 'info.legendB', g: 'info.legendG', no: 'info.legendNo', x: 'info.legendX' };

function groupsTable() {
  const head = GROUP_YEARS.map((y, i) => {
    const extra = i === 0 ? t('info.earlier') : i === GROUP_YEARS.length - 1 ? t('info.later') : '';
    return `<th scope="col">${y}${extra ? `<br><span class="small">${esc(extra)}</span>` : ''}</th>`;
  }).join('');
  const rows = ['info.rowNever', 'info.rowOnce', 'info.rowTwice'].map((label, k) => `<tr><th scope="row">${esc(t(label))}</th>${
    GROUP_YEARS.map((y) => { const c = groupCell(y, k); return `<td class="${CELL[c][0]}" title="${esc(t(CELL_LABEL[c]))}">${CELL[c][1]}</td>`; }).join('')}</tr>`).join('');
  return `<div class="table-scroll"><table class="gtable">
    <caption class="sr-only">${esc(t('info.groupsTitle'))}</caption>
    <thead><tr><th scope="col" style="text-align:left">${esc(t('info.colPrev'))} / ${esc(t('info.colYear'))}</th>${head}</tr></thead>
    <tbody>${rows}</tbody></table></div>
    <div class="legend">${['ab', 'b', 'g', 'no', 'x'].map((c) => `<span><i class="${CELL[c][0]}"></i>${esc(t(CELL_LABEL[c]))}</span>`).join('')}</div>`;
}

export function infoPanel() {
  return `<aside class="info" aria-label="${esc(t('info.title'))}">
    <section class="hero">
      ${STAR_CHART}
      ${I.astronaut}
      <div>
        <p class="hero-kicker">${esc(t('info.kicker'))}</p>
        <h2>${esc(t('info.title'))}</h2>
        <div class="hero-facts">
          <span>${ico.pin}${esc(t('meta.whereVal'))}</span>
          <span>${ico.cal}${esc(t('meta.whenVal'))}</span>
          <span>${ico.star}${esc(t('info.since'))}</span>
        </div>
        <p class="hero-caption">${esc(t('info.sextant'))}</p>
      </div>
    </section>

    <section class="card">
      <h3>${ico.users}${esc(t('info.whoTitle'))}</h3>
      <p>${esc(t('info.who'))}</p>
      <p>${esc(t('info.team'))}</p>
    </section>

    <section class="card">
      <h3>${ico.star}${esc(t('info.quotaTitle'))}</h3>
      <div class="quota-row">
        <span class="quota-chip">${esc(t('info.quotaChip')).replace('{n}', '<b>6</b>')}</span>
        <span class="quota-chip">α <b>4</b></span>
        <span class="quota-chip">β <b>3</b></span>
        <span class="quota-chip">γ <b>2</b></span>
      </div>
      <p>${esc(t('info.quotaRecommended'))}</p>
      <p>${esc(t('info.quotaExtra'))}</p>
    </section>

    <section class="card">
      <h3>${ico.grid}${esc(t('info.groupsTitle'))}</h3>
      <p>${esc(t('info.groupsLead'))}</p>
      ${groupsTable()}
      <p class="small" style="margin-top:10px">${esc(t('info.groupsNote'))}</p>
    </section>

    <section class="card contact">
      <h3>${ico.user}${esc(t('info.contactTitle'))}</h3>
      <p>${esc(t('info.contact'))}<br><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
      <p><a href="${OFFICIAL_URL}" target="_blank" rel="noopener">${esc(t('info.official'))} ${ico.ext}</a></p>
    </section>
  </aside>`;
}
