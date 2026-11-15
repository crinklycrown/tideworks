/* =========================================================
   BÜHNE für Cutscenes und Dialogfenster (#cine in index.html)
   Szenen zeichnen in ein 320×180-Bild (stageScene, nicht im DOM). Das sichtbare Canvas #cineCv hat das Seitenverhältnis
   des Bildschirms und ist so hochskaliert (image-rendering: pixelated, Faktor darf krumm sein), dass es das Fenster füllt;
   das 16:9-Bild liegt mittig darin und wird an den Rändern beschnitten statt Ränder zu zeigen (stageBlit).
   Die Kinobalken legt die Bühne darüber (stageBars), immer gleich hoch: 16/180 der Bildhöhe.
   Schmaler als 3:2 (Handy hochkant, schmales Fenster) wird höchstens bis 270 Pixel Breite beschnitten, darüber hinaus
   kommt oben und unten Schwarz dazu (wie höhere Balken). Darüber DOM-Text (Namensschild, Textkasten),
   Knopf „Überspringen“ und ein Hinweis. Zwei Arten:
     film – Vollbild (Cutscene und der Dialog danach); die Karte wird solange nicht gezeichnet.
            Mit Schleier (stageVeil) ist der Hintergrund durchsichtig und die Karte läuft weiter (Ein- und Ausblenden).
     over – durchsichtig über der laufenden Karte, Bühne 320×180 unten mittig (Dialog ohne Cutscene), höchstens 3×
   Ein Handler steuert, was passiert: { frame(now, dt), advance(), skip() }. Klick, Leertaste und Enter rufen advance,
   Esc ruft skip. Solange die Bühne offen ist, bekommt das Spiel keine Tasten (ui.cine, input/input.js).
   ========================================================= */
import { W, H, BAR, canvas, clamp, ease } from './kit.js';
import { ui } from '../ui/context.js';

const MAX_OVER = 3;          // Dialog über der Karte: höchstens 3× (sonst wird der Kasten riesig)
const MIN_W = 270;           // film: so schmal darf das 16:9-Bild höchstens beschnitten werden (16 %, 3:2 füllt genau)
const FADE_OUT = .8;         // stageClose(fn, true): Schwarz blendet in s zurück ins Spiel
let D = null;                // DOM-Elemente
let handler = null, mode = null, raf = 0, lastNow = 0, closing = null, fading = false;
const V = { cw: W, ch: H, ox: 0, oy: 0, s: 1 };   // sichtbares Canvas (Bühnen-Pixel), Lage des 16:9-Bilds darin, Skalierung
let scene = null;            // 320×180-Bild der Szene

function dom() {
  if (D) return D;
  const $ = (id) => document.getElementById(id);
  D = { root: $('cine'), stage: $('cineStage'), cv: $('cineCv'), name: $('cineName'), text: $('cineText'), skip: $('cineSkip'), note: $('cineNote') };
  D.ctx = D.cv.getContext('2d');
  D.root.addEventListener('click', (e) => { if (e.target.closest('button')) return; if (handler && handler.advance) handler.advance(); });
  D.skip.addEventListener('click', (e) => { e.stopPropagation(); if (handler && handler.skip) handler.skip(); });
  // Tasten: vor allen anderen Hörern (Fang-Phase am Fenster), damit Karte, Kürzel und Chat nichts bekommen
  window.addEventListener('keydown', (e) => {
    if (!handler) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat && handler.advance) handler.advance(); }
    else if (e.key === 'Escape') { e.preventDefault(); if (handler.skip) handler.skip(); }
    else if (e.ctrlKey || e.metaKey || /^F\d+$/.test(e.key)) return;   // Browser-Kürzel (neu laden, Entwickler-Werkzeuge) bleiben
    e.stopPropagation();
  }, true);
  window.addEventListener('resize', () => { if (handler) fit(); });
  return D;
}
// Größe und Skalierung. film: Fenster füllen (beschneiden statt Ränder), over: ganzzahlig, höchstens 3×
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let cw = W, ch = H, s;
  if (mode === 'film') {
    if (vw / vh >= W / H) { s = vw / W; ch = Math.min(H, Math.ceil(vh / s)); }              // breiter als 16:9: oben und unten beschneiden
    else {
      s = vh / H; cw = Math.ceil(vw / s);                                                   // schmaler: links und rechts beschneiden …
      if (cw < MIN_W) { s = vw / MIN_W; cw = MIN_W; ch = Math.ceil(vh / s); }               // … aber nicht zu viel
    }
  } else {
    const f = Math.min(vw / W, vh / H);
    s = Math.min(f >= 2 ? Math.floor(f) : f, MAX_OVER);
  }
  if (D.cv.width !== cw) D.cv.width = cw;
  if (D.cv.height !== ch) D.cv.height = ch;
  Object.assign(V, { cw, ch, ox: Math.round((cw - W) / 2), oy: Math.round((ch - H) / 2), s });
  D.stage.style.width = (cw * s).toFixed(2) + 'px';
  D.stage.style.height = (ch * s).toFixed(2) + 'px';
  D.stage.style.setProperty('--px', s.toFixed(4) + 'px');
  // Namensschild und Textkasten folgen dem Kasten (boxRect), in Bildschirm-Pixeln
  const R = boxRect(), px = (v) => (v * s).toFixed(2) + 'px';
  Object.assign(D.name.style, { left: px(R.x + 16), top: px(R.y - 9), width: px(62), height: px(12) });
  Object.assign(D.text.style, { left: px(R.x + 23), top: px(R.y + 5), width: px(R.w - 32), height: px(40) });
}
// Dialogkasten im sichtbaren Canvas: unten links im sichtbaren Teil des 16:9-Bilds (bei 16:9 wie bisher x 50, y 128, 266×48)
export function boxRect() {
  const left = Math.max(0, V.ox), right = Math.min(V.cw, V.ox + W), bottom = Math.min(V.ch, V.oy + H);
  const x = left + 50;
  return { x, y: bottom - 52, w: Math.min(266, right - x - 4), h: 48, px: left, py: bottom - 80 };
}
function loop(ms) {
  raf = 0;
  if (!handler) return;
  const now = ms / 1000, dt = Math.min(.1, now - (lastNow || now));
  lastNow = now;
  D.ctx.imageSmoothingEnabled = false;
  handler.frame(now, dt);
  if (handler) raf = requestAnimationFrame(loop);
}

