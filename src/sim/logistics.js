/* =========================================================
   LOGISTIK: Bänder, Splitter, Überlauf-Tor, Kreuzung, Brückenband, Tor, Extraktor, Speicher
   Speicher (sim/kontor.js): Hauptkontor = Inselinventar, Lagerkiste und Handelskontor mit eigenem Bestand.
   Bänder liefern hinein (voll = Stau), nur Extraktoren holen heraus.
   ========================================================= */
import { DIRS, BUILDABLE, G_MOUNT, G_LAVA } from '../config.js';
import { BD, FLAT, CONVEY, HQ, STEG, BELT_BRIDGE, EXTRACT, PRODUCERS } from '../data/buildings.js';
import { RECIPES_OF, inCap, recipeOf } from '../data/recipes.js';
import { DRILLS } from '../data/mining.js';
import { KRAFTWERK } from '../data/fluids.js';
import { ITEMS } from '../data/items.js';
import { perim } from '../util/math.js';
import { capOf, islData, pst, ownerOf, islOwner, fogOf } from './state.js';
import { bAt } from './buildings.js';
import { addEnergy } from './power.js';
import { flowAdd, ioAdd } from './stats.js';
import { inBody, isStore, stockOf, storeCap } from './kontor.js';
import { powerOf } from './mods.js';
import { dkAccept } from './drones.js';
import { wonderAccept } from './wonder.js';

