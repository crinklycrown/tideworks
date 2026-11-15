/* =========================================================
   VERBINDUNG ZUR SIMULATION (Hauptthread)
   Gleiche Schnittstelle für beide Modi:
     USE_WORKER = true  → Simulation im Web Worker
     USE_WORKER = false → dieselbe Simulation (SimHost) im Hauptthread
   ========================================================= */
import { SimHost } from './sim/host.js';
import SimWorker from './sim/worker.js?worker&inline';

export function createSimClient(useWorker, onMessage) {
  let toHost, rid = 0, seq = 0, mode = 'local';
  const pending = new Map();
  const receive = (msg) => {
    if ((msg.kind === 'save' || msg.kind === 'import') && pending.has(msg.rid)) { pending.get(msg.rid)(msg); pending.delete(msg.rid); return; }
    onMessage(msg);
  };
  const startLocal = () => {
    // Nachrichten werden wie beim Worker kopiert und asynchron zugestellt – so verhalten sich beide Modi gleich
    const host = new SimHost((msg) => { const c = structuredClone(msg); queueMicrotask(() => receive(c)); });
    toHost = (m) => host.handle(structuredClone(m));
    mode = 'local';
  };
  if (useWorker) {
    try {
      const w = new SimWorker();
      let alive = false, initMsg = null;
      // Startet der Worker nicht (z. B. vom Browser blockiert), läuft die Simulation im Hauptthread weiter
      const fallback = (why) => {
        if (alive || mode !== 'worker') return;
        console.warn('Web Worker nicht verfügbar, Simulation läuft im Hauptthread.', why);
        try { w.terminate(); } catch (e) { /* egal */ }
        startLocal();
        if (initMsg) toHost(initMsg);
      };
      w.onmessage = (e) => { alive = true; receive(e.data); };
      w.onerror = (e) => { if (!alive) { e.preventDefault(); fallback(`${e.message || 'Fehler beim Laden'} (${e.filename || ''}:${e.lineno || 0})`); } else console.error('Simulation (Worker):', e.message || e); };
      toHost = (m) => { if ((m.type === 'init' || m.type === 'demo') && !initMsg) { initMsg = m; setTimeout(() => fallback('keine Antwort'), 5000); } w.postMessage(m); };
      mode = 'worker';
    } catch (e) {
      console.warn('Web Worker nicht verfügbar, Simulation läuft im Hauptthread.', e && e.message);
      startLocal();
    }
  } else startLocal();

  const request = (m) => new Promise(res => { m.rid = ++rid; pending.set(m.rid, res); toHost(m); });
  return {
    get mode() { return mode; },
    init: (save) => toHost({ type: 'init', save }),
    demo: () => toHost({ type: 'demo' }),                                    // Titelbildschirm
    newGame: (seed, opts) => request({ type: 'new', seed, opts }).then(r => r.ok),       // seed = Zahl oder null (zufällig); opts.slots = Getrennte Inseln
    load: (save) => request({ type: 'load', save }).then(r => r.ok),
    // liefert die Paketnummer; Snapshots melden in ack, bis wohin Kommandos verarbeitet sind
    send: (...cmds) => { toHost({ type: 'cmd', cmds, seq: ++seq }); return seq; },
    get seq() { return seq; },
    reset: () => toHost({ type: 'reset' }),
    pause: () => toHost({ type: 'pause' }),
    resume: () => toHost({ type: 'resume' }),
    setSpeed: (speed, halt) => toHost({ type: 'speed', speed, halt }),
    // Koop (Host): Kommandos eines Mitspielers, Ansichten der Mitspieler, Simulation anhalten (Mitspieler-Modus)
    sendAs: (pid, cmds, seq) => toHost({ type: 'cmd', cmds, seq, pid }),
    post: (m) => toHost(m),
    idle: () => toHost({ type: 'idle' }),
    save: (ui) => request({ type: 'save', ui }).then(r => r.data),
    importSave: (save) => request({ type: 'import', save }).then(r => r.ok)
  };
}
