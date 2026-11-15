/* =========================================================
   BLAUPAUSEN (Oberfläche): Rechteck-Auswahl (V), Speichern-Dialog, Zwischenablage (Strg+C / Strg+V),
   Bibliothek-Fenster „Blaupausen“ (Umschalt+V), Platzieren mit Vorschau und Drehen (R).
   Erfassen, Prüfen und das Format stehen in sim/blueprint.js; gebaut wird in der Simulation (Kommando 'placeBlueprint').
   Die Bibliothek ist spielstandübergreifend und liegt unter dem Schlüssel 'blueprints' im Speicher (save/storage.js),
   nicht im Spielstand.
   ========================================================= */
import { BD, FLAT } from '../data/buildings.js';
import { tkx, tky } from '../util/tiles.js';
import { esc } from '../util/format.js';
import { captureBlueprint, encodeBlueprint, decodeBlueprint, parseBlueprint, blueprintCost, cleanName, BP_NAME_LEN } from '../sim/blueprint.js';
import { islName } from '../sim/state.js';
import { storage } from '../save/storage.js';
import { bpGhost, bpCheck } from '../gfx/renderer.js';
import { game, ui, $, send, afterSync, saveGame, newGrp } from './context.js';
import { setMode, renderAllUI } from './panels.js';
import { registerWindow, openWindow, closeWindow, renderWindow } from './windows.js';
import { costText, setHTML, curIsl } from './common.js';
import { askConfirm } from './modal.js';
import { toast } from './toasts.js';

const KEY = 'blueprints';
let lib = [];          // [{ id, name, bp }] (neueste zuerst)
let libReady = false;

