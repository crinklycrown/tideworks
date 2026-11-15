/* =========================================================
   EINGABE: Maus, Touch, Tastatur, Kamera-Steuerung
   Platzierungs-Prüfungen lesen den Spiegel direkt (checkPlace),
   Änderungen gehen als Kommandos an die Simulation.
   ========================================================= */
import { closePause } from '../ui/menu.js';
import { DIRS } from '../config.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { BD, FLAT, PIPE, PORTS, STORE } from '../data/buildings.js';
import { checkPlace } from '../sim/buildings.js';
import { canLink } from '../sim/power.js';
import { cam, clampCam, screenToWorld, tileAtW, zoomAt, centerIsland, followShip, stopFollow } from '../gfx/camera.js';
import { ghostPos, shipAt, upgradeTarget } from '../gfx/renderer.js';
import { upgradeInfo } from '../sim/buildings.js';
import { mine, homeIsl } from '../sim/state.js';
import { game, ui, $, send, afterSync, saveGame, newGrp } from '../ui/context.js';
import { upgradeCmd, addCost, undo, redo, pipette } from '../ui/tools.js';
import { selectDone, copySelection, pasteClip, rotatePlace, placeClick, toggleLibrary } from '../ui/blueprints.js';
import { setSpeed, togglePause } from '../ui/speed.js';
import { renderAllUI, setMode, demolishAsk } from '../ui/panels.js';
import { renderInsights, updateHint } from '../ui/insights.js';
import { handleUIKey, escape } from '../ui/hotbar.js';
import { isSmallScreen } from '../ui/layout.js';
import { toast } from '../ui/toasts.js';
import { isGuest, active as coopActive } from '../net/session.js';
import { openChat } from '../ui/chat.js';
import { openMarkMenu } from '../ui/marks.js';
import { selectShip, foundHover, foundClick, foundConfirm, foundRotate, routeAdd, routeFinish } from '../ui/ships.js';

const SPOT = new Set(['found', 'move']);         // Kontor gründen / verlegen
const CLICK_MODES = new Set(['found', 'move', 'route', 'bridge']);   // Modi, die auf einen Klick ohne Ziehen warten

let drag = null, painting = null, lastX = 0, lastY = 0;
export const keys = new Set();
// Koop: Felder des laufenden Band-/Rohr-Zugs (Vorschau für die Mitspieler) als [x, y]
export const dragPath = () => painting && painting.path ? painting.path : null;

