/* =========================================================
   PRODUKTIONSSTATISTIK in der Oberfläche
   Raten und Verlauf aus game.state.flow (kommt höchstens einmal pro Sekunde mit dem Snapshot),
   pixeliges Verlaufsdiagramm und das Statistik-Fenster (P).
   Begriffe: erzeugt = ins Kontor gelangt, verbraucht = aus dem Kontor genommen,
             Produktion = Ausgabe der Gebäude (auch wenn sie nicht ins Kontor geht).
   Flüssigkeiten wie Items: Bestand = Inhalt der Rohrnetze und Tanks, erzeugt = ins Netz gepumpt, verbraucht = aus dem Netz gezogen.
   ========================================================= */
import { BD } from '../data/buildings.js';
import { ITEMS, ITEM_ORDER, resName } from '../data/items.js';
import { FLUIDS, FLUID_ORDER } from '../data/fluids.js';
import { fluidStock } from '../sim/fluids.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR, bIcon, flagSpr } from '../gfx/sprites.js';
import { esc, fmt } from '../util/format.js';
import { capOf, totalRes, invOf, kontorIslands, flagOf, playerName } from '../sim/state.js';
import { flowRates, flowHistory, flowOneOff, powerHistory } from '../sim/stats.js';
import { IST_WARN } from '../data/stats.js';
import { game, ui } from './context.js';
import { setHTML, curIsl, islLabel, coinSrcName } from './common.js';
import { registerWindow } from './windows.js';
import { registerTip } from './tooltip.js';
import { COIN_SRC, COIN_LOG } from '../data/trade.js';
import { coinSums } from '../sim/coins.js';

/* ---------- Quellen der Aufschlüsselung ---------- */
const SRC = {
  band: ['Über Bänder', () => SPR.belt[0][0][0]],
  extraktor: ['Extraktoren', () => bIcon('extraktor')],
  schiffe: ['Schiffe', () => SPR.icon.anchor],
  haeuser: ['Häuser', () => SPR.icon.house],
  bauen: ['Bauen', () => SPR.icon.hammer],
  schiffbau: ['Schiffbau', () => SPR.icon.catSchiff],
  forschung: ['Forschung', () => SPR.icon.flask],
  verbrennung: ['Verbrennung (Überlauf)', () => bIcon('verbrennung')],
  leeren: ['Geleert (Bänder, Rohrnetze)', () => SPR.icon.cross],
  handel: ['Handel', () => SPR.icon.coin],
  reparatur: ['Reparatur', () => SPR.icon.wrench],
  leuchtturm: ['Weltenleuchtturm', () => bIcon('leuchtturm')],
  relikte: ['Relikte (Unterhalt)', () => SPR.icon.relic]
};
// Getrennte Inseln: 'schiffe@<pid>' = Lieferung von/an einen Mitspieler
const partnerOf = (q) => q.startsWith('schiffe@') ? q.slice(8) : null;
export const srcName = (q) => partnerOf(q) ? `Schiffe (${playerName(game, partnerOf(q))})` : SRC[q] ? SRC[q][0] : BD[q] ? BD[q].name : q;
export const srcIcon = (q) => partnerOf(q) ? SPR.icon.anchor : SRC[q] ? SRC[q][1]() : BD[q] ? bIcon(q) : SPR.icon.chest;

