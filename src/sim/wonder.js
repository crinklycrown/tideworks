/* =========================================================
   WELTENLEUCHTTURM: Stufen als Baustelle (data/wonder.js)
   state.wonder = { ph (fertige Stufen 0–4), pb (Stufe auf der Baustelle, 0 = keine), got (gelieferte Waren der Stufe pb;
     null = alles da, z. B. Stand vor 0.18.0, als beim Beauftragen bezahlt wurde), pt (Bauzeit in s, läuft erst, wenn alles da ist),
     lager (1 = Waren auch aus dem Inselinventar nehmen), acc (Bruchteil für pull), id (Gebäude), doneAt (Spielzeit der letzten Stufe) }
   Ablauf: wonderOrder eröffnet die Baustelle der nächsten Stufe (wenn sie freigegeben ist), Bänder liefern über
   wonderAccept (sim/logistics.js accept), wonderTick holt aus dem Inselinventar und baut, sobald alles da ist.
   Fertige Stufe: Sichtweite um den Turm aufdecken, Ereignis wonderPhase, Story-Auslöser wonder:<n> (Stufe 2 → cs_licht_im_wind, Akt 3).
   Getrennte Inseln: jeder Spieler hat seinen eigenen Leuchtturm (pst(g, pid).wonder, Gebäude des Besitzers); ohne Geschichte
   gibt es dort keinen Bauplan (nur alte Spielstände). Wer Stufe 4 zuerst abschließt, steht in state.wfirst (WONDER.firstFame Ruhm).
   Kein DOM-Zugriff.
   ========================================================= */
import { WONDER, WONDER_LOCKED } from '../data/wonder.js';
import { BD } from '../data/buildings.js';
import { kontorIslands, pst, ownerOf, isSep, seatedPids, playerName, invOf, islData } from './state.js';
import { addFame } from './research.js';
import { storyEvent } from './story.js';
import { reveal } from './explore.js';
import { flowAdd } from './stats.js';

export const freshWonder = () => ({ ph: 0, pb: 0, pt: 0, got: null, lager: 1, acc: 0, id: null, doneAt: null });
export const wonderDone = (g, pid) => pst(g, pid).wonder.ph >= WONDER.phases.length;
// Leuchtturm des Gebäudes b: Werte seines Besitzers
const wOf = (g, b) => pst(g, ownerOf(b)).wonder;

// Ist Stufe n (1–4) in der Geschichte freigegeben? Ohne Geschichte (Getrennte Inseln) und für alte Türme (alt_turm) immer.
export function stageOpen(g, n) {
  const P = WONDER.phases[n - 1], S = g.state.story;
  if (!P) return false;
  if (!S || S.flags.alt_turm || !P.need) return true;
  if (P.need.act != null && S.act < P.need.act) return false;
  if (P.need.flag && !S.flags[P.need.flag]) return false;
  return true;
}
// Noch fehlende Menge der Ware it auf der Baustelle (0 = genug oder keine Baustelle)
export function wonderNeed(W, it) {
  if (!W || !W.pb || !W.got) return 0;
  const c = WONDER.phases[W.pb - 1].cost[it] || 0;
  return Math.max(0, c - (W.got[it] || 0));
}
// Sind alle Waren der Baustelle da?
export function wonderFull(W) {
  if (!W || !W.pb) return false;
  if (!W.got) return true;
  const C = WONDER.phases[W.pb - 1].cost;
  return Object.keys(C).every(it => (W.got[it] || 0) >= C[it]);
}
// Anteil der gelieferten Waren (0–1) über alle Sorten
export function wonderShare(W) {
  if (!W || !W.pb) return 0;
  if (!W.got) return 1;
  const C = WONDER.phases[W.pb - 1].cost;
  let n = 0, all = 0;
  for (const it in C) { all += C[it]; n += Math.min(C[it], W.got[it] || 0); }
  return all ? n / all : 1;
}

