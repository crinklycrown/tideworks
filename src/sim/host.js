/* =========================================================
   SIMULATIONS-HOST: besitzt den maßgeblichen Spielzustand
   Läuft im Web Worker (sim/worker.js) oder – mit USE_WORKER = false – im Hauptthread.
   Nachrichten an den Host (handle):
     { type: 'demo' }                Demo-Fabrik für den Titelbildschirm (sim/demo.js, wird nie gespeichert)
     { type: 'new', seed, rid, opts } Neues Spiel (seed leer = zufällig; opts.slots = Getrennte Inseln mit 2–4 Startplätzen); Antwort 'import' mit ok
     { type: 'init', save }          Start: Spielstand laden (JSON-Text) oder neue Welt
     { type: 'cmd', cmds: [...], seq } Kommandos der Oberfläche (siehe sim/sim.js); seq kommt als ack im Snapshot zurück
     { type: 'reset' }               Neue Welt erzeugen
     { type: 'import', save, rid }   Spielstand laden (Import)
     { type: 'save', rid, ui }       Spielstand als JSON-Text anfordern
     { type: 'pause' } / { type: 'resume' }   Fenster unsichtbar (unabhängig von der Spielpause)
     { type: 'speed', speed, halt }  Spieltempo 1–3 und Pause (Kommandos laufen auch in der Pause)
   Koop (nur der Hauptthread des Hosts schickt diese; Mitspieler erreichen den Host über net/session.js):
     { type: 'cmd', cmds, seq, pid } Kommandos eines Mitspielers (Berechtigungen prüft applyCommand)
     { type: 'addView', pid }        Mitspieler bekommt eine world-Nachricht und danach eigene Snapshots (sim/views.js)
     { type: 'dropView', pid }       Mitspieler ist weg
     { type: 'view', pid, rect, sel } Kamera-Ausschnitt (Felder) und ausgewähltes Gebäude des Mitspielers
     { type: 'busy', pid, busy }     Datenkanal voll: keine Snapshots bauen, bis er sich geleert hat
     { type: 'idle' }                keine Welt (dieser Browser ist Mitspieler in einer Koop-Sitzung)
   Nachrichten vom Host (post): 'world', 'snap', 'save', 'import', 'net' (fertig gepackte Nachricht für einen Mitspieler: pid, buf)
   Kein DOM-Zugriff.
   ========================================================= */
import { TICK, MAX_STEPS, MAX_FRAME_DT } from '../config.js';
import { randInt } from '../util/math.js';
import { createGame, newGame } from './state.js';
import { addBuilding } from './buildings.js';
import { reveal, revealIsland } from './explore.js';
import { sim, applyCommand } from './sim.js';
import { createSnapCache, worldMessage, buildSnapshot, snapTransfer } from './snapshot.js';
import { serialize, loadInto } from '../save/serialize.js';
import { buildDemo, demoTick } from './demo.js';
import { createView, feedViews, netWorld, netSnap, evFor } from './views.js';
import { encode } from '../net/protocol.js';
import { NET } from '../data/net.js';
import { HOME_SLOTS } from '../data/islands.js';
import { isSep } from './state.js';

const nowSec = () => performance.now() / 1000;

