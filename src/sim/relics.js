/* =========================================================
   RELIKTE UND RELIKTSOCKEL (seit 0.24.0; alle Zahlen in data/relics.js)
   Zustand state.relics gehört zur Welt (wie Geschichte und Völker) und wird vom Host synchronisiert:
     { list: [E], next (nächste Nummer), got: { id: Anzahl } (je erhalten; legendäre nur einmal), rn (Zähler für den Zufall),
       ver (steigt bei jeder Änderung, für den Zwischenspeicher der Wirkungen) }
     E = { u (Nummer), id (data/relics.js), at (Gebäude-ID des Sockels | null = in der Sammlung), isl (Insel des Sockels | null),
           pick (gewählte Ware beim Füllhorn | null), off (legendär: Unterhalt fehlt, Wirkung ruht), due (Spielzeit der nächsten Perle), src }
   Kommandos (über den Host): relicPut { id: Sockel, u, pick }, relicTake { id: Sockel }, relicDebug (nur Host).
   Wirkungen: relicFx(g, Insel) liefert die zusammengefassten Werte der aktiven Relikte einer Insel (fx in data/relics.js);
   Simulation und Oberfläche lesen sie nur darüber (auch auf dem Spiegel). Kein DOM-Zugriff.
   ========================================================= */
import { CYCLE } from '../config.js';
import { RELICS, RELIC_ORDER, RELIC_TIERS, PEDESTALS, RELIC_UPKEEP, RELIC_PICK_KINDS, RELIC_DEBUG, RELIC_FURNACES } from '../data/relics.js';
import { ITEMS } from '../data/items.js';
import { hash2 } from '../util/math.js';
import { islData, homeIsl, islName, HOST_PID } from './state.js';
import { flowAdd } from './stats.js';

export const freshRelics = () => ({ list: [], next: 1, got: {}, rn: 0, ver: 0 });
const R = (g) => (g.state && g.state.relics) || null;
const fail = (g, msg) => g.events.push({ type: 'fail', msg });

/* ---------- Abfragen (auch auf dem Spiegel) ---------- */
export const relicDef = (id) => RELICS[id] || null;
export const isLegend = (id) => !!RELICS[id] && RELICS[id].tier === 3;
export const pedTier = (t) => PEDESTALS[t] || 0;
export const isPedestal = (t) => !!PEDESTALS[t];
export const tierName = (n) => RELIC_TIERS[n] ? RELIC_TIERS[n].name : '';
// Waren, die das Füllhorn verdoppeln kann
export const pickable = (it) => !!ITEMS[it] && RELIC_PICK_KINDS.includes(ITEMS[it].kind) && !ITEMS[it].npc && !ITEMS[it].bell;
export const PICK_LIST = Object.keys(ITEMS).filter(pickable);
// Eintrag im Sockel b (oder null)
export function relicIn(g, bid) { const S = R(g); return S ? S.list.find(e => e.at === bid) || null : null; }
// Relikte in der Sammlung, die in einen Sockel der Stufe tier passen
export function relicsFree(g, tier) { const S = R(g); return S ? S.list.filter(e => e.at == null && RELICS[e.id] && RELICS[e.id].tier <= (tier || 3)) : []; }
// Zahl der Relikte je id in der Sammlung (eingesetzt oder nicht)
export function relicCount(g, id) { const S = R(g); return S ? S.list.filter(e => e.id === id).length : 0; }