/* ---------- Zahlen ---------- */
// Rate pro Minute: ab 10 ganzzahlig, darunter eine Nachkommastelle; signed = mit Vorzeichen
export function fmtRate(r, signed) {
  const v = Math.abs(r) < 0.05 ? 0 : r, a = Math.abs(v);
  const s = (a >= 10 ? Math.round(a) : Math.round(a * 10) / 10).toLocaleString('de-DE');
  return signed ? (v > 0 ? '+' : v < 0 ? '−' : '') + s : s;
}
export const rateCls = (r) => Math.abs(r) < 0.05 ? 'zero' : r > 0 ? 'pos' : 'neg';
// Raten für Insel k (-1 = alle), gecacht je Statistik-Stand
let rc = { ver: -1, k: null, r: null };
export function ratesFor(k) {
  if (rc.ver !== game.flowVer || rc.k !== k) rc = { ver: game.flowVer, k, r: flowRates(game.state.flow, game.state.flowT, k) };
  return rc.r;
}
export const stockOf = (k, it) => FLUIDS[it] ? Math.floor(fluidStock(game, k, it).n) : k >= 0 ? Math.floor(invOf(game, k)[it] || 0) : Math.floor(totalRes(game, it));
export const active = (r) => !!r && (r.p >= 0.05 || r.c >= 0.05 || r.m >= 0.05 || r.u >= 0.05);
// Einmalige Posten der letzten 15 min (Bauen, Forschung, Schiffbau, Leeren), gecacht wie ratesFor
let oc = { ver: -1, k: null, r: null };
export function oneOffFor(k) {
  if (oc.ver !== game.flowVer || oc.k !== k) oc = { ver: game.flowVer, k, r: flowOneOff(game.state.flow, game.state.flowT, k) };
  return oc.r;
}
// Soll (Plan der Gebäude, sim/soll.js) und Ist (Produktion minus Verbrauch der Gebäude, letzte 60 s) je Minute.
// low = Ist liegt mehr als IST_WARN unter Soll. k = -1: alle Inseln
export function sollIst(k, it) {
  const S = game.SOLL || {};
  let soll = 0, blk = 0, has = false;
  for (const i of k >= 0 ? [k] : Object.keys(S)) { const e = S[i] && S[i][it]; if (e) { soll += e[0]; blk += e[1]; has = true; } }
  const r = ratesFor(k)[it], ist = r ? r.m - r.u : 0;
  return { has, soll, blk, ist, low: has && Math.abs(soll) >= 0.05 && ist < soll - Math.abs(soll) * IST_WARN };
}

/* ---------- Verlaufsdiagramm ---------- */
const CH_W = 120, CH_H = 40;   // logische Pixel (CSS doppelt so groß)
export function chartHTML() {
  return `<div class="chart"><div class="chart-top xs"><span class="lg"><i class="sw pos"></i>erzeugt</span><span class="lg"><i class="sw neg"></i>verbraucht</span><span class="grow"></span><span class="muted" data-cmax></span></div>
    <canvas class="px chartcv" width="${CH_W}" height="${CH_H}"></canvas>
    <div class="chart-ax xs muted"><span>&minus;15 min</span><span>&minus;7,5</span><span>jetzt</span></div></div>`;
}
// Je Fach zwei Säulen (2 px breit): grün erzeugt, rot verbraucht
export function drawChart(root, k, item) {
  const cv = root.querySelector('.chartcv');
  if (!cv) return;
  const h = flowHistory(game.state.flow, game.state.flowT, k, item);
  paintBars(root, cv, h.p, h.c, 'min');
}
function paintBars(root, cv, P, C, unit) {
  const n = P.length, ctx = cv.getContext('2d');
  const max = Math.max(1, ...P, ...C), top = Math.ceil(max / 5) * 5;
  ctx.clearRect(0, 0, CH_W, CH_H);
  ctx.fillStyle = '#f3e1b6'; ctx.fillRect(0, 0, CH_W, CH_H);
  ctx.fillStyle = '#e6cd96';
  for (let x = 0; x < CH_W; x += 2) { ctx.fillRect(x, Math.round(CH_H / 2), 1, 1); ctx.fillRect(x, 0, 1, 1); }
  const bw = Math.floor(CH_W / n), hh = CH_H - 2;
  for (let i = 0; i < n; i++) {
    const x = i * bw, hp = Math.round(P[i] / top * hh), hc = Math.round(C[i] / top * hh);
    if (hp) { ctx.fillStyle = '#7cc24f'; ctx.fillRect(x, CH_H - 1 - hp, 2, hp); ctx.fillStyle = '#b4e47c'; ctx.fillRect(x, CH_H - 1 - hp, 2, 1); }
    if (hc) { ctx.fillStyle = '#e8774f'; ctx.fillRect(x + 2, CH_H - 1 - hc, 2, hc); ctx.fillStyle = '#ffb08a'; ctx.fillRect(x + 2, CH_H - 1 - hc, 2, 1); }
  }
  ctx.fillStyle = '#5c3a1b'; ctx.fillRect(0, CH_H - 1, CH_W, 1);
  const lab = root.querySelector('[data-cmax]');
  if (lab) lab.textContent = `max ${fmt(top)}/${unit}`;
}