export class SimHost {
  constructor(post) {
    this.post = post;            // post(msg, transferList)
    this.g = createGame();
    this.cache = createSnapCache();
    this.demo = false;
    this.views = new Map(); this.netTimer = null;   // Koop: Ansichten der Mitspieler
    this.ack = 0; this.paused = false; this.speed = 1; this.halt = false; this.last = 0; this.acc = 0; this.timer = null; this.flushPending = false;
  }
  handle(m) {
    switch (m.type) {
      case 'demo': {
        const g = createGame();
        buildDemo(g);
        g.wireVer = (this.g.wireVer || 0) + 1;
        this.g = g; this.demo = true; this.speed = 1; this.halt = false;
        this.sendWorld({ demo: true });
        this.start();
        return;
      }
      case 'new': {
        const g = createGame();
        const slots = m.opts && Number.isFinite(+m.opts.slots) ? Math.max(HOME_SLOTS.min, Math.min(HOME_SLOTS.max, +m.opts.slots | 0)) : 0;
        newGame(g, Number.isFinite(m.seed) ? (m.seed >>> 0) % 2147483647 : randInt(), addBuilding, reveal, revealIsland, slots ? { slots } : null);
        g.wireVer = (this.g.wireVer || 0) + 1;
        this.g = g; this.demo = false; this.speed = 1; this.halt = false;
        this.post({ kind: 'import', rid: m.rid, ok: true });
        this.sendWorld({ reset: true });
        this.start();
        return;
      }
      case 'init': {
        const loaded = !!m.save && loadInto(this.g, m.save);
        if (!loaded) newGame(this.g, randInt(), addBuilding, reveal, revealIsland);
        this.sendWorld({ loaded });
        this.start();
        return;
      }
      case 'cmd': {
        const pid = m.pid || 'host', v = this.views.get(pid);
        if (pid !== 'host' && !v) return;
        for (const c of m.cmds || []) applyCommand(this.g, c, pid);
        if (v) v.ack = m.seq; else this.ack = m.seq;
        this.scheduleFlush();
        return;
      }
      case 'addView': {
        const v = createView(m.pid);
        this.views.set(m.pid, v);
        this.g.undos.delete(m.pid);   // eigener Rückgängig-Stapel beginnt leer
        this.netSend(v, netWorld(this.g, v));
        if (!this.netTimer) this.netTimer = setInterval(() => this.netFlush(), NET.snapEvery * 1000);
        return;
      }
      case 'dropView':
        this.views.delete(m.pid);
        if (this.g.inspBy) { this.g.inspBy.delete(m.pid); this.g.inspect = new Set([...this.g.inspBy.values()].filter(x => x != null)); }
        if (!this.views.size && this.netTimer) { clearInterval(this.netTimer); this.netTimer = null; }
        return;
      case 'view': { const v = this.views.get(m.pid); if (v) { v.rect = Array.isArray(m.rect) && m.rect.length === 4 ? m.rect.map(Number) : null; v.sel = Number.isFinite(m.sel) ? m.sel : null; } return; }
      case 'busy': { const v = this.views.get(m.pid); if (v) v.busy = !!m.busy; return; }
      case 'reset':
        this.g.paint = null;
        newGame(this.g, randInt(), addBuilding, reveal, revealIsland);
        this.sendWorld({ reset: true });
        return;
      case 'import': case 'load': {
        const g2 = createGame();
        if (!loadInto(g2, m.save)) { this.post({ kind: 'import', rid: m.rid, ok: false }); return; }
        this.start();
        g2.wireVer = this.g.wireVer + 1;
        this.g = g2; this.demo = false; this.speed = 1; this.halt = false;
        this.post({ kind: 'import', rid: m.rid, ok: true });
        this.sendWorld({ imported: true });
        return;
      }
      case 'save':
        this.post({ kind: 'save', rid: m.rid, data: serialize(this.g, m.ui) });
        return;
      // Koop-Mitspieler: eigene Simulation ruht (Demo beendet, keine Welt)
      case 'idle':
        this.g = createGame(); this.demo = false; this.halt = false; this.views.clear();
        if (this.netTimer) { clearInterval(this.netTimer); this.netTimer = null; }
        return;
      case 'pause': this.paused = true; return;
      case 'resume': this.paused = false; return;
      case 'speed':
        this.speed = Math.min(3, Math.max(1, m.speed | 0 || 1)); this.halt = !!m.halt;
        this.scheduleFlush();
        return;
    }
  }
  sendWorld(info) {
    const w = worldMessage(this.g, this.cache, info);
    this.post(w, [...w.trees.map(t => t[1].buffer), ...w.fog.map(f => f[1].buffer)]);
    for (const v of this.views.values()) this.netSend(v, netWorld(this.g, v));   // neue Welt auch für die Mitspieler
    this.snapshot(0);
  }
  // Koop: Nachricht für einen Mitspieler packen (komprimiert) und an den Hauptthread geben; die Reihenfolge bleibt erhalten
  netSend(v, msg) {
    v.q = v.q.then(() => encode(msg)).then(buf => { v.bytes += buf.byteLength; this.post({ kind: 'net', pid: v.pid, buf }, [buf]); }).catch(e => console.error('Koop: Nachricht nicht gepackt', e));
  }
  netFlush() {
    if (!this.g.state) return;
    for (const v of this.views.values()) if (!v.busy && v.recs) this.netSend(v, netSnap(this.g, v, this));
  }
  snapshot(steps) {
    if (!this.g.state) return;   // keine Welt (Koop-Mitspieler)
    if (this.views.size) feedViews(this.g, this.views, steps);
    const s = buildSnapshot(this.g, this.cache, steps);
    s.events = s.events.filter(ev => evFor(ev, 'host', isSep(this.g)));   // Koop: Meldungen der Mitspieler nicht beim Host
    s.ack = this.ack;          // zuletzt verarbeitetes Kommando-Paket
    s.speed = this.speed; s.halt = this.halt;
    this.post(s, snapTransfer(s));
  }
  scheduleFlush() {
    if (this.flushPending) return;
    this.flushPending = true;
    setTimeout(() => { this.flushPending = false; this.snapshot(0); }, 0);
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.loop(), 1000 / 60);
  }
  // Ein Durchlauf: höchstens 0,25 s Zeit, feste Schritte von TICK, max. MAX_STEPS – beides mal Tempo
  // (bei 3× also dreimal so viele Schritte je Durchlauf). In der Pause rechnet die Simulation nicht.
  loop() {
    if (this.paused || !this.g.state) return;
    const now = nowSec(), dt = this.last ? Math.min(MAX_FRAME_DT, now - this.last) : 0;
    this.last = now;
    if (this.halt) { this.acc = 0; return; }
    this.acc += dt * this.speed;
    const max = MAX_STEPS * this.speed;
    let n = 0;
    while (this.acc >= TICK && n < max) { sim(this.g, TICK); if (this.demo) demoTick(this.g, TICK); this.acc -= TICK; n++; }
    if (n >= max) this.acc = 0;
    if (n) this.snapshot(n);
  }
}
