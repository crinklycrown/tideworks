/* =========================================================
   NPC-INSELN (seit Version 16): Ole, Brann, Aurel
   Jede NPC-Insel liegt in einer festen Zelle, die beim Spielstart aus dem Seed gewählt wird (world/npcs.js, pickNpcCells):
   Zellen, deren Mitte im Abstandsband band (Felder zur Heimatinsel) liegt, nach Seed-Hash geordnet, die erste freie.
   Ole liegt in Ring 1, Brann in Ring 2, Aurel knapp hinter der Grenze zu Ring 3 (data/islands.js RINGS).
   look = Optik der Insel (Umriss und Boden in world/worldgen.js, Farben in gfx/ground.js, Gebäude in gfx/sprites/npc.js):
     klippe   – Pfahldorf an grauen Klippen: Steinboden, Klippen rund um die Küste außer an der Bucht zur Heimatinsel
     bucht    – Werkstattbucht: Wiese und Stein, eine tiefe Bucht zur Heimatinsel hin
     goldberg – Goldberg: runde Insel mit einem Berg in der Mitte, Terrassen und goldenem Fels
   village = Gebäude des Dorfs [Typ, Anzahl, wo] (wo: 'coast' = an der Küste, sonst landeinwärts). Sie sind echte Gebäude
   (by = 'npc:<id>', fest, nicht abreißbar), stehen aber still (kein Takt, keine Produktion).
   Das Hauptgebäude jeder Insel ist der NPC-Steg (npchafen, 3×3 mit Steg) am erzeugten Kontorplatz; dort legen Schiffe an,
   dort steht die Figur, ein Klick darauf öffnet das Gespräch.
   ========================================================= */
import { NPCS } from './unlocks.js';

export const NPC_ORDER = ['ole', 'brann', 'aurel'];
export const NPC_ISL = {
  ole:   { isl: 'Pfahldorf',     look: 'klippe',   band: [240, 420], r: 21, flag: '#8a8f98', role: 'alter Fischer',
           village: [['npc_pfahlhaus', 4, 'coast'], ['npc_netz', 3, 'coast'], ['npc_raeucher', 2]] },
  brann: { isl: 'Werkstattbucht', look: 'bucht',   band: [520, 780], r: 27, flag: '#e0843a', role: 'Werkmeister',
           village: [['npc_werkstatt', 2], ['npc_kran', 3, 'coast'], ['npc_schlot', 2], ['npc_lager', 2]] },
  aurel: { isl: 'Goldberg',      look: 'goldberg', band: [930, 1090], r: 33, flag: '#e8c43a', role: 'König vom Goldberg',
           village: [['npc_villa', 4], ['npc_terrasse', 4], ['npc_banner', 4]] }
};
// Zellen der NPC-Inseln liegen mindestens so viele Zellen (Chebyshev) auseinander und von jeder Heimatinsel entfernt
export const NPC_GAP = 2;
// Ein Dorf-Gebäude hält so viele Felder Abstand zu den anderen (ohne Steg)
export const VILLAGE_GAP = 1;

// Handelspartner (sim/npc.js, Fenster „Völker“): die drei Völker und seit 0.23.0 der Inselrat (nur nach Ende A, Steg am Goldberg).
// Der Inselrat hat keine eigene Insel (kein Eintrag in NPC_ISL); seine Angaben fürs Fenster stehen in RAT.
export const TRADERS = [...NPC_ORDER, 'rat'];
export const RAT = { isl: 'Goldberg', flag: '#c8a868', role: 'Rat der Inseln: Ole, Brann und Aurels Bürger' };
export const traderInfo = (id) => NPC_ISL[id] || RAT;
export const npcPid = (id) => 'npc:' + id;
export const npcOfPid = (pid) => typeof pid === 'string' && pid.startsWith('npc:') && (NPC_ISL[pid.slice(4)] || pid.slice(4) === 'rat') ? pid.slice(4) : null;
export const npcName = (id) => (NPCS[id] && NPCS[id].name) || id;
