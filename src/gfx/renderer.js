/* =========================================================
   ZEICHNEN DER SPIELWELT
   Liest nur den Spiegel-Spielkontext (game) und den Oberflächen-Zustand (ui).
   ========================================================= */
import { TS, DIRS, G_WATER, G_LAVA, WIRE_RANGE, INTERPOLATE, SANDY } from '../config.js';
import { storeOf } from '../sim/mods.js';
import { findsInCell, lootLeft } from '../world/finds.js';
import { BD, FLAT, HOUSE, DRILL, PIPE, GENS, HQ, STEG, BELT_BRIDGE, POWER_USE } from '../data/buildings.js';
import { stegOf, stegLine, portById } from '../sim/kontor.js';
import { BP_EXCLUDE } from '../sim/blueprint.js';
import { isPowered, bdist, canLink } from '../sim/power.js';
import { RECIPES_OF, RECIPES, recipeMain, recipeFluid, recipeOf } from '../data/recipes.js';
import { PIPES, FLUIDS, PUMPS } from '../data/fluids.js';
import { ITEM_COL } from './sprites/sea.js';
import { pipeNets, isFluidB } from '../sim/fluids.js';
import { oilUnder } from '../sim/buildings.js';
import { clamp, hash2 } from '../util/math.js';
import { CS, ck, tk, tkx, tky, HOME_ISL, islId } from '../util/tiles.js';
import { SPR, shipSprite, kontorSpr, kontorOfType } from './sprites.js';
import { npcSprite } from './sprites/npc.js';
import { festOn, aurelStays } from '../sim/ending.js';
import { TREE_SP } from './sprites/trees.js';
import { GROUND_FLAT } from './ground.js';
import { FOG_FLAT } from './fog.js';
import { wantGround, wantFog, pump, frameStamp, resetChunkImages } from './chunks.js';
import { cam } from './camera.js';
import { dayInfo } from '../world/daytime.js';
import { DEMO } from '../data/demo.js';
import { checkPlace, ringTiles, upgradeInfo, bAt, bridgeOut } from '../sim/buildings.js';
import { rotateBlueprint, checkBlueprint } from '../sim/blueprint.js';
import { statusOf, STATUS_COL } from './status.js';
import { beltShape } from '../sim/logistics.js';
import { islName, flagOf, isSep, mine, ownerOf, homeAt, actor } from '../sim/state.js';
import { game, ui } from '../ui/context.js';
import { DRONES } from '../data/drones.js';
import { WONDER, BEAM } from '../data/wonder.js';
import { wonderFull } from '../sim/wonder.js';
import { drawPeersWorld, drawPeersScreen } from './peers.js';

let ctx = null;
export function initRenderer(canvas) { ctx = canvas.getContext('2d'); }
const PX = CS * TS;                  // Pixel je Chunk
const BUDGET = 6;                    // ms je Bild für das Vorrendern von Chunks
// Messwerte für Tests (workscape.chunks())
export const renderStats = { visibleChunks: 0, fogged: 0, ms: 0 };

