/* =========================================================
   PRODUKTIONSSTATISTIK: Zu- und Abgänge je Insel und Item
   Ring-Puffer mit Fächern zu FLOW_BUCKET Sekunden (Spielzeit) für die letzten 15 Minuten.
   Je Fach und Art (p/c/m) zählt ein Objekt { item: { quelle: anzahl } }:
     p – ins Lager-Netzwerk gelangt (Bänder, Schiffsentladung). Rückerstattungen zählen nicht.
     c – aus dem Inselinventar genommen (Häuser, Bauen, Schiffbau, Forschung, Schiffsbeladung, Extraktoren)
     e – Strom { g: erzeugt, d: Bedarf, s: versorgt } (Summe der Sekunden im Fach)
   Einmalige Posten (Bauen, Forschung, Schiffbau, Leeren; data/stats.js ONE_OFF) zählen nicht in Rate und Netto (flowRates),
   sondern getrennt (flowOneOff).
     m – Ausgabe der Produktionsgebäude (addOut), egal wohin sie danach geht
     u – Verbrauch der Gebäude (Zutaten, Schmiermittel, Bedarf der Häuser); Ist = m − u (Vergleich mit Soll, sim/soll.js)
   Gespeichert in state.flow (wird mitgespeichert). Lesefunktionen werden auch von der
   Oberfläche auf dem Spiegel genutzt. Kein DOM-Zugriff.
   ========================================================= */
import { isOneOff, IO_WINDOW } from '../data/stats.js';

export const FLOW_BUCKET = 30, FLOW_BUCKETS = 30;     // 30 Fächer à 30 s = 15 min
const KINDS = ['p', 'c', 'm', 'u'];

// isl: Insel-ID → Fächer (Inseln kommen beim ersten Eintrag dazu)
export function freshFlow() { return { isl: {} }; }
// Prüft einen geladenen Stand (fehlend oder falsch geformt → neu)
export function validFlow(f) {
  return !!f && !!f.isl && typeof f.isl === 'object' && !Array.isArray(f.isl) && Object.values(f.isl).every(a => Array.isArray(a) && a.length === FLOW_BUCKETS);
}

// n Stück von item auf Insel k zählen. kind = 'p' | 'c' | 'm', src = Quelle (Gebäudetyp oder Kategorie)
export function flowAdd(g, k, kind, item, n, src) {
  if (k < 0 || !n) return;
  const st = g.state, arr = st.flow.isl[k] || (st.flow.isl[k] = new Array(FLOW_BUCKETS).fill(null));
  const abs = Math.floor(st.time / FLOW_BUCKET), slot = abs % FLOW_BUCKETS;
  let b = arr[slot];
  if (!b || b.n !== abs) b = arr[slot] = { n: abs, p: {}, c: {}, m: {}, u: {} };
  const by = (b[kind] || (b[kind] = {}))[item] || (b[kind][item] = {});
  by[src] = (by[src] || 0) + n;
}
// Veraltete Fächer entfernen (hält Snapshot und Spielstand klein)
export function pruneFlow(flow, time) {
  const abs = Math.floor(time / FLOW_BUCKET);
  for (const k in flow.isl) for (let i = 0, arr = flow.isl[k]; i < arr.length; i++) if (arr[i] && abs - arr[i].n >= FLOW_BUCKETS) arr[i] = null;
}

/* ---------- Auswertung (Simulation und Oberfläche) ---------- */
// Fach mit absoluter Nummer abs auf Insel k (oder null)
function bucketAt(flow, k, abs) { const b = flow.isl[k] && flow.isl[k][((abs % FLOW_BUCKETS) + FLOW_BUCKETS) % FLOW_BUCKETS]; return b && b.n === abs ? b : null; }
const islList = (flow, k) => k >= 0 ? [k] : Object.keys(flow.isl);
const sumSrc = (o) => { let s = 0; for (const q in o) if (!isOneOff(q)) s += o[q]; return s; };   // ohne einmalige Posten

