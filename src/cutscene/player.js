/* =========================================================
   CUTSCENE-PLAYER: spielt Szenen aus src/cutscenes/ auf der Bühne (cutscene/stage.js) und wechselt danach in den Dialog
   Format einer Szene (ein Modul je Szene, eingetragen in src/cutscenes/index.js):
     {
       id, title,                 // id wie in data/story.js (CUTSCENES), Titel für das Menü „Szenen“
       len,                       // Länge in Sekunden
       dialog,                    // Dialog danach (data/dialogs/), wenn die Story keinen anderen nennt
       setup(),                   // einmal vor dem ersten Abspielen: Ebenen vorrendern (layer, PB …) und behalten
       shots: [{ from, to, draw(ctx, lt, t) }],   // Einstellungen; lt = Sekunden seit Beginn der Einstellung, t = seit Beginn der Szene
       dialogBg(ctx, el, now),    // Hintergrund des Dialogs danach (el = Sekunden seit Dialogbeginn, now = Uhr in s)
       bars,                      // false = keine Kinobalken (Standard: 16 px oben und unten)
       cold,                      // true = ohne Spielbild davor (Prolog beim Spielstart): beginnt gleich im Schwarz
       lines,                     // Dialogzeilen als kurze Einblendungen IN der Szene (seit 0.22.0, cs_wahrheit):
                                  //   [{ from, to, who, text, face }] – Zeiten in s der Szene; who = Sprecher (Namensschild),
                                  //   face = Porträt-Id oder null (ohne Porträt). Laufen mit der Zeit der Szene (Koop: bei allen gleich),
                                  //   kein Klick nötig. Kasten fährt kurz ein, Text wie auf der Schreibmaschine, Kasten fährt hinaus.
       linesDialog                // Dialog-Id mit denselben Zeilen: bei prefers-reduced-motion (Szene entfällt) vor dem Dialog danach
     }
   Ablauf: das Spielbild blendet in IN s nach Schwarz, in der zweiten Hälfte fahren die Balken ein (Schleier, die Karte läuft
   dahinter weiter), dann blendet die Szene in UP s auf. Der Player zeichnet die Einstellung zu t ins 320×180-Bild, die Bühne
   setzt es bildschirmfüllend ein und legt die Balken darüber (cutscene/stage.js). Am Ende geht es in den Dialog
   (ui/dialog.js blendet weich auf) oder ohne Dialog aus dem Schwarz zurück ins Spiel. Knopf „Überspringen“ (und Esc):
   die Szene blendet in OUT s ab, dann wie am Ende.
   prefers-reduced-motion: die Szene entfällt, es geht direkt in den Dialog (wie in der Referenz).
   playScene(id, opts) → Promise; opts: dialog (Id, null = ohne Dialog), canSkip (false = Hinweis note statt Knopf),
     note (Text dazu), onSkip() (Koop: Host meldet das Überspringen an alle), skipNow (Koop: Host hat schon übersprungen),
     hold (seit 0.22.0: nach dem Dialog bleibt die Bühne offen und zeigt weiter dialogBg, z. B. für die Entscheidung am Leuchtturm;
           der Aufrufer schließt sie mit stageClose bzw. setzt mit stageSet einen eigenen Handler)
   skipScene(id) – von außen überspringen (Koop: Mitspieler, wenn der Host überspringt)
   seekScene(id, t) – ein Bild zum Zeitpunkt t zeigen und stehen bleiben (t ≥ len: Dialogzeile t − len), zum Prüfen
   ========================================================= */
import { stageOpen, stageClose, stageSkip, stageScene, stageBlit, stageBars, stageBlack, stageVeil, stageView, stageText, boxRect } from './stage.js';
import { SCENES } from '../cutscenes/index.js';
import { showDialog, drawBox } from '../ui/dialog.js';
import { SPEAKERS } from '../data/dialogs/index.js';
import { portrait, hasFace, noPortrait } from '../gfx/portraits.js';
import { ease, clamp, blinkAt, talkAt } from './kit.js';

const IN = .8, UP = .7, OUT = .6;   // Sekunden: Spielbild nach Schwarz, Szene aufblenden, Abblende beim Überspringen

export const hasScene = (id) => !!SCENES[id];
export const sceneTitle = (id) => SCENES[id] ? SCENES[id].title : id;
export const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function ready(M) {
  if (M._ready) return;
  const t0 = performance.now();
  M.setup();
  M._ready = true;
  M._setupMs = Math.round(performance.now() - t0);
}
// Bild der Szene zum Zeitpunkt t ins sichtbare Canvas; a = Abblende darüber (0–1)
function drawAt(M, ctx, t, a = 0) {
  const sc = stageScene();
  const S = M.shots.find(s => t < s.to) || M.shots[M.shots.length - 1];
  S.draw(sc, t - S.from, t);
  stageBlit(ctx);
  if (M.lines) drawLine(M, ctx, t, a);
  stageBlack(ctx, a);
  if (M.bars !== false) stageBars(ctx, 1);
}
// Einblendung einer Dialogzeile in der Szene (M.lines): Kasten fährt in LIN.in s ein und am Ende in LIN.out s hinaus,
// der Text beginnt LIN.wait s nach dem Einfahren und läuft mit LIN.cps Zeichen je s (wie das Dialogfenster)
const LIN = { in: .35, out: .3, wait: .15, cps: 42 };
const linesShown = (M, t) => M.lines.find(l => t >= l.from && t < l.to) || null;
function drawLine(M, ctx, t, a) {
  const L = a < .5 ? linesShown(M, t) : null;
  if (!L) { stageText(null, ''); return; }
  const k = Math.min(clamp((t - L.from) / LIN.in, 0, 1), clamp((L.to - t) / LIN.out, 0, 1));
  const R = boxRect(), dy = Math.round((1 - ease(k)) * 84), settled = t - L.from >= LIN.in && L.to - t > LIN.out;
  const chars = settled ? Math.max(0, Math.floor((t - L.from - LIN.in - LIN.wait) * LIN.cps)) : 0, typing = chars < L.text.length;
  drawBox(ctx, R, dy, false, t);
  if (L.face && !noPortrait(L.face)) {
    const face = hasFace(L.face), blink = face && blinkAt(t), talk = face && settled && typing && talkAt(t);
    ctx.drawImage(portrait(L.face)(blink ? 2 : 0, talk ? 1 : 0), R.px, R.py + dy);
  }
  stageText(settled ? SPEAKERS[L.who] || L.who : null, settled ? L.text.slice(0, chars) : '');
}