// Zwischenspeicher der Wirkungen: Insel → fx (nur aktive Relikte), dazu weltweite Werte (spots)
const EMPTY = Object.freeze({});
function merge(a, b) {
  if (!a) return b;
  const o = Object.assign({}, a);
  for (const k in b) o[k] = typeof b[k] === 'number' && typeof o[k] === 'number' ? o[k] + b[k] : b[k];
  return o;
}
function fxTable(g) {
  const S = R(g);
  if (!S) return null;
  const c = g._rfx;
  if (c && c.src === S && c.ver === S.ver) return c;
  const map = new Map();
  let spots = 0;
  for (const e of S.list) {
    const D = RELICS[e.id];
    if (!D || e.at == null || e.off) continue;
    const fx = Object.assign({}, D.fx);
    if (fx.double) fx.double = e.pick && pickable(e.pick) ? e.pick : null;
    if (fx.spots) spots += fx.spots;
    map.set(e.isl, merge(map.get(e.isl), fx));
  }
  return (g._rfx = { src: S, ver: S.ver, map, spots });
}
// Wirkungen der aktiven Relikte auf Insel k (leer, wenn keins)
export function relicFx(g, k) { const T = fxTable(g); return (T && T.map.get(k)) || EMPTY; }
// Faktoren für die einzelnen Stellen der Simulation
export const fxProd = (g, k) => { const f = relicFx(g, k); return 1 + (f.prod || 0); };
export const fxDrill = (g, k) => { const f = relicFx(g, k); return 1 + (f.prod || 0) + (f.drill || 0); };
export const fxBelt = (g, k) => 1 + (relicFx(g, k).belt || 0);
export const fxCap = (g, k) => 1 + (relicFx(g, k).cap || 0);
export const fxHouse = (g, k) => Math.max(0, 1 + (relicFx(g, k).house || 0));
// Stromverbrauch: Faktor (0 = braucht keinen Strom)
export const fxPower = (g, k) => { const f = relicFx(g, k); return f.noPower ? 0 : Math.max(0, 1 + (f.power || 0)); };
// Ofen ohne Kohle bzw. ohne Strom (Ewige Glut)
export function fxFurnace(g, b) { const F = RELIC_FURNACES[b.t]; return F && relicFx(g, b.isl).furnace ? F : null; }
export const fxDouble = (g, k) => relicFx(g, k).double || null;
export const fxCoal2Iron = (g, k) => !!relicFx(g, k).coal2iron;
// Schiff: Tempo-Bonus der Insel seiner Werft (Heimathafen)
export function fxShip(g, s) { const w = s && s.home != null ? g.blds.get(s.home) : null; return w ? relicFx(g, w.isl).ship || 0 : 0; }
// Tauchen: zusätzlicher Sauerstoff (Relikt auf der Heimatinsel des Tauchers), Faktor für die Häufigkeit der Tauchspots (weltweit)
export const relicAir = (g, pid) => relicFx(g, homeIsl(g, pid)).air || 0;
export function relicSpots(g) { const T = fxTable(g); return 1 + (T ? T.spots : 0); }

