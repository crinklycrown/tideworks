/* =========================================================
   KNOPFLEISTE unten mittig + Tastenkürzel der Oberfläche
   B Bauen · T Forschung · F Flotte · P Statistik · K Markt · N Völker · L Relikte · M Karte · X Abriss · U Aufwerten · V Blaupause · H Status · 1–9 Gebäude · Esc
   Rückgängig/Wiederholen (Pfeile, Strg+Z / Strg+Y) haben keinen Namen. Alle Kürzel: KEYS (Tabelle im Zahnrad-Menü).
   ========================================================= */
import { openPause } from './menu.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { cam, stopFollow } from '../gfx/camera.js';
import { game, ui, $ } from './context.js';
import { anyResearchable } from '../sim/research.js';
import { renderInsights } from './insights.js';
import { setMode } from './panels.js';
import { toggleBuild, closeBuild, pickIndex } from './buildmenu.js';
import { toggleWindow, closeWindow } from './windows.js';
import { closePopover } from './inventory.js';
import { menusOpen, closeMenus } from './hud.js';
import { registerTip } from './tooltip.js';
import { toggleUpgrade, toggleStatus, undo, redo } from './tools.js';
import { toggleSelect, toggleLibrary, escBlueprint } from './blueprints.js';
import { esc } from '../util/format.js';

// Knöpfe: id, Symbol (SPR.icon), Name, Taste, Aktion
const HOTBAR = [
  { id: 'build', icon: 'hammer', name: 'Bauen', key: 'B', run: () => toggleBuild() },
  { id: 'tech', icon: 'flask', name: 'Forschung', key: 'T', run: () => toggleWindow('tech') },
  { id: 'fleet', icon: 'anchor', name: 'Flotte', key: 'F', run: () => toggleWindow('fleet') },
  { id: 'stats', icon: 'chart', name: 'Statistik', key: 'P', run: () => toggleWindow('stats') },
  { id: 'market', icon: 'coin', name: 'Markt', key: 'K', run: () => toggleWindow('market') },
  { id: 'npcs', icon: 'people', name: 'Völker', key: 'N', run: () => toggleWindow('npcs') },
  { id: 'relics', icon: 'relic', name: 'Relikte', key: 'L', run: () => toggleWindow('relics') },
  { id: 'map', icon: 'map', name: 'Karte', key: 'M', run: () => toggleWindow('map') },
  { id: 'demolish', icon: 'pick', name: 'Abriss', key: 'X', run: () => toggleDemolish() },
  { id: 'upgrade', icon: 'upgrade', name: 'Aufwerten', key: 'U', run: () => toggleUpgrade() },
  { id: 'blueprint', icon: 'blueprint', name: 'Blaupause', key: 'V', run: () => toggleSelect() },
  { id: 'status', icon: 'status', name: 'Status', key: 'H', run: () => toggleStatus() },
  { id: 'undo', icon: 'undo', key: 'Strg+Z', arrow: true, sep: true, run: () => undo() },
  { id: 'redo', icon: 'redo', key: 'Strg+Y', arrow: true, run: () => redo() }
];
const BY_KEY = Object.fromEntries(HOTBAR.filter(h => h.key.length === 1).map(h => [h.key.toLowerCase(), h]));

