/* =========================================================
   INFO-PANEL links unten (nur bei Auswahl) + BAU-HINWEIS oben mittig
   ========================================================= */
import { MAP_COAST_SHARE, GROUND_NAME, G_ROCK, G_MOUNT, G_LAVA, DIR_NAME, WIRE_RANGE, POLE_LINKS } from '../config.js';
import { SHIP_KINDS, SHIP_ORDER } from '../data/ships.js';
import { IST_WARN } from '../data/stats.js';
import { stockRead, storeCap, kontorKind, isStore } from '../sim/kontor.js';
import { bldRates } from '../sim/soll.js';
import { BD, PRODUCERS, HOUSE, DRILL, PIPE, GENS, UPGRADE_TO, HQ, STEG, CONVEY, FLAT, BELT_BRIDGE } from '../data/buildings.js';
import { ITEMS, ITEM_ORDER, ORES, resName } from '../data/items.js';
import { RECIPES_OF, OUT_CAP, OPT_BOOST, recipePower, recipeOf, inCap, recipeMain, fluidCap } from '../data/recipes.js';
import { DRILLS, SAW } from '../data/mining.js';
import { FLUIDS, PIPES, PIPE_BY_TIER, PUMPS, KRAFTWERK, GEOTHERMIE, ACID, FLUID_BUF } from '../data/fluids.js';
import { mods, rateOf, storeOf, descOf, powerOf } from '../sim/mods.js';
import { pipeNets, netAt, pumpRate, fluidPorts, isFluidB } from '../sim/fluids.js';
import { ISL_TYPES, RINGS } from '../data/islands.js';
import { lockHint } from '../data/unlocks.js';
import { tkx, tky } from '../util/tiles.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR, shipSprite, bIcon, kontorSpr } from '../gfx/sprites.js';
import { ghostPos, upgradeTarget } from '../gfx/renderer.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { placeHint, selectHint } from './blueprints.js';
import { clamp } from '../util/math.js';
import { fmt, fmt1 } from '../util/format.js';
import { capOf, afford, invOf, islName, flagOf, isSep, mine, ownerOf, playerName, isUnlocked } from '../sim/state.js';
import { checkPlace, ringTiles, drillInfo, drillRate, waterAround, lavaUnder, oilUnder, upgradeInfo, bridgeIn, bridgeOut, bAt } from '../sim/buildings.js';
import { outputsOf, beltShape, extractInfo, beltObstacle, crossable } from '../sim/logistics.js';
import { isPowered, netOf, netStored, netCap, linkCount, netSummary } from '../sim/power.js';
import { game, ui, $, send } from './context.js';
import { uiBusy, costText, itemOptions, setHTML, mapText } from './common.js';
import { esc } from '../util/format.js';
import { WONDER, WONDER_LOCKED } from '../data/wonder.js';
import { traderInfo, npcName, npcOfPid } from '../data/npcs.js';
import { npcGone, endingOf } from '../sim/ending.js';
import { npcSprite } from '../gfx/sprites/npc.js';
import { npcPort, shipAtPort } from '../sim/villages.js';
import { npcOf, npcKnown, lvlOf } from '../sim/npc.js';
import { lvlName } from './npcs.js';
import { DRONES, DKISTE } from '../data/drones.js';
import { wonderReason, wonderFull, wonderShare, stageOpen } from '../sim/wonder.js';
import { werftBellHTML, shipDiveHTML } from './dive.js';
import { requests, flying, inReach } from '../sim/drones.js';
import { repairCost } from '../sim/events.js';
import { handelInfoHTML, plHTML, plViewHTML } from './market.js';
import { selShip, shipStatus, shipSpr, kindName, autoHTML, holdsHTML, foundHTML, resumeHTML, pickHTML, portHTML } from './ships.js';
import { pedestalHTML } from './relics.js';
/* ---------- Speicher (Hauptkontor, Lagerkiste, Handelskontor) ---------- */
// Bestand mit Symbol, Menge und Füllstand je Ware
function stockHTML(b) {
  const inv = stockRead(game, b), cap = storeCap(game, b);
  const its = ITEM_ORDER.filter(it => Math.floor(inv[it] || 0) > 0);
  const tot = its.reduce((a, it) => a + Math.floor(inv[it]), 0);
  let h = `<div class="stat"><span>Platz je Ware</span><b>${fmt(cap)}</b></div><div class="stat"><span>Gesamt</span><b>${fmt(tot)} Items, ${its.length} Ware${its.length === 1 ? '' : 'n'}</b></div>`;
  if (HQ.has(b.t)) return h;
  h += `<div class="lbl" style="margin-top:6px">Bestand</div>` + (its.length ? its.map(it => {
    const n = Math.floor(inv[it]), f = cap ? Math.min(1, n / cap) : 0;
    return `<div class="stockrow">${img(SPR.item[it], 2)}<span class="nm">${ITEMS[it].name}<span class="minibar"><span class="${f >= 1 ? 'full' : ''}" style="width:${f * 100}%"></span></span></span><b class="num">${fmt(n)} / ${fmt(cap)}</b></div>`;
  }).join('') : '<div class="xs muted">leer</div>');
  return h;
}
// Anteil des Bestands, der beim Abriss verloren ginge (Hauptkontor voll): { moved, lost, total }
export function stashPreview(b) {
  const inv = stockRead(game, b), H = game.KONT[b.isl], to = invOf(game, b.isl), cap = H ? storeCap(game, H) : 0;
  let moved = 0, lost = 0;
  for (const it in inv) { const n = Math.floor(inv[it] || 0); if (n <= 0) continue; const m = Math.max(0, Math.min(n, Math.floor(cap - (to[it] || 0)))); moved += m; lost += n - m; }
  return { moved, lost, total: moved + lost };
}
// Ware wählen (Extraktor, Tor-Automatik): Symbol-Raster; any = „beliebig“ anbieten
function itemPicker(act, sel, any) {
  const its = (any ? [''] : []).concat(ITEM_ORDER);
  return `<div class="picker">${its.map(it => `<button class="itb${it === sel ? ' on' : ''}" data-act="${act}" data-v="${it}" title="${it ? ITEMS[it].name : 'Beliebig (reihum)'}">${it ? img(SPR.item[it], 2) : '<span class="allw">alle</span>'}</button>`).join('')}</div>`;
}
const beltButtons = (b) => `<div class="btns"><button class="btn btn-paper btn-sm" data-act="clear" data-line="0">Feld leeren</button><button class="btn btn-paper btn-sm" data-act="clear" data-line="1">Strecke leeren</button></div>`;
// Durchsatz der letzten 60 s (nur das ausgewählte Gebäude wird gezählt) gegen die Soll-Leistung
function throughputHTML(b) {
  const io = game.insp && game.insp.id === b.id ? game.insp : null;
  const soll = bldRates(game, b).rates, its = new Set(Object.keys(soll));
  if (io) { Object.keys(io.in).forEach(it => its.add(it)); Object.keys(io.out).forEach(it => its.add(it)); }
  if (!its.size) return '';
  const row = (it) => {
    const s = soll[it] || 0, ist = io ? (s < 0 ? (io.in[it] || 0) : (io.out[it] || io.in[it] || 0)) : null;
    const low = ist != null && s && Math.abs(ist) < Math.abs(s) * (1 - IST_WARN);
    return `<div class="stat"><span class="row">${img(SPR.item[it], 1)}${resName(it)}</span><b class="num"><span class="${s < 0 ? 'neg' : 'pos'}">${s < 0 ? '&minus;' : '+'}${fmt1(Math.abs(s))}</span> <span class="xs ${low ? 'warnc' : 'muted'}">Ist ${ist == null ? '–' : fmt1(Math.abs(ist))}</span></b></div>`;
  };
  return `<div class="lbl" style="margin-top:8px">Durchsatz pro Minute <span class="xs muted" style="text-transform:none;letter-spacing:0">Soll &middot; Ist (letzte ${io ? Math.round(Math.min(60, io.span)) : 60} s)</span></div>` + [...its].map(row).join('');
}
// Band, Splitter, Überlauf: gemessener Durchsatz gegen das Höchsttempo, Waren darauf
function beltFlowHTML(b) {
  const io = game.insp && game.insp.id === b.id ? game.insp : null, max = (b.t === 'extraktor' ? extractInfo(game, b).rate : BD[b.t].speed || BD.band.speed) * 60;
  const tot = io ? Object.values(io.out).reduce((a, n) => a + n, 0) : 0;
  return `<div class="stat"><span>Durchsatz</span><b class="num">${io ? fmt1(tot) : '–'} / max. ${fmt(max)} Items/min</b></div>`
    + (io && Object.keys(io.out).length ? `<div class="stat"><span>Waren</span><b class="row" style="gap:4px">${Object.entries(io.out).sort((a, c) => c[1] - a[1]).map(([it, n]) => `<span class="row" title="${resName(it)}">${img(SPR.item[it], 1)}${fmt1(n)}</span>`).join('')}</b></div>` : '');
}
function torHTML(b) {
  const A = b.ga;
  let h = statusLine(!b.cl, b.cl ? 'Geschlossen &ndash; Waren stauen sich davor' : 'Offen') + `<div class="stat"><span>Inhalt</span><b>${b.it ? ITEMS[b.it].name : 'leer'}</b></div>`
    + `<button class="btn ${b.cl ? 'btn-green' : 'btn-red'} btn-sm btn-block" data-act="gate">${b.cl ? 'Öffnen' : 'Schließen'} (G)</button>`
    + `<label class="chk" style="margin-top:8px"><input type="checkbox" data-act="gateAutoOn" ${A ? 'checked' : ''}> Automatik nach Inselinventar</label>`;
  if (A) {
    const n = Math.floor(invOf(game, b.isl)[A.it] || 0);
    h += `<div class="xs" style="margin:4px 0">Ware: <b>${ITEMS[A.it].name}</b> &middot; im Inventar ${fmt(n)}</div>${itemPicker('gateIt', A.it, false)}
      <div class="row" style="gap:6px;margin-top:6px"><span class="xs">schließen ab</span><input class="inp num" type="number" min="1" step="10" data-act="gateHi" value="${A.hi}" style="width:70px"><span class="xs">öffnen unter</span><input class="inp num" type="number" min="0" step="10" data-act="gateLo" value="${A.lo}" style="width:70px"></div>`;
  }
  return h;
}
function sorterHTML(b) {
  const so = b.so || {}, it = so.it && ITEMS[so.it] ? so.it : '';
  const name = it ? ITEMS[it].name : 'keine Ware gewählt';
  let h = `<div class="stat"><span>Inhalt</span><b>${b.it ? ITEMS[b.it].name : 'leer'}</b></div>`
    + `<div class="stat"><span>Gewählte Ware</span><b class="row">${it ? img(SPR.item[it], 1) : ''}${name}</b></div>`
    + `<label class="chk" style="margin-top:4px"><input type="checkbox" data-act="sortRv" ${so.rv ? 'checked' : ''}> Umkehren</label>`
    + `<div class="xs muted" style="margin:4px 0">${so.rv ? `${it ? name : 'Die gewählte Ware'} geht zur Seite (links/rechts im Wechsel), alles andere geradeaus.` : `${it ? name : 'Die gewählte Ware'} läuft geradeaus, alles andere abwechselnd nach links und rechts.`} Ist eine Seite blockiert, nimmt es die andere.</div>`;
  h += foldHead('sopick', 'Ware wählen') + (fold('sopick') || !it ? itemPicker('sortIt', it, false) : '');
  return h;
}
function bridgeHTML(b) {
  const out = bridgeOut(game, b), inn = bridgeIn(game, b), m = ui.mode;
  const q = (b.q || []).map(o => img(SPR.item[o.it], 1)).join('');
  let h = statusLine(!!(out || inn), out ? `Verbunden &rarr; Ende ${b.bl[1]} Feld${b.bl[1] === 1 ? '' : 'er'} ${DIR_NAME[b.bl[0]]}` : inn ? 'Ausgang (Waren kommen von einem anderen Ende)' : 'Nicht verbunden');
  if (out && inn) h += `<div class="xs muted">Teil einer Kette: nimmt Waren vom vorigen Ende und reicht sie weiter.</div>`;
  h += `<div class="stat"><span>Unterwegs</span><b class="row" style="gap:2px">${q || 'nichts'} <span class="xs muted">(${(b.q || []).length}/${BELT_BRIDGE.buf})</span></b></div>`
    + `<div class="stat"><span>Tempo</span><b>${fmt1(b.fs || BELT_BRIDGE.rate)} Items/s${b.fs ? '' : ' (kein Zulauf)'} &middot; bis ${BELT_BRIDGE.range} Felder dazwischen</b></div>`
    + `<div class="xs muted">So schnell wie das schnellste zuführende Band, höchstens ${BELT_BRIDGE.max} Items/s.</div>`
    + `<div class="btns"><button class="btn btn-paper btn-sm" data-act="bridgeRelink">${m && m.kind === 'bridge' ? 'Ziel anklicken …' : 'Neu verbinden'}</button><button class="btn btn-paper btn-sm" data-act="bridgeUnlink" ${b.bl ? '' : 'disabled'}>Verbindung lösen</button></div>`;
  return h;
}
function extraktorHTML(b) {
  const X = extractInfo(game, b), nm = (s) => s.t === 'kiste' ? 'Lagerkiste' : isStore(s) ? kontorKind(game, s) : BD[s.t].name;
  const belts = X.to.filter(t => FLAT.has(t.t)).length, bl = X.to.filter(t => !FLAT.has(t.t));
  let h = X.from.length ? statusLine(!!X.to.length, `Holt aus: ${[...new Set(X.from.map(nm))].join(', ')}`) : statusLine(false, 'Kein Gebäude mit Waren daneben');
  h += `<div class="stat"><span>Gibt ab an</span><b>${[belts ? `${belts} Band${belts === 1 ? '' : 'teil' + (belts === 1 ? '' : 'e')}` : '', ...[...new Set(bl.map(nm))]].filter(Boolean).join(', ') || 'nichts (Band, das nicht hineinzeigt, oder Gebäude daneben)'}</b></div>`
    + `<div class="stat"><span>Filter</span><b class="row">${b.ex ? img(SPR.item[b.ex], 1) + ITEMS[b.ex].name : 'keiner (reihum alles)'}</b></div>`
    + `<div class="stat"><span>Tempo</span><b>${fmt1(X.rate)} Items/s</b></div>` + foldHead('expick', 'Filter wählen') + (fold('expick') ? itemPicker('ex', b.ex || '', true) : '');
  return h;
}
// Brennwert-Tabelle: Strom je Item in Verbrennungsanlage und Dampfkraftwerk
const kwFactor = () => KRAFTWERK.power * powerOf(game, 'kraftwerk') / KRAFTWERK.burn;
export function fuelTitle(it) { const v = ITEMS[it] && ITEMS[it].burn || 1; return `Brennwert ${v} = ${fmt1(v)} Strom in der Verbrennungsanlage, ${fmt1(v * kwFactor())} im Dampfkraftwerk`; }
function fuelTable(kw) {
  const its = ITEM_ORDER.filter(it => (ITEMS[it].burn || 1) > 1 && (!kw || ITEMS[it].burn >= KRAFTWERK.fuelMin)).sort((a, c) => ITEMS[c].burn - ITEMS[a].burn);
  return `<details class="fold"><summary>Brennwerte</summary><div class="ftab"><span class="xs muted">Ware</span><span class="xs muted">Brennwert</span><span class="xs muted">Verbr.</span><span class="xs muted">Kraftw.</span>`
    + its.map(it => `<span class="row" data-tip="fuel:${it}">${img(SPR.item[it], 1)}${ITEMS[it].name}</span><b class="num">${ITEMS[it].burn}</b><b class="num">${fmt1(ITEMS[it].burn)}</b><b class="num">${fmt1(ITEMS[it].burn * kwFactor())}</b>`).join('')
    + `</div><div class="xs muted">Alle anderen Waren: Brennwert 1.${kw ? ` Das Kraftwerk nimmt nur Brennstoff ab Brennwert ${KRAFTWERK.fuelMin}.` : ''}</div></details>`;
}
// Verbrannt in den letzten 60 s: Items, Brennwert, Strom
function burnStats(b) {
  const span = Math.max(1, b._bs || 0), n = b._bm || 0, v = b._bvm || 0;
  return `<div class="stat"><span>Verbrannt (letzte ${span} s)</span><b class="num">${fmt(n)} Items &middot; Brennwert ${fmt(v)}</b></div>`
    + `<div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Erzeugt</span><b class="num">${fmt1(b._PG || 0)} Strom/s</b></div>`;
}


