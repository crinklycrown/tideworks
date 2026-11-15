/* Gemeinsame HTML-Bausteine und DOM-Helfer der Panels */
import { ITEMS, ITEM_ORDER } from '../data/items.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { esc } from '../util/format.js';
import { game, ui } from './context.js';
import { invOf, islName, kontorIslands, playerName, isSep, actor, islOwner, homeAt } from '../sim/state.js';
import { COIN_SRC } from '../data/trade.js';
import { coastSeen } from '../sim/explore.js';
import { NPC_ISL } from '../data/npcs.js';
import { ISL_TYPES } from '../data/islands.js';

// Anzeigename einer entdeckten Insel ohne Kontor: NPC-Inseln mit ihrem Namen (Pfahldorf, Werkstattbucht, Goldberg), sonst der Inseltyp
export function foundName(k) {
  const npc = game.W.npcOf(k);
  return npc ? NPC_ISL[npc].isl : ISL_TYPES[game.W.island(k).type].name;
}
// Kartiert oder Anteil der gesehenen Küste einer Insel
export function mapText(k) {
  if (game.state.mapped[k]) return 'kartiert';
  const c = coastSeen(game, k);
  return `${c.total ? Math.floor(c.seen / c.total * 100) : 0} % der Küste gesehen`;
}

// Panels nicht neu zeichnen, während eine Maustaste darin gedrückt ist, eine Auswahlliste offen ist oder ein Textfeld den Fokus hat
export const uiBusy = (el) => {
  const a = document.activeElement;
  return ui.uiPressed || (el.contains(a) && (a.tagName === 'SELECT' || (a.tagName === 'INPUT' && a.type !== 'checkbox')));
};

/* ---------- Neu zeichnen ohne Springen ----------
   setHTML und patchList ersetzen den Inhalt nicht mehr komplett, sondern gleichen den DOM-Baum ab (morph):
   gleiche Elemente bleiben erhalten (Scrollposition, Fokus, Tooltips, Canvas), nur geänderte Texte und Attribute
   werden gesetzt. Liegt die Maus über dem Panel und kam seit HOLD_MS keine Eingabe, bleibt die Struktur stehen
   (keine Elemente hinzu/weg) – nur Zahlen und Texte ändern sich; der Rest folgt, sobald die Maus geht (spätestens nach HOLD_MAX). */
const HOLD_MS = 800;
let lastInput = 0;
if (typeof document !== 'undefined') for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { lastInput = performance.now(); }, true);
const HOLD_MAX = 2500;   // länger bleibt eine Strukturänderung nicht liegen, auch wenn die Maus bleibt
const hold = (el) => {
  const now = performance.now();
  if (now - lastInput <= HOLD_MS || !el.matches(':hover')) { el._held = 0; return false; }
  if (!el._held) el._held = now;
  if (now - el._held > HOLD_MAX) { el._held = 0; return false; }
  return true;
};
const tpl = typeof document !== 'undefined' ? document.createElement('template') : null;
const sameNode = (x, y) => x.nodeType === y.nodeType && x.nodeName === y.nodeName
  && (x.nodeType !== 1 || (x.getAttribute('data-k') === y.getAttribute('data-k') && x.id === y.id));