// Raten der letzten 60 s (= pro Minute) je Item: { item: { p, c, m, src: { p: {quelle: n}, c: {…}, m: {…} } } }
// Das aktuelle Fach zählt ganz, das vorletzte anteilig, sodass zusammen genau 60 s abgedeckt sind.
// k = Insel, -1 = alle Inseln
export function flowRates(flow, time, k) {
  const out = {};
  if (!flow) return out;
  const abs = Math.floor(time / FLOW_BUCKET), e = time - abs * FLOW_BUCKET;
  const parts = [[abs, 1], [abs - 1, 1], [abs - 2, Math.max(0, (FLOW_BUCKET - e) / FLOW_BUCKET)]];
  for (const i of islList(flow, k)) for (const [n, w] of parts) {
    const b = bucketAt(flow, i, n);
    if (!b || !w) continue;
    for (const kind of KINDS) for (const item in b[kind] || {}) {
      const by = b[kind][item];
      let any = false;
      for (const q in by) if (!isOneOff(q)) { any = true; break; }
      if (!any) continue;
      const r = out[item] || (out[item] = { p: 0, c: 0, m: 0, u: 0, src: { p: {}, c: {}, m: {}, u: {} } });
      for (const q in by) {
        if (isOneOff(q)) continue;
        r[kind] += by[q] * w; r.src[kind][q] = (r.src[kind][q] || 0) + by[q] * w;
      }
    }
  }
  return out;
}
// Verlauf der letzten 15 min für ein Item: je Fach (ältestes zuerst) Rate pro Minute für p, c und m.
// Das laufende Fach wird auf seine bisherige Dauer hochgerechnet.
export function flowHistory(flow, time, k, item) {
  const abs = Math.floor(time / FLOW_BUCKET), e = Math.max(5, time - abs * FLOW_BUCKET);
  const p = [], c = [], m = [];
  for (let n = abs - FLOW_BUCKETS + 1; n <= abs; n++) {
    let sp = 0, sc = 0, sm = 0;
    if (flow) for (const i of islList(flow, k)) {
      const b = bucketAt(flow, i, n);
      if (!b) continue;
      if (b.p[item]) sp += sumSrc(b.p[item]);
      if (b.c[item]) sc += sumSrc(b.c[item]);
      if (b.m[item]) sm += sumSrc(b.m[item]);
    }
    const f = 60 / (n === abs ? e : FLOW_BUCKET);
    p.push(sp * f); c.push(sc * f); m.push(sm * f);
  }
  return { p, c, m };
}

/* ---------- Einmalige Posten (data/stats.js ONE_OFF) ---------- */
// Summe der einmaligen Abgänge/Zugänge der letzten 15 min je Item: { item: { c, p, src: { quelle: n } } }
export function flowOneOff(flow, time, k) {
  const out = {};
  if (!flow) return out;
  const abs = Math.floor(time / FLOW_BUCKET);
  for (const i of islList(flow, k)) for (let n = abs - FLOW_BUCKETS + 1; n <= abs; n++) {
    const b = bucketAt(flow, i, n);
    if (!b) continue;
    for (const kind of ['p', 'c']) for (const item in b[kind]) for (const q in b[kind][item]) {
      if (!isOneOff(q)) continue;
      const r = out[item] || (out[item] = { p: 0, c: 0, src: {} });
      r[kind] += b[kind][item][q]; r.src[q] = (r.src[q] || 0) + b[kind][item][q];
    }
  }
  return out;
}