/* ---------- Bibliothek laden und speichern ---------- */
export async function loadLibrary() {
  let raw = null;
  try { raw = await storage.getItem(KEY); } catch (e) { raw = null; }
  try {
    const arr = raw ? JSON.parse(raw) : [];
    lib = (Array.isArray(arr) ? arr : []).map(e => { const p = parseBlueprint(e && e.bp); return p.bp ? { id: e.id || uid(), name: cleanName(e.name) || 'Blaupause', bp: p.bp } : null; }).filter(Boolean);
  } catch (e) { lib = []; }
  libReady = true;
  renderWindow(true);
}
function persist() { storage.setItem(KEY, JSON.stringify(lib.map(e => ({ id: e.id, name: e.name, bp: e.bp })))); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function suggestName() { const used = new Set(lib.map(e => e.name)); let n = 1; while (used.has(`Blaupause ${n}`)) n++; return `Blaupause ${n}`; }

/* ---------- Auswahl ---------- */
export const toggleSelect = () => setMode(ui.mode && (ui.mode.kind === 'bpSelect' || ui.mode.kind === 'bpPlace') ? null : { kind: 'bpSelect', a: null, b: null });
// Rechteck der Auswahl (Felder) oder null
function selRect() {
  const m = ui.mode;
  if (!m || m.kind !== 'bpSelect' || m.a == null || m.b == null) return null;
  return [tkx(m.a), tky(m.a), tkx(m.b), tky(m.b)];
}
// Auswahl erfassen; meldet ausgelassene Kontore/Werften
function capture() {
  const r = selRect();
  if (!r) return null;
  const c = captureBlueprint(game, r[0], r[1], r[2], r[3]);
  const skip = Object.keys(c.skipped);
  if (skip.length) toast(`${skip.map(t => BD[t].name).join(' und ')} ${skip.length > 1 ? 'werden' : 'wird'} nicht in Blaupausen übernommen.`);
  if (!c.bp) { toast('In der Auswahl liegt nichts, das in eine Blaupause passt (nur ganz enthaltene Gebäude zählen).'); return null; }
  return c.bp;
}
// Maus losgelassen: Auswahl steht, Dialog zum Speichern
export function selectDone() {
  const bp = capture();
  if (!bp) { ui.mode.a = ui.mode.b = null; return; }
  saveDialog(bp);
}
// Strg+C: Auswahl in die Zwischenablage (ohne Namen, nicht in die Bibliothek)
export function copySelection() {
  if (!selRect()) return false;
  const bp = capture();
  if (!bp) return true;
  ui.clip = bp;
  toast(`Auswahl kopiert (${bp.parts.length + bp.pipes.length} Teile). Strg+V fügt sie ein.`);
  return true;
}
export function pasteClip() {
  if (!ui.clip) { toast('Die Zwischenablage ist leer. Erst mit V ein Rechteck auswählen und Strg+C drücken.'); return; }
  startPlace(ui.clip, '');
}
// Esc: erst die Auswahl verwerfen, dann den Modus verlassen
export function escBlueprint() {
  const m = ui.mode;
  if (m.kind === 'bpSelect' && m.a != null) { m.a = m.b = null; m.drag = false; return; }
  setMode(null);
}

/* ---------- Speichern-Dialog ---------- */
function saveDialog(bp) {
  const m = $('modal'), n = bp.parts.length + bp.pipes.length;
  m.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>Blaupause speichern</span></div>
    <div class="mb small">
      <div class="xs muted" style="margin-bottom:8px">${bp.w}&times;${bp.h} Felder &middot; ${bp.parts.length} Gebäude und Bänder${bp.pipes.length ? `, ${bp.pipes.length} Rohre` : ''} &middot; ${costText(blueprintCost(bp), -1)}</div>
      <div class="lbl">Name</div>
      <input id="bpNameInp" class="inp" style="width:100%" maxlength="${BP_NAME_LEN}" value="${esc(suggestName())}" autocomplete="off" spellcheck="false">
      <div class="xs muted" style="margin-top:8px">„Nur kopieren“ (Strg+C) legt die Auswahl ohne Namen in die Zwischenablage, Strg+V fügt sie ein.</div>
    </div>
    <div class="mf"><button class="btn btn-sm" data-m="no">Abbrechen</button><button class="btn btn-paper btn-sm" data-m="copy">Nur kopieren</button><button class="btn btn-green btn-sm" data-m="yes">Speichern</button></div></div>`;
  m.classList.remove('hidden');
  const inp = $('bpNameInp');
  inp.focus(); inp.select();
  const finish = (how) => {
    m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true);
    // Abbrechen lässt die Auswahl stehen (Strg+C kopiert sie dann noch), sonst ist sie erledigt
    if (how !== 'no' && ui.mode && ui.mode.kind === 'bpSelect') { ui.mode.a = ui.mode.b = null; }
    if (how === 'copy') { ui.clip = bp; toast(`Auswahl kopiert (${n} Teile). Strg+V fügt sie ein.`); }
    if (how !== 'yes') return;
    const name = cleanName(inp.value) || suggestName();
    lib.unshift({ id: uid(), name, bp: Object.assign({}, bp, { name }) });
    persist();
    toast(`Blaupause <b>„${esc(name)}“</b> gespeichert. Bibliothek: Umschalt+V`, 'gold');
    renderWindow(true);
  };
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish('yes'); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish('no'); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); e.stopPropagation(); finish('copy'); }
  };
  document.addEventListener('keydown', onKey, true);
  m.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) finish(b.dataset.m); };
}

/* ---------- Platzieren ---------- */
export function startPlace(bp, name) {
  if (ui.win && $('win').classList.contains('center')) closeWindow();
  setMode({ kind: 'bpPlace', bp, rot: 0, name: name || bp.name || '' });
}
export function rotatePlace() { ui.mode.rot = (ui.mode.rot + 1) % 4; }
export function placeClick() {
  const gh = bpGhost();
  if (!gh) return;
  const chk = bpCheck(gh);
  if (!chk.n) { toast(firstReason(chk) || 'Hier passt kein Teil der Blaupause hin.'); return; }
  send({ type: 'placeBlueprint', bp: ui.mode.bp, rot: ui.mode.rot, x: gh.x, y: gh.y, name: ui.mode.name, grp: newGrp() });
  saveGame(); afterSync(() => renderAllUI(true));
}
function firstReason(chk) { const all = chk.parts.concat(chk.pipes).filter(r => !r.ok).map(r => r.reason); return all[0] || null; }
// Hinweis oben: Name, Gesamtkosten gegen Lager, platzierbare Teile, Drehen
export function placeHint() {
  const m = ui.mode, gh = bpGhost(), B = gh ? gh.B : m.bp, chk = gh ? bpCheck(gh) : null;
  const k = chk && chk.isl != null ? chk.isl : curIsl(), total = B.parts.length + B.pipes.length;
  const bad = chk && chk.n < chk.total ? firstReason(chk) : null;
  return `<span>${m.name ? `<b>${esc(m.name)}</b> ` : 'Blaupause '}${costText(blueprintCost(B), k)}${k >= 0 ? ` <span class="xs muted">(${esc(islName(game, k))})</span>` : ''}
    &middot; <b class="${chk && chk.n === total ? 'good' : 'bad'}">${chk ? chk.n : 0} von ${total} platzierbar</b> &middot; drehen (R) &middot; Klick baut <span class="muted">&middot; Esc</span>
    ${bad ? `<br><span class="bad">${bad}</span>` : ''}</span>`;
}
export function selectHint() {
  const r = selRect(), m = ui.mode;
  const size = m.a != null ? (() => { const b = m.b != null ? m.b : ui.hoverTile >= 0 ? ui.hoverTile : m.a; return `${Math.abs(tkx(b) - tkx(m.a)) + 1}&times;${Math.abs(tky(b) - tky(m.a)) + 1} Felder`; })() : '';
  return `<span>Blaupause: Rechteck aufziehen${size ? ` <b>(${size})</b>` : ''} &middot; Strg+C kopiert &middot; Strg+V fügt ein${ui.clip ? '' : ' (leer)'} <span class="muted">&middot; Esc</span>${r ? '' : ''}</span>
    <span class="hint-btns"><button class="btn btn-paper btn-sm" data-hint="bplib">Bibliothek</button></span>`;
}

/* ---------- Bibliothek-Fenster ---------- */
const CAT_COL = { logistik: '#e6bf85', abbau: '#a8743c', verarbeitung: '#d0644a', energie: '#ffd23f', fluessig: '#6ec8f0', wohnen: '#7cc24f', schifffahrt: '#8aa0b8' };
const thumbs = new Map();
// Vorschaubild: Draufsicht in Pixeln, Farbe je Baumenü-Kategorie
function thumb(e) {
  const key = e.id + ':' + JSON.stringify(e.bp).length;
  if (thumbs.has(key)) return thumbs.get(key);
  const B = e.bp, s = Math.max(1, Math.min(14, Math.floor(Math.min(200 / B.w, 88 / B.h))));
  const cv = document.createElement('canvas');
  cv.width = B.w * s; cv.height = B.h * s;
  const c = cv.getContext('2d');
  for (const [x, y] of B.pipes) { c.fillStyle = '#5a6f86'; c.fillRect(x * s + s / 4, y * s + s / 4, Math.max(1, s / 2), Math.max(1, s / 2)); }
  for (const p of B.parts) {
    const d = BD[p.t], col = CAT_COL[d.cat] || '#cccccc';
    if (FLAT.has(p.t)) {
      c.fillStyle = col; c.fillRect(p.x * s, p.y * s, s, s);
      if (s >= 3 && d.rot) { c.fillStyle = '#7a4a28'; const m = Math.floor(s / 2); const o = [[s - 1, m], [m, s - 1], [0, m], [m, 0]][p.d]; c.fillRect(p.x * s + o[0], p.y * s + o[1], 1, 1); }
    } else {
      c.fillStyle = '#3a2414'; c.fillRect(p.x * s, p.y * s, d.w * s, d.h * s);
      c.fillStyle = col; c.fillRect(p.x * s + 1, p.y * s + 1, d.w * s - 2, d.h * s - 2);
    }
  }
  thumbs.set(key, cv);
  return cv;
}
function libHTML() {
  if (!libReady) return '<div class="xs muted">Bibliothek wird geladen …</div>';
  const k = curIsl();
  return `<div class="bptop"><div class="grow xs muted">Blaupausen gelten für alle Spielstände. Neue Blaupause: V drücken und ein Rechteck aufziehen.</div>
      <button class="btn btn-paper btn-sm" data-bp="import">Code einfügen</button></div>`
    + (lib.length ? `<div class="bplist">${lib.map(e => {
      const B = e.bp, nb = B.parts.filter(p => !FLAT.has(p.t)).length;
      return `<div class="bpcard" data-id="${e.id}"><div class="thumb" data-thumb="${e.id}"></div>
        <input class="inp bpname" data-bp="name" maxlength="${BP_NAME_LEN}" value="${esc(e.name)}" spellcheck="false">
        <div class="xs muted">${B.w}&times;${B.h} Felder &middot; ${nb} Gebäude &middot; ${B.parts.length - nb} Logistik${B.pipes.length ? ` &middot; ${B.pipes.length} Rohre` : ''}</div>
        <div class="xs">${costText(blueprintCost(B), k)}</div>
        <div class="btns"><button class="btn btn-green btn-sm" data-bp="place">Platzieren</button><button class="btn btn-paper btn-sm" data-bp="code">Code kopieren</button><button class="btn btn-red btn-sm" data-bp="del">Löschen</button></div></div>`;
    }).join('')}</div>` : '<div class="xs muted">Noch keine Blaupausen gespeichert.</div>');
}
function codeDialog(title, text, code, onOk) {
  const m = $('modal');
  m.innerHTML = `<div class="panel modal wide" role="dialog" aria-modal="true"><div class="phead"><span>${title}</span></div>
    <div class="mb small">${text}<textarea id="bpCode" class="inp codebox" spellcheck="false" ${code ? 'readonly' : ''}>${code ? esc(code) : ''}</textarea></div>
    <div class="mf">${onOk ? '<button class="btn btn-sm" data-m="no">Abbrechen</button><button class="btn btn-green btn-sm" data-m="yes">Einfügen</button>' : '<button class="btn btn-sm" data-m="no">Schließen</button>'}</div></div>`;
  m.classList.remove('hidden');
  const ta = $('bpCode');
  ta.focus(); if (code) ta.select();
  const done = (ok) => { const v = ta.value; m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); if (ok && onOk) onOk(v); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } };
  document.addEventListener('keydown', onKey, true);
  m.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) done(b.dataset.m === 'yes'); };
}
function copyCode(e) {
  const code = encodeBlueprint(Object.assign({}, e.bp, { name: e.name }));
  const show = () => codeDialog('Blaupausen-Code', '<div class="xs muted" style="margin-bottom:6px">Der Code ist markiert, mit Strg+C kopieren.</div>', code, null);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => toast(`Code von <b>„${esc(e.name)}“</b> kopiert.`), show);
  else show();
}
function importCode() {
  codeDialog('Blaupausen-Code einfügen', '<div class="xs muted" style="margin-bottom:6px">Code einer Blaupause hier einfügen.</div>', '', (v) => {
    const r = decodeBlueprint(v);
    if (!r.bp) { toast(r.notes.join(' ')); return; }
    const name = cleanName(r.bp.name) || suggestName();
    lib.unshift({ id: uid(), name, bp: Object.assign({}, r.bp, { name }) });
    persist(); renderWindow(true);
    toast(`Blaupause <b>„${esc(name)}“</b> übernommen${r.notes.length ? ` &middot; ${r.notes.join(', ')}` : ''}.`, r.notes.length ? '' : 'gold');
  });
}
export const toggleLibrary = () => { if (ui.win === 'blueprints') closeWindow(); else openWindow('blueprints'); };
registerWindow('blueprints', {
  title: 'Blaupausen', icon: 'blueprint',
  render(body) {
    if (!setHTML(body, libHTML())) return;
    for (const el of body.querySelectorAll('[data-thumb]')) { const e = lib.find(x => x.id === el.dataset.thumb); if (e) el.appendChild(thumb(e)); }
  },
  wire(body) {
    body.addEventListener('click', async ev => {
      if (ui.win !== 'blueprints') return;
      ui.uiPressed = false;
      const b = ev.target.closest('[data-bp]');
      if (!b) return;
      if (b.dataset.bp === 'import') { importCode(); return; }
      const card = b.closest('[data-id]'), e = card && lib.find(x => x.id === card.dataset.id);
      if (!e) return;
      if (b.dataset.bp === 'place') startPlace(e.bp, e.name);
      else if (b.dataset.bp === 'code') copyCode(e);
      else if (b.dataset.bp === 'del') {
        if (!(await askConfirm('Blaupause löschen?', `<b>„${esc(e.name)}“</b> wird aus der Bibliothek entfernt.`, 'Löschen'))) return;
        lib = lib.filter(x => x !== e); persist(); renderWindow(true);
      }
    });
    body.addEventListener('change', ev => {
      const inp = ev.target.closest('[data-bp="name"]'), card = inp && inp.closest('[data-id]'), e = card && lib.find(x => x.id === card.dataset.id);
      if (!e) return;
      e.name = cleanName(inp.value) || e.name; e.bp = Object.assign({}, e.bp, { name: e.name });
      persist(); inp.blur(); renderWindow(true);
    });
  }
});