function syncAttrs(x, y) {
  for (const { name, value } of y.attributes) {
    if (x.getAttribute(name) !== value) x.setAttribute(name, value);
    if (name === 'value' && x !== document.activeElement && x.value !== value) x.value = value;
  }
  for (const { name } of [...x.attributes]) if (!y.hasAttribute(name)) x.removeAttribute(name);
  if (x.nodeName === 'INPUT') x.checked = y.hasAttribute('checked');
  else if (x.nodeName === 'OPTION') x.selected = y.hasAttribute('selected');
}
// Kinder von a an die von b angleichen; lock = nichts hinzufügen/entfernen. Liefert true, wenn etwas offen blieb.
function morph(a, b, lock) {
  const an = [...a.childNodes], bn = [...b.childNodes], n = Math.max(an.length, bn.length);
  let skipped = false;
  for (let i = 0; i < n; i++) {
    const x = an[i], y = bn[i];
    if (!y) { if (lock) skipped = true; else x.remove(); continue; }
    if (!x) { if (lock) skipped = true; else a.appendChild(y); continue; }
    if (!sameNode(x, y)) { if (lock) skipped = true; else a.replaceChild(y, x); continue; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    syncAttrs(x, y);
    if (x._html !== undefined) x._html = null;   // eigener Zwischenspeicher eines inneren Containers ist jetzt veraltet
    if (morph(x, y, lock)) skipped = true;
  }
  return skipped;
}
function morphHTML(el, html) {
  tpl.innerHTML = html;
  const skipped = morph(el, tpl.content, hold(el));
  tpl.innerHTML = '';
  if (!skipped) el._held = 0;
  return !skipped;
}
// Inhalt setzen, wenn er sich geändert hat (Abgleich statt innerHTML, siehe oben).
// key = was das Element zeigt (z. B. die Auswahl): wechselt er, wird neu aufgebaut (frische Scrollposition, keine Sperre)
export function setHTML(el, html, key) {
  if (el._html === html && el._key === key) return false;
  if (!el.firstChild || el._key !== key) { el.innerHTML = html; el._html = html; el._key = key; return true; }
  el._html = morphHTML(el, html) ? html : null;
  return true;
}
// Kinder eines Containers nach Schlüssel abgleichen: items = [{ k, html, cls, tag? }].
// Nur geänderte Einträge werden abgeglichen, vorhandene Elemente bleiben erhalten.
export function patchList(el, items) {
  const lock = hold(el);
  const old = new Map();
  for (const c of [...el.children]) { if (c.dataset.k != null) old.set(c.dataset.k, c); else if (!lock) c.remove(); }
  let prev = null;
  for (const it of items) {
    let c = old.get(it.k);
    if (c) old.delete(it.k);
    else if (lock) continue;
    else { c = document.createElement(it.tag || 'div'); c.dataset.k = it.k; }
    if (c.className !== (it.cls || '')) c.className = it.cls || '';
    if (c._html !== it.html) { if (!c.firstChild) { c.innerHTML = it.html; c._html = it.html; } else { tpl.innerHTML = it.html; c._html = morph(c, tpl.content, lock) ? null : it.html; tpl.innerHTML = ''; } }
    const want = prev ? prev.nextSibling : el.firstChild;
    if (c !== want && !lock) el.insertBefore(c, want);
    prev = c;
  }
  if (!lock) for (const c of old.values()) c.remove();
}

export function costText(cost, k) {
  const inv = k >= 0 ? invOf(game, k) : null;
  return Object.entries(cost).map(([r, n]) => `<span class="cost${inv && (inv[r] || 0) < n ? ' no' : ''}">${img(SPR.item[r], 1)}${n}</span>`).join('');
}
// Inseln mit Kontor; gleich benannte („Unbekannte Insel“) bekommen die Inselmitte als Zusatz
export function islandOptions(sel) {
  return `<option value="-1" ${sel < 0 ? 'selected' : ''}>– frei –</option>` + kontorIslands(game).map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(islLabel(k))}</option>`).join('');
}
export function islLabel(k) {
  const n = islName(game, k), I = k >= 0 && !game.state.isl[k]?.name && k !== 0 && !homeAt(game, k) ? game.W.island(k) : null;   // Heimatinseln ohne Koordinaten
  return I ? `${n} (${I.x} / ${I.y})` : n;
}
export function itemOptions(sel) { return `<option value="" ${!sel ? 'selected' : ''}>nichts</option>` + ITEM_ORDER.map(it => `<option value="${it}" ${it === sel ? 'selected' : ''}>${ITEMS[it].name}</option>`).join(''); }
// Insel, deren Lager gerade gemeint ist: unter der Kamera, über dem Meer die zuletzt besuchte
export const curIsl = () => ui.camIsl >= 0 ? ui.camIsl : ui.viewIsl;
// Posten im Münzbuch; Handel zwischen Spielern: 'pv:<pid>' = Verkauf an, 'pk:<pid>' = Kauf von
export function coinSrcName(k) {
  const i = k.indexOf(':');
  if (i < 0) return COIN_SRC[k] || k;
  const who = playerName(game, k.slice(i + 1));
  if (k.startsWith('na:')) return `Aufträge und Verträge (${who})`;
  if (k.startsWith('ng:')) return `Geschenke von ${who}`;
  return k.startsWith('pv:') ? `Verkauf an ${who}` : `Kauf von ${who}`;
}
// Getrennte Inseln: Inseln der Mitspieler (mit Hauptkontor) als { I: Insel, color } für Umrisse in Minimap und Karte
export function foreignIslands() {
  if (!isSep(game)) return [];
  const me = actor(game), P = game.state.players || {}, out = [];
  for (const k of kontorIslands(game)) {
    const o = islOwner(game, k), I = o !== me && game.W.island(k);
    if (I) out.push({ I, color: (P[o] && P[o].color) || '#ffffff' });
  }
  return out;
}
// Umriss als Ellipse um die Insel; toPx = Feld → Bildschirm, z = Pixel je Feld, lw = Linienbreite
export function outlineIsland(ctx, I, color, toPx, z, lw) {
  const [px, py] = toPx(I.x + 0.5, I.y + 0.5), rx = Math.max(3, (I.r + 2) * z), ry = Math.max(3, (I.r * 0.85 + 2) * z);
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = lw + 2; ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
}