function itemStat(it, cur, max) { return `<div class="stat"><span class="row">${img(SPR.item[it], 2)}${resName(it)}</span><b>${Math.floor(cur || 0)}${max != null ? ' / ' + max : ''}</b></div>`; }
function pbar(f, cls = '') { return `<div class="bar ${cls}" style="height:11px;margin:6px 0"><div style="width:${Math.round(clamp(f, 0, 1) * 100)}%;transition:none"></div></div>`; }
function statusLine(ok, txt) { return `<div class="small" style="margin:4px 0;font-weight:800"><span class="${ok ? 'good' : 'bad'}">&#9679;</span> ${txt}</div>`; }
const recipeName = (R) => R.name || resName(recipeMain(R));
const recipeIcon = (R) => SPR.item[R.icon || recipeMain(R)];
const amounts = (o) => Object.entries(o).map(([it, n]) => `${n} ${resName(it)}`).join(' + ') || '–';
const ACID_MSG = 'Säure braucht säurefeste Rohre (Mk3)';
// Stromverbrauch eines Gebäudes (Strom/s) mit dem aktiven Rezept; need = ohne Strom Stillstand
export function powerUseOf(b) {
  if (DRILLS[b.t]) return { use: DRILLS[b.t].power, need: true };
  if (PUMPS[b.t]) return { use: PUMPS[b.t].power, need: true };
  const R = recipeOf(b);
  return R ? recipePower(R) : { use: 0, need: false };
}
// Rezept-Gebäude: Auswahl, Status, Fortschritt, Puffer, Leistung pro Minute
function recipeHTML(b) {
  const list = RECIPES_OF[b.t], R = recipeOf(b), P = recipePower(R);
  let h = '';
  if (list.length > 1) {
    h += `<div class="lbl" style="margin-top:6px">Rezept</div><div class="seg rcpick">` + list.map(r =>
      `<button class="segb${r.id === R.id ? ' on' : ''}" data-act="rc" data-v="${r.id}" title="${recipeName(r)}${isUnlocked(game, 'rc:' + r.id) ? '' : ` – ${lockHint('rc:' + r.id)}`}" ${isUnlocked(game, 'rc:' + r.id) ? '' : 'disabled'}>${img(recipeIcon(r), 2)}<span>${recipeName(r)}</span></button>`).join('') + '</div>';
  }
  const boost = !P.need && P.use && b._pw;
  const miss = Object.entries(R.in).filter(([it, n]) => (b.buf[it] || 0) < n).map(([it, n]) => `${n - Math.floor(b.buf[it] || 0)} ${ITEMS[it].name}`);
  if (b._wf) miss.push(resName(b._wf));
  const fin = R.fin || {}, fout = R.fout || {}, fi = b.fi || {}, fo = b.fo || {};
  h += b._acid ? statusLine(false, ACID_MSG) : b._st === 'power' ? statusLine(false, 'Kein Strom') : b._st === 'full' ? statusLine(false, 'Ausgabe voll') :
    b._st === 'wait' ? statusLine(false, `Wartet auf: ${miss.join(', ') || 'Zutaten'}`) : statusLine(!!b._act, boost ? `Produziert mit Strom (${OPT_BOOST}&times;)` : 'Produziert');
  h += `<div class="stat"><span>Rezept</span><b>${amounts(Object.assign({}, R.in, fin))} &rarr; ${amounts(Object.assign({}, R.out, fout))}</b></div>${pbar(b.run ? b.prog : 0)}`;
  h += `<div class="lbl" style="margin-top:6px">Eingang</div>` + Object.keys(R.in).map(it => itemStat(it, b.buf[it], inCap(R.in[it]))).join('')
    + Object.keys(fin).map(f => itemStat(f, fi[f], fluidCap(fin[f]))).join('');
  const rest = Object.keys(b.buf).filter(it => !R.in[it] && b.buf[it] > 0);
  if (rest.length) h += `<div class="xs muted">Rest im Puffer (anderes Rezept): ${rest.map(it => `${Math.floor(b.buf[it])} ${ITEMS[it].name}`).join(', ')}</div>`;
  h += `<div class="lbl" style="margin-top:6px">Ausgang</div>` + Object.keys(R.out).map(it => itemStat(it, b.out[it], OUT_CAP)).join('')
    + Object.keys(fout).map(f => itemStat(f, fo[f], fluidCap(fout[f]))).join('');
  // Leistung bei voller Versorgung (optionaler Strom: mit dem aktuellen Stromzustand)
  const per = 60 / (R.t / (boost ? OPT_BOOST : 1));
  h += `<div class="lbl" style="margin-top:6px">Leistung pro Minute${P.use && !P.need ? (boost ? ' (mit Strom)' : ' (ohne Strom)') : ''}</div>`
    + Object.entries(Object.assign({}, R.in, fin)).map(([it, n]) => `<div class="stat"><span class="row">${img(SPR.item[it], 1)}${resName(it)}</span><b class="neg">&minus;${fmt1(n * per)}/min</b></div>`).join('')
    + Object.entries(Object.assign({}, R.out, fout)).map(([it, n]) => `<div class="stat"><span class="row">${img(SPR.item[it], 1)}${resName(it)}</span><b class="pos">+${fmt1(n * per)}/min</b></div>`).join('');
  if (P.use) h += `<div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Strom</span><b>${P.use}/s ${P.need ? '(nötig)' : `(optional, ${OPT_BOOST}&times; schneller)`}</b></div>`;
  return h;
}
const ignText = (ign) => ign && ign.length ? ign.map(o => `${o.n}&times; ${ORES[o.ore].name}`).join(', ') : '';
function drillHTML(b) {
  const D = DRILLS[b.t];
  if (!b._ot) return statusLine(false, b._why || 'Kein förderbares Vorkommen') + (b._ign && b._ign.length ? `<div class="stat"><span>Darunter</span><b>${ignText(b._ign)}</b></div>` : '');
  const L = D.lube, boost = b._lub && L.boost ? 1 + L.boost : 1, rate = drillRate(game, b.t, b._oc) * boost;
  let h = b._st === 'power' ? statusLine(false, 'Kein Strom') : b._st === 'full' ? statusLine(false, 'Ausgabe voll') : b._st === 'hot' ? statusLine(false, 'Überhitzt &ndash; braucht Kühlwasser')
    : b._st === 'lube' ? statusLine(false, 'Braucht Schmiermittel') : statusLine(true, b._lub && L.boost ? `Fördert geschmiert (+${Math.round(L.boost * 100)} %)` : 'Fördert');
  h += `<div class="stat"><span>Vorkommen</span><b>${ORES[b._ore].name} (${b._oc} Feld${b._oc === 1 ? '' : 'er'})</b></div>
    <div class="stat"><span>Leistung</span><b>${fmt1(rate)}/s &middot; ${fmt1(rate * 60)}/min</b></div>`;
  if (b._ign && b._ign.length) h += `<div class="stat"><span>Ignoriert</span><b>${ignText(b._ign)}</b></div>`;
  h += pbar(b.acc) + itemStat(b._ot, b.out[b._ot], D.buf);
  if (D.water) h += itemStat('wasser', (b.fi || {}).wasser, FLUID_BUF_W(D)) + `<div class="xs muted">Kühlwasser: ${D.water} Wasser/s über ein Rohr.</div>`;
  if (L) h += itemStat(L.it, b.buf[L.it], L.buf) + `<div class="xs muted">${L.opt ? `Optional: 1 ${ITEMS[L.it].name} je ${L.every} s für +${Math.round(L.boost * 100)} %` : `Verbraucht 1 ${ITEMS[L.it].name} je ${L.every} s`} (vom Band).</div>`;
  if (D.power) h += `<div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Strom</span><b>${D.power}/s (nötig)</b></div>`;
  return h;
}
const FLUID_BUF_W = (D) => FLUID_BUF * D.water;
const FLAT_PIPE = (b) => BD[b.t].w === 1 && game.pipes.get(b.x, b.y) > 0;
// Pumpen: Förderung, Puffer, Strom
function pumpHTML(b) {
  const P = PUMPS[b.t], r = pumpRate(b), cap = FLUID_BUF * r;
  let h = b._st === 'none' ? statusLine(false, b.t === 'saugpumpe' ? 'Kein Öl unter der Pumpe' : 'Kein Wasser') : b._st === 'power' ? statusLine(false, 'Kein Strom') :
    b._st === 'full' ? statusLine(false, (b._pn || []).length ? 'Netz voll oder führt eine andere Flüssigkeit' : 'Kein Rohr angeschlossen') : statusLine(!!b._act, 'Fördert');
  if (b.t === 'saugpumpe') h += `<div class="stat"><span>Ölfelder</span><b>${b._oc || 0} / 4</b></div>`;
  h += `<div class="stat"><span>Leistung</span><b>${fmt1(r)} ${FLUIDS[P.out].name}/s &middot; ${fmt(r * 60)}/min</b></div>` + itemStat(P.out, (b.fo || {})[P.out], cap);
  return h;
}
// Erzeuger: was in der letzten Sekunde ins Netz ging und was bei vollem Speicher verworfen wurde
function genLines(b) {
  const pd = b._PD || 0;
  return `<div class="stat"><span>Genutzt</span><b class="num">${fmt1(Math.max(0, (b._PG || 0) - pd))} Strom/s</b></div>`
    + (pd > 0.05 ? `<div class="stat"><span>Überschuss verworfen</span><b class="num">${fmt1(pd)}/s</b></div>` : '');
}
function kraftwerkHTML(b) {
  const K = KRAFTWERK, out = K.power * powerOf(game, b.t);
  let h = b._st === 'water' ? statusLine(false, 'Wartet auf: Wasser') : b._st === 'fuel' ? statusLine(false, 'Wartet auf: Brennstoff') : statusLine(!!b._act, 'Erzeugt Strom');
  h += `<div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Leistung</span><b>${fmt1(out)} Strom/s</b></div>` + genLines(b) + `
    <div class="stat"><span>Verbrauch</span><b>${K.burn} Brennwert/s + ${K.water} Wasser/s</b></div>`
    + itemStat('wasser', (b.fi || {}).wasser, FLUID_BUF * K.water)
    + `<div class="stat"><span>Brennstoff im Kessel</span><b>${fmt1(b.fuel || 0)} Brennwert</b></div>`
    + Object.keys(b.buf).filter(it => b.buf[it] > 0).map(it => itemStat(it, b.buf[it], K.buf)).join('')
    + `<div class="xs muted">Nimmt Brennstoff vom Band (ab Brennwert ${K.fuelMin}), höchstens ${K.buf} Stück.</div>`;
  return h;
}
// Rohrnetz an einem Feld: Inhalt, Durchsatz, langsamstes Rohr, Erzeuger und Verbraucher, „Netz leeren“
function pipeNetHTML(x, y) {
  const n = netAt(game, x, y);
  if (!n) return '';
  const tier = game.pipes.get(x, y), slow = n.pipes ? PIPES[PIPE_BY_TIER[n.minTier]] && BD[PIPE_BY_TIER[n.minTier]].name : null;
  const F = n.fluid ? FLUIDS[n.fluid] : null, bs = n.bs.map(id => game.blds.get(id)).filter(Boolean);
  const prod = bs.filter(b => Object.keys(fluidPorts(b).out).some(f => !n.fluid || f === n.fluid)), cons = bs.filter(b => Object.keys(fluidPorts(b).in).some(f => !n.fluid || f === n.fluid));
  const names = (l) => { const c = {}; l.forEach(b => { c[BD[b.t].name] = (c[BD[b.t].name] || 0) + 1; }); return Object.entries(c).map(([k, v]) => `${v}&times; ${k}`).join(', ') || 'keine'; };
  let h = `<div class="lbl" style="margin-top:8px">Rohrnetz</div>`;
  if (tier) h += `<div class="stat"><span>Rohr hier</span><b>${BD[PIPE_BY_TIER[tier]].name}</b></div>`;
  h += `<div class="stat"><span class="row">${F ? img(SPR.item[n.fluid], 2) : ''}Flüssigkeit</span><b>${F ? F.name : 'leer (frei)'}</b></div>
    <div class="stat"><span>Füllstand</span><b>${fmt(Math.floor(n.amt))} / ${fmt(n.cap)}</b></div>${pbar(n.cap ? n.amt / n.cap : 0, 'blue')}
    <div class="stat"><span>Durchsatz</span><b>${fmt1(n.flow)} / ${n.rate} pro s</b></div>
    <div class="stat"><span>Langsamstes Rohr</span><b>${slow || 'keins (nur Tanks)'}</b></div>
    <div class="stat"><span>Rohrfelder / Tanks</span><b>${n.pipes} / ${n.tanks.length}</b></div>
    <div class="stat"><span>Säurefest</span><b class="${n.acidOk ? 'good' : ''}">${n.acidOk ? 'ja' : 'nein'}</b></div>
    <div class="stat"><span>Erzeuger</span><b>${names(prod)}</b></div><div class="stat"><span>Verbraucher</span><b>${names(cons)}</b></div>
    <div class="btns"><button class="btn btn-paper btn-sm" data-act="drain" data-x="${x}" data-y="${y}" ${n.amt > 0 ? '' : 'disabled'}>Netz leeren</button>${tier ? `<button class="btn btn-red btn-sm" data-act="rmPipe" data-x="${x}" data-y="${y}">Rohr abreißen</button>` : ''}</div>`;
  if (tier) h += upgradeHTML({ pipe: tier, x, y });
  if (!n.acidOk && bs.some(b => b._acid)) h += `<div class="warn">${ACID_MSG}.</div>`;
  return h;
}
// Knopf „Aufwerten zu …“ mit Kosten (fehlende rot, gesperrt mit Schloss und Forschung). T = Gebäude oder { pipe, x, y }
export function costMiss(cost, miss) { return Object.entries(cost).map(([r, n]) => `<span class="cost${miss[r] ? ' no' : ''}">${img(SPR.item[r], 1)}${n}</span>`).join(''); }
function upgradeHTML(T) {
  const u = upgradeInfo(game, T);
  if (!u) return '';
  const attrs = T.pipe ? `data-act="upgrade" data-x="${T.x}" data-y="${T.y}"` : 'data-act="upgrade"';
  const gain = Object.keys(u.gain).length ? `<div class="xs muted">Erstattet: ${costText(u.gain, -1)}</div>` : '';
  if (u.locked) return `<div class="upg"><button class="btn btn-paper btn-sm btn-block" disabled>${img(SPR.icon.lock, 2)} Aufwerten zu ${BD[u.to].name}</button><div class="xs bad">${u.reason}</div></div>`;
  return `<div class="upg"><button class="btn btn-green btn-sm btn-block" ${attrs} ${u.ok ? '' : 'disabled'}>${img(SPR.icon.upgrade, 2)} Aufwerten zu ${BD[u.to].name} (U)</button>
    <div class="xs" style="margin-top:3px">Kosten: ${costMiss(u.cost, u.miss)}</div>${gain}${u.ok || !u.reason ? '' : `<div class="xs bad">${u.reason}</div>`}</div>`;
}
// Flüssigkeits-Gebäude: angeschlossene Netze
function fluidLinksHTML(b) {
  const pn = b._pn || [], ports = fluidPorts(b), need = Object.keys(ports.in).concat(Object.keys(ports.out));
  if (b.t === 'tank') { const n = pn[0]; return n ? pipeNetHTML(b.x, b.y) : ''; }
  if (!need.length) return '';
  if (!pn.length) return `<div class="warn">Kein Rohr angeschlossen. Lege ein Rohr an die Seite des Gebäudes (${need.map(resName).join(', ')}).</div>`;
  return `<div class="lbl" style="margin-top:8px">Rohrnetze</div>` + pn.map(n => `<div class="stat"><span class="row">${n.fluid ? img(SPR.item[n.fluid], 1) : ''}${n.fluid ? FLUIDS[n.fluid].name : 'leer'}</span><b>${fmt(Math.floor(n.amt))} / ${fmt(n.cap)} &middot; ${fmt1(n.flow)}/${n.rate} pro s</b></div>`).join('');
}
function houseHTML(b) {
  const H = HOUSE[b.t], inv = invOf(game, b.isl), every = mods(game).houseEvery;
  let h = statusLine(b.sup && !b.full, b.full ? `Versorgt &middot; Kontor voll, kein Platz für ${ITEMS[H.gives].name}` : b.sup ? `Versorgt &middot; liefert ${ITEMS[H.gives].name}` : 'Unversorgt &ndash; Waren fehlen im Kontor');
  h += `<div class="stat"><span>Bewohner</span><b>${H.pop}</b></div><div class="lbl" style="margin-top:8px">Bedarf alle ${every} s (Inselinventar)</div>`
    + Object.entries(H.need).map(([r, n]) => `<div class="stat"><span class="row">${img(SPR.item[r], 2)}${n}&times; ${ITEMS[r].name}</span><b class="${(inv[r] || 0) >= n ? 'good' : 'bad'}">${fmt(Math.floor(inv[r] || 0))} im Kontor</b></div>`).join('')
    + `<div class="stat"><span>Nächste Prüfung</span><b>in ${Math.ceil(Math.max(0, b.tm))} s</b></div>${pbar(1 - Math.max(0, b.tm) / every)}`
    + `<div class="stat"><span class="row">${img(SPR.item[H.gives], 2)}Erzeugt gesamt</span><b>${fmt(b.plans || 0)} ${ITEMS[H.gives].name}</b></div>`;
  return h;
}
/* ---------- Endgame: Leuchtturm, Drohnen, Schäden ---------- */
// Leuchtturm (0.18.0): Stufen mit Baustelle. Gesperrte Stufen nennen nur „Wird später freigeschaltet“ (kein Story-Spoiler).
function wonderHTML(b) {
  const W = game.state.wonder, N = WONDER.phases.length, inv = invOf(game, b.isl);
  let h = `<div class="stat"><span>Fertige Stufen</span><b>${W.ph} / ${N}</b></div>`;
  h += WONDER.phases.map((P, i) => {
    const n = i + 1, done = i < W.ph, cur = n === W.pb, open = done || cur || stageOpen(game, n);
    const tag = done ? '<span class="good">fertig</span>' : cur ? (wonderFull(W) ? 'wird gebaut' : 'Baustelle') : open ? '' : WONDER_LOCKED;
    const sub = !open ? '' : done ? `Sichtweite ${P.sight} Felder` : `Kosten: ${costText(P.cost, b.isl)}`;
    return `<div class="wph${done ? ' done' : cur ? ' cur' : ''}${open ? '' : ' locked'}"><div class="row"><b>${n}. ${open ? P.name : '???'}</b><span class="grow"></span><span class="xs${open ? '' : ' muted'}">${tag}</span></div>
      ${sub && !cur ? `<div class="xs muted" style="margin-top:2px">${sub}</div>` : ''}</div>`;
  }).join('');
  if (W.pb && !wonderFull(W)) {
    const C = WONDER.phases[W.pb - 1].cost;
    h += `<div class="small" style="font-weight:800;margin-top:6px">Baustelle Stufe ${W.pb}: Waren ${Math.floor(wonderShare(W) * 100)} %</div>`
      + Object.keys(C).map(it => { const got = Math.min(C[it], (W.got && W.got[it]) || 0), f = got / C[it];
        return `<div class="row xs" style="gap:4px;margin-top:3px">${img(SPR.item[it], 1)}<span style="min-width:62px">${resName(it)}</span><span class="grow">${pbar(f, f >= 1 ? 'green' : '').replace('margin:6px 0', 'margin:0')}</span><b style="min-width:76px;text-align:right">${fmt(got)} / ${fmt(C[it])}</b></div>`
          + (f < 1 ? `<div class="xs muted" style="margin-left:18px">im Inselinventar: ${fmt(inv[it] || 0)}</div>` : '');
      }).join('')
      + `<label class="chk" style="margin-top:6px"><input type="checkbox" data-act="wonderStore" ${W.lager ? 'checked' : ''}> Aus dem Inselinventar nehmen (${WONDER.pull}/s)</label>`
      + `<div class="xs muted" style="margin-top:3px">Bänder und Extraktoren am Turm liefern direkt auf die Baustelle (nur Waren, die noch fehlen).</div>`;
  } else if (W.pb) h += `<div class="small" style="font-weight:800;margin-top:6px">Stufe ${W.pb} wird gebaut &middot; noch ${Math.ceil(WONDER.build - W.pt)} s</div>${pbar(W.pt / WONDER.build, 'green')}`;
  else if (W.ph < N) {
    const why = wonderReason(game, b), locked = !stageOpen(game, W.ph + 1);
    h += locked ? `<div class="xs muted" style="margin-top:6px">Stufe ${W.ph + 1}: ${WONDER_LOCKED}.</div>`
      : `<button class="btn btn-green btn-sm btn-block" style="margin-top:6px" data-act="wonder" ${why ? 'disabled' : ''}>Baustelle für Stufe ${W.ph + 1} eröffnen</button>${why ? `<div class="xs bad" style="margin-top:3px">${why}</div>` : ''}`;
  } else h += `<div class="small good" style="font-weight:800;margin-top:6px">Der Weltenleuchtturm ist vollendet.</div>`;
  return h;
}
function hubHTML(b) {
  const D = b.dr || [], fl = flying(b), idle = D.length - fl, R = requests(game, b);
  const busy = { pick: 'holt ab', drop: 'liefert', fix: 'fliegt zur Reparatur', work: 'repariert', home: 'kehrt zurück' };
  let h = statusLine(!!b._pw, b._pw ? (fl ? `${fl} Drohne${fl === 1 ? '' : 'n'} unterwegs` : 'Bereit') : 'Kein Strom &ndash; keine neuen Flüge');
  h += `<div class="stat"><span>Drohnen frei / unterwegs</span><b>${idle} / ${fl}</b></div>
    <div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Strombedarf</span><b>${DRONES.power + DRONES.perFlying * fl} Strom/s</b></div>
    <div class="stat"><span>Durchsatz</span><b>${fmt(b._tp || 0)} Items/min</b></div>
    <div class="stat"><span>Arbeitsradius</span><b>${DRONES.radius} Felder</b></div>`;
  h += `<div class="lbl" style="margin-top:6px">Offene Anforderungen</div>` + (R.length ? R.slice(0, 6).map(q => `<div class="stat"><span class="row">${img(SPR.item[q.it], 2)}${ITEMS[q.it].name}</span><b>${fmt(q.need)}</b></div>`).join('') : '<div class="xs muted">keine</div>');
  const act = D.filter(d => d.st !== 'idle');
  if (act.length) h += `<div class="lbl" style="margin-top:6px">Unterwegs</div>` + act.slice(0, 8).map(d => `<div class="xs">${d.c ? `${img(SPR.item[d.c.it], 1)}${d.c.n} ` : ''}${busy[d.st] || d.st}</div>`).join('');
  return h;
}
function dkisteHTML(b) {
  const req = b.dm === 'req', inv = req ? b.out : b.inv || {}, its = Object.keys(inv).filter(it => (inv[it] | 0) > 0);
  const hubs = [...game.blds.values()].filter(o => o.t === 'drohnenhafen' && inReach(o, b));
  let h = `<div class="seg" style="margin:4px 0"><button class="segb${!req ? ' on' : ''}" data-act="dkMode" data-v="offer">Anbieten</button><button class="segb${req ? ' on' : ''}" data-act="dkMode" data-v="req">Anfordern</button></div>`;
  h += `<div class="xs muted">${req ? 'Drohnen bringen die gewählte Ware bis zur Zielmenge; die Kiste gibt sie auf abgehende Bänder aus.' : `Nimmt Waren von Bändern an (höchstens ${DKISTE.buf}), Drohnen holen sie für Anforderungen ab.`}</div>`;
  if (req) {
    h += `<div class="lbl" style="margin-top:6px">Ware</div>${itemPicker('dkIt', b.dw ? b.dw.it : '', false)}`
      + `<div class="row" style="gap:6px;margin-top:6px"><span class="xs">Zielmenge</span><input class="inp num" type="number" min="0" max="${DKISTE.reqMax}" step="10" data-act="dkN" value="${b.dw ? b.dw.n : 0}" style="width:70px"></div>`;
  }
  h += `<div class="lbl" style="margin-top:6px">Inhalt</div>` + (its.length ? its.map(it => itemStat(it, inv[it], req ? null : DKISTE.buf)).join('') : '<div class="xs muted">leer</div>');
  if (!hubs.length) h += `<div class="warn">Kein Drohnenhafen in Reichweite (${DRONES.radius} Felder).</div>`;
  return h;
}
function damagedHTML(b) {
  const c = repairCost(b), ok = afford(game, b.isl, c);
  return `<div class="warn dmgw"><div class="row">${img(SPR.icon.wrench, 2)}<b>Beschädigt &ndash; steht still</b></div>
    <div class="xs" style="margin:3px 0">Reparatur: ${costText(c, b.isl)}${ok ? '' : ' <span class="bad">fehlt im Inselinventar</span>'}. Drohnen in Reichweite reparieren von selbst.</div>
    <button class="btn btn-green btn-sm btn-block" data-act="repair" ${ok ? '' : 'disabled'}>Reparieren</button></div>`;
}
// Koop: „gebaut von <Name>“ (Spielerfarbe), sobald mehr als ein Spieler im Spielstand steht
function builtBy(b) {
  const P = game.state.players || {}, p = b.by && P[b.by];
  if (!p || Object.keys(P).length < 2 || isSep(game)) return '';
  return ` &middot; gebaut von <b style="color:${esc(p.color)};text-shadow:0 0 1px #2a1a10">${esc(p.name)}</b>`;
}
// Getrennte Inseln: „Gehört <Name>“ in der Spielerfarbe
export function ownerTag(pid) {
  const p = game.state.players && game.state.players[pid];
  return `Gehört <b style="color:${esc(p ? p.color : '#fff')};text-shadow:0 0 1px #2a1a10">${esc(playerName(game, pid))}</b>`;
}
// Fremdes Gebäude (Getrennte Inseln): nur lesen, ohne Bestand und Einstellungen
function infoForeign(b) {
  const def = BD[b.t], ic = HQ.has(b.t) ? kontorSpr(flagOf(game, b.isl)) : def.npc ? npcSprite(SPR.npc, b) : bIcon(b.t);
  const title = b.t === 'handelskontor' ? kontorKind(game, b) : b.ruin ? `Brandruine (${def.name})` : def.name;
  let h = `<div class="row">${img(ic, fitScale(ic, 46))}<div class="grow"><div class="pix" style="font-size:18px;font-weight:600">${title}</div><div class="xs muted">${islName(game, b.isl)} &middot; ${ownerTag(ownerOf(b))}</div></div></div>
    <div class="xs muted" style="margin:6px 0 4px">${descOf(game, b.t)}</div>`;
  if (b.dmg) h += '<div class="warn xs">Beschädigt</div>';
  if (b.t === 'handelskontor') h += `<div class="lbl" style="margin-top:6px">Preisliste</div>${plViewHTML(b)}`;
  else if (HQ.has(b.t)) h += '<div class="xs muted">Hauptkontor eines Mitspielers. Mit seiner Erlaubnis kann eine deiner Routen hier anlegen (Flotte &rarr; Route).</div>';
  return h + '<div class="xs muted" style="margin-top:6px">Fremdes Gebäude: Du kannst es ansehen, aber nicht ändern oder abreißen.</div>';
}
// NPC-Gebäude (Version 16): nur ansehen; am Steg das Gespräch mit dem NPC
function infoNpc(b) {
  const def = BD[b.t], ic = npcSprite(SPR.npc, b), V = traderInfo(b.npc), name = npcName(b.npc), S = game.state.story;
  let h = `<div class="row">${img(ic, fitScale(ic, 46))}<div class="grow"><div class="pix" style="font-size:18px;font-weight:600">${b.ruin ? 'Ruine: ' : ''}${b.t === 'npchafen' ? `${esc(name)}s Steg` : def.name}</div>
    <div class="xs muted">${islName(game, b.isl)} &middot; ${esc(name)}, ${V.role}</div></div></div><div class="xs muted" style="margin:6px 0 4px">${b.ruin ? 'Der Sturm hat alles fortgerissen.' : descOf(game, b.t)}</div>`;
  // Nach Ende B: Ruinen, niemand mehr da (sim/ending.js)
  if (b.ruin || npcGone(game, b.npc)) return h + `<div class="xs muted" style="margin-top:6px">Hier lebt niemand mehr. Kein Gespräch, kein Handel.</div>`;
  const P = npcPort(game, b.npc), s = P && shipAtPort(game, P);
  if (b.npc === 'rat') h += s ? `<div class="xs muted" style="margin-top:6px">${esc(s.name)} liegt am Steg. Laden = kaufen, Entladen = liefern und verkaufen.</div>` : '<div class="xs muted" style="margin-top:6px">Leg mit einem Schiff hier an, um mit dem Inselrat zu handeln.</div>';
  else if (!S) h += '<div class="xs muted">Ohne Geschichte (Getrennte Inseln) gibt es hier niemanden zum Reden.</div>';
  else if (s) h += `<button class="btn btn-green btn-sm btn-block" style="margin-top:6px" data-act="talk">Mit ${esc(name)} sprechen</button><div class="xs muted" style="margin-top:3px">${esc(s.name)} liegt am Steg.</div>`;
  else h += `<div class="xs muted" style="margin-top:6px">Leg mit einem Schiff an ${esc(name)}s Steg an, dann kannst du mit ihm sprechen und handeln.</div>`;
  const N = S && npcOf(game, b.npc);
  if (N && npcKnown(game, b.npc)) h += `<div class="stat" style="margin-top:6px"><span>Ruf</span><b>${lvlName(lvlOf(N).id)} &middot; ${Math.floor(N.rep)}</b></div>${N.orders.length ? `<div class="stat"><span>Offene Aufträge</span><b>${N.orders.length}</b></div>` : ''}
    <button class="btn btn-paper btn-sm btn-block" style="margin-top:4px" data-nv="open" data-npc="${b.npc}">${img(SPR.icon.people, 1)} Handel mit ${esc(name)} (N)</button>`;
  return h + (b.npc === 'rat' ? '' : '<div class="xs muted" style="margin-top:6px">Hier wohnt ' + esc(name) + '. Du kannst nichts bauen, ändern oder abreißen.</div>');
}
// Dorfgebäude, die nach dem Ende dir gehören (Brandruinen und Aurels Schmuck am Goldberg): abreißbar, sonst ohne Funktion
const ownedNpcB = (b) => BD[b.t].npc && b.t !== 'npchafen' && !npcOfPid(b.by);
function infoBuilding(b) {
  if (BD[b.t].npc && !ownedNpcB(b)) return infoNpc(b);
  if (isSep(game) && !mine(game, b)) return infoForeign(b);
  const { state, blds, tree } = game;
  const def = BD[b.t], ic = HQ.has(b.t) ? kontorSpr(flagOf(game, b.isl)) : def.npc ? npcSprite(SPR.npc, b) : bIcon(b.t);
  const title = b.t === 'handelskontor' ? kontorKind(game, b) : b.ruin ? `Brandruine (${def.name})` : def.name;
  let h = `<div class="row">${img(ic, fitScale(ic, 46))}<div class="grow"><div class="pix" style="font-size:18px;font-weight:600">${title}</div><div class="xs muted">${islName(game, b.isl)}${builtBy(b)}</div></div></div>
    <div class="xs muted" style="margin:6px 0 4px">${b.ruin ? 'Aurels Leute haben sie angezündet, bevor er ablegte. Reiß die Ruine ab und bau neu.' : descOf(game, b.t)}${ownedNpcB(b) && !b.ruin ? ' Gehörte Aurel, jetzt dir.' : ''}</div>`;
  const noOut = (PRODUCERS.has(b.t)) && !outputsOf(game, b).length;
  if (b.dmg) h += damagedHTML(b);
  switch (b.t) {
    case 'handel': h += handelInfoHTML(b); break;
    case 'leuchtturm': h += wonderHTML(b); break;
    case 'sockel1': case 'sockel2': case 'sockel3': h += pedestalHTML(b); break;
    case 'drohnenhafen': h += hubHTML(b); break;
    case 'dkiste': h += dkisteHTML(b); break;
    case 'band': case 'band2': case 'band3':
      h += `<div class="stat"><span>Richtung</span><b>${DIR_NAME[b.d]}</b></div><div class="stat"><span>Form</span><b>${beltShape(game, b) >= 0 ? 'Kurve' : 'gerade'}</b></div><div class="stat"><span>Inhalt</span><b>${b.it ? ITEMS[b.it].name : 'leer'}</b></div>`
        + beltFlowHTML(b) + beltButtons(b); break;
    case 'splitter': case 'ueberlauf':
      h += `<div class="stat"><span>Inhalt</span><b>${b.it ? ITEMS[b.it].name : 'leer'}</b></div>${beltFlowHTML(b)}<div class="xs muted">Eingänge werden automatisch erkannt: jede Seite, an der ein Band hineinzeigt.</div>` + beltButtons(b); break;
    case 'kreuzung':
      h += [0, 1].map(ax => { const L = (b.ln || [])[ax]; return `<div class="stat"><span>${ax ? 'Senkrecht' : 'Waagerecht'}</span><b>${L ? ITEMS[L.it].name + ' ' + DIR_NAME[L.d] : 'frei'}</b></div>`; }).join('') + beltFlowHTML(b) + beltButtons(b); break;
    case 'tor': h += torHTML(b) + beltFlowHTML(b); break;
    case 'sortierer': h += sorterHTML(b) + beltFlowHTML(b) + beltButtons(b); break;
    case 'bandbruecke': h += bridgeHTML(b) + beltFlowHTML(b); break;
    case 'extraktor': h += extraktorHTML(b) + beltFlowHTML(b); break;
    case 'kiste': case 'handelskontor':
      h += stockHTML(b);
      if (b.t === 'handelskontor' && isSep(game)) h += `<div class="lbl" style="margin-top:8px">Preisliste für Mitspieler</div>${plHTML(b)}`;
      break;
    case 'mast':
      h += `<div class="stat"><span>Verbindungen</span><b>${linkCount(b)} / ${POLE_LINKS}</b></div>` + (b.links || []).map(id => { const o = blds.get(id); return o ? `<div class="xs muted">&ndash; ${BD[o.t].name}</div>` : ''; }).join('')
        + `<div class="btns"><button class="btn btn-paper btn-sm" data-act="wire">Kabel verlegen</button><button class="btn btn-paper btn-sm" data-act="unwire" ${linkCount(b) ? '' : 'disabled'}>Alle lösen</button></div>`; break;
    case 'kontor': case 'kontoralt':
      if (b.t === 'kontoralt') h += `<div class="warn">Altes Kontor &ndash; bitte verlegen, um mehr Platz für Bänder zu bekommen.</div>`;
      h += stockHTML(b)
        + `<div class="xs muted" style="margin-top:4px">Bänder liefern hinein (voll = Stau). Waren holst du mit Extraktoren heraus.</div>
        <div class="btns"><button class="btn btn-paper btn-sm" data-act="nameIsl">Insel benennen</button><button class="btn ${b.t === 'kontoralt' ? 'btn-green' : 'btn-paper'} btn-sm" data-act="moveKontor">Kontor verlegen</button></div>`; break;
    case 'saege': {
      const grow = (b._ring || []).filter(i => { const v = tree.getK(i); return v > 0 && v < 1; }).length;
      h += statusLine(b._m > 0 && !b.dmg, b.dmg ? 'Steht still' : b._m > 0 ? 'Produziert' : 'Wartet auf reife Bäume')
        + `<div class="stat"><span>Reife Bäume</span><b>${b._m || 0} / ${(b._ring || []).length}</b></div><div class="stat"><span>Wachsen nach</span><b>${grow}</b></div>
        <div class="stat"><span>Leistung</span><b>${fmt1((b._m || 0) * SAW.rate)} Holz/s</b></div>${pbar(b.acc)}${itemStat('holz', b.out.holz, SAW.buf)}`; break;
    }
    case 'bohrer': case 'bohrer2': case 'multibohrer': h += drillHTML(b); break;
    case 'pumpe': case 'saugpumpe': h += pumpHTML(b); break;
    case 'kraftwerk': h += kraftwerkHTML(b) + burnStats(b) + fuelTable(true); break;
    case 'geothermie': h += statusLine(!!b._act, b._act ? 'Erzeugt Strom' : `Zu wenig Lava (mind. ${GEOTHERMIE.lava} Felder)`) + `<div class="stat"><span>Lavafelder</span><b>${b._lv || 0}</b></div><div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Leistung</span><b>${GEOTHERMIE.power * powerOf(game, b.t)} Strom/s</b></div>` + genLines(b); break;
    case 'fischer':
      h += `<div class="stat"><span>Wasserfelder im Umkreis</span><b>${b._wn}</b></div><div class="stat"><span>Fang</span><b>${fmt1(b._fr * rateOf(game, 'fischer'))} Fisch/s</b></div>${pbar(b.acc)}${itemStat('fisch', b.out.fisch, 10)}`; break;
    case 'verbrennung':
      h += statusLine(b._bt > 0, b._bt > 0 ? 'Verbrennt' : 'Leerlauf') + burnStats(b) + `<div class="stat"><span>Verbrannt (alle Inseln, gesamt)</span><b class="num">${fmt(state.stats.burned)}</b></div>` + fuelTable(false); break;
    default: if (HOUSE[b.t]) h += houseHTML(b); break;
    case 'werft': {
      const built = state.ships.filter(s => s.home === b.id).length;
      h += b.bq ? `<div class="small" style="font-weight:800">${SHIP_KINDS[b.bk || 'fracht'].name} wird gebaut …</div>${pbar(b.prog, 'green')}` : SHIP_ORDER.map(k => {
        const K = SHIP_KINDS[k], lock = !isUnlocked(game, 'ship:' + k), hl = K.holds + (K.upHolds ? mods(game).holds : 0);
        return `<div class="shipbuy"><button class="btn btn-green btn-sm btn-block" data-act="ship" data-kind="${k}" ${!lock && afford(game, b.isl, K.cost) ? '' : 'disabled'}>${img(lock ? SPR.icon.lock : shipSprite(k), lock ? 2 : 1)} ${K.name} bauen</button>
          <div class="xs" style="margin:3px 0 6px">${lock ? `<span class="bad">${lockHint('ship:' + k)}</span>` : `Kosten: ${costText(K.cost, b.isl)}`} &middot; ${hl} ${hl === 1 ? 'Laderaum' : 'Laderäume'}, Sicht ${K.reveal}</div></div>`;
      }).join('');
      h += werftBellHTML(b);
      h += `<div class="xs muted" style="margin-top:6px">In dieser Werft gebaut: ${built} Schiff${built === 1 ? '' : 'e'}. Routen im Fenster „Flotte“ (F).</div>`; break;
    }
  }
  if (RECIPES_OF[b.t]) h += recipeHTML(b);
  if (RECIPES_OF[b.t] || DRILLS[b.t] || HOUSE[b.t] || PUMPS[b.t] || b.t === 'saege' || b.t === 'fischer') h += throughputHTML(b);
  if (isFluidB(b.t)) h += fluidLinksHTML(b);
  if (FLAT_PIPE(b)) h += pipeNetHTML(b.x, b.y);
  if (isPowered(b.t)) h += netHTML(b);
  if (noOut) h += `<div class="warn">Kein Ausgabe-Band: Lege ein Band an, das vom Gebäude wegführt.</div>`;
  if (UPGRADE_TO[b.t]) h += upgradeHTML(b);
  h += `<div class="btns">${def.rot ? '<button class="btn btn-paper btn-sm" data-act="rotate">Drehen (R)</button>' : ''}${def.fixed && !ownedNpcB(b) ? '' : `<button class="btn btn-red btn-sm" data-act="demolish" ${def.rot ? '' : 'style="grid-column:1/-1"'}>Abreißen</button>`}</div>`;
  return h;
}
function infoShip(s) {
  // Fremdes Schiff (Getrennte Inseln): anklickbar, aber nicht steuerbar
  if (!mine(game, s)) return `<div class="row">${img(shipSpr(s), 2)}<div class="grow" style="min-width:0"><div class="pix" style="font-size:18px;font-weight:600">${esc(s.name)}</div><div class="xs muted">${kindName(s)} &middot; ${ownerTag(ownerOf(s))}</div><div class="xs muted">${shipStatus(s)}</div></div></div>
    <div class="btns"><button class="btn btn-paper btn-sm" data-sact="locate" data-ship="${s.id}">Zeigen</button></div>`;
  return `<div class="row">${img(shipSpr(s), 2)}<div class="grow" style="min-width:0"><div class="pix" style="font-size:18px;font-weight:600">${esc(s.name)}${s.bell ? ` <span title="Taucherglocke">${img(SPR.icon.bellS, 2)}</span>` : ''}</div><div class="xs muted">${kindName(s)} &middot; ${shipStatus(s)}</div></div></div>
    ${portHTML(s) || `<div class="lbl" style="margin-top:8px">Laderäume</div>${holdsHTML(s)}`}${shipDiveHTML(s)}
    <div class="col" style="gap:6px;margin-top:8px">${autoHTML(s)}${pickHTML(s)}${foundHTML(s)}${resumeHTML(s)}</div>
    <div class="btns"><button class="btn btn-paper btn-sm" data-sact="select" data-ship="${s.id}">Flotte</button><button class="btn btn-paper btn-sm" data-sact="locate" data-ship="${s.id}">Zeigen</button></div>
    <div class="xs muted" style="margin-top:6px">Rechtsklick auf die Karte schickt das Schiff dorthin (pausiert eine Route).</div>`;
}
// Aufklappbare Abschnitte im Info-Panel (bleiben beim Neuzeichnen offen)
const fold = (k) => !!(ui.fold && ui.fold[k]);
const foldHead = (k, label) => `<button class="lnk" data-act="fold" data-k="${k}">${fold(k) ? '&#9662;' : '&#9656;'} ${label}</button>`;
// Stromnetz: Bilanz (grün versorgt / rot unterversorgt), Speicher, aufklappbare Listen der Erzeuger und Verbraucher
function netHTML(b) {
  const n = netOf(game, b), S = netSummary(game, n);
  let h = `<div class="lbl" style="margin-top:10px">Stromnetz</div>`;
  if (!linkCount(b) && b.t !== 'mast') h += `<div class="warn">Nicht verkabelt. Baue einen Strommast in Reichweite (${WIRE_RANGE} Felder) – er verbindet sich automatisch.</div>`;
  if (!S) return h;
  const bad = !S.ok, pct = S.dem > 0 ? Math.min(1, S.sup / S.dem) : 1;
  h += `<div class="netbar ${bad ? 'bad' : 'good'}"><div style="width:${Math.round((bad ? pct : 1) * 100)}%"></div><span>${bad ? `Unterversorgt: &minus;${fmt1(-S.bal)}/s` : S.dem || S.gen ? `Versorgt: +${fmt1(S.bal)}/s` : 'Kein Verbrauch'}</span></div>`;
  h += `<div class="stat"><span class="row">${img(SPR.icon.bolt, 2)}Erzeugt (gesamt)</span><b class="num">${fmt1(S.gen)} Strom/s</b></div>`
    + `<div class="stat"><span>Genutzt / Bedarf</span><b class="num">${fmt1(S.used)} / ${fmt1(S.dem)} Strom/s</b></div>`
    + (S.lost > 0.05 ? `<div class="stat"><span>Überschuss verworfen</span><b class="num">${fmt1(S.lost)}/s</b></div>` : '')
    + `<div class="stat"><span>Gespeichert im Netz</span><b class="num">${Math.floor(S.e)} / ${S.cap}</b></div>${pbar(S.cap ? S.e / S.cap : 0, 'blue')}`;
  if (S.empty != null && S.e > 0) h += `<div class="xs bad">Speicher leer in etwa ${fmt(Math.ceil(S.empty))} s</div>`;
  else if (S.full != null && S.cap > S.e) h += `<div class="xs muted">Speicher voll in etwa ${fmt(Math.ceil(S.full))} s</div>`;
  const by = (l, f) => { const c = {}; for (const o of l) { const k = BD[o.t].name, e = c[k] || (c[k] = { n: 0, v: 0, w: 0 }); e.n++; e.v += f(o)[0]; e.w += f(o)[1]; } return Object.entries(c).sort((x, y) => y[1].v - x[1].v); };
  h += foldHead('gens', `Erzeuger (${n.gens.length})`);
  if (fold('gens')) h += by(n.gens, o => [o._PG || 0, 0]).map(([k, e]) => `<div class="stat sub"><span>${e.n}&times; ${k}</span><b class="num">${fmt1(e.v)}/s</b></div>`).join('') || '<div class="xs muted sub">keine</div>';
  h += foldHead('cons', `Verbraucher (${n.cons.length})`);
  if (fold('cons')) h += by(n.cons, o => [o._PQ || 0, o._PS || 0]).map(([k, e]) => `<div class="stat sub"><span>${e.n}&times; ${k}</span><b class="num ${e.w < e.v - 0.05 ? 'bad' : ''}">${fmt1(e.w)} / ${fmt1(e.v)}/s</b></div>`).join('') || '<div class="xs muted sub">keine</div>';
  h += `<div class="xs muted">Batterien: ${n.bats.length} &middot; Masten: ${n.poles.length}</div>`;
  if (GENS.has(b.t) || b.t === 'batterie') h += `<div class="stat"><span>Eigener Speicher</span><b class="num">${Math.floor(b.e || 0)} / ${storeOf(game, b.t)}</b></div>`;
  const pu = powerUseOf(b);
  if (pu.use) h += `<div class="stat"><span>Verbrauch</span><b>${pu.use} Strom/s &middot; ${b._pw ? 'versorgt' : 'ohne Strom'}</b></div>`;
  return h;
}
function mapStat(k) {
  const done = !!game.state.mapped[k];
  return `<div class="stat"><span>Karte</span><b class="${done ? 'good' : ''}">${mapText(k)}</b></div>` + (done ? '' : `<div class="xs muted">Ab ${Math.round(MAP_COAST_SHARE * 100)} % gesehener Küste gilt die Insel als kartiert und wird ganz aufgedeckt.</div>`);
}
function infoTile(i) {
  const { W, tree, claim, fog } = game;
  const x = tkx(i), y = tky(i);
  if (!fog.get(x, y)) return `<div class="pix" style="font-size:17px;font-weight:600">Nebel</div><div class="xs muted" style="margin-bottom:6px">Unerkundet &middot; Feld ${x} / ${y}</div><div class="xs muted">Schiffe und Gebäude in der Nähe decken den Nebel auf.</div>`;
  const k = W.il(x, y), gr = W.gr(x, y), I = k >= 0 ? W.island(k) : null, o = W.oreAt(x, y);
  let h = `<div class="pix" style="font-size:17px;font-weight:600">${GROUND_NAME[gr]}</div><div class="xs muted" style="margin-bottom:6px">${k >= 0 ? islName(game, k) : 'Offenes Meer'} &middot; Feld ${x} / ${y}</div>`;
  if (I && W.npcOf(k)) h += `<div class="stat"><span>Bewohnt von</span><b class="row">${img(SPR.npc.mark[W.npcOf(k)], 1)}${esc(npcName(W.npcOf(k)))}</b></div>`;
  if (I) h += `<div class="stat"><span>Inseltyp</span><b>${ISL_TYPES[I.type].name}</b></div><div class="stat"><span>Ring</span><b>${I.ring} (${RINGS[I.ring].max < Infinity ? 'bis ' + RINGS[I.ring].max : 'ab ' + RINGS[I.ring - 1].max} Felder)</b></div>` + mapStat(k);
  if (o) {
    const O = ORES[o];
    h += O.item ? itemStat(O.item, 0, null).replace('<b>0</b>', '<b>Vorkommen</b>') : `<div class="stat"><span>${O.name}</span><b>Vorkommen</b></div><div class="xs muted">${O.why || 'Noch nicht abbaubar'}.</div>`;
    if (O.id === 'quarz') h += `<div class="xs muted">Quarzsand fördert ein Bohrer nur, wenn unter ihm kein anderes Vorkommen liegt.</div>`;
  }
  const t = tree.get(x, y);
  if (t > 0) h += `<div class="stat"><span>Baum</span><b>${t >= 1 ? 'reif' : Math.round(t * 100) + ' % gewachsen'}</b></div>`;
  if (claim.get(x, y)) h += `<div class="stat"><span>Erntegebiet</span><b>Sägewerk</b></div>`;
  if (gr === G_ROCK) h += `<div class="xs muted">Auf Steinboden wachsen keine Bäume, Sägewerke sind hier nicht möglich.</div>`;
  if (gr === G_MOUNT) h += `<div class="xs muted">Berge sind nicht bebaubar.</div>`;
  if (gr === G_LAVA) h += `<div class="xs muted">Lava – hier kann nichts stehen (nur ein Geothermie-Generator darüber).</div>`;
  if (game.pipes.get(x, y)) h += pipeNetHTML(x, y);
  return h;
}
export function renderInsights() {
  const el = $('insights');
  if (uiBusy(el)) return;
  const b = ui.selected >= 0 ? game.blds.get(ui.selected) : null, sh = selShip();
  if (ui.selected >= 0 && !b) ui.selected = -1;
  if (ui.selShip >= 0 && !sh) ui.selShip = -1;
  const selTile = ui.selTile;
  // Durchsatz zählt die Simulation nur für das ausgewählte Gebäude
  const want = b ? b.id : null;
  if (ui.inspId !== want) { ui.inspId = want; send({ type: 'inspect', id: want }); }
  // ohne Auswahl ausgeblendet
  if (!b && selTile < 0 && !sh) { el.classList.add('hidden'); setHTML(el, ''); return; }
  el.classList.remove('hidden');
  const col = game.state.ui.infoCollapsed, title = sh ? 'Schiff' : b ? 'Gebäude' : 'Feld';
  const body = sh ? infoShip(sh) : b ? infoBuilding(b) : infoTile(selTile);
  setHTML(el, `<div class="phead click" data-act="toggle"><span>${title}</span><span class="row"><button class="xbtn" data-act="close" title="Schließen">&times;</button><span class="tog">${col ? '&#9656;' : '&#9662;'}</span></span></div>
    ${col ? '' : `<div class="pbody scroll">${body}</div>`}`, sh ? 's' + sh.id : b ? 'b' + b.id : 't' + selTile);
}
// Insel, auf der gerade gebaut würde: unter der Vorschau, ohne Vorschau die Insel unter der Kamera
export function buildIsl() {
  const mode = ui.mode, W = game.W;
  if (mode && mode.kind === 'build' && ui.hoverW) {
    const g = ghostPos(), d = BD[mode.t];
    for (const [x, y] of [[g.x, g.y], [g.x + (d.w >> 1), g.y + (d.h >> 1)]]) if (W.il(x, y) >= 0) return W.il(x, y);
    return -1;
  }
  return ui.camIsl;
}
export function updateHint() {
  const el = $('buildHint'), canvas = $('world'), mode = ui.mode, tree = game.tree, claim = game.claim;
  if (!mode) { el.classList.add('hidden'); canvas.classList.remove('building'); return; }
  canvas.classList.add('building');
  if (mode.kind === 'found' || mode.kind === 'move') {
    const what = mode.kind === 'found' ? 'Kontor gründen' : 'Kontor verlegen (kostenlos, Bestand bleibt)';
    setHTML(el, `<span class="row">${img(SPR.icon.chest, 2)}<span>${what}: grünen Platz anklicken &middot; R wechselt die Steg-Seite &middot; Haken oder Enter bestätigt &middot; X oder Esc bricht ab${mode.bad && ui.hoverW ? `<br><span class="bad">${mode.bad.reason}</span>` : ''}</span></span>`);
    el.classList.remove('hidden'); return;
  }
  if (mode.kind === 'bridge') {
    setHTML(el, `<span class="row">${img(bIcon('bandbruecke'), 1)}<span>Brückenband verbinden: anderes Ende auf einer Linie anklicken (höchstens ${BELT_BRIDGE.range} Felder dazwischen) <span class="muted">(Esc)</span></span></span>`);
    el.classList.remove('hidden'); return;
  }
  if (mode.kind === 'route') {
    setHTML(el, `<span class="row">${img(SPR.icon.anchor, 2)}<span>Kontore der Reihe nach anklicken – der erste ist der Start &middot; Enter/Haken fertig &middot; Esc abbrechen <b>(${mode.stops.length} Stopp${mode.stops.length === 1 ? '' : 's'})</b></span>
      <button class="ibtn ibtn-sm" data-hint="ok" title="Fertig (Enter)" ${mode.stops.length >= 2 ? '' : 'disabled'}>${img(SPR.icon.check, 2)}</button><button class="ibtn ibtn-sm" data-hint="no" title="Abbrechen (Esc)">${img(SPR.icon.cross, 2)}</button></span>`);
    el.classList.remove('hidden'); return;
  }
  if (mode.kind === 'wire') {
    const f = game.blds.get(mode.from);
    setHTML(el, `<span class="row">${img(SPR.icon.bolt, 2)}<span>Kabel verlegen: Gebäude oder Mast anklicken (max. ${WIRE_RANGE} Felder) &middot; erneut anklicken trennt${f ? ` &middot; ${linkCount(f)}/${POLE_LINKS} belegt` : ''} <span class="muted">(Esc)</span></span></span>`);
    el.classList.remove('hidden'); return;
  }
  if (mode.kind === 'upgrade') {
    let txt = 'Aufwerten: Teil anklicken oder darüber ziehen &middot; das alte wird voll erstattet (ohne Pläne) &middot; Band über Rohr: Umschalt wertet das Rohr auf';
    if (ui.upDrag) txt = `Aufwerten: <b>${ui.upDrag.n} Teil${ui.upDrag.n === 1 ? '' : 'e'}</b> &middot; gesamt ${costText(ui.upDrag.cost, -1) || '–'}`;
    else if (ui.hoverTile >= 0) {
      const T = upgradeTarget(ui.hoverTile, ui.shift), u = T ? upgradeInfo(game, T) : null;
      if (u) txt = `Aufwerten: ${BD[u.from].name} &rarr; <b>${BD[u.to].name}</b> &middot; ${costMiss(u.cost, u.miss)}${Object.keys(u.gain).length ? ` &middot; zurück ${costText(u.gain, -1)}` : ''}${u.ok ? '' : `<br><span class="bad">${u.reason}</span>`}`;
      else if (T) txt += `<br><span class="muted">${BD[T.pipe ? PIPE_BY_TIER[T.pipe] : T.t].name}: keine höhere Stufe</span>`;
    }
    setHTML(el, `<span class="row">${img(SPR.icon.upgrade, 2)}<span>${txt} <span class="muted">(Esc)</span></span></span>`); el.classList.remove('hidden'); return;
  }
  if (mode.kind === 'bpSelect') { setHTML(el, `<span class="row">${img(SPR.icon.blueprint, 2)}${selectHint()}</span>`); el.classList.remove('hidden'); return; }
  if (mode.kind === 'bpPlace') { setHTML(el, `<span class="row">${img(SPR.icon.blueprint, 2)}${placeHint()}</span>`); el.classList.remove('hidden'); return; }
  if (mode.kind === 'demolish') { setHTML(el, `<span class="row">${img(SPR.icon.pick, 2)}<span>Abriss: Gebäude anklicken oder ziehen &middot; 50 % Rückerstattung, Bänder und Rohre 100 % &middot; Band über Rohr: erst das Band, Umschalt nur das Rohr <span class="muted">(Esc)</span></span></span>`); el.classList.remove('hidden'); return; }
  const d = BD[mode.t], g = ghostPos();
  let extra = '';
  if (ui.hoverW) {
    const r = checkPlace(game, mode.t, g.x, g.y, false, mode.d);
    if (mode.t === 'saege') { const ring = ringTiles(g.x, g.y, 2, 2).filter(i => tree.getK(i) >= 1 && !claim.getK(i)).length; extra = ` &middot; ${ring} reife Bäume im Ring`; }
    if (DRILL.has(mode.t)) { const o = drillInfo(game, g.x, g.y, d.w, d.h); extra = o.n ? ` &middot; fördert ${ORES[o.ore].name} (${o.n} Feld${o.n === 1 ? '' : 'er'}) &middot; ${fmt1(drillRate(game, mode.t, o.n))}/s${o.ign.length ? ` &middot; ignoriert: ${ignText(o.ign)}` : ''}` : ''; }
    if (mode.t === 'fischer') extra = ` &middot; ${waterAround(game, g.x, g.y, 2, 2)} Wasserfelder`;
    if (mode.t === 'geothermie') { const n = lavaUnder(game, g.x, g.y, d.w, d.h); extra = ` &middot; <b class="${n >= GEOTHERMIE.lava ? 'good' : 'bad'}">${n} Lavafeld${n === 1 ? '' : 'er'}</b> (mind. ${GEOTHERMIE.lava})`; }
    if (mode.t === 'saugpumpe') { const n = oilUnder(game, g.x, g.y, d.w, d.h); extra = ` &middot; ${n} Ölfeld${n === 1 ? '' : 'er'} &middot; ${fmt1(Math.min(PUMPS.saugpumpe.max, n * PUMPS.saugpumpe.perTile))} Rohöl/s`; }
    if (PIPE.has(mode.t)) extra = ` &middot; ${PIPES[mode.t].rate}/s${PIPES[mode.t].acid ? ', säurefest' : ''} &middot; ziehen zum Verlegen, verbindet sich selbst`;
    if (CONVEY.has(mode.t) && BD[mode.t].rot) {
      // Vorschau beim Ziehen: quer liegendes gerades Band wird Kreuzung, Hindernis wird mit Brückenband überspannt
      const ex = bAt(game, g.x, g.y);
      if (ex && crossable(game, ex, mode.d)) extra = ` &middot; <b>wird zur Kreuzung</b> ${costText(BD.kreuzung.cost, buildIsl())}`;
      else if (beltObstacle(game, g.x, g.y)) extra = ` &middot; Hindernis: beim Ziehen geradeaus wird es mit einem Brückenband überspannt (2&times; ${costText(BD.bandbruecke.cost, buildIsl())}, max. ${BELT_BRIDGE.range} Felder)`;
      else extra = ` &middot; ziehen verlegt eine Linie, Umschalt hält sie gerade`;
    }
    if (mode.t === 'bandbruecke') extra = ` &middot; verbindet sich mit dem nächsten freien Ende (max. ${BELT_BRIDGE.range} Felder dazwischen)`;
    if (STEG.has(mode.t) && r.ok) extra += ` &middot; Steg ${DIR_NAME[r.d]} (R)`;
    if (!r.ok) extra += `<br><span class="bad">${r.reason}</span>`;
  }
  const k = buildIsl();
  // Pipette: übernommenes Rezept, Extraktor-Ware, Tor-Automatik, Sortierer
  const R = mode.rc && RECIPE_BY_ID[mode.rc], pick = (R ? ` &middot; Rezept: ${recipeName(R)}` : '') + (mode.ex && ITEMS[mode.ex] ? ` &middot; Ware: ${ITEMS[mode.ex].name}` : '')
    + (mode.ga && ITEMS[mode.ga.it] ? ` &middot; Automatik: ${ITEMS[mode.ga.it].name} ${mode.ga.hi}/${mode.ga.lo}` : '')
    + (mode.so && ITEMS[mode.so.it] ? ` &middot; Sortiert: ${ITEMS[mode.so.it].name}${mode.so.rv ? ' (umgekehrt)' : ''}` : '');
  setHTML(el, `<span>${d.name} ${costText(d.cost, k)}${k >= 0 ? ` <span class="xs muted">(${islName(game, k)})</span>` : ''}${d.rot ? ` &middot; ${DIR_NAME[mode.d]} (R)` : ''}${pick}${extra} <span class="muted">&middot; Esc</span></span>`);
  el.classList.remove('hidden');
}