// Nächste Stufe eröffnen: Grund, falls es nicht geht (null = geht)
export function wonderReason(g, b) {
  const pid = ownerOf(b), W = pst(g, pid).wonder;
  if (W.pb) return `Auf der Baustelle entsteht gerade Stufe ${W.pb}.`;
  if (wonderDone(g, pid)) return 'Der Weltenleuchtturm ist vollendet.';
  if (!stageOpen(g, W.ph + 1)) return `Stufe ${W.ph + 1}: ${WONDER_LOCKED}.`;
  return null;
}
export function wonderOrder(g, b) {
  if (!b || b.t !== 'leuchtturm') return;
  const why = wonderReason(g, b), pid = ownerOf(b), W = wOf(g, b);
  if (why) { g.events.push({ type: 'fail', msg: why }); return; }
  W.pb = W.ph + 1; W.pt = 0; W.got = {}; W.acc = 0; W.id = b.id;
  if (W.lager == null) W.lager = 1;
  g.events.push({ type: 'wonderStart', ph: W.pb, name: WONDER.phases[W.pb - 1].name, pid });
}
// Schalter „Aus dem Inselinventar nehmen“
export function wonderStore(g, b, on) {
  if (!b || b.t !== 'leuchtturm') return;
  wOf(g, b).lager = on ? 1 : 0;
}
// Ein Band (oder Extraktor) liefert item an den Turm: nur Waren, die der Baustelle noch fehlen (sonst staut das Band)
export function wonderAccept(g, b, item) {
  const W = wOf(g, b);
  if (W.id == null) W.id = b.id;
  if (W.id !== b.id || wonderNeed(W, item) <= 0) return false;
  W.got[item] = (W.got[item] || 0) + 1;
  flowAdd(g, b.isl, 'c', item, 1, 'leuchtturm');
  return true;
}