// Verbrennungsanlage: Brennwert als Strom in ihren Speicher
export function burn(g, k, item, inc) {
  const amt = (ITEMS[item].burn || 1) * powerOf(g, 'verbrennung', ownerOf(inc));
  addEnergy(g, inc, amt); inc._bt = 1.5;
  inc._bv = (inc._bv || 0) + amt; inc._bn = (inc._bn || 0) + 1;   // für die Strom-Anzeige (sim/power.js powerStats)
  pst(g, ownerOf(inc)).stats.burned++;
}
// Ins Inselinventar (Hauptkontor) einlagern. Voll → false (das Band staut). viaBelt: zählt als Lieferung
export function storeInsert(g, k, item, viaBelt, src) {
  const inv = islData(g, k).inv;
  if ((inv[item] || 0) >= capOf(g, k)) return false;
  inv[item] = (inv[item] || 0) + 1;
  if (viaBelt) { pst(g, islOwner(g, k)).stats.delivered++; flowAdd(g, k, 'p', item, 1, src || 'band'); }
  return true;
}
// In eine Lagerkiste / ein Handelskontor einlagern
export function boxInsert(g, b, item) {
  const inv = b.inv || (b.inv = {});
  if ((inv[item] || 0) >= storeCap(g, b)) return false;
  inv[item] = (inv[item] || 0) + 1;
  return true;
}
export function accept(g, b, item) {
  if (b.dmg) return false;   // beschädigt (Ereignisse): Stillstand
  switch (b.t) {
    case 'dkiste': return dkAccept(b, item);
    case 'leuchtturm': return wonderAccept(g, b, item);   // Baustelle: nur Waren, die der Stufe noch fehlen
    case 'kontor': case 'kontoralt': return storeInsert(g, b.isl, item, true);
    case 'kiste': case 'handelskontor': return boxInsert(g, b, item);
    case 'verbrennung': burn(g, b.isl, item, b); return true;
    case 'kraftwerk': {   // Brennstoff (Brennwert ab fuelMin), Puffer für alle Sorten zusammen
      if ((ITEMS[item].burn || 0) < KRAFTWERK.fuelMin) return false;
      let n = 0;
      for (const it in b.buf) n += b.buf[it];
      if (n >= KRAFTWERK.buf) return false;
      b.buf[item] = (b.buf[item] || 0) + 1; return true;
    }
    default: {
      // Bohrer mit Schmiermittel (lube in data/mining.js)
      const L = DRILLS[b.t] && DRILLS[b.t].lube;
      if (L) { if (item !== L.it || (b.buf[item] || 0) >= L.buf) return false; b.buf[item] = (b.buf[item] || 0) + 1; return true; }
      // Rezept-Gebäude: nur Zutaten des aktiven Rezepts, bis zum Doppelten der Rezeptmenge (mindestens 5)
      if (!RECIPES_OF[b.t]) return false;
      const R = recipeOf(b), n = R && R.in[item];
      if (!n || (b.buf[item] || 0) >= inCap(n)) return false;
      b.buf[item] = (b.buf[item] || 0) + 1; return true;
    }
  }
}
// Ein Item in Bewegungsrichtung dir auf Kachel (tx,ty) übergeben.
// sp = Tempo, mit dem es ankommt (Items/s des zuführenden Bands); Splitter, Überlauf-Tor und Brücke laufen so schnell weiter.
export function offer(g, tx, ty, item, dir, sp) {
  const t = bAt(g, tx, ty);
  if (!t) return false;
  switch (t.t) {
    case 'band': case 'band2': case 'band3':
      if (t.it || t.d === (dir + 2) % 4) return false;
      t.it = item; t.p = 0; return true;
    case 'splitter': case 'ueberlauf':
      if (t.it) return false;
      t.it = item; t.p = 0; t.from = (dir + 2) % 4; t.sp = sp || BD.band.speed; return true;     // from = Seite, von der es kam
    case 'kreuzung': {
      if (!t.ln) t.ln = [null, null];
      const ax = dir % 2;
      if (t.ln[ax]) return false;
      t.ln[ax] = { it: item, p: 0, d: dir, sp: sp || BD.band.speed }; return true;
    }
    case 'tor':
      if (t.cl || t.it || t.d === (dir + 2) % 4) return false;
      t.it = item; t.p = 0; t.sp = sp || BD.band.speed; return true;
    case 'bandbruecke': return bridgeTake(t, item, dir, sp);
    case 'sortierer':   // nur von hinten (Laufrichtung = Pfeil)
      if (t.it || dir !== t.d) return false;
      t.it = item; t.p = 0; t.sp = sp || BD.band.speed; return true;
    case 'extraktor': return false;
    default: {
      if (STEG.has(t.t) && !inBody(t, tx, ty)) return false;   // Steg nimmt nichts an
      if (!accept(g, t, item)) return false;
      if (g.inspect.has(t.id)) ioAdd(g, t, 'in', item);
      return true;
    }
  }
}
// Ausgabe-Bänder: angrenzende Bänder, die nicht ins Gebäude zeigen
export function outputsOf(g, b) {
  if (b._ov === g.topoVer) return b._outs;
  const def = BD[b.t], res = [], seen = new Set();
  for (const p of perim(b.x, b.y, def.w, def.h)) {
    const t = bAt(g, p.x, p.y);
    if (!t || seen.has(t.id) || !CONVEY.has(t.t)) continue;
    const fx = t.x + DIRS[t.d][0], fy = t.y + DIRS[t.d][1];
    if (fx >= b.x && fx < b.x + def.w && fy >= b.y && fy < b.y + def.h) continue;
    seen.add(t.id); res.push(t.id);
  }
  b._outs = res; b._ov = g.topoVer;
  return res;
}
export function emit(g, b, item) {
  const outs = outputsOf(g, b), n = outs.length;
  if (!n) return false;
  b._rr = b._rr || 0;
  for (let k = 0; k < n; k++) {
    const idx = (b._rr + k) % n, t = g.blds.get(outs[idx]);
    if (t && !t.it) { t.it = item; t.p = 0; b._rr = idx + 1; if (g.inspect.has(b.id)) ioAdd(g, b, 'out', item); return true; }
  }
  return false;
}
export function addOut(g, b, item, n) { const M = pst(g, ownerOf(b)).stats.made; b.out[item] = (b.out[item] || 0) + n; M[item] = (M[item] || 0) + n; flowAdd(g, b.isl, 'm', item, n, b.t); }
export function flush(g, b) { for (const it in b.out) if (b.out[it] > 0 && emit(g, b, it)) b.out[it]--; }
// Richtung, in die ein Teil an (x, y) Items abgibt, die bei b ankommen können (-1 = keine / alle Seiten).
// Zuläufe für die Kurvenerkennung: Bänder, Tor (Pfeilrichtung), Kreuzung (Ausgang in Richtung b),
// Brückenband-Ausgang (Laufrichtung), Splitter und Überlauf-Tor (geben in alle Richtungen aus).
function feedDir(g, t, b) {
  if (CONVEY.has(t.t) || t.t === 'tor') return t.d;
  if (t.t === 'splitter' || t.t === 'ueberlauf' || t.t === 'sortierer') return -1;
  if (t.t === 'kreuzung') {   // Ausgang Richtung b, wenn auf der Gegenseite etwas hineinläuft
    const dx = b.x - t.x, dy = b.y - t.y, d = DIRS.findIndex(v => v[0] === dx && v[1] === dy);
    if (d < 0) return -2;
    const s = bAt(g, t.x - dx, t.y - dy);
    return s && (s.t === 'extraktor' || ((CONVEY.has(s.t) || s.t === 'tor') && s.d === d)) ? d : -2;
  }
  if (t.t === 'bandbruecke') { const e = bridgeSrc(g, t); return e ? e.bl[0] : -2; }
  return -2;
}
// Zeigt das Teil auf (x,y) in Richtung von b? (strict: nur Bänder, für Splitter und Überlauf-Tor)
export function feeds(g, x, y, b, strict) {
  const t = bAt(g, x, y);
  if (!t) return false;
  if (strict) return CONVEY.has(t.t) && t.x + DIRS[t.d][0] === b.x && t.y + DIRS[t.d][1] === b.y;
  // Extraktor: speist Bänder und Tore, die nicht in ihn hineinzeigen (wegführend oder seitlich vorbei), sonst alles daneben
  if (t.t === 'extraktor') {
    const d = DIRS.findIndex(v => v[0] === b.x - t.x && v[1] === b.y - t.y);
    return d >= 0 && (!(CONVEY.has(b.t) || b.t === 'tor') || b.d !== (d + 2) % 4);
  }
  const d = feedDir(g, t, b);
  if (d === -2) return false;
  if (d === -1) {   // gibt in alle Richtungen aus: zählt nur, wenn es nicht von b gespeist wird
    return !(b.x + DIRS[b.d][0] === t.x && b.y + DIRS[b.d][1] === t.y);
  }
  return t.x + DIRS[d][0] === b.x && t.y + DIRS[d][1] === b.y;
}
// Brückenband-Ende, das in t mündet (t ist Ausgang), ohne Import von buildings.js-Hilfen im Takt
function bridgeSrc(g, t) {
  for (let d = 0; d < 4; d++) for (let n = 1; n <= BELT_BRIDGE.range + 1; n++) {
    const e = bAt(g, t.x + DIRS[d][0] * n, t.y + DIRS[d][1] * n);
    if (e && e.t === 'bandbruecke' && e.bl && e.bl[0] === (d + 2) % 4 && e.bl[1] === n) return e;
  }
  return null;
}
// -1 = gerade, 0/1 = Kurve (Zulauf von links/rechts)
export function beltShape(g, b) {
  if (b._sv === g.topoVer) return b._sh;
  let sh = -1;
  const bk = (b.d + 2) % 4;
  if (!feeds(g, b.x + DIRS[bk][0], b.y + DIRS[bk][1], b)) {
    const s0 = (b.d + 3) % 4, s1 = (b.d + 1) % 4;
    const f0 = feeds(g, b.x + DIRS[s0][0], b.y + DIRS[s0][1], b), f1 = feeds(g, b.x + DIRS[s1][0], b.y + DIRS[s1][1], b);
    if (f0 !== f1) sh = f0 ? 0 : 1;
  }
  b._sv = g.topoVer; b._sh = sh;
  return sh;
}