/* ---------- Strom (sim/power.js powerRoll trägt einmal pro Sekunde ein) ---------- */
// gen = erzeugt, dem = Bedarf, sup = versorgt (Strom in dieser Sekunde)
export function flowPower(g, k, gen, dem, sup, lost) {
  if (k < 0 || (!gen && !dem)) return;
  const st = g.state, arr = st.flow.isl[k] || (st.flow.isl[k] = new Array(FLOW_BUCKETS).fill(null));
  const abs = Math.floor(st.time / FLOW_BUCKET), slot = abs % FLOW_BUCKETS;
  let b = arr[slot];
  if (!b || b.n !== abs) b = arr[slot] = { n: abs, p: {}, c: {}, m: {}, u: {} };
  const e = b.e || (b.e = { g: 0, d: 0, s: 0, w: 0 });
  e.g += gen; e.d += dem; e.s += sup; e.w = (e.w || 0) + (lost || 0);
}
// Verlauf der letzten 15 min (Strom/s je Fach, ältestes zuerst): { g: erzeugt, d: Bedarf, s: versorgt, w: verworfen }
export function powerHistory(flow, time, k) {
  const abs = Math.floor(time / FLOW_BUCKET), e = Math.max(5, time - abs * FLOW_BUCKET), o = { g: [], d: [], s: [], w: [] };
  for (let n = abs - FLOW_BUCKETS + 1; n <= abs; n++) {
    let sg = 0, sd = 0, ss = 0, sw = 0;
    if (flow) for (const i of islList(flow, k)) { const b = bucketAt(flow, i, n); if (b && b.e) { sg += b.e.g; sd += b.e.d; ss += b.e.s; sw += b.e.w || 0; } }
    const f = 1 / (n === abs ? e : FLOW_BUCKET);
    o.g.push(sg * f); o.d.push(sd * f); o.s.push(ss * f); o.w.push(sw * f);
  }
  return o;
}

/* ---------- Durchsatz des gewählten Gebäudes (Info-Panel, Kommando inspect) ---------- */
// Fächer zu IO_WINDOW.bucket Sekunden, nicht gespeichert. Jeder Spieler (pid) hat ein gewähltes Gebäude (g.inspBy);
// g.inspect ist die Menge aller gewählten Gebäude, g._io die Zähler je Gebäude.
export function ioReset(g, id, pid) {
  const by = g.inspBy || (g.inspBy = new Map()), io = g._io || (g._io = new Map());
  by.set(pid || 'host', id != null && g.blds.has(id) ? id : null);
  g.inspect = new Set([...by.values()].filter(x => x != null));
  for (const k of io.keys()) if (!g.inspect.has(k)) io.delete(k);
  if (id != null && g.inspect.has(id)) io.set(id, { id, t0: g.state.time, b: [] });   // neu wählen = neu zählen
}
export function ioAdd(g, b, kind, item, cnt) {
  const io = g._io && g._io.get(b.id);
  if (!io) return;
  const n = Math.floor(g.state.time / IO_WINDOW.bucket);
  let k = io.b[io.b.length - 1];
  if (!k || k.n !== n) { k = { n, in: {}, out: {} }; io.b.push(k); while (io.b.length > IO_WINDOW.n + 1) io.b.shift(); }
  k[kind][item] = (k[kind][item] || 0) + (cnt || 1);
}
// Raten pro Minute der letzten 60 s: { id, in: { item: n/min }, out: {…}, span }
export function ioRates(g, pid) {
  const id = g.inspBy && g.inspBy.get(pid || 'host'), io = id != null && g._io ? g._io.get(id) : null;
  if (!io || !g.blds.has(io.id)) return null;
  const t = g.state.time, win = IO_WINDOW.bucket * IO_WINDOW.n, from = t - win, span = Math.max(IO_WINDOW.bucket, Math.min(win, t - io.t0));   // erste 10 s nicht hochrechnen
  const o = { id: io.id, in: {}, out: {}, span };
  for (const k of io.b) {
    const t0 = k.n * IO_WINDOW.bucket, t1 = t0 + IO_WINDOW.bucket;
    if (t1 <= from) continue;
    const w = t0 >= from ? 1 : (t1 - from) / IO_WINDOW.bucket;
    for (const kind of ['in', 'out']) for (const it in k[kind]) o[kind][it] = (o[kind][it] || 0) + k[kind][it] * w * 60 / span;
  }
  return o;
}