export function wonderTick(g, dt) {
  if (isSep(g)) { for (const p of seatedPids(g)) tickOne(g, dt, p); return; }
  tickOne(g, dt);
}
// Waren aus dem Inselinventar holen: höchstens WONDER.pull Stück je Sekunde, reihum über die fehlenden Sorten
function pullStore(g, W, b, dt) {
  W.acc = Math.min(WONDER.pull, (W.acc || 0) + WONDER.pull * dt);
  let n = Math.floor(W.acc);
  if (n <= 0) return;
  const inv = invOf(g, b.isl), C = WONDER.phases[W.pb - 1].cost, want = Object.keys(C).filter(it => wonderNeed(W, it) > 0 && (inv[it] || 0) > 0);
  if (!want.length) { W.acc = 0; return; }
  const real = islData(g, b.isl).inv;
  for (let k = 0; n > 0 && want.length; k++) {
    const i = k % want.length, it = want[i], m = Math.min(Math.ceil(n / want.length), wonderNeed(W, it), real[it] || 0);
    if (m <= 0) { want.splice(i, 1); continue; }
    real[it] -= m; W.got[it] = (W.got[it] || 0) + m; n -= m; W.acc -= m;
    flowAdd(g, b.isl, 'c', it, m, 'leuchtturm');
    if (wonderNeed(W, it) <= 0 || !real[it]) want.splice(i, 1);
  }
}
function tickOne(g, dt, pid) {
  const st = g.state, P = pst(g, pid), W = P.wonder;
  if (!W.pb) return;
  const b = W.id != null ? g.blds.get(W.id) : null;
  if (!b) return;
  if (!wonderFull(W)) {
    if (W.lager) pullStore(g, W, b, dt);
    if (!wonderFull(W)) return;
  }
  W.pt += dt;
  if (W.pt < WONDER.build) return;
  finishStage(g, W, b, pid);
  if (wonderDone(g, pid)) wonderFinal(g, W, P, pid);
}
// Stufe fertig: Sicht um den Turm, Meldung, Geschichte
function finishStage(g, W, b, pid, quiet) {
  const sep = isSep(g);
  W.ph = W.pb; W.pb = 0; W.pt = 0; W.got = null; W.acc = 0;
  revealTower(g, b, W.ph);
  if (WONDER.fame) addFame(g, WONDER.fame, pid);
  if (quiet) return;
  const ev = { type: 'wonderPhase', ph: W.ph, name: WONDER.phases[W.ph - 1].name, fame: WONDER.fame, sight: WONDER.phases[W.ph - 1].sight };
  if (sep) ev.pid = pid;
  g.events.push(ev);
  // Wettstreit: alle bekommen eine Zeile im Chat
  if (sep) g.events.push({ type: 'wonderNews', to: '*', who: pid, name: playerName(g, pid), ph: W.ph, phase: WONDER.phases[W.ph - 1].name });
  storyEvent(g, 'wonder', W.ph);   // Geschichte: Stufe 2 → Akt 3, Stufe 4 → Finale
}
// Sichtweite der fertigen Stufe ph um den Turm aufdecken (für den Besitzer)
export function revealTower(g, b, ph) {
  const P = WONDER.phases[ph - 1];
  if (!b || !P || !P.sight) return;
  const d = BD[b.t];
  reveal(g, b.x + (d.w >> 1), b.y + (d.h >> 1), P.sight, ownerOf(b));
}
function wonderFinal(g, W, P, pid) {
  const st = g.state, sep = isSep(g);
  W.doneAt = st.time;
  let first = false;
  if (sep && !st.wfirst) {
    st.wfirst = pid; first = true;
    addFame(g, WONDER.firstFame, pid);
    g.events.push({ type: 'wonderFirst', to: '*', who: pid, name: playerName(g, pid), fame: WONDER.firstFame });
  }
  const n = sep ? [...g.blds.values()].filter(b => ownerOf(b) === pid).length : g.blds.size;
  const done = { type: 'wonderDone', play: st.time - 120, blds: n, isl: kontorIslands(g, sep ? pid : undefined).length, fame: P.xpTotal, coins: P.coins | 0, coinsTotal: P.coinsTotal | 0 };
  if (sep) Object.assign(done, { pid, first, firstBy: st.wfirst ? playerName(g, st.wfirst) : null });
  g.events.push(done);
}

/* ---------- Debug (nur Entwicklung, nur Host): Stufe direkt setzen ---------- */
// n = fertige Stufen 0–4. Baustelle wird geleert, Sicht aufgedeckt. fire = Story-Auslöser wonder:<n> feuern (z. B. Stufe 2 → cs_licht_im_wind).
export function wonderDebug(g, c) {
  const W = g.state.wonder, n = Math.max(0, Math.min(WONDER.phases.length, c.n | 0));
  let b = W.id != null ? g.blds.get(W.id) : null;
  if (!b) for (const x of g.blds.values()) if (x.t === 'leuchtturm') { b = x; break; }
  if (b) W.id = b.id;
  W.ph = n; W.pb = 0; W.pt = 0; W.got = null; W.acc = 0;
  W.doneAt = n >= WONDER.phases.length ? g.state.time : null;
  if (b) for (let k = 1; k <= n; k++) revealTower(g, b, k);
  // full = die nächste Stufe eröffnen und alle Waren liefern (Bauzeit läuft sofort)
  if (c.site && b && n < WONDER.phases.length) {
    W.pb = n + 1; W.got = Object.assign({}, WONDER.phases[n].cost);
    if (c.site === 'half') for (const it in W.got) W.got[it] = Math.floor(W.got[it] / 2);
  }
  g.events.push({ type: 'storyDebug', msg: `Leuchtturm: Stufe ${n}${b ? '' : ' (kein Turm gebaut)'}`, to: '*' });
  if (c.fire && n > 0) storyEvent(g, 'wonder', n);
}
