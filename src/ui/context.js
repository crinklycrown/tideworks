/* =========================================================
   GEMEINSAMER ZUSTAND DER OBERFLÄCHE
   game – Spiegel des Spielkontexts (aus den Snapshots der Simulation gefüllt).
          Nur lesen! Änderungen laufen über Kommandos: send({ type: … }).
   ui   – reiner Oberflächen-Zustand (Auswahl, Baumodus, offene Fenster …)
          mode: { kind: 'build'|'wire'|'demolish'|'found'|'route'|'upgrade'|'bpSelect'|'bpPlace', … }
          camIsl  = Insel unter der Kamera (-1 = offenes Meer)
          viewIsl = zuletzt besuchte Insel (Lager-Panel über offenem Meer)
   Gespeicherte Einstellungen (eingeklappte Panels, letzte Baukategorie) liegen in game.state.ui.
   ========================================================= */
import { createMirror } from '../sim/snapshot.js';

export const game = createMirror();
export const ui = {
  selected: -1, selTile: -1, camIsl: 0, viewIsl: 0, mode: null, uiPressed: false,
  hoverW: null, hoverTile: -1, lastLevel: 1,
  buildOpen: false,   // Baumenü über der Knopfleiste offen
  win: null,          // offenes großes Fenster ('tech' | 'fleet' | 'stats')
  popItem: null,      // Item im Lager-Popover
  selShip: -1,        // ausgewähltes Schiff (ID)
  mark: null,         // Zielmarke nach Rechtsklick { x, y, t } (t = performance.now())
  fleet: {},          // aufgeklappte Teile im Flotten-Fenster je Schiff: { route, stop, pick }
  flash: null,        // Flotten-Eintrag kurz hervorheben { id, until }
  speed: 1,           // Spieltempo 1–3 (wird nicht gespeichert, Start immer 1×)
  halt: false,        // Spielpause (Leertaste); unabhängig vom Anhalten bei verstecktem Fenster
  menu: false,        // Titelbildschirm offen (Demo-Fabrik läuft, keine Eingaben in die Karte)
  pause: false,       // Pausenmenü offen (Spiel angehalten)
  cine: null,         // Cutscene/Dialog offen: 'film' (Vollbild, Karte wird nicht gezeichnet) | 'over' (Dialog über der Karte) | null
  clip: null          // Zwischenablage für Blaupausen (Strg+C / Strg+V), nicht in der Bibliothek
};

// Verbindung zur Simulation (wird in main.js gesetzt)
const link = { client: null, afterSync: [], save: () => {} };
export function setClient(client, save) { link.client = client; link.save = save; }
// Kommando(s) an die Simulation schicken
export function send(...cmds) { link.client.send(...cmds); }
export const simClient = () => link.client;
// Neue Zug-Nummer: alle Kommandos mit derselben Nummer bilden eine Aktion für Rückgängig (Ziehen, mehrere Kabel …)
let grpN = 0;
export const newGrp = () => ++grpN;
// Ausführen, sobald ein Snapshot die Wirkung aller bisher geschickten Kommandos enthält
export function afterSync(fn) { link.afterSync.push({ seq: link.client.seq, fn }); }
export function runAfterSync(ack) {
  if (!link.afterSync.length) return;
  const due = link.afterSync.filter(a => a.seq <= ack);
  link.afterSync = link.afterSync.filter(a => a.seq > ack);
  for (const a of due) a.fn();
}
// Spielstand speichern
export function saveGame() { link.save(); }
// DOM-Kurzform
export const $ = (id) => document.getElementById(id);