// Wirkung als Textzeilen (Tooltips, Sammlung, Sockel). pick = gewählte Ware beim Füllhorn
const pct = (f) => `${f > 0 ? '+' : '−'}${Math.round(Math.abs(f) * 100)} %`;
export function fxLines(fx, pick) {
  const out = [];
  if (!fx) return out;
  if (fx.prod) out.push(`Produktionsrate ${pct(fx.prod)}`);
  if (fx.drill) out.push(`Bohrrate ${pct(fx.drill)}`);
  if (fx.belt) out.push(`Bänder ${pct(fx.belt)} schneller`);
  if (fx.ship) out.push(`Schiffe dieser Insel ${pct(fx.ship)} schneller`);
  if (fx.power) out.push(`Stromverbrauch ${pct(fx.power)}`);
  if (fx.cap) out.push(`Lager (Hauptkontor) ${pct(fx.cap)}`);
  if (fx.house) out.push(fx.house > 0 ? `Häuser verbrauchen ${fx.house >= 1 ? `${fx.house + 1}-mal so viel` : pct(fx.house)}` : `Häuser verbrauchen ${Math.round(-fx.house * 100)} % weniger`);
  if (fx.air) out.push(`+${fx.air} s Sauerstoff beim Tauchen (auf der Heimatinsel)`);
  if (fx.furnace) out.push(`Öfen brauchen keine Kohle und keinen Strom (${Object.keys(RELIC_FURNACES).map(t => ({ schmelzofen: 'Schmelzofen', induktionsofen: 'Induktionsofen', siliziumofen: 'Silizium-Ofen' })[t] || t).join(', ')})`);
  if (fx.double) out.push(`Doppelte Produktion: ${typeof fx.double === 'string' && ITEMS[fx.double] ? ITEMS[fx.double].name : pick && ITEMS[pick] ? ITEMS[pick].name : 'eine Ware deiner Wahl'}`);
  if (fx.coal2iron) out.push('Geförderte Kohle kommt als Eisenerz an');
  if (fx.spots) out.push(`Tauchspots erscheinen ${fx.spots + 1}-mal so oft`);
  if (fx.noPower) out.push('Gebäude brauchen keinen Strom');
  return out;
}
// Unterhalt eines Relikts als Text (nur legendäre)
export const upkeepText = (id) => isLegend(id) ? `Verbraucht ${RELIC_UPKEEP.perDay} ${ITEMS[RELIC_UPKEEP.it].name}${RELIC_UPKEEP.perDay === 1 ? '' : 'n'} je Spieltag aus dem Inselinventar` : '';
// Zustand eines Sockels: { e (Eintrag | null), active, why (Hinweis, wenn die Wirkung ruht) }
export function pedestalState(g, b) {
  const e = relicIn(g, b.id);
  if (!e) return { e: null, active: false, why: '' };
  if (e.off) return { e, active: false, why: `Keine ${ITEMS[RELIC_UPKEEP.it].name}n im Inselinventar: Die Wirkung ruht, bis wieder eine da ist.` };
  if (RELICS[e.id] && RELICS[e.id].fx.double && !e.pick) return { e, active: false, why: 'Keine Ware gewählt.' };
  return { e, active: true, why: '' };
}

/* ---------- Ändern (nur in der Simulation) ---------- */
const bump = (S) => { S.ver = (S.ver | 0) + 1; };
// Relikt in die Sammlung legen. Legendäre gibt es nur einmal: liefert null, wenn es schon vergeben ist.
export function giveRelic(g, id, src, quiet) {
  const S = R(g), D = RELICS[id];
  if (!S || !D) return null;
  if (D.tier === 3 && S.got[id]) return null;
  const e = { u: S.next++, id, at: null, isl: null, pick: null, off: false, due: null, src: src || null };
  S.list.push(e);
  S.got[id] = (S.got[id] | 0) + 1;
  bump(S);
  if (!quiet) g.events.push({ type: 'relicGot', id, src: src || null, to: '*' });
  return e;
}
// Zufälliges Relikt einer Stufe für Handel, Aufträge und Tauchgänge (ohne End-Relikte; legendäre nur, solange sie frei sind;
// skip = Liste von ids, die nicht in Frage kommen). Liefert die id oder null.
export function rollRelic(g, tier, salt, skip) {
  const S = R(g);
  if (!S) return null;
  const pool = RELIC_ORDER.filter(id => { const D = RELICS[id]; return D.tier === tier && !D.end && !(tier === 3 && S.got[id]) && !(skip && skip.includes(id)); });
  if (!pool.length) return null;
  S.rn = (S.rn | 0) + 1;
  return pool[Math.floor(hash2(S.rn, salt | 0, g.state.seed + 9311) * pool.length) % pool.length];
}
// Stufe nach Gewichten { 1: w, 2: w, 3: w } würfeln
export function rollTier(g, w, salt) {
  const S = R(g), keys = Object.keys(w).map(Number), sum = keys.reduce((a, k) => a + w[k], 0);
  if (!S || !sum) return 0;
  S.rn = (S.rn | 0) + 1;
  let x = hash2(S.rn, (salt | 0) + 77, g.state.seed + 9323) * sum;
  for (const k of keys) { if (x < w[k]) return k; x -= w[k]; }
  return keys[keys.length - 1];
}
// Legendäre Relikte im Angebot eines Volks (für die Auswahl bei Tauchgängen ausschließen)
export function offeredRelics(g) {
  const N = g.state.npc, out = [];
  if (N) for (const k in N) if (N[k] && N[k].relic && N[k].relic.id) out.push(N[k].relic.id);
  return out;
}