// Blaupause beim Platzieren: gedrehte Fassung und linke obere Ecke unter der Maus
export function bpGhost() {
  const m = ui.mode;
  if (!m || m.kind !== 'bpPlace' || !ui.hoverW) return null;
  if (!m.rb || m.rbRot !== m.rot) { m.rb = rotateBlueprint(m.bp, m.rot); m.rbRot = m.rot; }
  const B = m.rb;
  return { B, x: Math.round(ui.hoverW.x / TS - B.w / 2), y: Math.round(ui.hoverW.y / TS - B.h / 2) };
}
// Prüfung der Blaupause an der Stelle (zwischengespeichert, bis sich Stelle, Drehung oder Spielwelt ändern)
export function bpCheck(gh) {
  const m = ui.mode, key = `${gh.x},${gh.y},${m.rot},${game.topoVer},${game.pipeVer},${game.fog.ver}`;
  if (m.ck !== key) { m.ck = key; m.chk = checkBlueprint(game, gh.B, gh.x, gh.y); }
  return m.chk;
}
// Ziel des Aufwerten-Werkzeugs unter der Maus: Gebäude oder (ohne Gebäude bzw. mit Umschalt) Rohr
export function upgradeTarget(i, shift) {
  if (i < 0) return null;
  const x = tkx(i), y = tky(i), b = bAt(game, x, y), p = game.pipes.get(x, y);
  if (p && (shift || !b || (FLAT.has(b.t) && !upgradeInfo(game, b)))) return { pipe: p, x, y };
  return b || null;
}
export function ghostPos() {
  const mode = ui.mode, hoverW = ui.hoverW;
  if (!mode || mode.kind !== 'build' || !hoverW) return { x: -99, y: -99 };
  const d = BD[mode.t];
  return { x: Math.round(hoverW.x / TS - d.w / 2), y: Math.round(hoverW.y / TS - d.h / 2) };
}
// Schiff unter einem Weltpunkt (Pixel), mit etwas Rand um das Sprite; null = keins
export function shipAt(wx, wy) {
  let best = null, bd = 1e9;
  for (const s of game.state.ships) {
    const x = s.x * TS, y = s.y * TS + 4, dx = wx - x, dy = wy - (y - 7);
    if (Math.abs(dx) > 15 || Math.abs(dy) > 14) continue;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
// Stopps, die die Karte gerade als Route zeigt: im Routen-Modus die gewählten, sonst die Route des ausgewählten Schiffs
function shownRoute() {
  const m = ui.mode;
  if (m && m.kind === 'route') return m.stops;
  const s = ui.selShip >= 0 ? game.state.ships.find(x => x.id === ui.selShip) : null;
  return s && s.route ? s.route.stops.map(x => x.kontor) : null;
}
// Mitte eines Kontors (Routen-Stopp per Kontor-ID)
function kontorCenter(id) { const b = portById(game, id); return b ? { x: (b.x + BD[b.t].w / 2) * TS, y: (b.y + BD[b.t].h / 2) * TS } : null; }
// Route: Linien zwischen den Kontoren (zurück zum ersten gestrichelt), nummerierte Marker (Bildschirmkoordinaten)
function drawRoute(stops, Z, OX, OY, DPR, px1) {
  const pts = stops.map(kontorCenter);
  ctx.lineWidth = 2 * px1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (!a || !b || pts.length < 2 || (i === pts.length - 1 && pts.length < 3)) continue;
    const last = i === pts.length - 1;
    ctx.setLineDash(last ? [5 * px1, 4 * px1] : []);
    ctx.strokeStyle = 'rgba(42,26,16,.75)'; ctx.lineWidth = 4 * px1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = last ? 'rgba(255,240,180,.8)' : '#ffd23f'; ctx.lineWidth = 2 * px1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Marker: je Kontor alle Nummern („1 · 3“)
  const at = new Map();
  stops.forEach((k, i) => { if (!at.has(k)) at.set(k, []); at.get(k).push(i + 1); });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `800 ${Math.round(14 * DPR)}px 'Nunito', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [k, nums] of at) {
    const c = kontorCenter(k);
    if (!c) continue;
    const txt = nums.join(' · '), w = Math.max(18 * DPR, ctx.measureText(txt).width + 10 * DPR), h = 18 * DPR;
    const sx = Math.round(c.x * Z + OX - w / 2), sy = Math.round((c.y - 34) * Z + OY - h);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(sx - 2 * DPR, sy - 2 * DPR, w + 4 * DPR, h + 4 * DPR);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx, sy, w, h);
    ctx.fillStyle = '#fff2a0'; ctx.fillRect(sx, sy, w, 2 * DPR);
    ctx.fillStyle = '#2a1a10'; ctx.fillText(txt, sx + w / 2, sy + h / 2 + DPR);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.setTransform(Z, 0, 0, Z, OX, OY);
}
// Baum auf Sand/Strand ist eine Palme, sonst eine der Laubbaum-/Tannenarten
function treeSprite(x, y, g) {
  const v = (hash2(x, y, 9) * 3) | 0;
  const T = SANDY[game.W.gr(x, y)] ? SPR.palm : SPR.tree[TREE_SP[(hash2(x, y, 7) * TREE_SP.length) | 0]];
  return g < 0.4 ? T[0] : g < 1 ? T[1][v] : T[2][v];
}
// dark = dunkler Rauch (Pyrolyse-Ofen)
function smoke(x, y, now, k0, dark) {
  for (let k = 0; k < 3; k++) {
    const ph = ((now * 0.45) + k / 3 + k0) % 1, sz = 1 + Math.round(ph * 3) + (dark ? 1 : 0);
    ctx.globalAlpha = (dark ? 0.8 : 0.65) * (1 - ph); ctx.fillStyle = dark ? (k % 2 ? '#3a3a40' : '#25252a') : (k % 2 ? '#e8e8e4' : '#cfcfca');
    ctx.fillRect(Math.round(x + Math.sin(ph * 6 + k + k0 * 7) * 2 - sz / 2), Math.round(y - ph * 16), sz, sz);
  }
  ctx.globalAlpha = 1;
}
function buildingActive(b) {
  if (b.dmg || b.ruin) return false;   // Ruinen (Enden, 0.23.0): kein Licht, kein Rauch
  if (BD[b.t].npc) return true;   // NPC-Dörfer: Rauch und Licht immer (sie produzieren nichts)
  if (b.t === 'drohnenhafen') return !!b._pw;
  if (RECIPES_OF[b.t] || DRILL.has(b.t) || PUMPS[b.t] || b.t === 'kraftwerk' || b.t === 'geothermie') return !!b._act;
  if (b.t === 'verbrennung') return b._bt > 0;
  if (HOUSE[b.t]) return !!b.sup;
  return false;
}
function bSprite(b, now, night) {
  switch (b.t) {
    case 'saege': return SPR.b.saege[(b._m > 0 && (b.out.holz || 0) < 20) ? (Math.floor(now * 6) & 1) : 0];
    case 'kontor': case 'kontoralt': case 'handelskontor': return kontorOfType(b.t, flagOf(game, b.isl));
    case 'extraktor': return SPR.b.extraktor[b.d];
    case 'dkiste': return b.dm === 'req' ? SPR.b.dkisteR : SPR.b.dkiste;
    case 'leuchtturm': { const ph = Math.min(4, game.state.wonder ? game.state.wonder.ph : 0); return ph >= 4 && beamOn() ? SPR.b.leuchtturmLit : SPR.b.leuchtturm[ph]; }
    default: {
      if (BD[b.t].npc) return npcSprite(SPR.npc, b);
      // Häuser: nachts mit beleuchteten Fenstern (SPR.b[t + 'N']), wenn versorgt
      if (HOUSE[b.t]) return night && b.sup && SPR.b[b.t + 'N'] ? SPR.b[b.t + 'N'] : SPR.b[b.t];
      // Animierte Gebäude (Liste von Bildern): nur im Betrieb, fps am ersten Bild
      const s = SPR.b[b.t];
      return Array.isArray(s) ? s[b._act ? Math.floor(now * (s[0].fps || 8)) % s.length : 0] : s;
    }
  }
}
const BELT_TIER = { band: 0, band2: 1, band3: 2 };
function flatSprite(t, d, now, closed) {
  if (t in BELT_TIER) return SPR.belt[BELT_TIER[t]][d][Math.floor(now * 8 * BD[t].speed) & 3];
  if (t === 'splitter') return SPR.splitter;
  if (t === 'ueberlauf') return SPR.ueber;
  if (t === 'tor') return SPR.gate[d][closed ? 1 : 0];
  if (t === 'sortierer') return SPR.sorter[d];
  if (t === 'bandbruecke') return SPR.bbEnd;
  return SPR.bridge;   // Kreuzung
}
// Vorschau-Sprite eines Bauteils (Mitspieler, eigene noch unbestätigte Bauten): { s, flat }
export function ghostSprite(t, d, x, y, now) {
  if (PIPE.has(t)) return { s: SPR.pipe[PIPES[t].tier - 1][0], flat: true };
  if (FLAT.has(t)) return { s: flatSprite(t, d | 0, now), flat: true };
  const s = t === 'extraktor' ? SPR.b.extraktor[d | 0] : STEG.has(t) ? kontorOfType(t, flagOf(game, game.W.il(x, y))) : Array.isArray(SPR.b[t]) ? SPR.b[t][0] : SPR.b[t];
  return { s, flat: false };
}
function flatSpriteB(b, now) {
  if (b.t in BELT_TIER) {
    const sh = beltShape(game, b);
    if (sh >= 0) return SPR.curve[BELT_TIER[b.t]][sh][b.d][Math.floor(now * 8 * BD[b.t].speed) & 3];
  }
  return flatSprite(b.t, b.d, now, b.cl);
}
function drawItems(b, c, r, alpha) {
  const cx0 = c * TS + 8, cy0 = r * TS + 8;
  const put = (it, x, y) => { const s = SPR.item[it]; if (!s) return; ctx.drawImage(s.cv, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); };
  if (b.t === 'kreuzung') { for (const L of b.ln || []) if (L) put(L.it, cx0 + DIRS[L.d][0] * (L.p - 0.5) * TS, cy0 + DIRS[L.d][1] * (L.p - 0.5) * TS); return; }
  if (!b.it) return;
  if (b.t === 'splitter' || b.t === 'ueberlauf') { put(b.it, cx0, cy0); return; }
  if (b.t === 'tor' || b.t === 'sortierer') { put(b.it, cx0 + DIRS[b.d][0] * ((b.p || 0) - 0.5) * TS, cy0 + DIRS[b.d][1] * ((b.p || 0) - 0.5) * TS); return; }
  // zwischen zwei Snapshots linear interpolieren
  const p = b._pp != null ? b._pp + (b.p - b._pp) * alpha : b.p;
  const F = DIRS[b.d], sh = beltShape(game, b);
  if (sh >= 0) {   // entlang des Viertelkreises
    const S = DIRS[sh === 0 ? (b.d + 3) % 4 : (b.d + 1) % 4], a = p * Math.PI / 2;
    const Cx = cx0 + (F[0] + S[0]) * 8, Cy = cy0 + (F[1] + S[1]) * 8;
    put(b.it, Cx + (-F[0] * Math.cos(a) - S[0] * Math.sin(a)) * 8, Cy + (-F[1] * Math.cos(a) - S[1] * Math.sin(a)) * 8);
  } else put(b.it, cx0 + F[0] * (p - 0.5) * TS, cy0 + F[1] * (p - 0.5) * TS);
}
// Farbfeld des Sortierers: gewählte Ware, bei „Umkehren“ mit hellem Rand; ohne Ware grau
function sorterPatch(x, y, so) {
  const it = so && so.it;
  tint(x + 6, y + 6, 4, 4, it ? ITEM_COL[it] || '#c8ccd4' : '#5a5f68');
  if (it && so.rv) { tint(x + 6, y + 6, 4, 1, '#fbf6ea'); tint(x + 6, y + 9, 4, 1, '#fbf6ea'); }
}
function wireAnchor(b) {
  if (b.t === 'mast') return { x: b.x * TS + 8, y: (b.y + 1) * TS - SPR.b.mast.h + 3 };
  return { x: b.x * TS + BD[b.t].w * 8, y: b.y * TS + 5 };
}
function drawWires(wx0, wy0, wx1, wy1, px1) {
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = Math.max(px1, 0.7);
  ctx.beginPath();
  for (const b of game.blds.values()) {
    if (!b.links || !b.links.length) continue;
    const a = wireAnchor(b);
    for (const id of b.links) {
      if (id < b.id) continue;
      const o = game.blds.get(id);
      if (!o) continue;
      const c = wireAnchor(o);
      if (Math.max(a.x, c.x) < wx0 || Math.min(a.x, c.x) > wx1 || Math.max(a.y, c.y) + 12 < wy0 || Math.min(a.y, c.y) > wy1) continue;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + c.x) / 2, (a.y + c.y) / 2 + 4 + Math.hypot(c.x - a.x, c.y - a.y) * 0.08, c.x, c.y);
    }
  }
  ctx.stroke();
}
/* ---------- Rohre ---------- */
// Verbindungsmaske eines Rohrfelds: Bit d = Nachbar in Richtung DIRS[d] ist ein Rohr oder ein Flüssigkeits-Gebäude (auch Tank)
function fluidAt(x, y) { const id = game.bmap.get(x, y), b = id ? game.blds.get(id) : null; return !!b && isFluidB(b.t); }
export function pipeMask(x, y, extra) {
  let m = 0;
  for (let d = 0; d < 4; d++) { const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (game.pipes.get(nx, ny) || fluidAt(nx, ny) || (extra && extra(nx, ny))) m |= 1 << d; }
  return m;
}
// Rohre im sichtbaren Bereich (unter den Bändern), mit Flüssigkeitsstreifen, wenn das Netz gefüllt ist.
// Liefert die Rohrfelder unter flachen Teilen, damit deren Ränder danach über das Band gezeichnet werden.
function drawPipes(c0, c1, r0, r1, now, revealed) {
  const under = [];
  if (!game.pipes.m.size) return under;
  const P = pipeNets(game);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const tier = game.pipes.get(c, r);
    if (!tier || !revealed(c, r)) continue;
    const m = pipeMask(c, r), x = c * TS, y = r * TS;
    ctx.drawImage(SPR.pipe[tier - 1][m].cv, x, y);
    const n = P.tile.get(tk(c, r)), F = n && n.fluid && n.amt > 0.01 ? FLUIDS[n.fluid] : null;
    if (F) fluidStripe(x, y, m, F, now, n.flow > 0.05);
    const id = game.bmap.get(c, r);
    if (id) under.push([c, r, tier, m]);
  }
  return under;
}
// dünner Streifen in der Rohrmitte, Glanzpunkte wandern, solange etwas fließt
// In der Statusansicht ist der Streifen breiter (4 statt 2 Pixel)
function fluidStripe(x, y, m, F, now, moving) {
  ctx.fillStyle = F.col;
  const arms = m || 5, w = game.state.ui.statusView ? 4 : 2, a = 8 - w / 2;
  if (arms & 1) ctx.fillRect(x + 8, y + a, 8, w);
  if (arms & 4) ctx.fillRect(x, y + a, 8, w);
  if (arms & 2) ctx.fillRect(x + a, y + 8, w, 8);
  if (arms & 8) ctx.fillRect(x + a, y, w, 8);
  ctx.fillRect(x + a, y + a, w, w);
  ctx.fillStyle = F.hi;
  const o = moving ? Math.floor(now * 10) & 7 : 0;
  if (arms & 5) ctx.fillRect(x + o * 2, y + 7, 1, 1);
  if (arms & 10) ctx.fillRect(x + 7, y + o * 2, 1, 1);
}
// Rohr unter einem Band: Rand des Rohrs (3 Pixel je Verbindung) über das Band zeichnen, damit es sichtbar bleibt
function drawPipeEdges(under) {
  for (const [c, r, tier, m0] of under) {
    const cv = SPR.pipe[tier - 1][m0 || 5].cv, x = c * TS, y = r * TS, m = m0 || 5;
    if (m & 1) ctx.drawImage(cv, 13, 0, 3, 16, x + 13, y, 3, 16);
    if (m & 4) ctx.drawImage(cv, 0, 0, 3, 16, x, y, 3, 16);
    if (m & 2) ctx.drawImage(cv, 0, 13, 16, 3, x, y + 13, 16, 3);
    if (m & 8) ctx.drawImage(cv, 0, 0, 16, 3, x, y, 16, 3);
  }
}
// Farbe eines Rezepts im Reaktor (Hauptprodukt: Flüssigkeit oder Item)
function recipeCol(b) {
  const R = b.rc && RECIPES.find(r => r.id === b.rc), k = R ? recipeMain(R) : null;
  return k ? (FLUIDS[k] ? FLUIDS[k] : { col: ITEM_COL[k] || '#a8dcf0', hi: '#ffffff' }) : null;
}
function tint(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
/* ---------- Taucherglocke und Tauchspot (0.19.0, sim/dive.js) ---------- */
// Tauchspot: dunkler Fleck, zwei sich ausbreitende Ringe, aufsteigende Blasen in drei Größen, die oben zerplatzen
// Story-Spot (seit 0.21.0): größer und auffälliger (breiterer Fleck, drei Ringe, mehr und größere Blasen, höher)
function drawBubbles(P, now) {
  const big = P.kind === 'story', k1 = big ? 1.5 : 1, cx = P.x * TS + 8, cy = P.y * TS + 9;
  ctx.globalAlpha = big ? 0.3 : 0.22; ctx.fillStyle = '#123c62';
  ctx.beginPath(); ctx.ellipse(cx, cy, 11 * k1, 5 * k1, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < (big ? 3 : 2); k++) {   // Ringe auf der Wasseroberfläche
    const ph = (now / 2.4 + k / (big ? 3 : 2)) % 1, r = (3 + ph * 10) * k1, n = big ? 40 : 28;
    ctx.globalAlpha = 0.75 * (1 - ph);
    for (let a = 0; a < n; a++) { const t = a / n * Math.PI * 2; tint(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r * 0.42), 1, 1, '#d8f0ff'); }
  }
  ctx.globalAlpha = 1;
  // Schaum an der Oberfläche
  for (let i = 0; i < (big ? 9 : 5); i++) { if (Math.sin(now * 4 + i * 2.1) < 0.2) continue; tint(Math.round(cx - 6 * k1 + ((i * 7) % 13) * k1), cy - 1 + (i % 3), big ? 2 : 1, 1, '#f4fbff'); }
  const nB = big ? 14 : 9, rise = big ? 30 : 22;
  for (let i = 0; i < nB; i++) {
    const T = 1.7 + (i % 3) * 0.45, ph = (now / T + i * 0.618) % 1, sz = (i % 4 === 0 ? 3 : i % 2 ? 1 : 2) + (big && i % 3 === 0 ? 1 : 0);
    const x = Math.round(cx - 7 * k1 + ((i * 7) % 15) * k1 + Math.sin(now * 2.5 + i * 1.7) * 0.8), y = Math.round(cy + 1 - ph * rise);
    ctx.globalAlpha = ph > 0.8 ? (1 - ph) * 5 : 1;
    if (sz === 4) {   // große Blase (nur Story-Spot): 5×5 mit Glanz
      if (ph > 0.9) { for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 2], [3, 2], [0, -4]]) tint(x + dx, y + dy, 1, 1, '#f4fbff'); }
      else { tint(x - 1, y - 3, 3, 1, '#e8f8ff'); tint(x - 1, y + 3, 3, 1, '#e8f8ff'); tint(x - 3, y - 1, 1, 3, '#e8f8ff'); tint(x + 3, y - 1, 1, 3, '#e8f8ff'); tint(x - 2, y - 2, 1, 1, '#e8f8ff'); tint(x + 2, y - 2, 1, 1, '#e8f8ff'); tint(x - 2, y + 2, 1, 1, '#e8f8ff'); tint(x + 2, y + 2, 1, 1, '#e8f8ff'); tint(x - 2, y - 1, 5, 3, '#6ec8f0'); tint(x - 1, y - 2, 3, 5, '#6ec8f0'); tint(x - 1, y - 1, 2, 1, '#ffffff'); }
    } else if (sz === 3) {
      if (ph > 0.9) { for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 1], [2, 1]]) tint(x + dx, y + dy, 1, 1, '#f4fbff'); }   // zerplatzt
      else { tint(x - 1, y - 2, 3, 1, '#e8f8ff'); tint(x - 1, y + 2, 3, 1, '#e8f8ff'); tint(x - 2, y - 1, 1, 3, '#e8f8ff'); tint(x + 2, y - 1, 1, 3, '#e8f8ff'); tint(x - 1, y - 1, 3, 3, '#6ec8f0'); tint(x - 1, y - 1, 1, 1, '#ffffff'); }
    } else if (sz === 2) { tint(x, y, 2, 2, '#e8f8ff'); tint(x + 1, y + 1, 1, 1, '#6ec8f0'); }
    else tint(x, y, 1, 1, '#f4fbff');
  }
  ctx.globalAlpha = 1;
}
// Glocke am Kran des Schiffs: Pfosten und Ausleger am Heck, Kette, Glocke über dem Wasser. Taucht das Schiff, ist die Glocke unten:
// Kette verschwindet im Wasser, dort Ringe und Blasen. RIG = [Heck (Pixel vom Anker), Deckhöhe] je Schiffsart
const RIG = { fracht: [-10, -4], entdecker: [-11, -3], kogge: [-14, -7] };
function drawBellRig(s, x, y, now, down) {
  const R = RIG[s.kind] || RIG.fracht, dir = s.fl ? -1 : 1, px = x + R[0] * dir, py = y + R[1], post = px + 2 * dir, hook = px - 4 * dir;
  tint(post, py - 8, 1, 8, '#5a3218');                                    // Pfosten
  for (let i = 0; i <= 6; i++) tint(post - i * dir, py - 8, 1, 1, i === 6 ? '#3a2414' : '#7a4a28');   // Ausleger
  tint(post + dir, py - 7, 1, 1, '#5a3218');                              // Strebe
  const swing = down ? 0 : Math.round(Math.sin(now * 1.8 + s.id) * 0.6), hx = hook + swing;
  const bottom = down ? y + 3 : py - 1;
  for (let yy = py - 7; yy < bottom; yy++) tint(hx, yy, 1, 1, (yy & 1) ? '#c8ccd4' : '#6a6e74');   // Kette
  if (!down) { const b = SPR.bellHang; ctx.drawImage(b.cv, hx - b.ax, py - 1 - b.ay); return; }
  // Glocke unten: Ringe und Blasen an der Kette
  for (let k = 0; k < 2; k++) { const ph = (now / 1.6 + k * 0.5) % 1, r = 2 + ph * 5; ctx.globalAlpha = 0.8 * (1 - ph); for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; tint(Math.round(hx + Math.cos(t) * r), Math.round(bottom + Math.sin(t) * r * 0.4), 1, 1, '#d8f0ff'); } }
  for (let i = 0; i < 4; i++) { const ph = (now / 1.1 + i * 0.27) % 1; ctx.globalAlpha = ph > 0.8 ? (1 - ph) * 5 : 1; tint(Math.round(hx - 2 + i + Math.sin(now * 4 + i)), Math.round(bottom - ph * 9), i % 2 + 1, i % 2 + 1, '#e8f8ff'); }
  ctx.globalAlpha = 1;
}
// Getrennte Inseln: Rahmen in der Spielerfarbe um die Flagge fremder Kontore (Rechteck im Sprite: x, y, w, h)
const FLAG_BOX = { kontor: [41, 0, 8, 7], kontoralt: [27, 0, 6, 6], handelskontor: [2, 4, 8, 6] };
const pColor = (pid) => { const P = game.state.players && game.state.players[pid]; return (P && P.color) || '#ffffff'; };
function flagFrame(b, left, top) {
  const F = FLAG_BOX[b.t];
  if (!F || !isSep(game) || mine(game, b)) return;
  const c = pColor(ownerOf(b)), [x, y, w, h] = F;
  tint(left + x - 1, top + y - 1, w + 2, 1, c); tint(left + x - 1, top + y + h, w + 2, 1, c);
  tint(left + x - 1, top + y, 1, h, c); tint(left + x + w, top + y, 1, h, c);
}
function frameRect(x, y, w, h, col, t) { ctx.fillStyle = col; ctx.fillRect(x, y, w, t); ctx.fillRect(x, y + h - t, w, t); ctx.fillRect(x, y, t, h); ctx.fillRect(x + w - t, y, t, h); }

// Statusansicht: ab Zoomstufe 1 (1 Bildschirmpixel je Weltpixel) Produkt-Symbol auf einem Schildchen mit Punkt, darunter nur der Punkt
function drawStatus(c0, c1, r0, r1, zoom, px1, revealed) {
  const icons = zoom >= 1;
  for (const b of game.blds.values()) {
    const d = BD[b.t];
    if (b.x + d.w < c0 || b.x > c1 || b.y + d.h < r0 || b.y > r1 || !revealed(b.x, b.y)) continue;
    const S = statusOf(game, b);
    if (!S) continue;
    const cx = Math.round((b.x + d.w / 2) * TS), top = b.y * TS + 1, col = STATUS_COL[S.c];
    if (icons) {
      const ic = S.it === 'bolt' ? SPR.icon.bolt : S.it === 'wrench' ? SPR.icon.wrench : S.it ? SPR.item[S.it] : null, iw = ic ? ic.w : 0, ih = ic ? ic.h : 0;
      const w = iw + 9, h = Math.max(ih, 6) + 4, x = cx - (w >> 1);
      tint(x - 1, top - 1, w + 2, h + 2, '#3a2414'); tint(x, top, w, h, '#fbf0d4');
      if (ic) ctx.drawImage(ic.cv, x + 2, top + 2);
      tint(x + w - 6, top + (h >> 1) - 2, 4, 4, '#3a2414'); tint(x + w - 5, top + (h >> 1) - 1, 2, 2, col);
      tint(x + w - 6, top + (h >> 1) - 1, 4, 2, col); tint(x + w - 5, top + (h >> 1) - 2, 2, 4, col);
    } else {
      const s = Math.max(4, Math.round(6 * px1 * 2) / 2);
      tint(cx - s / 2 - px1 * 2, top - px1 * 2, s + px1 * 4, s + px1 * 4, '#3a2414'); tint(cx - s / 2, top, s, s, col);
    }
  }
}
// Nebel-Version eines Chunks samt Nachbarn (ändert sich, sobald dort etwas aufgedeckt wird)
function fogVer3(fog, kx, ky) { let v = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += fog.chunkVer(ck(kx + dx, ky + dy)) * (3 * dy + dx + 7); return v; }
function fogCov3(fog, kx, ky) { let all = true, none = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = fog.coverage(ck(kx + dx, ky + dy)); if (c !== 2) all = false; if (c !== 0) none = false; } return all ? 2 : none ? 0 : 1; }

/* ---------- Steg, Brückenband-Schienen, Strom-Vorschau ---------- */
// Steg-Felder und Anleger (flach); Laterne am ersten Steg-Feld kommt in die Tiefen-Liste
function drawSteg(t, x, y, d, sl, list, ruin) {
  const L = stegLine(t, x, y, d, sl), S = SPR.steg[d];
  if (ruin) {   // Ruinen-Steg (Ende B): die Bohlen sind fort, nur die Pfähle stehen noch, keine Laterne
    for (const p of [...L.tiles, L.dock]) for (const [ox, oy] of d % 2 ? [[3, 4], [11, 4], [3, 12], [11, 12]] : [[4, 3], [4, 11], [12, 3], [12, 11]]) {
      const X = p.x * TS + ox, Y = p.y * TS + oy;
      ctx.fillStyle = '#2a1e16'; ctx.fillRect(X - 1, Y - 1, 3, 4);
      ctx.fillStyle = '#5a4434'; ctx.fillRect(X, Y - 1, 1, 2);
    }
    return L;
  }
  for (const p of L.tiles) ctx.drawImage(S.land.cv, p.x * TS, p.y * TS);
  ctx.drawImage(S.dock.cv, L.dock.x * TS, L.dock.y * TS);
  const f = L.tiles[0] || L.dock;
  if (list) list.push({ s: SPR.lantern, x: f.x * TS + (d % 2 ? 3 : 8), y: f.y * TS + (d % 2 ? 8 : 3) });
  return L;
}
// Brückenband: halbtransparente Schiene vom Eingang zum Ausgang, Items gleiten darauf (über allem außer Nebel)
function drawBridgeRails(c0, c1, r0, r1, sel) {
  const put = (it, x, y) => { const s = SPR.item[it]; if (!s) return; ctx.drawImage(s.cv, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); };
  for (const b of game.blds.values()) {
    if (b.t !== 'bandbruecke' || !b.bl) continue;
    const [d, n] = b.bl, ex = b.x + DIRS[d][0] * n, ey = b.y + DIRS[d][1] * n;
    if (Math.max(b.x, ex) < c0 || Math.min(b.x, ex) > c1 || Math.max(b.y, ey) < r0 || Math.min(b.y, ey) > r1) continue;
    const x0 = b.x * TS + 8, y0 = b.y * TS + 2, x1 = ex * TS + 8, y1 = ey * TS + 2, H = d % 2 === 0;
    ctx.globalAlpha = sel === b.id ? 0.85 : 0.55;
    if (H) { const xa = Math.min(x0, x1), w = Math.abs(x1 - x0); tint(xa, y0 - 3, w, 6, '#5a5f68'); tint(xa, y0 - 3, w, 1, '#c8ccd4'); tint(xa, y0 + 2, w, 1, '#2a2e34'); for (let x = xa + 4; x < xa + w; x += 5) tint(x, y0 - 2, 1, 4, '#8a8f98'); }
    else { const ya = Math.min(y0, y1), h = Math.abs(y1 - y0); tint(x0 - 3, ya, 6, h, '#5a5f68'); tint(x0 - 3, ya, 1, h, '#c8ccd4'); tint(x0 + 2, ya, 1, h, '#2a2e34'); for (let y = ya + 4; y < ya + h; y += 5) tint(x0 - 2, y, 4, 1, '#8a8f98'); }
    ctx.globalAlpha = 1;
    for (const o of b.q || []) put(o.it, x0 + DIRS[d][0] * o.p * TS, y0 + DIRS[d][1] * o.p * TS);
  }
}
// Strom beim Bauen: Reichweite eines Masts (gestrichelt hellgelb), Gebäude, die sich verbinden würden, und Kabel-Vorschau
function powerPreview(t, g, px1) {
  const W = game.W, d = BD[t], isl = W.il(g.x + (d.w >> 1), g.y + (d.h >> 1));
  const me = { t, x: g.x, y: g.y, isl, links: [], id: -1 };
  const cands = [...game.blds.values()].filter(o => o.isl === isl && isPowered(o.t) && bdist(me, o) <= WIRE_RANGE).sort((a, b) => bdist(me, a) - bdist(me, b));
  const pick = [];
  if (t === 'mast') {
    const pole = cands.find(o => o.t === 'mast' && !canLink(me, o));
    if (pole) pick.push(pole);
    for (const o of cands) { if (pick.length >= 4) break; if (o.t !== 'mast' && !(o.links || []).length && !canLink(me, o)) pick.push(o); }
    ctx.setLineDash([3 * px1 * 2, 3 * px1 * 2]); ctx.lineWidth = Math.max(px1 * 2, 1); ctx.strokeStyle = 'rgba(255,240,150,0.95)';
    ctx.strokeRect((g.x - WIRE_RANGE) * TS, (g.y - WIRE_RANGE) * TS, (2 * WIRE_RANGE + 1) * TS, (2 * WIRE_RANGE + 1) * TS);
    ctx.setLineDash([]);
    tint((g.x - WIRE_RANGE) * TS, (g.y - WIRE_RANGE) * TS, (2 * WIRE_RANGE + 1) * TS, (2 * WIRE_RANGE + 1) * TS, 'rgba(255,240,150,0.06)');
  } else { const pole = cands.find(o => o.t === 'mast' && !canLink(me, o)); if (pole) pick.push(pole); }
  const a = { x: g.x * TS + d.w * 8, y: t === 'mast' ? (g.y + 1) * TS - SPR.b.mast.h + 3 : g.y * TS + 5 };
  ctx.setLineDash([3 * px1 * 2, 2 * px1 * 2]); ctx.lineWidth = Math.max(px1 * 1.5, 0.8); ctx.strokeStyle = 'rgba(255,240,150,0.95)';
  for (const o of pick) {
    const D = BD[o.t], c = wireAnchor(o);
    frameRect(o.x * TS, o.y * TS, D.w * TS, D.h * TS, 'rgba(255,240,150,0.9)', Math.max(px1 * 2, 1));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + c.x) / 2, (a.y + c.y) / 2 + 4 + Math.hypot(c.x - a.x, c.y - a.y) * 0.08, c.x, c.y); ctx.stroke();
  }
  ctx.setLineDash([]);
}
// Im Baumodus: Kabel-Symbol über Stromverbrauchern und Erzeugern (grün verkabelt, rot ohne Kabel)
function drawCableIcons(c0, c1, r0, r1, revealed) {
  for (const b of game.blds.values()) {
    if (b.t === 'mast' || !isPowered(b.t)) continue;
    const d = BD[b.t];
    if (b.x + d.w < c0 || b.x > c1 || b.y + d.h < r0 || b.y > r1 || !revealed(b.x, b.y)) continue;
    const ok = (b.links || []).length > 0, x = (b.x + d.w) * TS - 9, y = b.y * TS + 1, col = ok ? '#7cc24f' : '#e8504a';
    tint(x - 1, y - 1, 9, 7, '#3a2414'); tint(x, y, 7, 5, '#fbf0d4');
    tint(x + 1, y + 2, 3, 1, col); tint(x + 4, y + 1, 2, 3, col); tint(x + 6, y + 1, 1, 1, col); tint(x + 6, y + 3, 1, 1, col);
  }
}

// now = Sekunden (Animationen), nowMs = Millisekunden (Interpolation zwischen Snapshots)
// Weltenleuchtturm im Bau: nächste Phase wächst von unten mit dem Fortschritt, darüber das Gerüst
// Solange Waren fehlen (Baustelle sammelt), stehen Kisten der gelieferten Waren am Fuß des Turms
function drawWonderBuild(b, left, bottom) {
  const W = game.state.wonder;
  if (!W || !W.pb || W.id !== b.id) return;
  if (!wonderFull(W)) {
    const C = WONDER.phases[W.pb - 1].cost, its = Object.keys(C).filter(it => W.got && W.got[it] > 0);
    its.forEach((it, i) => {
      const c = SPR.crate[it], n = Math.min(3, Math.ceil((W.got[it] / C[it]) * 3));
      for (let k = 0; k < n; k++) ctx.drawImage(c.cv, left + 8 + i * 13 + (k & 1) * 4 - c.ax, bottom - 4 - k * 4 - c.ay);
    });
    return;
  }
  const f = clamp(W.pt / WONDER.build, 0, 1), n = SPR.b.leuchtturm[W.pb], old = SPR.b.leuchtturm[W.pb - 1];
  const h = Math.round(old.h + (n.h - old.h) * f);
  if (f > 0.02) ctx.drawImage(n.cv, 0, n.h - h, n.w, h, left, bottom - h, n.w, h);
  const sc = SPR.scaffold[W.pb], hh = Math.min(sc.h, h + 8);
  ctx.drawImage(sc.cv, 0, sc.h - hh, sc.w, hh, left, bottom - hh, sc.w, hh);
}
// Drohnen über allem außer Nebel: Schatten am Boden, Drohne darüber, Ladung als Kiste
function drawDrones(now, alpha, wx0, wy0, wx1, wy1) {
  let n = 0;
  for (const b of game.blds.values()) {
    if (b.t !== 'drohnenhafen' || !b.dr) continue;
    for (const d of b.dr) {
      if (d.st === 'idle') continue;
      const x = (d._x0 != null && alpha < 1 ? d._x0 + (d.x - d._x0) * alpha : d.x) * TS, y = (d._y0 != null && alpha < 1 ? d._y0 + (d.y - d._y0) * alpha : d.y) * TS;
      if (x < wx0 - 20 || x > wx1 + 20 || y < wy0 - 30 || y > wy1 + 20) continue;
      n++;
      const hov = Math.round(10 + Math.sin(now * 5 + n) * 1.2);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#1e2430'; ctx.fillRect(Math.round(x) - 3, Math.round(y) + 1, 7, 2); ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 4); ctx.globalAlpha = 1;
      if (d.c && SPR.crate[d.c.it]) { const c = SPR.crate[d.c.it]; ctx.drawImage(c.cv, Math.round(x) - c.ax, Math.round(y) - hov + 5 - c.ay); }
      const sp = SPR.drone[Math.floor(now * 20 + n) & 1];
      ctx.drawImage(sp.cv, Math.round(x) - sp.ax, Math.round(y) - hov - sp.ay);
    }
  }
  return n;
}
// Arbeitsradius eines Drohnenhafens (Rechteck wie bdist), gestrichelt
function hubRadius(x, y, w, h, px1) {
  const R = DRONES.radius;
  ctx.setLineDash([3 * px1 * 2, 3 * px1 * 2]); ctx.lineWidth = Math.max(px1 * 2, 1); ctx.strokeStyle = 'rgba(150,210,255,0.95)';
  ctx.strokeRect((x - R) * TS, (y - R) * TS, (w + 2 * R) * TS, (h + 2 * R) * TS);
  ctx.setLineDash([]);
  tint((x - R) * TS, (y - R) * TS, (w + 2 * R) * TS, (h + 2 * R) * TS, 'rgba(150,210,255,0.06)');
}
// Wetter und Vulkan der laufenden Ereignisse (Regen, Wellen, Asche, Glut)
function drawEventFx(now, wx0, wy0, wx1, wy1, lavaGlow) {
  const E = game.state.ev;
  if (!E || !E.list) return;
  for (const e of E.list) {
    if (!e.on) continue;
    if (e.kind === 'flaute' || e.kind === 'fest') continue;
    if (e.x == null) continue;
    const cx = (e.x + 0.5) * TS, cy = (e.y + 0.5) * TS, R = e.r * TS;
    const x0 = Math.max(wx0, cx - R), x1 = Math.min(wx1, cx + R), y0 = Math.max(wy0, cy - R), y1 = Math.min(wy1, cy + R);
    if (x0 >= x1 || y0 >= y1) continue;
    if (e.kind === 'sturm') {
      // dunkle Wolkendecke, Regenstriche und Schaumkronen
      ctx.fillStyle = 'rgba(40,50,70,0.22)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = 'rgba(200,220,255,0.55)';
      const step = 24, ox = (now * 140) % step, oy = (now * 320) % step;
      for (let y = Math.floor(y0 / step) * step; y < y1; y += step) for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
        const hx = hash2(x, y, 31), rx = x + hx * step + ox - 8, ry = y + hash2(x, y, 37) * step + oy;
        if ((rx - cx) ** 2 + (ry - cy) ** 2 > R * R) continue;
        ctx.fillRect(Math.round(rx), Math.round(ry), 1, 4); ctx.fillRect(Math.round(rx) - 1, Math.round(ry) + 4, 1, 3);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const W = game.W;
      for (let ty = Math.floor(y0 / TS); ty < y1 / TS; ty += 2) for (let tx = Math.floor(x0 / TS); tx < x1 / TS; tx += 3) {
        if (W.gr(tx, ty) !== G_WATER) continue;
        const ph = (now * 0.7 + hash2(tx, ty, 41)) % 1;
        if (ph > 0.5) continue;
        ctx.globalAlpha = 0.7 * (1 - ph * 2); ctx.fillRect(tx * TS + 3 + Math.round(ph * 8), ty * TS + 8, 5, 1); ctx.fillRect(tx * TS + 4 + Math.round(ph * 8), ty * TS + 7, 2, 1);
      }
      ctx.globalAlpha = 1;
    } else if (e.kind === 'vulkan') {
      // Asche fällt über der Insel, Krater glüht stärker
      for (let k = 0; k < 140; k++) {
        const ph = (now * 0.12 + hash2(k, e.id, 5)) % 1, ax = cx + (hash2(k, e.id, 7) - 0.5) * 2 * R + Math.sin(now + k) * 6, ay = cy - R + ph * 2 * R;
        if (ax < x0 || ax > x1 || ay < y0 || ay > y1) continue;
        ctx.globalAlpha = 0.65 * Math.sin(ph * Math.PI); ctx.fillStyle = k % 3 ? '#5a5650' : '#8a847a'; ctx.fillRect(Math.round(ax), Math.round(ay), 2, 2);
      }
      ctx.globalAlpha = 1;
      const pul = 0.6 + 0.25 * Math.sin(now * 3);
      lavaGlow.push([cx, cy, 120, pul]);
      ctx.globalAlpha = 0.18 * pul; ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (e.kind === 'schwarm') {
      // Fische springen um die Insel
      ctx.fillStyle = '#c8e0f0';
      for (let k = 0; k < 24; k++) {
        const ph = (now * 0.5 + hash2(k, e.id, 9)) % 1;
        if (ph > 0.3) continue;
        const a = hash2(k, e.id, 11) * Math.PI * 2, d = R * (0.35 + 0.5 * hash2(k, e.id, 13)), fx = cx + Math.cos(a) * d, fy = cy + Math.sin(a) * d - Math.sin(ph / 0.3 * Math.PI) * 5;
        if (game.W.gr(Math.floor(fx / TS), Math.floor(fy / TS)) !== G_WATER) continue;
        ctx.fillRect(Math.round(fx), Math.round(fy), 3, 1); ctx.fillRect(Math.round(fx) + 1, Math.round(fy) - 1, 1, 1);
      }
    }
  }
}
// Mit Geschichte leuchtet der Turm erst nach der Entscheidung für Ende A (Licht weitergeben); ohne Geschichte wie bisher
const beamOn = () => !game.state.story || game.state.story.choice === 'a';
// Lichtstrahl des vollendeten Weltenleuchtturms (nachts, kreisend)
function drawBeam(now, nightF) {
  if (!beamOn()) return;
  const W = game.state.wonder, b = W && W.ph >= 4 && W.id != null ? game.blds.get(W.id) : null;
  if (!b) return;
  const s = SPR.b.leuchtturmLit, d = BD[b.t], x = b.x * TS + s.beam[0], y = (b.y + d.h) * TS - s.h + s.beam[1];
  const a = now * BEAM.rpm * Math.PI * 2 / 60, L = BEAM.len * TS;
  ctx.globalCompositeOperation = 'lighter';
  for (const k of [0, Math.PI]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, L);
    g.addColorStop(0, `rgba(255,240,170,${0.55 * nightF})`); g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, L, a + k - 0.07, a + k + 0.07); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
/* ---------- Dorffest nach Ende A (0.23.0, einmal, sim/ending.js festOn) ----------
   Am Tag Wimpelketten über den Häusern von Pfahldorf und Werkstattbucht, nachts bunte Lampions und Feuerwerk über den Stegen. */
const FEST_COL = ['#e8504a', '#ffd23f', '#3f8fe8', '#7cc24f', '#f08ad0'], FEST_GLOW = ['255,90,80', '255,214,90', '90,150,255', '130,220,100', '255,140,210'];
function festDeco(b, left, top, s, now, nightF, glows) {
  if (b.t === 'npc_laterne') return;
  const y0 = top + Math.min(6, s.h >> 3), n = Math.max(3, s.w >> 2);
  for (let i = 0; i < n; i++) {
    const x = left + 2 + Math.round(i * (s.w - 4) / Math.max(1, n - 1)), sag = Math.round(Math.sin(i / Math.max(1, n - 1) * Math.PI) * 3), c = (i + b.id) % FEST_COL.length;
    ctx.fillStyle = '#3a2414'; ctx.fillRect(x, y0 + sag, 1, 1);
    ctx.fillStyle = FEST_COL[c]; ctx.fillRect(x, y0 + sag + 1, 2, 2 + (Math.sin(now * 4 + i) > 0.6 ? 1 : 0));
    if (nightF > 0 && i % 2 === 0) glows.push([x + 1, y0 + sag + 2, 9, 0.45, FEST_GLOW[c]]);
  }
}
function drawFireworks(now, nightF) {
  if (nightF < 0.3) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const b of game.blds.values()) {
    if (b.t !== 'npchafen' || b.ruin || (b.npc !== 'ole' && b.npc !== 'brann') || !game.state.found[b.isl]) continue;   // nur über entdeckten Inseln
    const cx = (b.x + 1.5) * TS, cy = (b.y + 1) * TS, P = 2.6;
    for (let k = 0; k < 2; k++) {
      const tt = now + k * 1.3 + b.id * 0.71, n = Math.floor(tt / P), u = (tt % P) / P;
      const bx = cx + (hash2(n, k, b.id) - 0.5) * 70, by = cy - 60 - hash2(n, k + 7, b.id) * 40, col = FEST_GLOW[Math.floor(hash2(n, k + 3, b.id) * FEST_GLOW.length)];
      if (u < 0.3) { const v = u / 0.3; ctx.fillStyle = `rgba(255,230,180,${nightF})`; ctx.fillRect(Math.round(cx + (bx - cx) * v), Math.round(cy + (by - cy) * v), 1, 2); continue; }
      const v = (u - 0.3) / 0.7, r = 4 + v * 26, a = (1 - v) * nightF;
      for (let i = 0; i < 18; i++) {
        const ang = i / 18 * Math.PI * 2 + n;
        ctx.fillStyle = `rgba(${col},${a})`;
        ctx.fillRect(Math.round(bx + Math.cos(ang) * r), Math.round(by + Math.sin(ang) * r + v * v * 10), 2, 2);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
export const fxStats = { drones: 0 };
export function draw(now, nowMs) {
  const t0 = performance.now();
  const { W, state, blds, tree, claim, fog } = game, mode = ui.mode, selected = ui.selected, selTile = ui.selTile;
  const canvas = cam.canvas, Z = cam.Z, DPR = cam.DPR;
  const cw = canvas.width, ch = canvas.height, di = dayInfo(game.demo ? state.time * DEMO.day : state.time), nightF = di.night, night = nightF > 0.5;
  const alpha = INTERPOLATE ? clamp((nowMs - game.snapAt) / game.snapDur, 0, 1) : 1;
  resetChunkImages(game.worldVer);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#3474b8'; ctx.fillRect(0, 0, cw, ch);
  const OX = cam.OX = Math.round(cw / 2 - cam.x * Z), OY = cam.OY = Math.round(ch / 2 - cam.y * Z);
  ctx.setTransform(Z, 0, 0, Z, OX, OY);

  const wx0 = -OX / Z, wy0 = -OY / Z, wx1 = (cw - OX) / Z, wy1 = (ch - OY) / Z;
  const c0 = Math.floor(wx0 / TS) - 1, c1 = Math.ceil(wx1 / TS) + 1;
  const r0 = Math.floor(wy0 / TS) - 1, r1 = Math.ceil(wy1 / TS) + 4;
  const px1 = DPR / Z;   // 1 Bildschirmpixel in Weltkoordinaten
  const revealed = (x, y) => fog.get(x, y) === 1;

  // Sichtbare Chunks: Boden- und Nebelbilder anfordern, fehlende in der Zeit vorrendern
  const kx0 = Math.floor(wx0 / PX), kx1 = Math.floor(wx1 / PX), ky0 = Math.floor(wy0 / PX), ky1 = Math.floor(wy1 / PX);
  const frameUsed = frameStamp(), vis = [];
  for (let ky = ky0; ky <= ky1; ky++) for (let kx = kx0; kx <= kx1; kx++) {
    const cov = fogCov3(fog, kx, ky);
    vis.push({ kx, ky, cov, g: cov === 0 ? null : wantGround(kx, ky), f: cov === 2 ? null : wantFog(kx, ky, fogVer3(fog, kx, ky)) });
  }
  pump(W, fog, BUDGET, frameUsed);
  renderStats.visibleChunks = vis.length; renderStats.fogged = vis.filter(v => v.cov === 0).length;
  // Boden
  for (const v of vis) {
    if (!v.g) continue;
    if (v.g.done) ctx.drawImage(v.g.cv, v.kx * PX, v.ky * PX);
    else { ctx.fillStyle = W.chunk(v.kx, v.ky).land ? GROUND_FLAT[2] : GROUND_FLAT[0]; ctx.fillRect(v.kx * PX, v.ky * PX, PX, PX); }
  }
  // Lava: pulsierend
  const lavaGlow = [];
  for (const v of vis) {
    if (!v.g) continue;
    const c = W.chunk(v.kx, v.ky);
    if (!c.lava.length) continue;
    for (const i of c.lava) {
      const x = (v.kx << 5) + (i & 31), y = (v.ky << 5) + (i >> 5), ph = Math.sin(now * 2.1 + hash2(x, y, 5) * 6.28);
      ctx.globalAlpha = 0.16 + 0.16 * ph; ctx.fillStyle = ph > 0 ? '#ffe08a' : '#ff6a1a';
      ctx.fillRect(x * TS, y * TS, TS, TS);
      if ((x + y) % 2 === 0) lavaGlow.push([x * TS + 8, y * TS + 8, 30, 0.32 + 0.08 * ph]);
    }
    ctx.globalAlpha = 1;
  }

  // Raster nur im Baumodus
  if (mode && (mode.kind === 'build' || mode.kind === 'demolish' || mode.kind === 'upgrade' || mode.kind === 'bpSelect' || mode.kind === 'bpPlace')) {
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let c = c0; c <= c1 + 1; c++) ctx.fillRect(c * TS, r0 * TS, px1, (r1 - r0 + 2) * TS);
    for (let r = r0; r <= r1 + 1; r++) ctx.fillRect(c0 * TS, r * TS, (c1 - c0 + 2) * TS, px1);
  }
  // Erntegebiet des gewählten Sägewerks
  const selB = selected >= 0 ? blds.get(selected) : null;
  if (selB && selB.t === 'saege' && selB._ring) for (const i of selB._ring) tint(tkx(i) * TS, tky(i) * TS, TS, TS, 'rgba(255,220,90,0.22)');

  // Rohre (eigene Ebene unter den Bändern)
  const underPipes = drawPipes(c0, c1, r0, r1, now, revealed);
  // Flache Logistik und Items darauf (nur im sichtbaren Bereich)
  const flats = [];
  for (const b of blds.values()) if (FLAT.has(b.t) && b.x >= c0 && b.x <= c1 && b.y >= r0 && b.y <= r1) flats.push(b);
  for (const b of flats) {
    ctx.drawImage(flatSpriteB(b, now).cv, b.x * TS, b.y * TS);
    if (b.t === 'sortierer') sorterPatch(b.x * TS, b.y * TS, b.so);
  }
  drawPipeEdges(underPipes);
  for (const b of flats) drawItems(b, b.x, b.y, alpha);

  // Objekte nach Tiefe sortiert
  const list = [];
  // Stege der Kontore (flach, Laterne in der Tiefen-Liste)
  for (const b of blds.values()) if (STEG.has(b.t) && b.sl > 0 && b.x >= c0 - 4 && b.x <= c1 + 1 && b.y >= r0 - 4 && b.y <= r1 + 1) {
    const L = drawSteg(b.t, b.x, b.y, b.d, b.sl, list, !!b.ruin);
    // NPC steht vorn am Steg (Klick auf den Steg öffnet das Gespräch)
    // Ruinen-Steg (Ende B): niemand mehr da. Ende B: Aurel steht am Hauptkontor des Goldbergs (sim/ending.js)
    const who = b.t === 'npchafen' && !b.ruin ? b.npc : b.t === 'kontor' && aurelStays(game) && game.W.npcOf(b.isl) === 'aurel' ? 'aurel' : null;
    if (who && SPR.npc.fig[who]) { const f = L.tiles[L.tiles.length - 1] || L.dock; list.push({ s: SPR.npc.fig[who], x: f.x * TS + 8, y: f.y * TS + 11 + Math.round(Math.sin(now * 1.5 + b.id) * 0.6) }); }
  }
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (!revealed(c, r)) continue;
    const g = tree.get(c, r);
    if (g > 0 && !game.bmap.get(c, r)) list.push({ s: treeSprite(c, r, g), x: c * TS + 8, y: r * TS + 14 });
  }
  for (const b of blds.values()) {
    if (FLAT.has(b.t)) continue;
    const d = BD[b.t], x0 = b.x * TS, y1 = (b.y + d.h) * TS;
    if (x0 > wx1 || x0 + d.w * TS < wx0 || y1 < wy0 || y1 - 70 > wy1) continue;
    list.push({ b, y: y1 - 1 });
  }
  // Funde auf See (Fund-Zellen sind so groß wie Chunks)
  for (const v of vis) {
    if (v.cov === 0) continue;
    for (const f of findsInCell(W, v.kx, v.ky)) {
      if (f.x < c0 || f.x > c1 || f.y < r0 || f.y > r1 || !revealed(f.x, f.y) || !lootLeft(state.loot, f)) continue;
      list.push({ find: f, y: f.y * TS + 10 });
    }
  }
  // Tauchspot (Blasen), nur aufgedeckt
  const dvSpot = state.dive && state.dive.spot, dvBusy = state.dive && state.dive.busy;
  if (dvSpot && dvSpot.x >= c0 - 1 && dvSpot.x <= c1 + 1 && dvSpot.y >= r0 - 1 && dvSpot.y <= r1 + 2 && revealed(dvSpot.x, dvSpot.y) && !(dvBusy && dvBusy.spot === dvSpot.id)) list.push({ dive: dvSpot, y: dvSpot.y * TS + 6 });
  // über Bord geworfene Ladung (Kisten)
  for (const j of state.jet || []) if (j.x >= c0 && j.x <= c1 && j.y >= r0 && j.y <= r1 && revealed(j.x, j.y)) list.push({ jet: j, y: j.y * TS + 10 });
  for (const s0 of state.ships) {
    // Schiffsposition zwischen zwei Snapshots interpolieren
    const s = s0._x0 == null || alpha >= 1 ? s0 : Object.assign({}, s0, { x: s0._x0 + (s0.x - s0._x0) * alpha, y: s0._y0 + (s0.y - s0._y0) * alpha });
    if (s.x * TS > wx0 - 20 && s.x * TS < wx1 + 20 && s.y * TS > wy0 - 20 && s.y * TS < wy1 + 20) list.push({ ship: s, y: s.y * TS + 4 });
  }
  for (const t0 of (state.trade && state.trade.list) || []) {
    const t = t0._x0 == null || alpha >= 1 ? t0 : Object.assign({}, t0, { x: t0._x0 + (t0.x - t0._x0) * alpha, y: t0._y0 + (t0.y - t0._y0) * alpha });
    if (t.x * TS > wx0 - 20 && t.x * TS < wx1 + 20 && t.y * TS > wy0 - 20 && t.y * TS < wy1 + 20 && revealed(Math.floor(t.x), Math.floor(t.y))) list.push({ trader: t, y: t.y * TS + 4 });
  }
  list.sort((a, b) => a.y - b.y);

  const glows = [], fest = festOn(game);
  for (const o of list) {
    if (o.b) {
      const b = o.b, d = BD[b.t], s = bSprite(b, now, night), left = b.x * TS, top = (b.y + d.h) * TS - s.h;
      ctx.drawImage(s.cv, left, top);
      flagFrame(b, left, top);
      if (b.t === 'leuchtturm') drawWonderBuild(b, left, top + s.h);
      if (s.patch) { const P = s.patch, ex = b.t === 'dkiste' ? (b.dw && b.dw.it) : b.ex; if (b.t === 'dkiste' && !ex) { /* keine Anforderung */ } else if (ex) tint(left + P[0], top + P[1], P[2], P[3], ITEM_COL[ex] || '#c8ccd4'); else { tint(left + P[0], top + P[1], P[2] >> 1, P[3] >> 1, '#e8504a'); tint(left + P[0] + (P[2] >> 1), top + P[1], P[2] >> 1, P[3] >> 1, '#7cc24f'); tint(left + P[0], top + P[1] + (P[3] >> 1), P[2] >> 1, P[3] >> 1, '#3f8fe8'); tint(left + P[0] + (P[2] >> 1), top + P[1] + (P[3] >> 1), P[2] >> 1, P[3] >> 1, '#ffd23f'); } }
      if (s.bar) { const bh = Math.round(s.bar[3] * clamp((b.e || 0) / storeOf(game, 'batterie'), 0, 1)); if (bh) tint(left + s.bar[0], top + s.bar[1] + s.bar[3] - bh, s.bar[2], bh, '#7cc24f'); }
      const act = buildingActive(b);
      if (s.gauge) {   // Tank: Füllstand des angeschlossenen Netzes
        const n = pipeNets(game).tile.get(tk(b.x, b.y)), G = s.gauge, f = n && n.fluid ? clamp(n.amt / n.cap, 0, 1) : 0, gh = Math.round(G[3] * f);
        if (gh) { const F = FLUIDS[n.fluid]; tint(left + G[0], top + G[1] + G[3] - gh, G[2], gh, F.col); tint(left + G[0], top + G[1] + G[3] - gh, 1, gh, F.hi); }
      }
      if (s.tubes) {   // Reaktor: Röhren in der Farbe des Rezepts, blubbern im Betrieb
        const F = recipeCol(b);
        if (F) s.tubes.forEach((T, i) => {
          const lv = Math.round(T[3] * (act ? 0.75 + 0.06 * Math.sin(now * 3 + i * 2) : 0.6));
          tint(left + T[0], top + T[1] + T[3] - lv, T[2], lv, F.col);
          if (act) for (let k = 0; k < 3; k++) { const ph = (now * 0.8 + k / 3 + i * 0.29) % 1; tint(left + T[0] + 1 + ((k * 2 + i) % (T[2] - 2)), top + T[1] + T[3] - 2 - Math.round(ph * (lv - 3)), 1, 1, F.hi); }
        });
      }
      if (s.fluid) {   // Abfüllanlage, Entleerer: Flächen in der Farbe der Flüssigkeit des aktiven Rezepts
        const f = recipeFluid(recipeOf(b)), F = f && FLUIDS[f];
        if (F) for (const [x, y, w, h, always] of s.fluid) {
          if (!always && !act) continue;
          tint(left + x, top + y, w, h, F.col);
          if (act) { const ph = Math.floor(now * 12 + b.id) % Math.max(w, h); tint(left + x + (w > h ? ph : 0), top + y + (w > h ? 0 : ph), 1, 1, F.hi); }
        }
      }
      if (s.sm && act) smoke(left + s.sm[0], top + s.sm[1], now, b.id * 0.37, s.smDark);
      if (fest && (b.npc === 'ole' || b.npc === 'brann') && !b.ruin) festDeco(b, left, top, s, now, nightF, glows);
      if (s.steam && act) { smoke(left + s.sm[0] - 3, top + s.sm[1], now, b.id * 0.37 + 0.5); smoke(left + s.sm[0] + 3, top + s.sm[1], now, b.id * 0.37 + 0.2); }
      // Leuchten im Betrieb (Spulen, Elektroden): [x, y, w, h, Farbe, Farbe hell]
      if (s.lit && act) { const on = Math.sin(now * 9 + b.id) > -0.2; for (const L of s.lit) tint(left + L[0], top + L[1], L[2], L[3], on ? L[5] : L[4]); }
      if (s.fire && act) {
        const fl = Math.sin(now * 13 + b.id) > 0;
        tint(left + s.fire[0], top + s.fire[1], s.fire[2], s.fire[3], fl ? '#ff9a2a' : '#e8632a');
        tint(left + s.fire[0] + 1, top + s.fire[1] + s.fire[3] - 2, Math.max(1, s.fire[2] - 2), 1, '#ffe08a');
      }
      if (b.dmg) {   // beschädigt: rot getönt, roter Schraubenschlüssel darüber
        ctx.globalAlpha = 0.22; tint(left, top + s.h - d.h * TS, d.w * TS, d.h * TS, '#e8504a'); ctx.globalAlpha = 1;
        const w = SPR.icon.wrench, bob = Math.round(Math.sin(now * 3 + b.id) * 1.5);
        ctx.drawImage(w.cv, left + (d.w * TS >> 1) - w.ax, top - 6 + bob - w.ay);
      }
      if (s.glow && nightF > 0 && (act || HQ.has(b.t) || b.t === 'handelskontor' || b.t === 'handel' || (b.t === 'leuchtturm' && game.state.wonder.ph >= 4) || b.t === 'fischer' || b.t === 'werft')) glows.push([left + s.glow[0], top + s.glow[1], act ? 24 : 16, act ? 0.5 : 0.35, act && s.glowCol]);
    } else if (o.ship) {
      const s = o.ship, sp = shipSprite(s.kind), bob = Math.round(Math.sin(now * 2 + s.id) * 0.8), x = Math.round(s.x * TS), y = Math.round(s.y * TS + 4 + bob);
      if (s.fl) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(sp.cv, -sp.ax, y - sp.ay); ctx.restore(); }
      else ctx.drawImage(sp.cv, x - sp.ax, y - sp.ay);
      // Ladung: je belegtem Laderaum eine Kiste an Deck
      const off = [-7, 3, 8, -2];
      (s.cargo || []).forEach((h, i) => { if (!h) return; const c = SPR.crate[h.it], dx = s.fl ? -off[i] : off[i]; ctx.drawImage(c.cv, x + dx - c.ax, y - 4 - c.ay); });
      if (s.bell) drawBellRig(s, x, y, now, !!(dvBusy && dvBusy.ship === s.id));
      if (s.id === ui.selShip) frameRect(x - 13, y - 19, 26, 23, '#ffd23f', Math.max(px1 * 2, 1));
      if (nightF > 0) glows.push([x, y - 6, 12, 0.35]);
    } else if (o.trader) {
      const t = o.trader, sp = SPR.trader[t.kind] || SPR.trader.hafen, bob = Math.round(Math.sin(now * 2 + t.id) * 0.8), x = Math.round(t.x * TS), y = Math.round(t.y * TS + 4 + bob);
      if (t.fl) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(sp.cv, -sp.ax, y - sp.ay); ctx.restore(); }
      else ctx.drawImage(sp.cv, x - sp.ax, y - sp.ay);
      if (nightF > 0) glows.push([x, y - 6, 12, 0.35]);
    } else if (o.find) {
      const f = o.find, sp = f.kind === 'wreck' ? SPR.wreck : SPR.drift, bob = f.kind === 'wreck' ? 0 : Math.round(Math.sin(now * 1.6 + f.x) * 0.8);
      ctx.drawImage(sp.cv, f.x * TS + 8 - sp.ax, f.y * TS + 10 + bob - sp.ay);
    } else if (o.dive) {
      drawBubbles(o.dive, now);
    } else if (o.jet) {
      const j = o.jet, sp = SPR.jetsam, bob = Math.round(Math.sin(now * 1.8 + j.x * 0.7 + j.y) * 0.8);
      ctx.drawImage(sp.cv, j.x * TS + 8 - sp.ax, j.y * TS + 10 + bob - sp.ay);
    } else {
      ctx.drawImage(o.s.cv, o.x - o.s.ax, o.y - o.s.ay);
    }
  }

  drawEventFx(now, wx0, wy0, wx1, wy1, lavaGlow);
  fxStats.drones = drawDrones(now, alpha, wx0, wy0, wx1, wy1);
  // Brückenbänder: Schienen und gleitende Items über allem außer dem Nebel
  drawBridgeRails(c0, c1, r0, r1, selected);
  // Nebel über allem, was noch nicht erkundet ist
  for (const v of vis) {
    if (!v.f) continue;
    if (v.f.ver >= 0) { if (!v.f.empty && v.f.cv) ctx.drawImage(v.f.cv, v.kx * PX, v.ky * PX, PX, PX); }
    else { ctx.fillStyle = FOG_FLAT; ctx.fillRect(v.kx * PX, v.ky * PX, PX, PX); }
  }

  // Statusansicht: Produkt und Status über den Produktionsgebäuden
  if (state.ui.statusView) drawStatus(c0, c1, r0, r1, Z / DPR, px1, revealed);
  // Stromkabel
  drawWires(wx0, wy0, wx1, wy1, px1);
  if (mode && mode.kind === 'wire') { const f = blds.get(mode.from); if (f) { const d = BD[f.t]; tint((f.x - WIRE_RANGE) * TS, (f.y - WIRE_RANGE) * TS, (d.w + 2 * WIRE_RANGE) * TS, (d.h + 2 * WIRE_RANGE) * TS, 'rgba(255,230,120,0.1)'); } }

  // Auswahl
  if (selB && selB.t === 'drohnenhafen') hubRadius(selB.x, selB.y, 2, 2, px1);
  if (selB) { const d = BD[selB.t]; frameRect(selB.x * TS, selB.y * TS, d.w * TS, d.h * TS, '#ffd23f', Math.max(px1 * 2, 1)); }
  else if (selTile >= 0) frameRect(tkx(selTile) * TS, tky(selTile) * TS, TS, TS, '#ffffff', Math.max(px1 * 2, 1));

  // Ausgewähltes Schiff: restlicher Weg gestrichelt
  const selS = ui.selShip >= 0 ? state.ships.find(x => x.id === ui.selShip) : null;
  if (selS && selS.path && selS.st === 'sail') {
    const p = selS.path, sx = selS._x0 != null && alpha < 1 ? selS._x0 + (selS.x - selS._x0) * alpha : selS.x, sy = selS._y0 != null && alpha < 1 ? selS._y0 + (selS.y - selS._y0) * alpha : selS.y;
    ctx.beginPath(); ctx.moveTo(sx * TS, sy * TS);
    for (let i = Math.max(0, (selS.pi || 0) + 1); i < p.length; i++) ctx.lineTo((tkx(p[i]) + 0.5) * TS, (tky(p[i]) + 0.5) * TS);
    ctx.setLineDash([4 * px1, 4 * px1]); ctx.lineWidth = 2 * px1; ctx.strokeStyle = 'rgba(255,248,224,.9)'; ctx.stroke(); ctx.setLineDash([]);
    if (selS.dest === 'man' && selS.mt != null) { const m = SPR.mark; ctx.drawImage(m.cv, tkx(selS.mt) * TS + 6 - m.ax, tky(selS.mt) * TS + 13 - m.ay); }
  }
  const rs = shownRoute();
  if (rs && rs.length) drawRoute(rs, Z, OX, OY, DPR, px1);
  // Zielmarke nach Rechtsklick (2,5 s)
  if (ui.mark && performance.now() - ui.mark.t < 2500) { const m = SPR.mark; ctx.drawImage(m.cv, ui.mark.x * TS + 6 - m.ax, ui.mark.y * TS + 13 - m.ay); }
  // Kontor gründen / verlegen: gültige Plätze leicht markiert, Vorschau 3×3 mit Steg halbtransparent, ungültiger Platz rot
  if (mode && (mode.kind === 'found' || mode.kind === 'move') && mode.sel) {
    for (const k of mode.tiles) tint(tkx(k) * TS, tky(k) * TS, TS, TS, 'rgba(255,236,130,0.3)');
    if (mode.bad) tint(mode.bad.x * TS, mode.bad.y * TS, 3 * TS, 3 * TS, 'rgba(232,80,60,0.45)');
    else if (mode.hover && (mode.hover.x !== mode.sel.x || mode.hover.y !== mode.sel.y)) frameRect(mode.hover.x * TS, mode.hover.y * TS, 3 * TS, 3 * TS, 'rgba(255,255,255,.7)', Math.max(px1 * 2, 1));
    const sp = kontorOfType('kontor', mode.flag), x0 = mode.sel.x * TS, y1 = (mode.sel.y + 3) * TS;
    tint(x0, mode.sel.y * TS, 3 * TS, 3 * TS, 'rgba(124,194,79,0.3)');
    ctx.globalAlpha = 0.75; const L = drawSteg('kontor', mode.sel.x, mode.sel.y, mode.sel.d, mode.sel.sl, null); ctx.globalAlpha = 1;
    for (const p of L.tiles) tint(p.x * TS, p.y * TS, TS, TS, 'rgba(124,194,79,0.25)');
    frameRect(L.dock.x * TS, L.dock.y * TS, TS, TS, 'rgba(160,220,255,.9)', Math.max(px1 * 2, 1));
    ctx.globalAlpha = 0.65; ctx.drawImage(sp.cv, x0, y1 - sp.h); ctx.globalAlpha = 1;
  }
  // Brückenband neu verbinden: Ziel-Enden in Reichweite markieren
  if (mode && mode.kind === 'bridge') {
    const f = blds.get(mode.from);
    if (f) for (const o of blds.values()) {
      if (o.t !== 'bandbruecke' || o.id === f.id || o.isl !== f.isl) continue;
      const dx = o.x - f.x, dy = o.y - f.y, n = Math.abs(dx) + Math.abs(dy);
      if ((dx && dy) || n > BELT_BRIDGE.range + 1) continue;
      frameRect(o.x * TS, o.y * TS, TS, TS, '#9cc8ff', Math.max(px1 * 2, 1));
    }
  }
  if (mode && mode.kind === 'build') drawCableIcons(c0, c1, r0, r1, revealed);
  // Geister-Vorschau beim Bauen
  if (mode && mode.kind === 'build' && ui.hoverW) {
    const d = BD[mode.t], g = ghostPos(), r = checkPlace(game, mode.t, g.x, g.y, false, mode.d);
    if (mode.t === 'saege') for (const i of ringTiles(g.x, g.y, 2, 2)) { const x = tkx(i), y = tky(i); tint(x * TS, y * TS, TS, TS, tree.get(x, y) >= 1 && !claim.get(x, y) ? 'rgba(255,220,90,0.35)' : 'rgba(255,255,255,0.12)'); }
    if (mode.t === 'fischer') for (let yy = g.y - 2; yy < g.y + 4; yy++) for (let xx = g.x - 2; xx < g.x + 4; xx++) if (W.gr(xx, yy) === G_WATER) tint(xx * TS, yy * TS, TS, TS, 'rgba(160,220,255,0.28)');
    if (mode.t === 'saugpumpe' || mode.t === 'geothermie') for (let yy = g.y; yy < g.y + d.h; yy++) for (let xx = g.x; xx < g.x + d.w; xx++) {
      const hit = mode.t === 'saugpumpe' ? oilUnder(game, xx, yy, 1, 1) : W.gr(xx, yy) === G_LAVA;
      if (hit) tint(xx * TS, yy * TS, TS, TS, 'rgba(255,200,80,0.35)');
    }
    if (isPowered(mode.t)) powerPreview(mode.t, g, px1);
    if (mode.t === 'drohnenhafen') hubRadius(g.x, g.y, d.w, d.h, px1);
    if (mode.t === 'dkiste') for (const o of blds.values()) if (o.t === 'drohnenhafen') hubRadius(o.x, o.y, 2, 2, px1);
    if (STEG.has(mode.t) && r.sl) { ctx.globalAlpha = 0.7; drawSteg(mode.t, g.x, g.y, r.d, r.sl, null); ctx.globalAlpha = 1; }
    tint(g.x * TS, g.y * TS, d.w * TS, d.h * TS, r.ok ? 'rgba(124,194,79,0.22)' : 'rgba(232,80,60,0.3)');
    ctx.globalAlpha = 0.7;
    if (PIPE.has(mode.t)) ctx.drawImage(SPR.pipe[PIPES[mode.t].tier - 1][pipeMask(g.x, g.y)].cv, g.x * TS, g.y * TS);
    else if (FLAT.has(mode.t)) { ctx.drawImage(flatSprite(mode.t, mode.d, now).cv, g.x * TS, g.y * TS); if (mode.t === 'sortierer') sorterPatch(g.x * TS, g.y * TS, mode.so); }
    else {
      const s = mode.t === 'extraktor' ? SPR.b.extraktor[mode.d] : STEG.has(mode.t) ? kontorOfType(mode.t, flagOf(game, W.il(g.x, g.y))) : Array.isArray(SPR.b[mode.t]) ? SPR.b[mode.t][0] : SPR.b[mode.t];
      ctx.drawImage(s.cv, g.x * TS, (g.y + d.h) * TS - s.h);
    }
    ctx.globalAlpha = 1;
  }
  if (mode && mode.kind === 'upgrade' && ui.hoverTile >= 0) {
    const T = upgradeTarget(ui.hoverTile, ui.shift), u = T ? upgradeInfo(game, T) : null;
    const col = !u ? 'rgba(255,255,255,0.15)' : u.ok ? 'rgba(124,194,79,0.4)' : 'rgba(232,80,60,0.4)';
    if (T && T.pipe) tint(T.x * TS + 3, T.y * TS + 3, TS - 6, TS - 6, col);
    else if (T) { const d = BD[T.t]; tint(T.x * TS, T.y * TS, d.w * TS, d.h * TS, col); }
    else tint(tkx(ui.hoverTile) * TS, tky(ui.hoverTile) * TS, TS, TS, col);
  }
  if (mode && mode.kind === 'bpSelect' && mode.a != null) {
    const b = mode.b != null ? mode.b : ui.hoverTile >= 0 ? ui.hoverTile : mode.a;
    const x0 = Math.min(tkx(mode.a), tkx(b)), y0 = Math.min(tky(mode.a), tky(b)), x1 = Math.max(tkx(mode.a), tkx(b)), y1 = Math.max(tky(mode.a), tky(b));
    tint(x0 * TS, y0 * TS, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS, 'rgba(110,170,255,0.18)');
    for (const o of blds.values()) {
      const d = BD[o.t];
      if (o.x >= x0 && o.y >= y0 && o.x + d.w - 1 <= x1 && o.y + d.h - 1 <= y1) tint(o.x * TS, o.y * TS, d.w * TS, d.h * TS, BP_EXCLUDE.has(o.t) || d.fixed ? 'rgba(232,80,60,0.3)' : 'rgba(110,170,255,0.3)');
    }
    frameRect(x0 * TS, y0 * TS, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS, '#9cc8ff', Math.max(px1 * 2, 1));
  }
  const bg = bpGhost();
  if (bg) {
    const { B, x: ox, y: oy } = bg, chk = bpCheck(bg), pk = new Set(B.pipes.map(([x, y]) => tk(ox + x, oy + y)));
    B.pipes.forEach(([x, y, tier], i) => {
      const ok = chk.pipes[i].ok;
      ctx.globalAlpha = 0.6; ctx.drawImage(SPR.pipe[tier - 1][pipeMask(ox + x, oy + y, (nx, ny) => pk.has(tk(nx, ny)))].cv, (ox + x) * TS, (oy + y) * TS); ctx.globalAlpha = 1;
      tint((ox + x) * TS, (oy + y) * TS, TS, TS, ok ? 'rgba(124,194,79,0.25)' : 'rgba(232,80,60,0.35)');
    });
    B.parts.forEach((p, i) => {
      const d = BD[p.t], ok = chk.parts[i].ok, x = (ox + p.x) * TS, y = (oy + p.y) * TS;
      tint(x, y, d.w * TS, d.h * TS, ok ? 'rgba(124,194,79,0.25)' : 'rgba(232,80,60,0.35)');
      ctx.globalAlpha = 0.6;
      if (FLAT.has(p.t)) { ctx.drawImage(flatSprite(p.t, p.d, now).cv, x, y); if (p.t === 'sortierer') sorterPatch(x, y, p.so); }
      else { const s = p.t === 'extraktor' ? SPR.b.extraktor[p.d || 0] : Array.isArray(SPR.b[p.t]) ? SPR.b[p.t][0] : SPR.b[p.t]; ctx.drawImage(s.cv, x, y + d.h * TS - s.h); }
      ctx.globalAlpha = 1;
    });
    frameRect(ox * TS, oy * TS, B.w * TS, B.h * TS, chk.n === chk.total ? '#b4e47c' : '#ffc61a', Math.max(px1 * 2, 1));
  }
  if (mode && mode.kind === 'demolish' && ui.hoverTile >= 0) {
    const hoverTile = ui.hoverTile, b = blds.get(game.bmap.getK(hoverTile)), pipe = game.pipes.getK(hoverTile) > 0;
    if (pipe && (ui.shift || !b)) tint(tkx(hoverTile) * TS + 4, tky(hoverTile) * TS + 4, TS - 8, TS - 8, 'rgba(232,80,60,0.6)');   // nur das Rohr
    else if (b && !BD[b.t].fixed) { const d = BD[b.t]; tint(b.x * TS, b.y * TS, d.w * TS, d.h * TS, 'rgba(232,80,60,0.4)'); }
    else tint(tkx(hoverTile) * TS, tky(hoverTile) * TS, TS, TS, 'rgba(255,255,255,0.15)');
  }

  // Koop: Vorschau und Rahmen der Mitspieler, eigene noch unbestätigte Bauten
  drawPeersWorld(ctx, now, px1);
  // Nacht
  if (nightF > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(18,24,64,${0.46 * nightF})`; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(Z, 0, 0, Z, OX, OY);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, a, col] of glows.concat(lavaGlow)) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r), c = col || '255,200,90';
      g.addColorStop(0, `rgba(${c},${a * nightF})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    drawBeam(now, nightF);
    if (fest) drawFireworks(now, nightF);
  } else if (di.isDay) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(cw * 0.92, 0, 0, cw * 0.92, 0, Math.max(cw, ch) * 0.8);
    g.addColorStop(0, 'rgba(255,224,150,0.18)'); g.addColorStop(1, 'rgba(255,224,150,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  }
  // Inselnamen beim Herauszoomen: nur benannte, entdeckte Inseln (vorerst die Heimatinsel)
  if (Z / DPR < 1.6) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `600 ${Math.round(15 * DPR)}px 'Pixelify Sans', monospace`; ctx.textAlign = 'center';
    const named = new Set(Object.keys(state.isl).map(Number).filter(k => k === HOME_ISL || state.isl[k].name));
    if (state.homes) for (const h of state.homes) if (h.pid) named.add(islId(h.cx, h.cy));
    for (const k of named) {
      if (!state.found[k]) continue;
      const I = W.island(k);
      if (!I) continue;
      const sx = (I.x + 0.5) * TS * Z + OX, sy = (I.y - 1) * TS * Z + OY;
      if (sx < -200 || sx > cw + 200 || sy < -50 || sy > ch + 50) continue;
      const name = islName(game, k);
      ctx.lineWidth = 4 * DPR; ctx.strokeStyle = 'rgba(60,35,15,.85)'; ctx.strokeText(name, sx, sy);
      const H = isSep(game) && homeAt(game, k);
      ctx.fillStyle = H && H.pid !== actor(game) ? pColor(H.pid) : '#fbf0d4'; ctx.fillText(name, sx, sy);
    }
  }
  // Koop: Mauszeiger der Mitspieler, Markierungen
  drawPeersScreen(ctx, Z, OX, OY, DPR, cw, ch, nowMs);
  renderStats.ms = performance.now() - t0;
}
