/* =========================================================
   DROHNEN: Drohnenhafen und Drohnenkisten (data/drones.js)
   Drohnenhafen b.dr = [{ x, y, st, job, c, tm }]  (Position in Feldern, Mitte; gespeichert)
     st:  'idle' (im Hafen) | 'pick' (fliegt zur Anbieten-Kiste) | 'drop' (bringt c zur Anfordern-Kiste)
          | 'fix' (fliegt zum beschädigten Gebäude) | 'work' (repariert, tm s) | 'home' (zurück zum Hafen)
     job: { a (Quelle), b (Ziel), it, n } oder { fix (Gebäude-ID) }, c: { it, n } = Ladung
   Drohnenkiste: b.dm = 'offer' (Anbieten: nimmt vom Band an, b.inv, höchstens DKISTE.buf) | 'req' (Anfordern: b.dw = { it, n },
     Bestand in b.out, wird auf abgehende Bänder ausgegeben).
   Drohnen fliegen nur zwischen Kisten im Radius ihres Hafens (gleiche Insel); Lagerhallen und Kontore nehmen nicht teil.
   Strom: DRONES.power Grundlast + DRONES.perFlying je fliegender Drohne. Ohne Strom starten keine neuen Flüge.
   Aufträge werden nicht gespeichert vorgemerkt (Reservierungen ergeben sich aus den fliegenden Drohnen).
   Kein DOM-Zugriff.
   ========================================================= */
import { DRONES, DKISTE } from '../data/drones.js';
import { BD } from '../data/buildings.js';
import { ITEMS } from '../data/items.js';
import { mods } from './mods.js';
import { drawPower, bdist } from './power.js';
import { flush } from './logistics.js';
import { storeInsert } from './logistics.js';
import { repairCost, repair } from './events.js';
import { afford, ownerOf } from './state.js';
import { stashToHQ } from './buildings.js';

const mid = (b) => ({ x: b.x + BD[b.t].w / 2, y: b.y + BD[b.t].h / 2 });
// Getrennte Inseln: nur Kisten und Gebäude des Besitzers (in „Gemeinsame Insel“ gehört alles allen)
export const inReach = (hub, b) => b.isl === hub.isl && bdist(hub, b) <= DRONES.radius && ownerOf(b) === ownerOf(hub);
export const flying = (b) => (b.dr || []).filter(d => d.st !== 'idle').length;
const dkInv = (b) => { let n = 0; for (const it in b.inv || {}) n += b.inv[it]; return n; };

// Drohnenkiste nimmt vom Band an (nur Anbieten)
export function dkAccept(b, item) {
  if (b.dm === 'req' || dkInv(b) >= DKISTE.buf) return false;
  b.inv = b.inv || {};
  b.inv[item] = (b.inv[item] || 0) + 1;
  return true;
}
export function tickDKiste(g, b) { if (b.dm === 'req') flush(g, b); }
// Modus / Anforderung setzen (Kommando 'dkiste'); Bestand wechselt mit in den neuen Modus
export function setDKiste(g, b, c) {
  if (c.dm === 'offer' || c.dm === 'req') {
    if (c.dm !== b.dm) {
      if (c.dm === 'req') { for (const it in b.inv || {}) b.out[it] = (b.out[it] || 0) + b.inv[it]; b.inv = {}; }
      else { const o = b.out; b.out = {}; b.inv = b.inv || {}; for (const it in o) { const m = Math.max(0, Math.min(o[it], DKISTE.buf - dkInv(b))); if (m) b.inv[it] = (b.inv[it] || 0) + m; o[it] -= m; } stashToHQ(g, b.isl, o); }
      b.dm = c.dm;
    }
  }
  if (c.it !== undefined) {
    if (c.it && ITEMS[c.it]) b.dw = { it: c.it, n: Math.max(0, Math.min(DKISTE.reqMax, Math.floor(+c.n) || 0)) };
    else if (c.it === '') b.dw = null;
  }
  g.topoVer++;
}