const every = () => CYCLE / Math.max(0.01, RELIC_UPKEEP.perDay);
// Unterhalt zahlen: eine Perle aus dem Inselinventar; true = bezahlt
function payUpkeep(g, e) {
  const inv = islData(g, e.isl).inv, it = RELIC_UPKEEP.it;
  if ((inv[it] || 0) < 1) return false;
  inv[it] -= 1;
  flowAdd(g, e.isl, 'c', it, 1, 'relikte'); flowAdd(g, e.isl, 'u', it, 1, 'relikte');
  return true;
}
function setOff(g, e, off) {
  if (!!e.off === off) return;
  e.off = off; bump(R(g));
  g.events.push({ type: off ? 'relicPaused' : 'relicResumed', id: e.id, isl: e.isl, to: '*' });
}
// relicPut { id: Sockel, u: Relikt, pick: Ware (Füllhorn) }: einsetzen; ein Relikt im Sockel geht vorher zurück in die Sammlung
export function relicPut(g, b, c) {
  const S = R(g);
  if (!S || !b || !isPedestal(b.t)) return;
  const e = S.list.find(x => x.u === +c.u), D = e && RELICS[e.id];
  if (!D) { fail(g, 'Dieses Relikt gibt es nicht (mehr).'); return; }
  if (e.at === b.id) {   // nur die Ware des Füllhorns ändern
    if (D.fx.double && pickable(c.pick) && e.pick !== c.pick) { e.pick = c.pick; bump(S); g.events.push({ type: 'relicPut', id: e.id, isl: b.isl, pick: e.pick }); }
    return;
  }
  if (e.at != null) { fail(g, `${D.name} steckt schon in einem anderen Sockel. Nimm es dort erst heraus.`); return; }
  if (D.tier > pedTier(b.t)) { fail(g, `${D.name} ist ${RELIC_TIERS[D.tier].adj} und passt erst in einen Sockel dieser Stufe. Werte den Sockel auf.`); return; }
  if (D.fx.double && !pickable(c.pick)) { fail(g, `${D.name}: Wähle die Ware, die doppelt kommen soll.`); return; }
  const old = relicIn(g, b.id);
  if (old) unseat(old);
  e.at = b.id; e.isl = b.isl; e.pick = D.fx.double ? c.pick : null; e.off = false; e.due = null;
  if (D.tier === 3) {   // erste Perle sofort; fehlt sie, ruht die Wirkung von Anfang an
    const t = g.state.time;
    if (payUpkeep(g, e)) e.due = t + every(); else { e.off = true; e.due = t; }
  }
  bump(S);
  g.events.push({ type: 'relicPut', id: e.id, isl: b.isl, pick: e.pick, off: e.off });
}
function unseat(e) { e.at = null; e.isl = null; e.off = false; e.due = null; }
// relicTake { id: Sockel }: zurück in die Sammlung
export function relicTake(g, b) {
  const S = R(g), e = b && relicIn(g, b.id);
  if (!e) return;
  unseat(e); bump(S);
  g.events.push({ type: 'relicTaken', id: e.id, isl: b.isl });
}
// Sockel abgerissen (sim/buildings.js removeBuilding): Relikt zurück in die Sammlung
export function relicUnseat(g, b) {
  const S = R(g), e = S && b && isPedestal(b.t) ? relicIn(g, b.id) : null;
  if (!e) return;
  unseat(e); bump(S);
  g.events.push({ type: 'relicTaken', id: e.id, isl: b.isl, removed: true, to: '*' });
}
// Einmal je Sekunde (sim/sim.js): Unterhalt der legendären Relikte
export function relicTick(g) {
  const S = R(g);
  if (!S) return;
  const t = g.state.time;
  for (const e of S.list) {
    if (e.at == null || !isLegend(e.id)) continue;
    if (e.due == null) e.due = t;
    if (t < e.due) continue;
    if (payUpkeep(g, e)) { e.due = Math.max(e.due + every(), t); setOff(g, e, false); }
    else { e.due = t + 1; setOff(g, e, true); }
  }
}
// Debug (nur Host): op 'all' = jedes Relikt, das es noch nicht gibt, in die Sammlung (auch die End-Relikte);
// op 'pearls' = n Perlen (und je halb so viele Korallen und Muscheln) ins Inselinventar der Insel isl (sonst Heimatinsel)
export function relicDebug(g, c) {
  if (!R(g)) { fail(g, 'Debug: In diesem Spiel gibt es keine Relikte.'); return; }
  if (c.op === 'all') {
    let n = 0;
    for (const id of RELIC_ORDER) if (!relicCount(g, id) && giveRelic(g, id, 'debug', true)) n++;
    g.events.push({ type: 'relicDebug', n, to: '*' });
    return;
  }
  if (c.op === 'pearls') {
    const k = Number.isFinite(+c.isl) && +c.isl >= 0 ? +c.isl : homeIsl(g, HOST_PID), inv = islData(g, k).inv, n = Math.max(0, Math.floor(+c.n) || RELIC_DEBUG.pearls);
    inv.perle = (inv.perle || 0) + n; inv.koralle = (inv.koralle || 0) + Math.ceil(n / 2); inv.muschel = (inv.muschel || 0) + Math.ceil(n / 2);
    g.events.push({ type: 'relicDebug', pearls: n, isl: k, name: islName(g, k), to: '*' });
  }
}