// Bühne öffnen (oder Art und Handler wechseln). Liefert den Zeichen-Kontext des sichtbaren Canvas.
// opts.veil: mit Schleier öffnen (Karte bleibt sichtbar, der Handler blendet selbst ab)
export function stageOpen(m, h, opts = {}) {
  dom();
  if (closing) { clearTimeout(closing); closing = null; }
  mode = m; handler = h; fading = false;
  D.root.className = 'cine-' + m;
  D.root.classList.remove('hidden', 'out');
  stageVeil(!!opts.veil);
  D.name.hidden = true; D.text.textContent = ''; D.skip.hidden = true; D.note.hidden = true;
  fit();
  D.ctx.clearRect(0, 0, V.cw, V.ch);
  if (m === 'film' && !opts.veil) { D.ctx.fillStyle = '#000'; D.ctx.fillRect(0, 0, V.cw, V.ch); }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  D.stage.focus({ preventScroll: true });
  if (!raf) { lastNow = 0; raf = requestAnimationFrame(loop); }
  return D.ctx;
}
export const stageSet = (h) => { handler = h; fading = false; };
export const stageCtx = () => dom().ctx;
// Zeichen-Kontext des 320×180-Bilds der Szene
export function stageScene() {
  if (!scene) { scene = canvas(W, H).getContext('2d'); }
  scene.imageSmoothingEnabled = false;
  return scene;
}
// Sichtbares Canvas: { cw, ch, ox, oy, s }
export const stageView = () => V;
// Schleier: Hintergrund durchsichtig, die Karte wird dahinter weiter gezeichnet (ui.cine = 'veil')
export function stageVeil(on) {
  if (D) D.root.classList.toggle('veil', on);
  ui.cine = handler ? (on ? 'veil' : mode) : null;
}
// Szene (320×180) mittig ins sichtbare Canvas, außen Schwarz
export function stageBlit(ctx) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, V.cw, V.ch);
  ctx.drawImage(scene.canvas, V.ox, V.oy);
}
// Abblende über das ganze sichtbare Canvas (a = 0 bis 1)
export function stageBlack(ctx, a) { if (a <= 0) return; ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, V.cw, V.ch); }
// Höhe der Kinobalken: 16/180 der Bildhöhe; ist das Canvas höher als das 16:9-Bild, gehört das Schwarz darüber dazu
export const barHeight = () => V.ch <= H ? Math.round(BAR * V.ch / H) : V.oy + BAR;
// Kinobalken oben und unten, k = 0 (keine) bis 1 (ganz eingefahren)
export function stageBars(ctx, k = 1) {
  const h = Math.round(barHeight() * clamp(k, 0, 1));
  if (h <= 0) return;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, V.cw, h); ctx.fillRect(0, V.ch - h, V.cw, h);
}
// Bühne schließen; fn sofort danach. fade = true (nur film): erst aus dem Schwarz zurück ins Spiel blenden (FADE_OUT),
// die Balken fahren dabei hinaus; ohne fade kurz ausblenden (CSS)
export function stageClose(fn, fade) {
  if (!D || !handler) { if (fn) fn(); return; }
  D.name.hidden = true; D.text.textContent = ''; D.skip.hidden = true; D.note.hidden = true;
  if (fade && mode === 'film' && FADE_OUT > 0) {
    let t0 = 0;
    const done = () => { if (handler !== fader) return; handler = null; fading = false; ui.cine = null; mode = null; D.root.classList.add('hidden'); D.root.classList.remove('veil'); };
    const fader = {
      frame(now) {
        if (!t0) t0 = now;
        const u = (now - t0) / FADE_OUT;
        if (u >= 1) { done(); return; }
        D.ctx.clearRect(0, 0, V.cw, V.ch);
        stageBlack(D.ctx, 1 - ease(u));
        stageBars(D.ctx, 1 - ease(u * 1.4));
      },
      advance() {}, skip() {}
    };
    handler = fader; fading = true;
    stageVeil(true);
    if (fn) fn();
    return;
  }
  handler = null; ui.cine = null;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  D.root.classList.add('out');
  closing = setTimeout(() => { closing = null; if (!handler) { D.root.classList.add('hidden'); mode = null; } }, 260);
  if (fn) fn();
}
export const stageMode = () => handler && !fading ? mode : null;
// Knopf „Überspringen“ (on) bzw. Hinweis (note = Text) zeigen
export function stageSkip(on, note) {
  dom();
  D.skip.hidden = !on;
  D.note.hidden = !note; D.note.textContent = note || '';
}
// Namensschild und Text im Kasten (Text als DOM über dem Canvas)
export function stageText(name, text) {
  D.name.hidden = name == null;
  const nm = name == null ? '' : name;
  if (D.name.textContent !== nm) D.name.textContent = nm;
  if (D.text.textContent !== text) D.text.textContent = text;
}