/* ---------- Aufschlüsselung ---------- */
// Top 5 je Richtung: erzeugt = Gebäude-Produktion je Typ + Schiffsentladung; verbraucht = Lager-Entnahmen
export function breakdownHTML(r) {
  if (!r) return '<div class="xs muted">Keine Bewegung in der letzten Minute.</div>';
  const prod = Object.entries(r.src.m).concat(Object.entries(r.src.p).filter(([q]) => q === 'schiffe' || partnerOf(q)));
  const cons = Object.entries(r.src.c);
  const list = (arr, cls) => arr.filter(([, v]) => v >= 0.05).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q, v]) => {
    const ic = srcIcon(q);
    return `<div class="bd"><span class="bic2">${img(ic, fitScale(ic, 18))}</span><span class="grow">${esc(srcName(q))}</span><b class="${cls}">${fmtRate(v)}/min</b></div>`;
  }).join('') || '<div class="xs muted">–</div>';
  return `<div class="bdcols"><div><div class="lbl">Erzeugt von</div>${list(prod, 'pos')}</div><div><div class="lbl">Verbraucht von</div>${list(cons, 'neg')}</div></div>`;
}
// Kopfwerte eines Items (Popover und Statistik-Fenster)
export function itemFacts(k, it) {
  const r = ratesFor(k)[it], st = stockOf(k, it), fl = !!FLUIDS[it];
  const cap = fl ? fluidStock(game, k, it).cap : k >= 0 ? capOf(game, k) : null, where = fl ? 'Netz' : 'Kontor';
  const p = r ? r.p : 0, c = r ? r.c : 0, m = r ? r.m : 0;
  return `<div class="stat"><span>Bestand${fl ? ' (Rohre und Tanks)' : ''}</span><b>${fmt(st)}${cap != null ? ' / ' + fmt(cap) : ''}</b></div>
    <div class="stat"><span>Erzeugt (ins ${where})</span><b class="pos">${fmtRate(p)}/min</b></div>
    <div class="stat"><span>Verbraucht (aus dem ${where})</span><b class="neg">${fmtRate(c)}/min</b></div>
    <div class="stat"><span>Netto</span><b class="${rateCls(p - c)}">${fmtRate(p - c, true)}/min</b></div>
    <div class="stat" data-tip="th:m"><span>Produktion der Gebäude</span><b>${fmtRate(m)}/min</b></div>` + sollHTML(k, it) + oneOffHTML(k, it)
    + (ITEMS[it] ? `<div class="stat" data-tip="fuel:${it}"><span>Brennwert</span><b class="num">${ITEMS[it].burn || 1}</b></div>` : '');
}
function sollHTML(k, it) {
  const s = sollIst(k, it);
  if (!s.has) return '';
  return `<div class="stat" data-tip="th:soll"><span>Soll / Ist (Gebäude)</span><b class="num"><span class="${rateCls(s.soll)}">${fmtRate(s.soll, true)}</span> <span class="xs ${s.low ? 'warnc' : 'muted'}">Ist ${fmtRate(s.ist, true)}</span>/min</b></div>`
    + (Math.abs(s.blk) >= 0.05 ? `<div class="xs muted">davon blockiert: ${fmtRate(s.blk, true)}/min</div>` : '');
}
function oneOffHTML(k, it) {
  const o = oneOffFor(k)[it];
  if (!o) return '';
  const parts = Object.entries(o.src).sort((a, b) => b[1] - a[1]).map(([q, n]) => `${srcName(q)} ${fmt(n)}`).join(', ');
  return `<div class="stat oneoff" data-tip="th:one"><span>Einmalig (Bauen, Forschung, Schiffbau)</span><b class="num">${o.c ? '&minus;' + fmt(o.c) : ''}${o.c && o.p ? ' / ' : ''}${o.p ? '+' + fmt(o.p) : ''}</b></div><div class="xs muted oneoff">letzte 15 min: ${parts}</div>`;
}

