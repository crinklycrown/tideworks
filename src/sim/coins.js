/* =========================================================
   MÜNZEN: state.coins (ganzzahlig) und Münzbuch state.coinLog
   Münzen sind kein Item: nicht im Lager, nicht verschiffbar. Quellen: Handel, Funde (Wracks ab Ring 2), Ziele.
   Ausgaben: Kauf, Forschung, Leuchtturm-Phasen.
   Münzbuch: Eimer zu COIN_LOG.every Sekunden mit Einnahmen/Ausgaben je Posten (COIN_SRC) und dem Kontostand am Ende.
     state.coinLog = [{ t (Beginn), v: { Posten: Betrag (+/−) }, bal }]
   Getrennte Inseln: Kasse und Münzbuch je Spieler (pst); pid fehlt = Spieler des laufenden Kommandos bzw. Host.
   Kein DOM-Zugriff; coinSums läuft auch auf dem Spiegel.
   ========================================================= */
import { COIN_LOG } from '../data/trade.js';
import { pst, isSep, seatedPids } from './state.js';

function bucket(g, pid) {
  const st = pst(g, pid), L = st.coinLog || (st.coinLog = []), t0 = Math.floor(g.state.time / COIN_LOG.every) * COIN_LOG.every;
  let b = L[L.length - 1];
  if (!b || b.t !== t0) { b = { t: t0, v: {}, bal: st.coins | 0 }; L.push(b); while (L.length > COIN_LOG.len) L.shift(); g.coinVer = (g.coinVer || 0) + 1; }
  return b;
}
// n Münzen gutschreiben (negativ = ausgeben), src = Posten
export function coinAdd(g, n, src, pid) {
  n = Math.round(n);
  if (!n) return;
  const st = pst(g, pid);
  st.coins = Math.max(0, (st.coins | 0) + n);
  if (n > 0) st.coinsTotal = (st.coinsTotal | 0) + n;
  const b = bucket(g, pid);
  b.v[src] = (b.v[src] || 0) + n; b.bal = st.coins;
  g.coinVer = (g.coinVer || 0) + 1;
}
// Kontostand im Münzbuch nachführen (einmal je Sekunde), damit der Verlauf auch ohne Buchungen weiterläuft
export function coinTick(g) {
  if (isSep(g)) { for (const p of seatedPids(g)) bucket(g, p).bal = pst(g, p).coins | 0; return; }
  bucket(g).bal = g.state.coins | 0;
}
export const canPay = (g, n, pid) => (pst(g, pid).coins | 0) >= n;
export const coinsOf = (g, pid) => pst(g, pid).coins | 0;
// Summen der letzten span Sekunden: { in: { Posten: n }, out: { Posten: n }, inSum, outSum }
export function coinSums(log, now, span) {
  const o = { in: {}, out: {}, inSum: 0, outSum: 0 };
  for (const b of log || []) {
    if (b.t + COIN_LOG.every <= now - span) continue;
    for (const k in b.v) { const v = b.v[k]; if (v > 0) { o.in[k] = (o.in[k] || 0) + v; o.inSum += v; } else { o.out[k] = (o.out[k] || 0) - v; o.outSum -= v; } }
  }
  return o;
}
