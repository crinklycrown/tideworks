/* =========================================================
   DIALOGFENSTER (Monolog-Fenster) – Technik und Stil aus docs/cutscenes/rauch-hinter-dem-nebel.html
   Porträt links (64×80, ragt ins Fenster), Namensschild (Pixelify Sans), Pergament-Kasten im Holzrahmen,
   Text (Nunito) erscheint wie auf der Schreibmaschine mit Pausen an Satzzeichen, Blinzeln und Mundbewegung beim Sprechen,
   Pfeil „weiter“. Klick, Leertaste oder Enter: Zeile fertig schreiben bzw. nächste Zeile; Esc: Dialog überspringen.
   showDialog(id, opts) → Promise (erfüllt nach der letzten Zeile)
     opts.bg(ctx, el, now) – Hintergrund aus einer Cutscene (dialogBg): Bühne bleibt im Kino-Modus. Ablauf: das Bild blendet
                             aus dem Schwarz auf, die Balken fahren hinaus, erst dann fahren Kasten, Porträt und Namensschild
                             ruhig ein und der Text beginnt (FILM). Am Ende fährt der Kasten hinaus, das Bild blendet ab und
                             die Bühne blendet aus dem Schwarz zurück ins Spiel.
                             ohne bg: Fenster über der laufenden Karte (Bühne „over“)
     opts.seek = n        – nur Zeile n fertig zeigen und stehen bleiben (Prüfen, tideworks.dialog(id, n))
     opts.keep            – (seit 0.22.0, nur mit bg) am Ende fährt nur der Kasten hinaus, das Bild bleibt stehen und die Bühne offen
                            (der Handler zeichnet bg weiter); danach übernimmt der Aufrufer (stageSet bzw. stageClose)
   Daten: data/dialogs/ (Sprecher, Porträt, Zeilen), Porträts: gfx/portraits.js
   ========================================================= */
import { W, H, clamp, ease, hash, blinkAt, talkAt } from '../cutscene/kit.js';
import { stageOpen, stageSet, stageClose, stageMode, stageText, stageSkip, stageCtx, stageScene, stageBlit, stageBlack, stageBars, stageView, boxRect } from '../cutscene/stage.js';
import { reducedMotion } from '../cutscene/player.js';
import { DIALOGS, SPEAKERS, dialogLines } from '../data/dialogs/index.js';
import { portrait, hasFace, noPortrait } from '../gfx/portraits.js';

const CPS = 42;                                    // Zeichen je Sekunde
// Zeitplan in s: Bild aus dem Schwarz (fade), Balken hinaus (bars0 + bars), Kasten ein (box0 + box), danach Text;
// beim Schließen: Kasten hinaus (out), Abblende (dark0 + dark)
const FILM = { fade: .7, bars0: .6, bars: .5, box0: 1, box: .7, out: .45, dark0: .2, dark: .5 };
const OVER = { fade: 0, bars0: 0, bars: 0, box0: 0, box: .6, out: 0, dark0: 0, dark: 0 };
const QUICK = { fade: 0, bars0: 0, bars: 0, box0: 0, box: 0, out: 0, dark0: 0, dark: 0 };   // prefers-reduced-motion
const prog = (el, a, d) => d > 0 ? clamp((el - a) / d, 0, 1) : el >= a ? 1 : 0;

// Pergament-Kasten im Holzrahmen mit Namensschild (R = boxRect(), dy = Einfahren von unten), Pfeil „weiter“
export function drawBox(ctx, R, dy, arrow, now) {
  const { x, w, h } = R, y = R.y + dy;
  ctx.fillStyle = '#1a0f07'; ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = '#5c3a1b'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#8a5a2e'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#e8b45c'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#fbf0d4'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = '#f1dfb4';   // Fasern im Pergament
  for (let yy = y + 3; yy < y + h - 3; yy++) for (let xx = x + 3; xx < x + w - 3; xx++) if (hash(xx, yy, 12) < .05) ctx.fillRect(xx, yy, 1, 1);
  ctx.fillStyle = '#5c3a1b'; [[x + 4, y + 4], [x + w - 5, y + 4], [x + 4, y + h - 5], [x + w - 5, y + h - 5]].forEach(([a, b]) => ctx.fillRect(a, b, 1, 1));
  // Namensschild
  const nx = x + 16, ny = y - 9;
  ctx.fillStyle = '#3a2414'; ctx.fillRect(nx - 1, ny - 1, 64, 14);
  ctx.fillStyle = '#7a4a28'; ctx.fillRect(nx, ny, 62, 12);
  ctx.fillStyle = '#a87444'; ctx.fillRect(nx, ny, 62, 1);
  ctx.fillStyle = '#5c3a1b'; ctx.fillRect(nx, ny + 11, 62, 1);
  if (arrow) {
    const ax = x + w - 12, ay = y + h - 9 + (Math.floor(now / .3) % 2);
    ctx.fillStyle = '#8a5a2e';
    for (let k = 0; k < 3; k++) ctx.fillRect(ax + k, ay + k, 5 - k * 2, 1);
  }
}

