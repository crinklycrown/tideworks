/* =========================================================
   KOOP-MARKIERUNGEN
   Mittlere Maustaste (Klick ohne Ziehen) oder Alt+Klick: Halbkreis-Menü mit „Hierher“, „Achtung“, „Hilfe“, „Bauplatz“.
   Die Markierung sehen alle MARKS.ttl Sekunden lang in der Farbe des Spielers (Karte: gfx/peers.js, Minimap,
   Kartenansicht), mit kurzem Ton und Aufblitzen. Liegt sie außerhalb des Bildschirms, zeigt ein Pfeil am Rand
   die Richtung; ein Klick auf den Pfeil fährt die Kamera hin.
   ========================================================= */
import { TS } from '../config.js';
import { MARKS } from '../data/net.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { cam, centerOnTile } from '../gfx/camera.js';
import { inkOn } from '../gfx/peers.js';
import { on, sendMark, liveMarks, coop } from '../net/session.js';
import { esc } from '../util/format.js';
import { $ } from './context.js';

let menuAt = null, wired = false, audio = null;

export function wireMarks() {
  if (wired) return;
  wired = true;
  const m = $('markMenu');
  m.innerHTML = MARKS.kinds.map((k, i) => {
    // Halbkreis über dem Klickpunkt, von links nach rechts
    const a = Math.PI + (i + 0.5) / MARKS.kinds.length * Math.PI, x = Math.cos(a) * MARKS.menuR, y = Math.sin(a) * MARKS.menuR;
    return `<button class="mkb" data-mk="${k.id}" style="left:${Math.round(x)}px;top:${Math.round(y)}px">${img(SPR.icon[k.icon], 2)}<span>${k.name}</span></button>`;
  }).join('') + '<span class="mkc"></span>';
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mk]');
    if (b && menuAt) sendMark(b.dataset.mk, menuAt.x, menuAt.y);
    closeMarkMenu();
  });
  m.addEventListener('contextmenu', (e) => { e.preventDefault(); closeMarkMenu(); });
  document.addEventListener('keydown', (e) => { if (menuAt && e.key === 'Escape') { e.stopPropagation(); closeMarkMenu(); } }, true);
  document.addEventListener('pointerdown', (e) => { if (menuAt && !e.target.closest('#markMenu')) closeMarkMenu(); }, true);
  $('markEdge').addEventListener('click', (e) => { const b = e.target.closest('[data-mx]'); if (b) centerOnTile(+b.dataset.mx + 0.5, +b.dataset.my + 0.5); });
  on('mark', beep);
}
// sx, sy = Bildschirm (CSS-Pixel), w = Weltpunkt (Pixel)
export function openMarkMenu(sx, sy, w) {
  if (!coop.role || !w) return;
  menuAt = { x: Math.floor(w.x / TS), y: Math.floor(w.y / TS) };
  const m = $('markMenu');
  m.style.left = `${Math.round(Math.min(window.innerWidth - 80, Math.max(80, sx)))}px`;
  m.style.top = `${Math.round(Math.min(window.innerHeight - 20, Math.max(MARKS.menuR + 30, sy)))}px`;
  m.classList.remove('hidden');
}
export function closeMarkMenu() { menuAt = null; $('markMenu').classList.add('hidden'); }

// kurzer Ton (Tonhöhe je Art), leise
function beep(k) {
  const K = MARKS.kinds.find(x => x.id === k.kind);
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(K ? K.tone : 660, t); o.frequency.setValueAtTime((K ? K.tone : 660) * 1.5, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.25);
  } catch (e) { /* ohne Ton */ }
}

// Pfeile am Bildschirmrand für Markierungen außerhalb (jedes Bild)
let lastHtml = '';
export function renderMarkEdges() {
  const box = $('markEdge');
  if (!box) return;
  const list = coop.role ? liveMarks() : [];
  if (!list.length) { if (lastHtml) { box.innerHTML = ''; lastHtml = ''; } return; }
  const W = window.innerWidth, H = window.innerHeight, Z = cam.Z / cam.DPR, M = 34;
  let html = '';
  for (const k of list) {
    const x = ((k.x + 0.5) * TS - cam.x) * Z + W / 2, y = ((k.y + 0.5) * TS - cam.y) * Z + H / 2;
    if (x >= 0 && y >= 0 && x <= W && y <= H) continue;
    const dx = x - W / 2, dy = y - H / 2, s = Math.min((W / 2 - M) / Math.abs(dx || 1e-6), (H / 2 - M) / Math.abs(dy || 1e-6));
    const ex = Math.round(W / 2 + dx * s), ey = Math.round(H / 2 + dy * s), a = Math.atan2(dy, dx) * 180 / Math.PI;
    const K = MARKS.kinds.find(o => o.id === k.kind);
    html += `<button class="mke" data-mx="${k.x}" data-my="${k.y}" style="left:${ex}px;top:${ey}px;--c:${esc(k.color)};color:${inkOn(k.color)}" title="${esc(k.name)}: ${K ? K.name : ''}">
      <span class="mka" style="transform:rotate(${Math.round(a)}deg)"></span>${K ? img(SPR.icon[K.icon], 2) : ''}</button>`;
  }
  if (html !== lastHtml) { box.innerHTML = html; lastHtml = html; }
}