// Alle Tastenkürzel (Tabelle „Tastenkürzel“ im Pausenmenü)
export const KEYS = [
  ['Karte', [['W A S D / Pfeiltasten', 'Karte verschieben (mit Umschalt dreimal so schnell)'], ['+ / − / Mausrad', 'Zoomen'], ['Leertaste', 'Pause an/aus'], ['Umschalt+1 / 2 / 3', 'Spieltempo 1× / 2× / 3×']]],
  ['Bauen', [['B', 'Baumenü'], ['1–9', 'Gebäude der offenen Kategorie'], ['R', 'Drehen (Bauen, Blaupause, Auswahl)'], ['Q', 'Pipette: Gebäude, Rohr oder Band unter der Maus übernehmen'], ['Umschalt+Q', 'Pipette: Rohr unter einem Band'],
    ['Ziehen', 'Bänder als Linie verlegen: quer liegende Bänder werden Kreuzungen, Hindernisse bis 3 Felder überspannt ein Brückenband'], ['Umschalt+Ziehen', 'Linie gerade halten'],
    ['X', 'Abriss (Umschalt: nur das Rohr)'], ['U', 'Aufwerten (Klick oder Ziehen, Umschalt: Rohr unter einem Band)'], ['Strg+Z', 'Rückgängig'], ['Strg+Y / Strg+Umschalt+Z', 'Wiederholen']]],
  ['Blaupausen', [['V', 'Rechteck auswählen'], ['Strg+C', 'Auswahl kopieren'], ['Strg+V', 'Zwischenablage einfügen'], ['Umschalt+V', 'Bibliothek „Blaupausen“']]],
  ['Fenster und Ansichten', [['T', 'Forschung'], ['F', 'Flotte'], ['P', 'Statistik'], ['M', 'Kartenansicht: ganze erkundete Welt, Routen, Schiffe, Funde'], ['K', 'Markt: Preise, Händler, Handelsaufträge'], ['N', 'Völker: Handel, Ruf, Aufträge und Lieferverträge mit Ole, Brann und Aurel'], ['L', 'Relikte: Sammlung, eingesetzte Relikte, Herkunft'],['H', 'Statusansicht'], ['G / Umschalt+Klick', 'Tor öffnen oder schließen'], ['Esc', 'Abbrechen, schließen (Reihenfolge siehe README); ist nichts offen: Pausenmenü']]],
  ['Koop', [['Enter', 'Chat öffnen, Enter schickt, Esc schließt (nicht in Modi, die Enter brauchen: Kontor gründen, Route anlegen)'], ['Mittlere Maustaste / Alt+Klick', 'Markierung setzen: Hierher, Achtung, Hilfe, Bauplatz'], ['Leertaste / Umschalt+1 / 2 / 3', 'Tempo und Pause: nur der Host']]]
];

export const toggleDemolish = () => setMode(ui.mode && ui.mode.kind === 'demolish' ? null : { kind: 'demolish' });

export function renderHotbar() {
  for (const el of $('hotbar').children) {
    const id = el.dataset.hb;
    const k = ui.mode && ui.mode.kind;
    el.classList.toggle('on', id === 'build' ? ui.buildOpen : id === 'demolish' ? k === 'demolish' : id === 'upgrade' ? k === 'upgrade'
      : id === 'blueprint' ? k === 'bpSelect' || k === 'bpPlace' : id === 'status' ? !!(game.state && game.state.ui.statusView) : ui.win === id);
    if (id === 'undo' || id === 'redo') el.classList.toggle('off', !(game.undo && game.undo[id === 'undo' ? 'u' : 'r']));
    if (id === 'tech') el.classList.toggle('dot', !!game.state && anyResearchable(game));   // Forschung verfügbar und bezahlbar
  }
}

// Esc: Blaupause platzieren/Auswahl → Kontor gründen/verlegen, Route anlegen, Brückenband verbinden → Kamera folgt Schiff → Popover/Menü → Fenster → Bau-/Abrissmodus → Baumenü → Auswahl → Pausenmenü
export function escape() {
  if (ui.mode && (ui.mode.kind === 'bpPlace' || ui.mode.kind === 'bpSelect')) { escBlueprint(); return; }
  if (ui.mode && (ui.mode.kind === 'found' || ui.mode.kind === 'move' || ui.mode.kind === 'route' || ui.mode.kind === 'bridge')) { setMode(null); return; }
  if (cam.follow >= 0) { stopFollow(); return; }   // Kamera folgt einem Schiff: erst das beenden
  if (ui.popItem) { closePopover(); return; }
  if (menusOpen()) { closeMenus(); return; }
  if (ui.win) { closeWindow(); return; }
  if (ui.mode) { setMode(null); return; }
  if (ui.buildOpen) { closeBuild(); return; }
  if (ui.selected >= 0 || ui.selTile >= 0 || ui.selShip >= 0) { ui.selected = -1; ui.selTile = -1; ui.selShip = -1; renderInsights(); return; }
  openPause();
}
// Tastenkürzel der Oberfläche; liefert true, wenn die Taste verbraucht wurde
export function handleUIKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.shiftKey && (e.key === 'v' || e.key === 'V')) { toggleLibrary(); return true; }
  const h = BY_KEY[e.key.toLowerCase()];
  if (h) { h.run(); return true; }
  if (/^[1-9]$/.test(e.key)) { pickIndex(+e.key - 1); return true; }
  return false;
}