/* ---------- Ticks der Logistik-Teile ---------- */
// Fortschritt gilt ab 1 − EPS als angekommen (sonst kostet die Rundung bei 0,1er-Schritten einen Takt: Schnellband 1,8 statt 2 Items/s)
const EPS = 1e-6;
function tickBelt(g, b, dt) {
  if (!b.it) return;
  b.p += dt * BD[b.t].speed;
  if (b.p < 1 - EPS) return;
  b.p = 1;
  if (offer(g, b.x + DIRS[b.d][0], b.y + DIRS[b.d][1], b.it, b.d, BD[b.t].speed)) { if (g.inspect.has(b.id)) ioAdd(g, b, 'out', b.it); b.it = null; }
}
// Tempo eines Splitters/Überlauf-Tors: das des Bands, von dem das Item kam (ohne Angabe: Fließband Mk1)
const spOf = (b) => b.sp || BD.band.speed;

/* ---------- Brückenband ---------- */
// Eingang (Ende mit Verbindung b.bl = [Richtung, Abstand]): nimmt von allen Seiten außer der Seite zum Ausgang.
// Tempo = das schnellste Band, das in der letzten Sekunde etwas angeboten hat (b.fs, höchstens BELT_BRIDGE.max),
// ohne zuführendes Band BELT_BRIDGE.rate. Puffer BELT_BRIDGE.buf. Die Items gleiten auf der Schiene (b.q: [{ it, p, sp }], p in Feldern).
const bridgeRate = (sp) => Math.min(BELT_BRIDGE.max, sp || BELT_BRIDGE.rate);
export function bridgeTake(t, item, dir, sp) {
  if (!t.bl || (dir + 2) % 4 === t.bl[0]) return false;
  const r = bridgeRate(sp);
  if (r >= (t.fs || 0)) { t.fs = r; t._fa = 0; }   // schnellster Zulauf
  if ((t._cd || 0) > 0) return false;
  const q = t.q || (t.q = []);
  if (q.length >= BELT_BRIDGE.buf) return false;
  q.push({ it: item, p: 0, sp: t.fs });
  t._cd = Math.max(-0.5 / t.fs, t._cd || 0) + 1 / t.fs;   // Rest des Takts mitnehmen (sonst Rundungsverlust)
  return true;
}
function tickBridge(g, b, dt) {
  if (b._cd > 0) b._cd -= dt;
  if (b.fs && (b._fa = (b._fa || 0) + dt) > 1.5) { b.fs = 0; b._fa = 0; }   // Zulauf versiegt
  const q = b.q;
  if (!b.bl || !q || !q.length) return;
  const [d, n] = b.bl, gap = n / BELT_BRIDGE.buf;
  for (let i = 0; i < q.length; i++) q[i].p = Math.max(q[i].p, Math.min(n, q[i].p + dt * BELT_BRIDGE.glide, i ? q[i - 1].p - gap : n));
  const f = q[0];
  if (f.p < n - EPS) return;
  const e = bAt(g, b.x + DIRS[d][0] * n, b.y + DIRS[d][1] * n);
  if (!e || e.t !== 'bandbruecke') return;   // Ausgang fehlt: Items warten
  let ok;
  if (e.bl) { const eq = e.q || (e.q = []); ok = eq.length < BELT_BRIDGE.buf && (d + 2) % 4 !== e.bl[0]; if (ok) eq.push({ it: f.it, p: 0, sp: f.sp }); }   // Kette
  else ok = offer(g, e.x + DIRS[d][0], e.y + DIRS[d][1], f.it, d, bridgeRate(f.sp));
  if (ok) { if (g.inspect.has(b.id)) ioAdd(g, b, 'out', f.it); q.shift(); }
}

