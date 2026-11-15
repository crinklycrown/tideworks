/* =========================================================
   MARKT (Taste K): Preise, nächste Händler, Handelsaufträge je Insel
   Liest nur den Spiegel. Preise und Händler-Termine kommen aus sim/trade.js (laufen auch auf dem Spiegel).
   Der Auftrags-Editor (ordersHTML) steht hier und im Info-Panel des Handelspostens; Klicks und Änderungen
   laufen in beiden über marketClick / marketChange (Attribut data-mk).
   Getrennte Inseln: Reiter „Spieler“ mit den eigenen Preislisten der Handelskontore (Editor plHTML, auch im Info-Panel,
   Attribut data-pl) und den Preislisten der Mitspieler, soweit aufgedeckt (Insel, Entfernung, verfügbare Menge).
   ========================================================= */
import { ITEMS, isPlan } from '../data/items.js';
import { TRADERS, TRADER_ORDER, MAX_TRADE_ORDERS, MARKET } from '../data/trade.js';
import { buyPrice, sellPrice, buyersOf, sellersOf, posts, traderActive, TRADE_GOODS } from '../sim/trade.js';
import { invOf, flagOf, isSep, mine, ownerOf, playerName, homeIsl, islName } from '../sim/state.js';
import { PLAYER_TRADE } from '../data/trade.js';
import { kontorKind } from '../sim/kontor.js';
import { buyable, sellable } from '../sim/ptrade.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR, flagSpr } from '../gfx/sprites.js';
import { esc, fmt, pad } from '../util/format.js';
import { game, ui, send, saveGame, afterSync } from './context.js';
import { setHTML, curIsl, islLabel } from './common.js';
import { registerWindow, renderWindow } from './windows.js';
import { registerTip } from './tooltip.js';
import { renderInsights } from './insights.js';
import { centerOnTile } from '../gfx/camera.js';

const mw = { isl: null, sort: 'name', view: 'npc' };
const draft = { kind: 'sell', it: 'holz' };