export function wireHotbar() {
  $('hotbar').innerHTML = HOTBAR.map(h => h.arrow
    ? `<button class="hbtn arrow${h.sep ? ' sep' : ''}" data-hb="${h.id}" data-tip="hb:${h.id}">${img(SPR.icon[h.icon], 2)}</button>`
    : `<button class="hbtn" data-hb="${h.id}" data-tip="hb:${h.id}">${img(SPR.icon[h.icon], 2)}<span class="hn">${h.name}</span><kbd>${h.key}</kbd></button>`).join('');
  $('hotbar').addEventListener('click', e => { const b = e.target.closest('[data-hb]'); if (b) { ui.uiPressed = false; b.blur(); HOTBAR.find(h => h.id === b.dataset.hb).run(); } });
  registerTip('hb', (id) => {
    const h = HOTBAR.find(x => x.id === id);
    if (!h) return '';
    // Pfeile: Beschriftung der obersten Aktion („Rückgängig: 14 Fließbänder gebaut“)
    if (h.arrow) { const lbl = game.undo && game.undo[id === 'undo' ? 'u' : 'r'], what = id === 'undo' ? 'Rückgängig' : 'Wiederholen'; return `<div class="tt-h"><span>${lbl ? `${what}: ${esc(lbl)}` : `Nichts zum ${what === 'Rückgängig' ? 'Rückgängigmachen' : 'Wiederholen'}`}</span><kbd>${h.key}</kbd></div>`; }
    const extra = id === 'market' ? '<div class="xs">Preise, nächste Händler und Handelsaufträge je Insel mit Handelsposten.</div>' : id === 'npcs' ? '<div class="xs">Handel mit Ole, Brann und Aurel: Ruf, Angebot, Aufträge, Lieferverträge, Pläne.</div>' : id === 'blueprint' ? '<div class="xs">Rechteck aufziehen und als Blaupause speichern. Bibliothek: Umschalt+V</div>' : id === 'status' ? '<div class="xs">Produkt und Status über allen Produktionsgebäuden: grün läuft, gelb wartet, rot fehlt Strom/Wasser/Versorgung, grau kein Rezept.</div>' : id === 'upgrade' ? '<div class="xs">Klick oder Ziehen wertet eine Stufe auf. Das alte Teil wird voll erstattet (ohne Pläne).</div>' : '';
    return `<div class="tt-h"><span>${h.name}</span><kbd>${h.key}</kbd></div>${extra}`;
  });
  renderHotbar();
}

// Tabelle aller Tastenkürzel (Zahnrad-Menü)
export function showKeys() {
  const m = $('modal');
  m.innerHTML = `<div class="panel modal wide" role="dialog" aria-modal="true"><div class="phead"><span class="row">${img(SPR.icon.key, 2)}Tastenkürzel</span></div>
    <div class="mb small scroll"><table class="keys">${KEYS.map(([h, rows]) => `<tr class="kh"><td colspan="2">${h}</td></tr>` + rows.map(([k, t]) => `<tr><td>${k.split(' / ').map(x => `<kbd>${x}</kbd>`).join(' ')}</td><td>${t}</td></tr>`).join('')).join('')}</table>
    <div class="xs muted" style="margin-top:8px">In Eingabefeldern wirken keine Kürzel. Auf dem Mac gilt Cmd statt Strg.</div></div>
    <div class="mf"><button class="btn btn-sm" data-m="ok">Schließen</button></div></div>`;
  m.classList.remove('hidden');
  const done = () => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(); } };
  document.addEventListener('keydown', onKey, true);
  m.onclick = (e) => { if (e.target.closest('[data-m]') || e.target === m) done(); };
}
