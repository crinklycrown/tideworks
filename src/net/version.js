/* =========================================================
   KOOP: Versionsprüfung beim Beitreten
   Verglichen werden Spielversion (package.json), SAVE_VERSION und ein Prüfwert über die Datentabellen in src/data/.
   Weicht etwas ab, ist kein Beitritt möglich („Ihr nutzt verschiedene Versionen von Tideworks“).
   ========================================================= */
import { GAME_VERSION, SAVE_VERSION } from '../config.js';
import * as buildings from '../data/buildings.js';
import * as items from '../data/items.js';
import * as recipes from '../data/recipes.js';
import * as tech from '../data/tech.js';
import * as mining from '../data/mining.js';
import * as fluids from '../data/fluids.js';
import * as ships from '../data/ships.js';
import * as trade from '../data/trade.js';
import * as islands from '../data/islands.js';
import * as events from '../data/events.js';
import * as wonder from '../data/wonder.js';
import * as drones from '../data/drones.js';
import * as finds from '../data/finds.js';
import * as goals from '../data/goals.js';
import * as net from '../data/net.js';
import * as unlocks from '../data/unlocks.js';
import * as story from '../data/story.js';
import * as dialogs from '../data/dialogs/index.js';
import * as dive from '../data/dive.js';
import * as npctrade from '../data/npctrade.js';

const TABLES = { buildings, items, recipes, tech, mining, fluids, ships, trade, islands, events, wonder, drones, finds, goals, net, unlocks, story, dialogs, dive, npctrade };
let cached = null;
// FNV-1a über das JSON aller Tabellen (Funktionen zählen nicht mit, Reihenfolge der Schlüssel fest)
export function dataHash() {
  if (cached) return cached;
  let h = 2166136261;
  const keys = Object.keys(TABLES).sort();
  for (const k of keys) {
    const mod = TABLES[k], names = Object.keys(mod).sort();
    const txt = k + JSON.stringify(names.map(n => [n, mod[n]]), (key, v) => v instanceof Set ? [...v] : v instanceof Map ? [...v] : v);
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  }
  cached = (h >>> 0).toString(16).padStart(8, '0');
  return cached;
}
// Eigene Kennung (Debug: tideworks.netDebug({ fakeVersion }) simuliert eine andere Version)
export function versionInfo(debug) {
  return { v: debug && debug.fakeVersion ? String(debug.fakeVersion) : GAME_VERSION, sv: SAVE_VERSION, dh: dataHash() };
}
export const sameVersion = (a, b) => !!a && !!b && a.v === b.v && a.sv === b.sv && a.dh === b.dh;