/* ---------- Spielstand ---------- */
// Geladenen Zustand prüfen (save/serialize.js), nach den Gebäuden: Sockel müssen existieren und groß genug sein, je Sockel ein Relikt
export function cleanRelics(raw, g) {
  const S = freshRelics();
  if (!raw || typeof raw !== 'object') return S;
  const seen = new Set(), seat = new Set();
  for (const r of Array.isArray(raw.list) ? raw.list : []) {
    if (!r || !RELICS[r.id] || !Number.isInteger(r.u) || r.u <= 0 || seen.has(r.u)) continue;
    seen.add(r.u);
    const e = { u: r.u, id: r.id, at: null, isl: null, pick: pickable(r.pick) ? r.pick : null, off: !!r.off, due: Number.isFinite(+r.due) ? +r.due : null, src: typeof r.src === 'string' ? r.src.slice(0, 20) : null };
    const b = r.at != null && g.blds.get(+r.at);
    if (b && isPedestal(b.t) && RELICS[r.id].tier <= pedTier(b.t) && !seat.has(b.id)) { e.at = b.id; e.isl = b.isl; seat.add(b.id); }
    if (e.at == null) { e.off = false; e.due = null; }
    S.list.push(e);
  }
  // Legendäre doppelt (defekter Stand): nur das erste behalten
  const leg = new Set();
  S.list = S.list.filter(e => { if (!isLegend(e.id)) return true; if (leg.has(e.id)) return false; leg.add(e.id); return true; });
  const got = raw.got && typeof raw.got === 'object' && !Array.isArray(raw.got) ? raw.got : {};
  for (const id in got) if (RELICS[id] && Number.isFinite(+got[id]) && +got[id] > 0) S.got[id] = Math.floor(+got[id]);
  for (const e of S.list) S.got[e.id] = Math.max(S.got[e.id] | 0, relicCountIn(S, e.id));
  S.next = Math.max(Number.isInteger(raw.next) ? raw.next : 1, ...S.list.map(e => e.u + 1), 1);
  S.rn = Math.max(0, raw.rn | 0);
  return S;
}
const relicCountIn = (S, id) => S.list.filter(e => e.id === id).length;