/* ---------- Tor ---------- */
// Offen: wie ein gerades Band im Tempo des zuführenden Bands. Geschlossen: hält das Item fest.
function tickGate(g, b, dt) {
  if (!b.it || b.cl) return;
  const sp = spOf(b);
  b.p += dt * sp;
  if (b.p < 1 - EPS) return;
  b.p = 1;
  if (offer(g, b.x + DIRS[b.d][0], b.y + DIRS[b.d][1], b.it, b.d, sp)) b.it = null;
}
// Automatik (alle GATE.every s aus sim/sim.js): schließen bei Bestand ≥ hi, öffnen unter lo (Inselinventar)
export function gateCheck(g) {
  for (const b of g.blds.values()) {
    if (b.t !== 'tor' || !b.ga) continue;
    const n = (islData(g, b.isl).inv[b.ga.it] || 0);
    if (!b.cl && n >= b.ga.hi) b.cl = true;
    else if (b.cl && n < b.ga.lo) b.cl = false;
  }
}

/* ---------- Sortierer ---------- */
// b.so = { it: gewählte Ware ('' = keine), rv: umgekehrt }. Normal: gewählte Ware geradeaus, andere abwechselnd links/rechts
// (b.tg; ist eine Seite blockiert, die andere). Umgekehrt: gewählte Ware zur Seite, andere geradeaus. Tempo des zuführenden Bands.
export function sorterStraight(b, it) { const so = b.so || {}, m = !!so.it && it === so.it; return so.rv ? !m : m; }
function tickSorter(g, b, dt) {
  if (!b.it) return;
  const sp = spOf(b);
  b.p += dt * sp;
  if (b.p < 1 - EPS) return;
  b.p = 1;
  const go = (d) => {
    if (!offer(g, b.x + DIRS[d][0], b.y + DIRS[d][1], b.it, d, sp)) return false;
    if (g.inspect.has(b.id)) ioAdd(g, b, 'out', b.it);
    b.it = null; return true;
  };
  if (sorterStraight(b, b.it)) { go(b.d); return; }
  for (let k = 0; k < 2; k++) {
    const s = (b.tg + k) % 2, d = s ? (b.d + 1) % 4 : (b.d + 3) % 4;
    if (go(d)) { b.tg = (s + 1) % 2; return; }
  }
}