// Dialog id abspielen (siehe Kopf). Unbekannte id: sofort fertig.
export function showDialog(id, opts = {}) {
  const D = DIALOGS[id];
  if (!D) { console.warn('Dialog unbekannt:', id); return Promise.resolve(); }
  const lines = dialogLines(D), bg = opts.bg || null;
  return new Promise(resolve => {
    const film = !!bg || stageMode() === 'film';
    const T = reducedMotion() ? QUICK : film ? FILM : OVER, INTRO = T.box0 + T.box;
    const st = { line: 0, chars: 0, wait: film ? .3 : .9, dStart: 0, done: false };
    const render = (now) => {
      const ctx = st.ctx, el = now - st.dStart, L = lines[st.line], R = boxRect(), V = stageView();
      if (film) {
        const sc = stageScene();
        if (bg) bg(sc, el, now); else { sc.fillStyle = '#000'; sc.fillRect(0, 0, W, H); }
        sc.fillStyle = 'rgba(10,14,20,.35)'; sc.fillRect(0, 0, W, H);
        stageBlit(ctx);
        stageBlack(ctx, 1 - prog(el, 0, T.fade));
        stageBars(ctx, 1 - ease(prog(el, T.bars0, T.bars)));
      } else ctx.clearRect(0, 0, V.cw, V.ch);
      const intro = prog(el, T.box0, T.box), out = st.out ? prog(now - st.out, 0, T.out) : 0;
      if (intro > 0 && out < 1) {
        const dy = Math.round((1 - ease(intro)) * 84 + ease(out) * 84);
        const typing = st.chars < L.text.length, shown = intro >= 1 && !st.out;
        drawBox(ctx, R, dy, !typing && shown, now);
        const pid = L.face || (D.portrait && L.who === D.speaker ? D.portrait : L.who);
        const face = hasFace(pid), blink = face && blinkAt(now), talk = face && typing && st.wait <= 0 && talkAt(now);
        if (!noPortrait(pid)) ctx.drawImage(portrait(pid)(blink ? 2 : 0, talk ? 1 : 0), R.px, R.py + dy);
      }
      if (film && st.out && !opts.keep) stageBlack(ctx, prog(now - st.out, T.dark0, T.dark));
      const shown = intro >= 1 && !st.out;
      stageText(shown ? SPEAKERS[L.who] || L.who : null, shown ? L.text.slice(0, Math.floor(st.chars)) : '');
    };
    const finish = () => {
      if (st.done) return;
      st.done = true;
      if (opts.keep && film && opts.seek == null) { st.out = performance.now() / 1000; return; }   // Kasten hinaus, Bild bleibt
      if (opts.keep) { resolve(); return; }
      if (opts.seek == null && T.out + T.dark0 + T.dark > 0) { st.out = performance.now() / 1000; return; }   // erst hinaus, dann schließen
      stageClose(resolve, film && T !== QUICK);
    };
    const h = {
      frame(now, dt) {
        if (!st.dStart) st.dStart = now;
        if (st.out) {
          if (st.kept) { render(now); return; }
          if (opts.keep) { render(now); if (now - st.out >= T.out) { st.kept = true; resolve(); } return; }
          if (now - st.out >= Math.max(T.out, T.dark0 + T.dark)) { render(now); stageClose(resolve, film && T !== QUICK); return; }
          render(now); return;
        }
        const line = lines[st.line].text;
        if (now - st.dStart > INTRO && st.chars < line.length) {
          if (st.wait > 0) st.wait -= dt;
          else {
            const before = Math.floor(st.chars);
            st.chars = Math.min(line.length, st.chars + dt * CPS);
            const ch = line[Math.floor(st.chars) - 1];
            if (Math.floor(st.chars) > before && ch) st.wait = '.!?'.includes(ch) ? .28 : ch === ',' || ch === ':' ? .12 : 0;
          }
        }
        render(now);
      },
      advance() {
        if (st.done || !st.dStart || performance.now() / 1000 - st.dStart < INTRO + .1) return;
        const full = lines[st.line].text.length;
        if (st.chars < full) { st.chars = full; return; }
        if (st.line < lines.length - 1) { st.line++; st.chars = 0; st.wait = .15; return; }
        finish();
      },
      skip: finish
    };
    // Prüfen: eine Zeile fertig zeigen, ohne Zeitablauf (wie __cs.seek in der Referenz: now = 100, Dialog seit 2 s)
    if (opts.seek != null) {
      st.ctx = stageOpen(film ? 'film' : 'over', { frame() {}, advance: finish, skip: finish });
      st.line = clamp(opts.seek | 0, 0, lines.length - 1); st.chars = 999; st.wait = 0; st.dStart = 97;
      render(100);
      return;
    }
    // Nach einer Cutscene bleibt die Bühne offen (gleicher Modus): nur den Handler wechseln
    if (stageMode() === (film ? 'film' : 'over')) { stageSet(h); stageSkip(false); st.ctx = stageCtx(); }
    else st.ctx = stageOpen(film ? 'film' : 'over', h);
  });
}