let cur = null;   // laufende Szene { id, skip() }
export function playScene(id, opts = {}) {
  const M = SCENES[id];
  if (!M) return Promise.resolve(false);
  ready(M);
  const dialog = opts.dialog !== undefined ? opts.dialog : M.dialog;
  const calm = !reducedMotion();
  return new Promise(resolve => {
    // phase: in (Spielbild → Schwarz), film (Szene), out (Abblende nach Überspringen)
    let phase = calm && !M.cold ? 'in' : 'film', t0 = 0, start = 0, outAt = 0, wantSkip = !!opts.skipNow, done = false;
    const toDialog = () => {
      if (done) return;
      done = true; cur = null;
      stageSkip(false);
      stageText(null, '');
      const hold = !!opts.hold;
      // Ohne Dialog danach (cs_ende_b): bei reduzierter Bewegung trotzdem die Zeilen der Einblendungen
      if (!dialog && !hold && !calm && M.linesDialog) { showDialog(M.linesDialog, { bg: M.dialogBg }).then(() => resolve(true)); return; }
      if (!dialog && !hold) { stageClose(() => resolve(true), calm); return; }
      if (!dialog) { stageOpen('film', { frame(now) { const sc = stageScene(); M.dialogBg(sc, 0, now); stageBlit(stageCtxOf()); }, advance() {}, skip() {} }); resolve(true); return; }
      // Ohne Szene (reduzierte Bewegung): zuerst die Zeilen der Einblendungen als Dialog
      const pre = !calm && M.linesDialog ? showDialog(M.linesDialog, { bg: M.dialogBg, keep: true }) : Promise.resolve();
      pre.then(() => showDialog(dialog, { bg: M.dialogBg, keep: hold })).then(() => resolve(true));
    };
    const stageCtxOf = () => ctxOf;
    const showSkip = () => stageSkip(opts.canSkip !== false, opts.canSkip === false ? (opts.note || 'Nur der Host kann überspringen') : null);
    const h = {
      frame(now) {
        if (!t0) t0 = now;
        if (phase === 'in') {
          const u = (now - t0) / IN;
          if (u < 1) {
            ctxOf.clearRect(0, 0, stageView().cw, stageView().ch);
            stageBlack(ctxOf, ease(u));
            if (M.bars !== false) stageBars(ctxOf, ease((u - .35) / .65));
            return;
          }
          stageVeil(false);
          if (wantSkip) { toDialog(); return; }
          phase = 'film'; start = now; showSkip();
        }
        if (!start) start = now;
        const t = now - start;
        if (phase === 'film') {
          if (t >= M.len) { toDialog(); return; }
          drawAt(M, ctxOf, t, calm ? 1 - t / UP : 0);
          return;
        }
        // out: die Szene läuft weiter und blendet ab
        const a = (now - outAt) / OUT;
        if (a >= 1 || t >= M.len) { stageBlack(ctxOf, 1); toDialog(); return; }
        drawAt(M, ctxOf, t, Math.max(a, 1 - t / UP));
      },
      advance() {},
      skip() {
        if (opts.canSkip === false || done) return;
        if (opts.onSkip) opts.onSkip();
        doSkip();
      }
    };
    const doSkip = () => {
      if (done) return;
      if (phase === 'in') { wantSkip = true; return; }
      if (!calm) { toDialog(); return; }
      if (phase === 'film') { phase = 'out'; outAt = performance.now() / 1000; stageSkip(false); }
    };
    cur = { id, skip: doSkip };
    const ctxOf = stageOpen('film', h, { veil: phase === 'in' });
    if (!calm) { toDialog(); return; }
    if (phase === 'film') { if (wantSkip) { toDialog(); return; } showSkip(); }
  });
}
// Standbild der Szene für den Dialog danach (dialogBg), z. B. um nach dem Laden wieder in die Entscheidung zu gehen
export function sceneBg(id) { const M = SCENES[id]; if (!M) return null; ready(M); return M.dialogBg; }
export function skipScene(id) { if (cur && (!id || cur.id === id)) { cur.skip(); return true; } return false; }
export const sceneRunning = () => cur ? cur.id : null;

export function seekScene(id, t) {
  const M = SCENES[id];
  if (!M) return false;
  ready(M);
  if (t >= M.len) {
    const d = M.dialog;
    if (!d) return false;
    stageOpen('film', { frame() {}, advance() {}, skip() {} });
    showDialog(d, { bg: M.dialogBg, seek: Math.floor(t - M.len) });
    return true;
  }
  const close = () => stageClose();
  const ctx = stageOpen('film', { frame() {}, advance: close, skip: close });
  drawAt(M, ctx, t);
  stageSkip(true);
  return true;
}
// Dauer von setup() je Szene in ms (Debug)
export const setupTimes = () => Object.fromEntries(Object.values(SCENES).filter(M => M._ready).map(M => [M.id, M._setupMs]));