/* ---------- Statistik-Fenster ---------- */
const COLS = [
  { id: 'item', name: 'Item' }, { id: 'st', name: 'Bestand' }, { id: 'p', name: 'Erzeugt' },
  { id: 'c', name: 'Verbraucht' }, { id: 'n', name: 'Netto' }, { id: 'm', name: 'Produktion' }, { id: 'soll', name: 'Soll' }, { id: 'ist', name: 'Ist' }, { id: 'o', name: 'Einmalig' }
];
const TH_TIP = {
  st: 'Menge im Hauptkontor (Flüssigkeiten: in Rohren und Tanks)', p: 'Ins Kontor gelangt, pro Minute (Bänder, Schiffe)', c: 'Aus dem Kontor genommen, pro Minute (Häuser, Extraktoren, Schiffe)',
  n: 'Erzeugt minus verbraucht', m: 'Ausgabe der Produktionsgebäude pro Minute, auch wenn sie nicht ins Kontor geht',
  soll: 'Soll: was die Gebäude nach Plan pro Minute erzeugen (+) oder verbrauchen (−), bei voller Versorgung',
  ist: 'Ist: was die Gebäude in der letzten Minute tatsächlich erzeugt minus verbraucht haben. Gelb: mehr als 20 % unter Soll',
  o: 'Einmalige Posten der letzten 15 Minuten (Bauen, Forschung, Schiffbau, Leeren). Sie zählen nicht in die Raten.',
  one: 'Einmalige Abgänge und Zugänge der letzten 15 Minuten. Sie zählen nicht in Erzeugt, Verbraucht und Netto.'
};
const sw = { tab: null, col: 'item', dir: 1, item: null };