/* ---------- Extraktor (Version 18: wie der Unloader in Mindustry; 0.17.0: parallele Bänder und Ausgleich) ---------- */
// Schlichter Block ohne Richtung. Quellen: alle angrenzenden Gebäude mit Waren – Speicher (Hauptkontor, Lagerkiste, Handelskontor)
// aus ihrem Bestand, alle anderen aus ihrer Ausgabe (b.out, z. B. Sägewerk, Schmelzofen, Bohrer, Drohnen-Kiste).
// Ziele: angrenzende Bänder und Tore, die nicht in den Extraktor hineinzeigen (wegführend oder seitlich vorbei), andere
// Logistik-Teile (Splitter, Kreuzung, Brückenband …) und angrenzende Gebäude, die die Ware annehmen – nie das Gebäude, aus dem sie kommt,
// und nie auf ein Band, dessen Strang wieder in die Quelle mündet (sonst liefen Waren im Kreis, z. B. am Hauptkontor).
// Von Speicher zu Speicher nur aus Lagerkiste/Handelskontor ins Hauptkontor (sonst pendelten Waren zwischen zwei Speichern).
// Ausgleich: Gebäude daneben, die dieselbe Ware lagern bzw. als Zutat annehmen (zwei Öfen, zwei Kisten), werden auf gleichen
// Füllstand (relativ zur Kapazität) gebracht – nur, wenn der Unterschied danach nicht umkippt (gleiche Kapazität: ≥ 2 Items).
// Ausgabe und Ausgleich laufen reihum über dieselbe Kandidatenliste; der Filter gilt für beides.
// b.ex = Filter ('' = reihum alles). b.fd = Richtung eines alten Extraktors (vor Version 18), dessen Band davor quer lief
// (save/serialize.js migrate17); seit 0.17.0 liefert er dorthin ohnehin.
const LOGI = new Set([...FLAT, 'extraktor']);
// Gebäude, in das ein Bandstrang ab t mündet (Bänder und Tore geradeaus verfolgt), sonst null
function beltEnd(g, t) {
  const seen = new Set();
  for (let n = 0; n < 256 && t && (CONVEY.has(t.t) || t.t === 'tor'); n++) {
    if (seen.has(t.id)) return null;
    seen.add(t.id);
    t = bAt(g, t.x + DIRS[t.d][0], t.y + DIRS[t.d][1]);
  }
  return t && !LOGI.has(t.t) ? t.id : null;
}
// Nachbarn (gecacht je topoVer): src = Gebäude, die Waren abgeben können; out = Ziele { id, x, y, d, b: Gebäude?, end: Mündung }; rate = Items/s
export function extractNear(g, b) {
  if (b._xv === g.topoVer && b._xn) return b._xn;
  const src = [], out = [];
  let rate = 0;
  for (let d = 0; d < 4; d++) {
    const x = b.x + DIRS[d][0], y = b.y + DIRS[d][1], t = bAt(g, x, y);
    if (!t || t.t === 'extraktor' || t.npc) continue;
    if (LOGI.has(t.t)) {
      let end = null;
      if (CONVEY.has(t.t) || t.t === 'tor') {
        if (t.d === (d + 2) % 4) continue;   // zeigt in den Extraktor hinein
        rate = Math.max(rate, CONVEY.has(t.t) ? BD[t.t].speed : BD.band.speed);
        end = beltEnd(g, t);
      } else rate = Math.max(rate, EXTRACT.building);
      out.push({ id: t.id, x, y, d, b: false, end });
      continue;
    }
    if (STEG.has(t.t) && !inBody(t, x, y)) continue;   // Steg
    if (src.includes(t.id)) continue;
    src.push(t.id);
    out.push({ id: t.id, x, y, d, b: true, end: null });
    rate = Math.max(rate, EXTRACT.building);
  }
  b._xn = { src, out, rate }; b._xv = g.topoVer;
  return b._xn;
}
// Bestand, aus dem der Extraktor nimmt (Speicher: Inventar, sonst Ausgabe)
export const extractStock = (g, s) => isStore(s) ? stockOf(g, s) : (s.out || {});
// Darf eine Ware von s nach t (Gebäude)? Nie zurück, Speicher → Speicher nur Kiste/Handelskontor → Hauptkontor
function extractTo(s, t) { return t.id !== s.id && (!isStore(s) || !isStore(t) || (HQ.has(t.t) && !HQ.has(s.t))); }
// Mündet der Bandstrang o in die Quelle s (dasselbe Gebäude oder ein Hauptkontor derselben Insel)?
function loopsBack(g, s, o) {
  if (o.end == null) return false;
  if (o.end === s.id) return true;
  const e = g.blds.get(o.end);
  return !!e && HQ.has(e.t) && HQ.has(s.t) && e.isl === s.isl;
}
// Lager eines Gebäudes für den Ausgleich: { inv, n, cap } – Lagerkiste/Handelskontor (Bestand je Ware),
// Rezept-Gebäude (Zutaten-Puffer des aktiven Rezepts), Bohrer (Schmiermittel), Dampfkraftwerk (Brennstoff, Puffer für alle Sorten).
// Hauptkontor nicht (es gibt nie an Speicher ab), sonst null.
function balStock(g, b, it) {
  if (b.dmg) return null;
  if (isStore(b)) { if (HQ.has(b.t)) return null; const inv = b.inv || (b.inv = {}); return { inv, n: inv[it] || 0, cap: storeCap(g, b) }; }
  if (!b.buf) return null;
  if (b.t === 'kraftwerk') {
    if ((ITEMS[it].burn || 0) < KRAFTWERK.fuelMin) return null;
    let n = 0;
    for (const k in b.buf) n += b.buf[k];
    return { inv: b.buf, n, cap: KRAFTWERK.buf };
  }
  const L = DRILLS[b.t] && DRILLS[b.t].lube;
  if (L) return L.it === it ? { inv: b.buf, n: b.buf[it] || 0, cap: L.buf } : null;
  if (!RECIPES_OF[b.t]) return null;
  const R = recipeOf(b), q = R && R.in[it];
  return q ? { inv: b.buf, n: b.buf[it] || 0, cap: inCap(q) } : null;
}
// Ausgleich s → t lohnt: s hat mehr (relativ), und nach dem Verschieben eines Items ist s noch mindestens so voll wie t
function balWorth(S, T) { return S.inv[S.it] >= 1 && (S.n - 1) / S.cap >= (T.n + 1) / T.cap; }
// Gebäude, aus denen er gerade nehmen kann bzw. an die er abgeben kann (Anzeige und Status)
export function extractInfo(g, b) {
  const N = extractNear(g, b), from = [], to = [];
  for (const id of N.src) { const s = g.blds.get(id); if (s && (isStore(s) || PRODUCERS.has(s.t) || RECIPES_OF[s.t] || s.t === 'dkiste' || Object.keys(s.out || {}).length)) from.push(s); }
  for (const o of N.out) { const t = g.blds.get(o.id); if (t) to.push(t); }
  return { from, to, rate: N.rate || EXTRACT.building };
}
function tickExtract(g, b, dt) {
  const N = extractNear(g, b);
  if (!N.src.length || !N.out.length) { b.acc = 0; return; }
  b.acc = Math.min(1, (b.acc || 0) + dt * N.rate);
  if (b.acc < 1 - EPS) return;
  // Kandidaten [Quelle, Ware, Ausgleich?], reihum über alle Quellen und Waren: Ausgabe (Bestand bzw. b.out) und Ausgleich (Lager)
  const cand = [];
  for (const id of N.src) {
    const s = g.blds.get(id);
    if (!s) continue;
    const inv = extractStock(g, s);
    if (b.ex) { if ((inv[b.ex] || 0) >= 1) cand.push(s, b.ex, false); }
    else for (const it of Object.keys(inv).sort()) if (inv[it] >= 1) cand.push(s, it, false);
    if (N.src.length < 2) continue;
    const pool = isStore(s) ? (HQ.has(s.t) ? null : inv) : s.buf;
    if (!pool) continue;
    if (b.ex) { if ((pool[b.ex] || 0) >= 1) cand.push(s, b.ex, true); }
    else for (const it of Object.keys(pool).sort()) if (pool[it] >= 1) cand.push(s, it, true);
  }
  const n = (cand.length / 3) | 0, r0 = (b._ri || 0) % Math.max(1, n), m = N.out.length, o0 = (b._ro || 0) % m;
  for (let k = 0; k < n; k++) {
    const i = (r0 + k) % n, s = cand[3 * i], it = cand[3 * i + 1], bal = cand[3 * i + 2];
    const S = bal && balStock(g, s, it);
    if (bal && !S) continue;
    if (S) S.it = it;
    for (let j = 0; j < m; j++) {
      const o = N.out[(o0 + j) % m];
      let inv;
      if (bal) {   // Ausgleich: nur Speicher ↔ Speicher bzw. Puffer ↔ Puffer (sonst Pendeln Ofen → Kiste → Ofen), Ziel weniger voll
        const t = o.b && o.id !== s.id && g.blds.get(o.id), T = t && isStore(t) === isStore(s) && balStock(g, t, it);
        if (!T || !balWorth(S, T) || !offer(g, o.x, o.y, it, o.d, N.rate)) continue;
        inv = S.inv;
      } else {
        if (o.b) { const t = g.blds.get(o.id); if (!t || !extractTo(s, t)) continue; }
        else if (loopsBack(g, s, o)) continue;
        if (!offer(g, o.x, o.y, it, o.d, N.rate)) continue;
        inv = extractStock(g, s);
      }
      inv[it]--;
      if (inv[it] <= 0 && !HQ.has(s.t)) delete inv[it];
      if (HQ.has(s.t)) flowAdd(g, s.isl, 'c', it, 1, 'extraktor');
      if (g.inspect.has(b.id)) ioAdd(g, b, 'out', it);
      if (g.inspect.has(s.id)) ioAdd(g, s, 'out', it);
      b._ri = (i + 1) % n; b._ro = ((o0 + j) % m + 1) % m;
      b.acc -= 1;
      b._it = it;   // zuletzt bewegte Ware (Anzeige)
      return;
    }
  }
}
export const LOGISTICS_TICKS = {
  band: tickBelt, band2: tickBelt, band3: tickBelt,
  splitter(g, b, dt) {
    if (!b.it) return;
    b.p += dt * spOf(b);
    if (b.p < 1 - EPS) return;
    b.p = 1;
    const outs = [];
    for (let d = 0; d < 4; d++) { if (d === b.from || feeds(g, b.x + DIRS[d][0], b.y + DIRS[d][1], b, true)) continue; outs.push(d); }
    const n = outs.length;
    for (let k = 0; k < n; k++) {
      const d = outs[(b.tg + k) % n];
      if (offer(g, b.x + DIRS[d][0], b.y + DIRS[d][1], b.it, d, spOf(b))) { b.it = null; b.tg = (b.tg + k + 1) % 12; return; }
    }
  },
  ueberlauf(g, b, dt) {
    if (!b.it) return;
    b.p += dt * spOf(b);
    if (b.p < 1 - EPS) return;
    b.p = 1;
    const fw = ((b.from == null ? 2 : b.from) + 2) % 4;
    if (offer(g, b.x + DIRS[fw][0], b.y + DIRS[fw][1], b.it, fw, spOf(b))) { b.it = null; return; }
    for (let k = 0; k < 2; k++) {
      const d = ((b.tg + k) % 2) ? (fw + 1) % 4 : (fw + 3) % 4;
      if (feeds(g, b.x + DIRS[d][0], b.y + DIRS[d][1], b, true)) continue;
      if (offer(g, b.x + DIRS[d][0], b.y + DIRS[d][1], b.it, d, spOf(b))) { b.it = null; b.tg = (b.tg + k + 1) % 2; return; }
    }
  },
  kreuzung(g, b, dt) {
    if (!b.ln) b.ln = [null, null];
    for (let ax = 0; ax < 2; ax++) {
      const L = b.ln[ax];
      if (!L) continue;
      const sp = L.sp || BD.band.speed;
      L.p = Math.min(1, L.p + dt * sp);
      if (L.p < 1 - EPS) continue;
      if (offer(g, b.x + DIRS[L.d][0], b.y + DIRS[L.d][1], L.it, L.d, sp)) { if (g.inspect.has(b.id)) ioAdd(g, b, 'out', L.it); b.ln[ax] = null; }
    }
  },
  tor: tickGate, bandbruecke: tickBridge, extraktor: tickExtract, sortierer: tickSorter
};

/* ---------- Bänder ziehen (sim/sim.js paint, Vorschau im Bau-Hinweis) ---------- */
// Hindernis für ein Brückenband: aufgedeckt und Gebäude ohne Band-Funktion, Wasser, Berg oder Lava
export function beltObstacle(g, x, y) {
  if (!fogOf(g).get(x, y)) return false;
  const b = bAt(g, x, y);
  if (b) return !FLAT.has(b.t);
  const gr = g.W.gr(x, y);
  return g.W.il(x, y) < 0 || gr === G_MOUNT || gr === G_LAVA || !BUILDABLE[gr];
}
// Gerades Band quer zur Zugrichtung sd, das die Kreuzung werden kann
export function crossable(g, ex, sd) { return !!ex && CONVEY.has(ex.t) && ex.d % 2 !== sd % 2 && beltShape(g, ex) < 0; }