function canvasPos(e) { const r = cam.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function tryPlace() {
  const mode = ui.mode, g = ghostPos(), r = checkPlace(game, mode.t, g.x, g.y, false, mode.d);
  if (!r.ok) { toast(r.reason); return; }
  send({ type: 'place', t: mode.t, x: g.x, y: g.y, d: r.d != null ? r.d : mode.d, rc: mode.rc, ex: mode.ex, ga: mode.ga, so: mode.so });
  afterSync(() => { renderAllUI(true); updateHint(); });
}
// Linksklick ohne Ziehen in den Modi „Kontor gründen“ und „Route anlegen“ bzw. ohne Modus
function mapClick() {
  const mode = ui.mode;
  if (mode && SPOT.has(mode.kind)) { foundClick(); updateHint(); return; }
  if (mode && mode.kind === 'route') {
    const b = ui.hoverTile >= 0 ? game.blds.get(game.bmap.getK(ui.hoverTile)) : null;
    if (b && PORTS.has(b.t)) routeAdd(b.id); else toast('Hier ist kein Kontor. Hauptkontore und Handelskontore der Reihe nach anklicken.');
    return;
  }
  if (mode && mode.kind === 'bridge') {
    const b = ui.hoverTile >= 0 ? game.blds.get(game.bmap.getK(ui.hoverTile)) : null;
    if (!b || b.t !== 'bandbruecke' || b.id === mode.from) { toast('Ein anderes Brückenband-Ende anklicken.'); return; }
    send({ type: 'bridgeLink', id: mode.from, to: b.id });
    setMode(null); saveGame(); afterSync(() => renderAllUI(true));
    return;
  }
  // Umschalt+Klick auf ein Tor: öffnen/schließen
  if (!mode && ui.shift && ui.hoverTile >= 0) {
    const b = game.blds.get(game.bmap.getK(ui.hoverTile));
    if (b && b.t === 'tor') { send({ type: 'gate', id: b.id }); saveGame(); afterSync(() => renderAllUI(true)); return; }
  }
  const s = ui.hoverW ? shipAt(ui.hoverW.x, ui.hoverW.y) : null;     // Schiffe haben Vorrang vor dem Feld darunter
  if (s) { selectShip(s.id); followShip(s.id); return; }   // Kamera folgt dem Schiff (gfx/camera.js)
  onTileClick(ui.hoverTile);
}
// Rechtsklick mit ausgewähltem Schiff: dorthin fahren (Wasser = genau dieses Feld, Land = Küste in Richtung des Klicks)
function shipGoto() {
  if (ui.hoverTile < 0) return;
  send({ type: 'shipGoto', ship: ui.selShip, x: tkx(ui.hoverTile), y: tky(ui.hoverTile) });
  saveGame(); afterSync(() => renderAllUI(true));
}
// Gedrückt halten und ziehen: jedes Band zeigt in die Richtung, in die gezogen wird.
// Die Simulation verlegt die Bänder (Kommando „paint“); die Bau-Richtung wird hier genauso nachgeführt.
// Mit Umschalt bleibt der Zug auf der Achse, in die er zuerst lief (gerade Linie ab dem Startfeld).
function paintBelt(i, shift) {
  if (i < 0) return;
  if (painting.start == null) painting.start = i;
  if (shift && painting.last >= 0) {
    const sx = tkx(painting.start), sy = tky(painting.start), dx = tkx(i) - sx, dy = tky(i) - sy;
    if (painting.axis == null && (dx || dy)) painting.axis = Math.abs(dx) >= Math.abs(dy) ? 0 : 1;
    if (painting.axis === 0) i = tk(tkx(i), sy); else if (painting.axis === 1) i = tk(sx, tky(i));
  } else if (!shift) painting.axis = null;
  if (painting.last === i) return;
  const mode = ui.mode, rot = BD[mode.t].rot;
  if (painting.path && painting.path.length < 400) painting.path.push([tkx(i), tky(i)]);
  send({ type: 'paint', t: mode.t, from: painting.last, to: i, d: mode.d, first: painting.first, grp: painting.grp, ex: mode.ex, ga: mode.ga, so: mode.so });
  painting.first = false;
  if (painting.last >= 0 && rot) {
    let cx = tkx(painting.last), cy = tky(painting.last);
    const tx = tkx(i), ty = tky(i);
    while (cx !== tx || cy !== ty) {
      const d = cx !== tx ? (tx > cx ? 0 : 2) : (ty > cy ? 1 : 3);
      mode.d = d;
      cx += DIRS[d][0]; cy += DIRS[d][1];
    }
  }
  painting.last = i;
  updateHint();
}
function wireClick(i) {
  const mode = ui.mode, from = game.blds.get(mode.from);
  if (!from) { setMode(null); return; }
  const o = i >= 0 && game.bmap.getK(i) ? game.blds.get(game.bmap.getK(i)) : null;
  if (!o || o.id === from.id) { setMode(null); return; }
  if ((from.links || []).includes(o.id)) { send({ type: 'unlink', a: from.id, b: o.id }); toast('Kabel entfernt.'); }
  else { const err = canLink(from, o); if (err) { toast(err); return; } send({ type: 'link', a: from.id, b: o.id }); }
  afterSync(() => { renderInsights(); updateHint(); });
}
// Abreißen: auf einem Feld mit Band und Rohr erst das Band, beim nächsten Klick das Rohr; mit Umschalt nur das Rohr.
// Jedes Feld zählt je Zug nur einmal (painting.tiles), damit ein Zug nicht Band und Rohr zugleich entfernt.
function demolishAt(i, shift) {
  if (i < 0 || painting.tiles.has(i)) return;
  const b = game.blds.get(game.bmap.getK(i)), pipe = game.pipes.getK(i) > 0;
  if (pipe && (shift || !b)) { painting.tiles.add(i); send({ type: 'removePipe', x: tkx(i), y: tky(i), grp: painting.grp }); return; }
  if (!b || BD[b.t].fixed || painting.done.has(b.id)) return;
  painting.done.add(b.id); painting.tiles.add(i);
  if (STORE.has(b.t)) { demolishAsk(b, painting.grp); return; }   // Speicher: fragen, wenn Bestand verloren ginge
  send({ type: 'remove', id: b.id, grp: painting.grp });
}
// Aufwerten: jedes Teil je Zug nur einmal (eine Stufe); Anzahl und Kosten für den Hinweis mitzählen
function upgradeAt(i, shift) {
  const T = upgradeTarget(i, shift);
  if (!T || (!T.pipe && !mine(game, T))) return;   // Getrennte Inseln: nur eigene Gebäude
  const key = T.pipe ? 'p' + i : 'b' + T.id;
  if (painting.done.has(key)) return;
  painting.done.add(key);
  const u = upgradeInfo(game, T);
  if (u && u.ok) { painting.n++; addCost(painting.cost, u.cost); }
  upgradeCmd(T, painting.grp);
  ui.upDrag = { n: painting.n, cost: painting.cost };
  updateHint();
}
function onTileClick(i) {
  ui.selShip = -1;
  if (i < 0) { ui.selected = -1; ui.selTile = -1; renderInsights(); return; }
  const id = game.bmap.getK(i);
  if (id) { ui.selected = id; ui.selTile = -1; }
  else { ui.selected = -1; ui.selTile = i; }
  if (!isSmallScreen()) game.state.ui.infoCollapsed = false;   // auf kleinen Bildschirmen bleibt es eingeklappt
  renderAllUI(true);
}

export function wireInput() {
  const canvas = cam.canvas;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    const pan = e.pointerType === 'mouse' && e.button !== 0, mode = ui.mode;
    ui.shift = e.shiftKey;
    const p = canvasPos(e); ui.hoverW = screenToWorld(p.x, p.y); ui.hoverTile = tileAtW(ui.hoverW.x, ui.hoverW.y);
    // Koop: Alt+Klick öffnet das Markierungs-Menü (die mittlere Maustaste beim Loslassen ohne Ziehen)
    if (coopActive() && e.altKey && e.button === 0) { openMarkMenu(e.clientX, e.clientY, ui.hoverW); return; }
    if (!pan && mode && !CLICK_MODES.has(mode.kind)) {
      if (mode.kind === 'build') {
        if (FLAT.has(mode.t) || PIPE.has(mode.t)) { painting = { last: -1, first: true, grp: newGrp(), path: [] }; paintBelt(ui.hoverTile, e.shiftKey); }
        else tryPlace();
      } else if (mode.kind === 'wire') wireClick(ui.hoverTile);
      else if (mode.kind === 'upgrade') { painting = { up: true, done: new Set(), grp: newGrp(), n: 0, cost: {} }; upgradeAt(ui.hoverTile, e.shiftKey); }
      else if (mode.kind === 'bpSelect') { if (ui.hoverTile >= 0) { mode.a = ui.hoverTile; mode.b = null; painting = { sel: true }; updateHint(); } }
      else if (mode.kind === 'bpPlace') placeClick();
      else { painting = { done: new Set(), tiles: new Set(), grp: newGrp() }; demolishAt(ui.hoverTile, e.shiftKey); }
      return;
    }
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, pan, btn: e.button };
    lastX = e.clientX; lastY = e.clientY;
    if (e.button === 1) e.preventDefault();     // kein Auto-Scroll des Browsers
  });
  canvas.addEventListener('pointermove', e => {
    const p = canvasPos(e), mode = ui.mode;
    ui.shift = e.shiftKey;     // Abriss-Vorschau: mit Umschalt nur das Rohr
    ui.hoverW = screenToWorld(p.x, p.y);
    const nt = tileAtW(ui.hoverW.x, ui.hoverW.y);
    if (mode && SPOT.has(mode.kind)) { const had = mode.bad; foundHover(ui.hoverW); if (!!had !== !!mode.bad || (had && mode.bad && had.reason !== mode.bad.reason)) updateHint(); }
    if (nt !== ui.hoverTile) { ui.hoverTile = nt; if (mode) updateHint(); }
    if (painting) {
      if (painting.sel) return;
      if (mode && mode.kind === 'build') paintBelt(ui.hoverTile, e.shiftKey);
      else if (mode && mode.kind === 'upgrade') upgradeAt(ui.hoverTile, e.shiftKey);
      else if (mode) demolishAt(ui.hoverTile, e.shiftKey);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; stopFollow(); canvas.classList.add('grabbing'); }
      if (drag.moved) { const s2 = cam.Z / cam.DPR; cam.x = drag.cx - dx / s2; cam.y = drag.cy - dy / s2; clampCam(); }
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (painting) {
      const wasPaint = painting.last !== undefined, sel = painting.sel;
      painting = null; ui.upDrag = null;
      if (sel) { const m = ui.mode; if (m && m.kind === 'bpSelect' && m.a != null) { m.b = ui.hoverTile >= 0 ? ui.hoverTile : m.a; selectDone(); } updateHint(); return; }
      if (wasPaint) send({ type: 'paintEnd' });
      saveGame(); afterSync(() => renderAllUI(true));
      return;
    }
    if (!drag) return;
    const { moved, pan, btn } = drag;
    drag = null; canvas.classList.remove('grabbing');
    if (!moved && !pan) mapClick();
    else if (!moved && pan && btn === 1 && coopActive() && ui.hoverW) openMarkMenu(lastX, lastY, ui.hoverW);
    else if (!moved && pan && btn === 2 && ui.mode) setMode(null);
    else if (!moved && pan && btn === 2 && ui.selShip >= 0) shipGoto();
  });
  canvas.addEventListener('pointercancel', () => { if (painting && painting.last !== undefined) send({ type: 'paintEnd' }); drag = null; painting = null; ui.upDrag = null; canvas.classList.remove('grabbing'); });
  // Maus verlässt die Karte (auch auf ein Panel): Vorschau und Hinweis leeren
  canvas.addEventListener('pointerleave', () => { if (!drag && !painting) { ui.hoverW = null; ui.hoverTile = -1; foundHover(null); updateHint(); } });
  canvas.addEventListener('wheel', e => { e.preventDefault(); const p = canvasPos(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1 : -1); }, { passive: false });

  const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || !$('modal').classList.contains('hidden');
  document.addEventListener('keydown', e => {
    const mode = ui.mode;
    if (e.key === 'Shift') keys.add('fast');
    if (ui.menu || ui.cine || !$('modal').classList.contains('hidden')) return;   // Titel, Cutscene/Dialog, Fenster
    // Pausenmenü: nur Esc (schließt es)
    if (ui.pause) { if (e.key === 'Escape') { e.preventDefault(); closePause(); } return; }
    // In Eingabefeldern/Selects wirken keine Kürzel; Esc verlässt nur das Feld
    if (typing(e)) { if (e.key === 'Escape' || (e.key === 'Enter' && e.target.tagName === 'INPUT')) e.target.blur(); return; }
    if (e.key === 'Escape') { escape(); return; }
    // Strg/Cmd: Rückgängig, Wiederholen, Blaupause kopieren/einfügen
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
      if (k === 'c') { if (copySelection()) e.preventDefault(); return; }
      if (k === 'v') { e.preventDefault(); pasteClip(); return; }
      return;
    }
    // Spieltempo: Leertaste = Pause, Umschalt+1/2/3
    if (isGuest() && (e.key === ' ' || e.code === 'Space' || (e.shiftKey && /^Digit[123]$/.test(e.code)))) { e.preventDefault(); return; }   // Tempo bestimmt nur der Host
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); togglePause(); return; }
    if (e.shiftKey && /^Digit[123]$/.test(e.code)) { e.preventDefault(); setSpeed(+e.code.slice(5)); return; }
    if (e.key === 'q' || e.key === 'Q') { pipette(e.shiftKey); updateHint(); return; }
    if (e.key === 'Enter' && mode && SPOT.has(mode.kind)) { foundConfirm(); return; }
    // G: ausgewähltes Tor öffnen/schließen
    if ((e.key === 'g' || e.key === 'G') && !mode && ui.selected >= 0) {
      const b = game.blds.get(ui.selected);
      if (b && b.t === 'tor') { send({ type: 'gate', id: b.id }); saveGame(); afterSync(renderInsights); return; }
    }
    if (e.key === 'Enter' && mode && mode.kind === 'route') { routeFinish(); return; }
    // Koop: Enter öffnet den Chat (wenn kein Modus Enter braucht)
    if (e.key === 'Enter' && coopActive()) { e.preventDefault(); openChat(); return; }
    if (KEYMAP[e.key]) { keys.add(KEYMAP[e.key]); e.preventDefault(); return; }
    if (handleUIKey(e)) { e.preventDefault(); return; }
    if (e.key === 'r' || e.key === 'R') {
      if (mode && SPOT.has(mode.kind)) { foundRotate(); updateHint(); }
      else if (mode && mode.kind === 'build') { mode.d = (mode.d + 1) % 4; updateHint(); }
      else if (mode && mode.kind === 'bpPlace') { rotatePlace(); updateHint(); }
      else if (ui.selected >= 0) { const b = game.blds.get(ui.selected); if (b) { send({ type: 'rotate', id: b.id }); afterSync(renderInsights); } }
    }
    if (e.key === '+') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1);
    if (e.key === '-') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, -1);
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'Shift') keys.delete('fast');
    if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]);
    // Umschalt+W liefert beim Loslassen ggf. „w“ statt „W“: beide Schreibweisen lösen
    const k = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (k && KEYMAP[k]) keys.delete(KEYMAP[k]);
  });
  window.addEventListener('blur', () => keys.clear());

  // Haken/X über der Kontor-Vorschau und im Routen-Hinweis
  $('foundBtns').addEventListener('click', e => { const b = e.target.closest('[data-fb]'); if (!b) return; if (b.dataset.fb === 'ok') foundConfirm(); else setMode(null); });
  $('buildHint').addEventListener('click', e => { const b = e.target.closest('[data-hint]'); if (!b || b.disabled) return; if (b.dataset.hint === 'ok') routeFinish(); else if (b.dataset.hint === 'bplib') toggleLibrary(); else setMode(null); });

  $('zoomIn').addEventListener('click', () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1));
  $('zoomOut').addEventListener('click', () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, -1));
  // Zum Kontor der Insel unter der Kamera, über dem Meer zur Heimatinsel
  $('goHome').addEventListener('click', () => centerIsland(game, ui.camIsl >= 0 ? ui.camIsl : homeIsl(game)));
}