export const coinsHTML = (n, scale = 1) => `<span class="coinv">${img(SPR.icon.coin, scale)}${fmt(n)}</span>`;
const price = (v) => (v >= 100 ? fmt(Math.round(v)) : (Math.round(v * 10) / 10).toLocaleString('de-DE'));
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.floor(Math.max(0, s) % 60))}`;
const traderIcon = (kind) => img(SPR.trader[kind] || SPR.trader.hafen, 1);

/* ---------- Händler-Termine ---------- */
// Je Insel mit Handelsposten und Händlerart: { kind, isl, txt, t (s bis Ankunft, für die Sortierung) }
export function arrivals() {
  const st = game.state, T = st.trade || { due: {}, list: [] }, out = [];
  for (const b of ownPosts()) for (const kind of TRADER_ORDER) {
    const tr = T.list.find(t => t.kind === kind && t.isl === b.isl);
    let txt, t;
    if (!traderActive(game, kind)) { txt = `erst mit Kontor ab Ring ${TRADERS[kind].needRing}`; t = 1e9; }
    else if (tr) { t = 0; txt = tr.st === 'dock' ? `liegt an (${Math.ceil(tr.tm)} s)` : tr.st === 'in' ? 'segelt heran' : 'fährt weiter'; }
    else { const d = T.due[kind + ':' + b.isl]; t = d != null ? d - st.time : TRADERS[kind].first; txt = `in ${mmss(t)}`; }
    out.push({ kind, isl: b.isl, txt, t, tr });
  }
  return out;
}

// Getrennte Inseln: nur die eigenen Handelsposten
const ownPosts = () => posts(game).filter(b => mine(game, b));

/* ---------- Preislisten zwischen Spielern (Handelskontor) ---------- */
const plItems = (sel) => Object.keys(ITEMS).map(it => `<option value="${it}" ${it === sel ? 'selected' : ''}>${ITEMS[it].name}</option>`).join('');
const npcHint = (it) => { const b = buyPrice(game, it), s = sellPrice(game, it); return b || s ? `Händler: Ankauf ${b ? price(b) : '–'} / Verkauf ${s ? price(s) : '–'}` : 'Händler handeln diese Ware nicht'; };
// Editor der eigenen Preisliste (Info-Panel und Markt): Verkauf an Partner (Bestand behalten), Ankauf von Partnern (bis Bestand)
export function plHTML(b) {
  const pl = b.pl || { sell: [], buy: [] }, inv = b.inv || {};
  const rows = (kind) => (pl[kind] || []).map((o, i) => `<div class="tord ${kind === 'sell' ? 'sell' : 'buy'}">
      <div class="row"><span class="tkind">${kind === 'sell' ? 'Verkauf an Partner' : 'Ankauf von Partnern'}</span>${img(SPR.item[o.it], 2)}<select class="inp sel" data-pl="set" data-k="${kind}" data-i="${i}" data-f="it">${plItems(o.it)}</select>
        <span class="grow"></span><button class="xbtn" data-pl="del" data-k="${kind}" data-i="${i}" title="Zeile löschen">&times;</button></div>
      <div class="row tord2"><span class="xs">Preis</span><input class="inp num" type="number" min="0" max="${PLAYER_TRADE.maxPrice}" step="0.5" data-pl="set" data-k="${kind}" data-i="${i}" data-f="p" value="${o.p}" style="width:62px">
        <span class="xs">${kind === 'sell' ? 'Bestand behalten' : 'bis Bestand'}</span><input class="inp num" type="number" min="0" step="10" data-pl="set" data-k="${kind}" data-i="${i}" data-f="${kind === 'sell' ? 'keep' : 'upto'}" value="${kind === 'sell' ? o.keep : o.upto}" style="width:62px"></div>
      <div class="xs muted">Bestand ${fmt(Math.floor(inv[o.it] || 0))} &middot; ${npcHint(o.it)}</div></div>`).join('');
  const full = (k) => (pl[k] || []).length >= PLAYER_TRADE.lines;
  return `<div class="torders" data-plb="${b.id}">${rows('sell')}${rows('buy')}${!(pl.sell || []).length && !(pl.buy || []).length ? '<div class="xs muted">Noch keine Preisliste. Schiffe deiner Mitspieler kaufen und verkaufen hier nur, was eingetragen ist &ndash; ohne Rückfrage.</div>' : ''}
    <div class="row tadd"><button class="btn btn-green btn-sm" data-pl="add" data-k="sell" ${full('sell') ? 'disabled' : ''}>+ Verkauf</button><button class="btn btn-green btn-sm" data-pl="add" data-k="buy" ${full('buy') ? 'disabled' : ''}>+ Ankauf</button></div></div>`;
}
// Preisliste eines fremden Handelskontors (nur lesen): Preis und verfügbare Menge je Zeile
export function plViewHTML(b) {
  const pl = b.pl;
  if (!pl || (!pl.sell.length && !pl.buy.length)) return '<div class="xs muted">Keine Preisliste: Hier wird nicht gehandelt.</div>';
  const line = (o, kind) => {
    const n = kind === 'sell' ? buyable(game, b, o.it) : sellable(game, b, o.it);
    return `<div class="stat"><span class="row">${img(SPR.item[o.it], 2)}${ITEMS[o.it].name}</span><b class="xs">${kind === 'sell' ? 'kaufen' : 'verkaufen'} zu ${img(SPR.icon.coin, 1)}${price(o.p)} &middot; ${n === Infinity ? '' : `${fmt(n)} Stück`}</b></div>`;
  };
  return (pl.sell.length ? `<div class="lbl">Du kannst kaufen</div>${pl.sell.map(o => line(o, 'sell')).join('')}` : '')
    + (pl.buy.length ? `<div class="lbl" style="margin-top:6px">Du kannst verkaufen</div>${pl.buy.map(o => line(o, 'buy')).join('')}` : '')
    + '<div class="xs muted" style="margin-top:4px">Laden = kaufen (du zahlst), Entladen = verkaufen (der Besitzer zahlt). Per Route oder am Anleger im Schiffs-Panel.</div>';
}
function plSend(b, pl) { send({ type: 'setPrices', id: b.id, pl }); after(); }
const plCopy = (b) => { const p = b.pl || { sell: [], buy: [] }; return { sell: (p.sell || []).map(o => Object.assign({}, o)), buy: (p.buy || []).map(o => Object.assign({}, o)) }; };
function plBld(el) { const c = el.closest('[data-plb]'); const b = c && game.blds.get(+c.dataset.plb); return b && b.t === 'handelskontor' && mine(game, b) ? b : null; }
function plClick(a) {
  const b = plBld(a);
  if (!b) return;
  const pl = plCopy(b), k = a.dataset.k;
  if (a.dataset.pl === 'add') { const used = new Set(pl[k].map(o => o.it)), it = Object.keys(ITEMS).find(x => !used.has(x)) || 'holz', base = Math.round((sellPrice(game, it) || 5) * 10) / 10; pl[k].push(k === 'sell' ? { it, p: base, keep: 0 } : { it, p: base, upto: 100 }); }
  else if (a.dataset.pl === 'del') pl[k].splice(+a.dataset.i, 1);
  else return;
  plSend(b, pl);
}
function plChange(a) {
  const b = plBld(a);
  if (!b) return;
  const pl = plCopy(b), o = pl[a.dataset.k][+a.dataset.i], f = a.dataset.f;
  if (!o) return;
  o[f] = f === 'it' ? a.value : Math.max(0, +a.value || 0);
  a.blur(); plSend(b, pl);
}
// Reiter „Spieler“: eigene Preislisten und die der Mitspieler (aufgedeckt), mit Insel und Entfernung zur Heimatinsel
function playersHTML() {
  const mineL = [...game.blds.values()].filter(b => b.t === 'handelskontor' && mine(game, b)), H = game.W.island(homeIsl(game));
  const other = [...game.blds.values()].filter(b => b.t === 'handelskontor' && !mine(game, b) && b.pl && (b.pl.sell.length || b.pl.buy.length));
  let h = `<div class="lbl">Deine Preislisten</div>`;
  h += mineL.length ? mineL.map(b => `<div class="xs" style="margin-top:6px"><b>${esc(islName(game, b.isl))} &middot; ${kontorKind(game, b)}</b></div>${plHTML(b)}`).join('')
    : '<div class="xs muted">Baue ein Handelskontor (Schifffahrt), um Mitspielern Waren anzubieten oder abzukaufen.</div>';
  h += `<div class="lbl mt">Angebote der Mitspieler</div>`;
  h += other.length ? other.map(b => {
    const P = game.state.players[ownerOf(b)] || {}, d = H ? Math.round(Math.hypot(b.x - (H.x0 + H.w / 2), b.y - (H.y0 + H.h / 2))) : 0;
    return `<div class="mplr"><div class="row"><span class="lsw" style="background:${esc(P.color || '#fff')}"></span><b class="grow">${esc(playerName(game, ownerOf(b)))} &middot; ${esc(islName(game, b.isl))}</b><span class="xs muted">${fmt(d)} Felder</span><button class="lnk" data-mloc="${b.id}">Zeigen</button></div>${plViewHTML(b)}</div>`;
  }).join('') : '<div class="xs muted">Noch keine Preislisten von Mitspielern in Sicht. Erkunde ihre Inseln mit Schiffen.</div>';
  return h;
}

/* ---------- Auftrags-Editor ---------- */
const goodOptions = (sel, sell) => TRADE_GOODS.filter(it => !(sell && isPlan(it))).map(it => `<option value="${it}" ${it === sel ? 'selected' : ''}>${ITEMS[it].name}</option>`).join('');
// Wer handelt die Ware in diese Richtung? (Warnung, wenn niemand)
function whoText(o) {
  const who = o.kind === 'sell' ? buyersOf(o.it) : sellersOf(o.it);
  return who.length ? who.map(k => TRADERS[k].name).join(', ') : null;
}
export function ordersHTML(k) {
  const L = (game.state.orders || {})[k] || [], inv = invOf(game, k);
  let h = L.length ? '' : '<div class="xs muted">Noch keine Aufträge. Händler handeln nur, was hier eingetragen ist.</div>';
  h += L.map((o, i) => {
    const sell = o.kind === 'sell', who = whoText(o), p = sell ? buyPrice(game, o.it) : sellPrice(game, o.it);
    const off = o.lim != null && (sell ? p < o.lim : p > o.lim);
    return `<div class="tord${sell ? ' sell' : ' buy'}">
      <div class="row"><span class="tkind">${sell ? 'Verkaufen' : 'Kaufen'}</span>${img(SPR.item[o.it], 2)}<select class="inp sel" data-mk="set" data-oid="${o.id}" data-f="it">${goodOptions(o.it, sell)}</select>
        <span class="grow"></span>${i ? `<button class="xbtn" data-mk="up" data-oid="${o.id}" title="Nach oben (wird zuerst ausgeführt)">&#9652;</button>` : ''}<button class="xbtn" data-mk="del" data-oid="${o.id}" title="Auftrag löschen">&times;</button></div>
      <div class="row tord2"><span class="xs">${sell ? 'über Bestand' : 'bis Bestand'}</span><input class="inp num" type="number" min="0" step="10" data-mk="set" data-oid="${o.id}" data-f="n" value="${o.n}" style="width:68px">
        <span class="xs">${sell ? 'Mindestpreis' : 'Höchstpreis'}</span><input class="inp num" type="number" min="0" step="0.5" placeholder="–" data-mk="set" data-oid="${o.id}" data-f="lim" value="${o.lim != null ? o.lim : ''}" style="width:58px"></div>
      <div class="xs ${off || !who ? 'warnc' : 'muted'}">Bestand ${fmt(Math.floor(inv[o.it] || 0))} &middot; Preis jetzt ${img(SPR.icon.coin, 1)}${price(p)}${off ? ` &middot; ${sell ? 'unter Mindestpreis' : 'über Höchstpreis'}` : ''} &middot; ${who ? esc(who) : (sell ? 'kein Händler kauft diese Ware' : 'kein Händler verkauft diese Ware')}</div>
    </div>`;
  }).join('');
  if (L.length < MAX_TRADE_ORDERS) {
    const sell = draft.kind === 'sell';
    if (sell && isPlan(draft.it)) draft.it = 'holz';
    h += `<div class="row tadd"><div class="seg"><button class="segb${sell ? ' on' : ''}" data-mk="dk" data-v="sell">Verkaufen</button><button class="segb${!sell ? ' on' : ''}" data-mk="dk" data-v="buy">Kaufen</button></div>
      <select class="inp sel" data-mk="dit">${goodOptions(draft.it, sell)}</select><button class="btn btn-green btn-sm" data-mk="add" data-isl="${k}">+ Auftrag</button></div>`;
  }
  return `<div class="torders" data-isl="${k}">${h}</div>`;
}
function islOf(el) { const c = el.closest('[data-isl]'); return c ? +c.dataset.isl : null; }
function after() { saveGame(); afterSync(() => { renderWindow(true); renderInsights(); }); }
// Klicks im Editor (Markt-Fenster und Info-Panel); true = verbraucht
export function marketClick(e) {
  const pa = e.target.closest('[data-pl]');
  if (pa) { if (pa.tagName !== 'SELECT' && pa.tagName !== 'INPUT' && !pa.disabled) plClick(pa); return true; }
  const a = e.target.closest('[data-mk]');
  if (!a || a.tagName === 'SELECT' || a.tagName === 'INPUT') return !!a;
  const k = islOf(a), act = a.dataset.mk;
  if (act === 'dk') { draft.kind = a.dataset.v; renderWindow(true); renderInsights(); return true; }
  if (k == null) return true;
  if (act === 'add') send({ type: 'tradeOrder', isl: k, op: 'add', o: { kind: draft.kind, it: draft.it, n: draft.kind === 'sell' ? 200 : 50, lim: null } });
  else if (act === 'del') send({ type: 'tradeOrder', isl: k, op: 'del', oid: +a.dataset.oid });
  else if (act === 'up') send({ type: 'tradeOrder', isl: k, op: 'up', oid: +a.dataset.oid });
  else return true;
  after();
  return true;
}
export function marketChange(e) {
  const pa = e.target.closest('[data-pl]');
  if (pa) { plChange(pa); return true; }
  const a = e.target.closest('[data-mk]');
  if (!a) return false;
  if (a.dataset.mk === 'dit') { draft.it = a.value; return true; }
  if (a.dataset.mk !== 'set') return false;
  const k = islOf(a), f = a.dataset.f;
  if (k == null) return true;
  const v = f === 'it' ? a.value : f === 'lim' ? (a.value === '' ? null : +a.value) : Math.max(0, Math.floor(+a.value) || 0);
  send({ type: 'tradeOrder', isl: k, op: 'set', oid: +a.dataset.oid, o: { [f]: v } });
  a.blur(); after();
  return true;
}

/* ---------- Preisliste ---------- */
// Mini-Verlauf als SVG (Ankauf grün, Verkauf orange), Trend aus der Probe von vor ~2,5 min
function spark(h) {
  if (!h || h.length < 2) return '<span class="xs muted">–</span>';
  const W = 64, H = 16, max = Math.max(...h.map(x => x[1])), min = Math.min(...h.map(x => x[0]));
  const y = (v) => (H - 1 - (v - min) / Math.max(0.01, max - min) * (H - 2)).toFixed(1);
  const line = (i) => h.map((p, j) => `${(j / (h.length - 1) * (W - 1)).toFixed(1)},${y(p[i])}`).join(' ');
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${line(1)}" fill="none" stroke="#e8964a" stroke-width="1.2"/><polyline points="${line(0)}" fill="none" stroke="#5aa83a" stroke-width="1.2"/></svg>`;
}
function trend(h, i, now) {
  if (!h || h.length < 2) return '';
  const old = h[Math.max(0, h.length - 6)][i], d = now - old;
  if (Math.abs(d) < Math.max(0.05, old * 0.01)) return '<span class="tr0">&ndash;</span>';
  return d > 0 ? '<span class="trup">&#9650;</span>' : '<span class="trdn">&#9660;</span>';
}
function priceTable(k) {
  const H = (game.state.market && game.state.market.h) || {}, inv = k != null ? invOf(game, k) : {};
  const rows = TRADE_GOODS.map((it, i) => ({ it, i, b: buyPrice(game, it), s: sellPrice(game, it), by: buyersOf(it), sl: sellersOf(it) }));
  if (mw.sort === 'b') rows.sort((a, b) => b.b - a.b); else if (mw.sort === 's') rows.sort((a, b) => b.s - a.s);
  return `<table class="stbl mtbl"><thead><tr><th class="l" data-msort="name">Ware</th><th data-msort="b" data-tip="mk:b">Ankauf</th><th data-msort="s" data-tip="mk:s">Verkauf</th><th data-tip="mk:h">Verlauf</th><th>Händler</th>${k != null ? '<th>Bestand</th>' : ''}</tr></thead><tbody>`
    + rows.map(r => `<tr><td class="l"><span class="row">${img(SPR.item[r.it], 2)}${ITEMS[r.it].name}</span></td>
      <td>${r.b ? `${price(r.b)} ${trend(H[r.it], 0, r.b)}` : '<span class="muted xs">nur Kauf</span>'}</td><td>${price(r.s)} ${trend(H[r.it], 1, r.s)}</td><td>${spark(H[r.it])}</td>
      <td class="xs">${TRADER_ORDER.filter(t => r.by.includes(t) || r.sl.includes(t)).map(traderIcon).join('') || '<span class="muted">–</span>'}</td>${k != null ? `<td>${fmt(Math.floor(inv[r.it] || 0))}</td>` : ''}</tr>`).join('')
    + '</tbody></table>';
}