/* ---------- Drohnenhafen ---------- */
function allDrones(g) {
  const o = [];
  for (const b of g.blds.values()) if (b.t === 'drohnenhafen' && b.dr) for (const d of b.dr) o.push(d);
  return o;
}
// Schon vorgemerkt: aus Kiste a abzuholen (Ware it), zu Kiste b unterwegs, Gebäude in Reparatur
function plans(g) {
  const out = new Map(), inc = new Map(), fix = new Set();
  for (const d of allDrones(g)) {
    const j = d.job;
    if (!j) continue;
    if (j.fix != null) { fix.add(j.fix); continue; }
    if (d.st === 'pick') { const k = j.a + ':' + j.it; out.set(k, (out.get(k) || 0) + j.n); }
    if (d.st === 'pick' || d.st === 'drop') inc.set(j.b, (inc.get(j.b) || 0) + (d.c ? d.c.n : j.n));
  }
  return { out, inc, fix };
}
// Offene Anforderungen im Radius (für Info-Panel und Vergabe): [{ R, it, need }]
export function requests(g, hub, P) {
  P = P || plans(g);
  const o = [];
  for (const R of g.blds.values()) {
    if (R.t !== 'dkiste' || R.dm !== 'req' || !R.dw || !R.dw.it || !inReach(hub, R)) continue;
    const need = R.dw.n - (R.out[R.dw.it] || 0) - (P.inc.get(R.id) || 0);
    if (need > 0) o.push({ R, it: R.dw.it, need });
  }
  return o;
}
function assign(g, b) {
  const idle = b.dr.filter(d => d.st === 'idle');
  if (!idle.length) return;
  const P = plans(g);
  // Reparaturen zuerst
  for (const t of g.blds.values()) {
    if (!idle.length) return;
    if (!t.dmg || P.fix.has(t.id) || !inReach(b, t) || !afford(g, t.isl, repairCost(t))) continue;
    const d = idle.shift();
    d.st = 'fix'; d.job = { fix: t.id }; P.fix.add(t.id);
  }
  for (const q of requests(g, b, P)) {
    let need = q.need;
    while (need > 0 && idle.length) {
      let best = null, bd = Infinity, avail = 0;
      for (const A of g.blds.values()) {
        if (A.t !== 'dkiste' || A.dm === 'req' || !inReach(b, A)) continue;
        const v = ((A.inv || {})[q.it] || 0) - (P.out.get(A.id + ':' + q.it) || 0);
        if (v <= 0) continue;
        const dd = bdist(A, q.R);
        if (dd < bd) { bd = dd; best = A; avail = v; }
      }
      if (!best) break;
      const n = Math.min(DRONES.stack, need, avail), d = idle.shift();
      d.st = 'pick'; d.job = { a: best.id, b: q.R.id, it: q.it, n }; d.c = null;
      const k = best.id + ':' + q.it;
      P.out.set(k, (P.out.get(k) || 0) + n); P.inc.set(q.R.id, (P.inc.get(q.R.id) || 0) + n);
      need -= n;
    }
  }
}
// Drohne d fliegt Richtung (tx, ty); true = angekommen
function fly(d, tx, ty, step) {
  const dx = tx - d.x, dy = ty - d.y, L = Math.hypot(dx, dy);
  if (L <= step) { d.x = tx; d.y = ty; return true; }
  d.x += dx / L * step; d.y += dy / L * step;
  return false;
}
function home(d) { d.st = 'home'; d.job = null; }
export function tickHub(g, b, dt) {
  const n = mods(g, ownerOf(b)).drones, h = mid(b);
  b.dr = b.dr || [];
  while (b.dr.length < n) b.dr.push({ x: h.x, y: h.y, st: 'idle', job: null, c: null, tm: 0 });
  if (b.dr.length > n) b.dr = b.dr.filter((d, i) => i < n || d.st !== 'idle');
  const fl = flying(b);
  b._pw = drawPower(g, b, (DRONES.power + DRONES.perFlying * fl) * dt);
  b._act = fl > 0; b._st = b._pw ? '' : 'power';
  const step = DRONES.speed * dt;
  for (const d of b.dr) {
    if (d.st === 'idle') continue;
    if (d.st === 'home') { if (fly(d, h.x, h.y, step)) { if (d.c) { for (let i = 0; i < d.c.n; i++) if (!storeInsert(g, b.isl, d.c.it, false)) break; d.c = null; } d.st = 'idle'; } continue; }
    if (d.st === 'work') {
      d.tm -= dt;
      if (d.tm <= 0) { repair(g, g.blds.get(d.job.fix), 'drone'); home(d); }
      continue;
    }
    const j = d.job, tgt = g.blds.get(d.st === 'pick' ? j.a : d.st === 'drop' ? j.b : j.fix);
    if (!tgt || (d.st === 'fix' && !tgt.dmg)) { home(d); continue; }
    const p = mid(tgt);
    if (!fly(d, p.x, p.y, step)) continue;
    if (d.st === 'pick') {
      const m = Math.min(j.n, (tgt.inv || {})[j.it] || 0);
      if (m <= 0) { home(d); continue; }
      tgt.inv[j.it] -= m; if (tgt.inv[j.it] <= 0) delete tgt.inv[j.it];
      d.c = { it: j.it, n: m }; d.st = 'drop';
    } else if (d.st === 'drop') {
      tgt.out[d.c.it] = (tgt.out[d.c.it] || 0) + d.c.n;
      const tl = b._tl || (b._tl = []);
      tl.push([g.state.time, d.c.n]);
      d.c = null; home(d);
    } else if (d.st === 'fix') { d.st = 'work'; d.tm = DRONES.repair; }
  }
  // Durchsatz der letzten Minute
  if (b._tl) { const t0 = g.state.time - 60; while (b._tl.length && b._tl[0][0] < t0) b._tl.shift(); b._tp = b._tl.reduce((a, x) => a + x[1], 0); }
  b._ac = (b._ac || 0) + dt;
  if (b._ac >= DRONES.every) { b._ac = 0; if (b._pw) assign(g, b); }
}
// Nach dem Laden: Drohnen ohne gültigen Auftrag zurück zum Hafen
export function resumeDrones(g) {
  for (const b of g.blds.values()) {
    if (b.t !== 'drohnenhafen' || !Array.isArray(b.dr)) continue;
    b.dr = b.dr.filter(d => d && Number.isFinite(d.x) && Number.isFinite(d.y));
    for (const d of b.dr) if (d.st !== 'idle' && d.st !== 'home' && !(d.job && g.blds.get(d.job.fix != null ? d.job.fix : d.st === 'pick' ? d.job.a : d.job.b))) home(d);
  }
}