function statsHTML() {
  const isls = kontorIslands(game);
  if (sw.tab == null || (sw.tab !== 'all' && sw.tab !== 'strom' && sw.tab !== 'coins' && !isls.includes(sw.tab))) sw.tab = 'all';
  let h = `<div class="seg stabs">${isls.map(k => `<button class="segb${sw.tab === k ? ' on' : ''}" data-stab="${k}">${img(flagSpr(flagOf(game, k)), 1)}${esc(islLabel(k))}</button>`).join('')}<button class="segb${sw.tab === 'all' ? ' on' : ''}" data-stab="all">Alle Inseln</button><button class="segb${sw.tab === 'strom' ? ' on' : ''}" data-stab="strom">${img(SPR.icon.bolt, 2)}Strom</button><button class="segb${sw.tab === 'coins' ? ' on' : ''}" data-stab="coins">${img(SPR.icon.coin, 2)}Münzen</button></div>`;
  if (sw.tab === 'strom') return h + powerHTML();
  if (sw.tab === 'coins') return h + coinsHTML();
  const k = sw.tab === 'all' ? -1 : sw.tab, R = ratesFor(k), O = oneOffFor(k);
  const rows = ITEM_ORDER.concat(FLUID_ORDER).map((it, i) => {
    const r = R[it], p = r ? r.p : 0, c = r ? r.c : 0, s = sollIst(k, it), o = O[it];
    return { it, i, st: stockOf(k, it), p, c, n: p - c, m: r ? r.m : 0, soll: s.has ? s.soll : 0, ist: s.ist, low: s.low, hasSoll: s.has, o: o ? o.p - o.c : 0, act: active(r) || s.has || !!o };
  }).filter(r => r.st > 0 || r.act);
  const key = sw.col === 'item' ? 'i' : sw.col;
  rows.sort((a, b) => (a[key] - b[key]) * sw.dir || a.i - b.i);
  if (sw.item && !rows.some(r => r.it === sw.item)) sw.item = null;
  h += `<table class="stbl"><thead><tr>${COLS.map(c => `<th data-sort="${c.id}" class="${c.id === 'item' ? 'l' : ''}${sw.col === c.id ? ' sorted' : ''}" ${TH_TIP[c.id] ? `data-tip="th:${c.id}"` : ''}>${c.name}${c.id !== 'item' && c.id !== 'st' && c.id !== 'o' ? '<span class="xs"> /min</span>' : ''}${sw.col === c.id ? (sw.dir > 0 ? ' &#9652;' : ' &#9662;') : ''}</th>`).join('')}</tr></thead><tbody>`;
  h += rows.map(r => `<tr data-item="${r.it}" class="${sw.item === r.it ? 'on' : ''}"><td class="l"><span class="row">${img(SPR.item[r.it], 2)}${resName(r.it)}</span></td><td>${fmt(r.st)}</td><td class="pos">${fmtRate(r.p)}</td><td class="neg">${fmtRate(r.c)}</td><td class="${rateCls(r.n)}">${fmtRate(r.n, true)}</td><td>${fmtRate(r.m)}</td>`
    + `<td class="soll">${r.hasSoll ? fmtRate(r.soll, true) : '–'}</td><td class="${r.low ? 'warnc' : 'muted'}">${r.hasSoll ? fmtRate(r.ist, true) : '–'}</td><td class="muted">${r.o ? (r.o > 0 ? '+' : '&minus;') + fmt(Math.abs(r.o)) : '–'}</td></tr>`).join('');
  h += '</tbody></table>';
  if (!rows.length) h += '<div class="hint mt">Auf dieser Insel liegt noch nichts im Kontor und es wird nichts bewegt.</div>';
  if (sw.item) h += `<div class="card mt stdetail"><div class="row" style="margin-bottom:6px">${img(SPR.item[sw.item], 2)}<span class="pix" style="font-size:16px;font-weight:600">${resName(sw.item)}</span><span class="xs muted">${k >= 0 ? esc(islLabel(k)) : 'alle Inseln'}</span></div>
    <div class="stgrid"><div>${itemFacts(k, sw.item)}</div><div>${chartHTML()}</div></div>${breakdownHTML(R[sw.item])}</div>`;
  else if (rows.length) h += '<div class="xs muted mt">Zeile anklicken: Verlauf der letzten 15 Minuten und Aufschlüsselung.</div>';
  return h;
}
/* ---------- Reiter „Strom“: Erzeugung, Bedarf und Versorgung je Insel, Verlauf ---------- */
function powerHTML() {
  const isls = kontorIslands(game), F = game.state.flow, T = game.state.flowT;
  const last = (k) => { const h = powerHistory(F, T, k), n = h.g.length - 1; return { g: h.g[n], d: h.d[n], s: h.s[n], w: h.w[n] }; };
  const rows = isls.map(k => ({ k, ...last(k) })).filter(r => r.g > 0.01 || r.d > 0.01);
  let h = `<div class="xs muted" style="margin:6px 0">Strom pro Sekunde im laufenden Abschnitt (30 s). Erzeugt = gesamte Leistung der Kraftwerke, auch wenn Speicher und Batterien voll sind; der Überschuss wird verworfen. Unterversorgt: Verbraucher bekommen weniger, als sie brauchen.</div>`;
  if (!rows.length) return h + '<div class="hint mt">Noch kein Stromnetz. Baue eine Verbrennungsanlage und einen Strommast.</div>';
  h += `<table class="stbl"><thead><tr><th class="l">Insel</th><th>Erzeugt<span class="xs"> /s</span></th><th>Bedarf<span class="xs"> /s</span></th><th>Versorgt<span class="xs"> /s</span></th><th>Verworfen<span class="xs"> /s</span></th><th>Bilanz<span class="xs"> /s</span></th></tr></thead><tbody>`
    + rows.map(r => { const bal = r.g - r.d, bad = r.s < r.d - 0.05; return `<tr><td class="l"><span class="row">${img(flagSpr(flagOf(game, r.k)), 1)}${esc(islLabel(r.k))}</span></td><td>${fmtRate(r.g)}</td><td>${fmtRate(r.d)}</td><td class="${bad ? 'neg' : ''}">${fmtRate(r.s)}</td><td class="muted">${r.w > 0.01 ? fmtRate(r.w) : '–'}</td><td class="${bad ? 'neg' : rateCls(bal)}">${bad ? `Unterversorgt: &minus;${fmtRate(r.d - r.s)}` : fmtRate(bal, true)}</td></tr>`; }).join('')
    + '</tbody></table>';
  h += `<div class="card mt">${chartHTML()}</div>`;
  return h;
}
/* ---------- Reiter „Münzen“: Einnahmen und Ausgaben je Posten, Verlauf ---------- */
// Posten der Aufschlüsselung (Verkauf, Kauf, Funde, Leuchtturm zuerst, dann der Rest)
const COIN_MAIN = ['verkauf', 'kauf', 'funde', 'leuchtturm'];
function coinsHTML() {
  const st = game.state, S = coinSums(st.coinLog, st.time, 900), A = coinSums(st.coinLog, st.time, 1e9);
  const used = (k) => S.in[k] || S.out[k] || A.in[k] || A.out[k];
  const keys = COIN_MAIN.concat(Object.keys(COIN_SRC).filter(k => !COIN_MAIN.includes(k) && used(k)), [...new Set(Object.keys(A.in).concat(Object.keys(A.out)))].filter(k => k.includes(':')).sort());
  const cell = (v, sign) => v ? `<span class="${sign > 0 ? 'pos' : 'neg'}">${sign > 0 ? '+' : '&minus;'}${fmt(v)}</span>` : '<span class="muted">–</span>';
  let h = `<div class="row" style="gap:16px;margin:6px 0"><span class="pix" style="font-size:18px">${img(SPR.icon.coin, 2)} ${fmt(st.coins | 0)}</span><span class="xs muted">insgesamt verdient: ${fmt(st.coinsTotal | 0)}</span></div>`;
  h += `<table class="stbl"><thead><tr><th class="l">Posten</th><th>Einnahmen <span class="xs">15 min</span></th><th>Ausgaben <span class="xs">15 min</span></th><th>Einnahmen <span class="xs">${Math.round(COIN_LOG.every * COIN_LOG.len / 60)} min</span></th><th>Ausgaben <span class="xs">${Math.round(COIN_LOG.every * COIN_LOG.len / 60)} min</span></th></tr></thead><tbody>`
    + keys.map(k => `<tr><td class="l">${esc(coinSrcName(k))}</td><td>${cell(S.in[k], 1)}</td><td>${cell(S.out[k], -1)}</td><td>${cell(A.in[k], 1)}</td><td>${cell(A.out[k], -1)}</td></tr>`).join('')
    + `<tr><td class="l"><b>Summe</b></td><td>${cell(S.inSum, 1)}</td><td>${cell(S.outSum, -1)}</td><td>${cell(A.inSum, 1)}</td><td>${cell(A.outSum, -1)}</td></tr></tbody></table>`;
  h += `<div class="ctab mt"><div class="card"><div class="lbl">Einnahmen und Ausgaben je 30 s</div>${chartHTML().replace('</i>erzeugt', '</i>Einnahmen').replace('</i>verbraucht', '</i>Ausgaben')}</div><div class="card"><div class="lbl">Kontostand (${Math.round(COIN_LOG.every * COIN_LOG.len / 60)} min)</div>${balChartHTML()}</div></div>`;
  return h;
}
function balChartHTML() {
  return `<div class="chart"><div class="chart-top xs"><span class="lg"><i class="sw pos"></i>Kontostand</span><span class="grow"></span><span class="muted" data-bmax></span></div>
    <canvas class="px balcv" width="${CH_W}" height="${CH_H}"></canvas><div class="chart-ax xs muted"><span>&minus;${Math.round(COIN_LOG.every * COIN_LOG.len / 60)} min</span><span>jetzt</span></div></div>`;
}
function drawCoinCharts(root) {
  const st = game.state, L = st.coinLog || [], t0 = Math.floor(st.time / COIN_LOG.every) * COIN_LOG.every, n = 30, P = new Array(n).fill(0), C = new Array(n).fill(0);
  for (const b of L) {
    const i = n - 1 - Math.round((t0 - b.t) / COIN_LOG.every);
    if (i < 0 || i >= n) continue;
    for (const k in b.v) { if (b.v[k] > 0) P[i] += b.v[k]; else C[i] -= b.v[k]; }
  }
  const cv = root.querySelector('.chartcv');
  if (cv) paintBars(root, cv, P, C, '30 s');
  // Kontostand als Fläche
  const bc = root.querySelector('.balcv');
  if (!bc) return;
  const N = COIN_LOG.len, B = new Array(N).fill(null);
  for (const b of L) { const i = N - 1 - Math.round((t0 - b.t) / COIN_LOG.every); if (i >= 0 && i < N) B[i] = b.bal; }
  for (let i = 1; i < N; i++) if (B[i] == null && B[i - 1] != null) B[i] = B[i - 1];
  const ctx = bc.getContext('2d'), max = Math.max(10, ...B.map(v => v || 0)), top = Math.ceil(max / 100) * 100;
  ctx.fillStyle = '#f3e1b6'; ctx.fillRect(0, 0, CH_W, CH_H);
  ctx.fillStyle = '#e6cd96'; for (let x = 0; x < CH_W; x += 2) { ctx.fillRect(x, Math.round(CH_H / 2), 1, 1); ctx.fillRect(x, 0, 1, 1); }
  for (let x = 0; x < CH_W; x++) {
    const v = B[Math.min(N - 1, Math.floor(x / CH_W * N))];
    if (v == null) continue;
    const hh = Math.round(v / top * (CH_H - 2));
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, CH_H - 1 - hh, 1, hh); ctx.fillStyle = '#c8860e'; ctx.fillRect(x, CH_H - 1 - hh, 1, 1);
  }
  ctx.fillStyle = '#5c3a1b'; ctx.fillRect(0, CH_H - 1, CH_W, 1);
  const lab = root.querySelector('[data-bmax]');
  if (lab) lab.textContent = `max ${fmt(top)}`;
}
// Verlauf Strom (alle Inseln): grün erzeugt, rot Bedarf
function drawPowerChart(root) {
  const cv = root.querySelector('.chartcv');
  if (!cv) return;
  const h = powerHistory(game.state.flow, game.state.flowT, -1);
  paintBars(root, cv, h.g, h.d, 's');
}
registerWindow('stats', {
  title: 'Statistik', icon: 'chart',
  onOpen() { const k = curIsl(); sw.tab = kontorIslands(game).includes(k) ? k : 'all'; },
  render(body) {
    const changed = setHTML(body, statsHTML());
    if (sw.tab === 'strom') { if (changed || body._cv !== game.flowVer) { body._cv = game.flowVer; drawPowerChart(body); } return; }
    if (sw.tab === 'coins') { if (changed || body._cv !== game.flowVer) { body._cv = game.flowVer; drawCoinCharts(body); } return; }
    if (sw.item && (changed || body._cv !== game.flowVer)) { body._cv = game.flowVer; drawChart(body, sw.tab === 'all' ? -1 : sw.tab, sw.item); }
  },
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'stats') return;
      ui.uiPressed = false;
      const tb = e.target.closest('[data-stab]'), th = e.target.closest('[data-sort]'), tr = e.target.closest('tr[data-item]');
      if (tb) { const v = tb.dataset.stab; sw.tab = v === 'all' || v === 'strom' || v === 'coins' ? v : +v; sw.item = null; }
      else if (th) { const c = th.dataset.sort; if (sw.col === c) sw.dir = -sw.dir; else { sw.col = c; sw.dir = c === 'item' ? 1 : -1; } }
      else if (tr) sw.item = sw.item === tr.dataset.item ? null : tr.dataset.item;
      else return;
      this.render(body);
    });
  }
});
registerTip('th', (c) => TH_TIP[c] ? `<div class="xs">${TH_TIP[c]}</div>` : '');