/* ---------- Fenster ---------- */
function marketHTML() {
  const sep = isSep(game);
  if (!sep) mw.view = 'npc';
  const tabs = sep ? `<div class="seg seg2 stabs"><button class="segb${mw.view === 'npc' ? ' on' : ''}" data-mview="npc">Händler</button><button class="segb${mw.view === 'pl' ? ' on' : ''}" data-mview="pl">Spieler</button></div>` : '';
  if (mw.view === 'pl') return `<div class="row mkhead"><span class="pix" style="font-size:18px">${coinsHTML(game.state.coins | 0, 2)}</span><span class="xs muted grow">Handel zwischen Spielern: Preislisten der Handelskontore. Münzen gehen direkt vom Käufer zum Verkäufer.</span></div>${tabs}${playersHTML()}`;
  const P = ownPosts(), isls = [...new Set(P.map(b => b.isl))];
  if (mw.isl == null || !isls.includes(mw.isl)) mw.isl = isls.includes(curIsl()) ? curIsl() : isls[0] != null ? isls[0] : null;
  const k = mw.isl, st = game.state;
  let h = `<div class="row mkhead"><span class="pix" style="font-size:18px">${coinsHTML(st.coins | 0, 2)}</span><span class="xs muted grow">Händler kaufen zu 100 % und verkaufen zu 140 % des Grundpreises. Jeder Verkauf drückt den Ankaufpreis, jeder Kauf hebt den Verkaufspreis; beides erholt sich mit ${MARKET.recover * 100} % je Minute.</span></div>${tabs}`;
  if (!P.length) h += `<div class="hint mt">Noch kein Handelsposten. Erforsche <b>Handel</b> und baue einen Handelsposten (3×3, Schifffahrt) an die Küste einer Insel mit Kontor. Dann kommen Händler vorbei.</div>`;
  else {
    const A = arrivals();
    h += `<div class="lbl">Nächste Händler</div><div class="marr">${A.map(a => `<div class="row"><span>${traderIcon(a.kind)}</span><span class="grow">${TRADERS[a.kind].name} &middot; ${img(flagSpr(flagOf(game, a.isl)), 1)}${esc(islLabel(a.isl))}</span><b class="xs">${a.txt}</b></div>`
      + (a.tr && a.tr.offer ? `<div class="xs muted moff">Angebot: ${a.tr.offer.map(o => `${img(SPR.item[o.it], 1)}${o.n} ${ITEMS[o.it].name}`).join(', ')}</div>` : '')).join('')}</div>`;
    h += `<div class="seg stabs mt">${isls.map(i => `<button class="segb${i === k ? ' on' : ''}" data-mtab="${i}">${img(flagSpr(flagOf(game, i)), 1)}${esc(islLabel(i))}</button>`).join('')}</div>`;
    h += `<div class="lbl">Handelsaufträge ${esc(islLabel(k))}</div>${ordersHTML(k)}`;
  }
  h += `<div class="lbl mt">Preise</div>` + priceTable(P.length ? k : null);
  return h;
}
registerWindow('market', {
  title: 'Markt', icon: 'coin', side: true,
  render(body) { setHTML(body, marketHTML()); },
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'market') return;
      ui.uiPressed = false;
      const t = e.target.closest('[data-mtab]'), s = e.target.closest('[data-msort]'), v = e.target.closest('[data-mview]'), loc = e.target.closest('[data-mloc]');
      if (v) { mw.view = v.dataset.mview; this.render(body); return; }
      if (loc) { const b = game.blds.get(+loc.dataset.mloc); if (b) { centerOnTile(b.x, b.y); ui.selected = b.id; renderInsights(); } return; }
      if (t) { mw.isl = +t.dataset.mtab; this.render(body); return; }
      if (s) { mw.sort = s.dataset.msort; this.render(body); return; }
      marketClick(e);
    });
    body.addEventListener('change', e => { if (ui.win === 'market') marketChange(e); });
  }
});
registerTip('mk', (c) => `<div class="xs">${c === 'b' ? 'Ankauf: was ein Händler dir je Stück zahlt (du verkaufst). Pläne kaufen Händler nicht.' : c === 's' ? 'Verkauf: was du je Stück zahlst (du kaufst).' : 'Verlauf der letzten 20 Minuten: grün Ankauf, orange Verkauf.'}</div>`);

/* ---------- Info-Panel des Handelspostens ---------- */
export function handelInfoHTML(b) {
  const A = arrivals().filter(a => a.isl === b.isl);
  return `<div class="lbl">Nächste Händler</div>` + A.map(a => `<div class="stat"><span class="row">${traderIcon(a.kind)}${TRADERS[a.kind].name}</span><b class="xs">${a.txt}</b></div>`).join('')
    + `<div class="lbl" style="margin-top:6px">Handelsaufträge</div>${ordersHTML(b.isl)}<div class="xs muted" style="margin-top:4px">Alle Preise und Verläufe im Fenster „Markt“ (M).</div>`;
}
