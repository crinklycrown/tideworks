/* =========================================================
   GESCHICHTE (seit Version 16, Grundlage docs/STORY.md): Akte, Auslöser, Cutscene- und Dialog-IDs
   Zustand state.story = { act, flags, seen, once, choice } gehört zur Welt (nicht zu einem Spieler), wird gespeichert und
   im Koop vom Host verteilt. Getrennte Inseln (und die Demo im Titelbildschirm) laufen ohne Geschichte (state.story = null).
     act    – aktueller Akt (1–5), 6 = nach der Entscheidung (Spiel geht frei weiter)
     flags  – gesetzte Story-Flags (Name → 1), z. B. npc_ole, karte_gefunden, pumpe_gefunden
     seen   – gesehene Cutscenes und Einmal-Dialoge (ID → Spielzeit), setzt die Oberfläche des Hosts über das Kommando storySeen
     once   – ausgelöste Story-Schritte (TRIGGERS[].id → Spielzeit)
     choice – Entscheidung am Leuchtturm: null | 'a' (entzündet) | 'b' (dunkel)
   Ausgewertet wird in sim/story.js (storyEvent): Jeder Schritt läuft genau einmal, wenn sein Auslöser (on) eintritt und
   die Bedingungen stimmen. Auslöser:
     discover:<npc>   ein Schiff deckt die NPC-Insel auf (sim/explore.js)
     talk:<npc>       Klick auf den NPC, während ein Schiff an seinem Steg liegt (Kommando talk)
     trade:<npc>      Handel mit dem NPC (Thread 4 ruft storyEvent(g, 'trade', npc))
     wonder:<n>       Leuchtturm-Stufe n fertig (sim/wonder.js)
     buy:<ware>       Ware bei einem Volk gekauft (nur Teile der Taucherglocke, sim/npc.js)
     visit:<npc>      ein Schiff legt an seinem Steg an (sim/story.js storyTick, seit 0.21.0)
     dive             Tauchgang mit Fund abgeschlossen (sim/dive.js); surface = Glocke wieder oben (auch ohne Fund); find:<fund> Story-Fund eines Story-Spots (karte, pumpwerk)
   Bedingungen: act (genau dieser Akt), minAct (mindestens), flags (alle gesetzt), wonder (Stufe mindestens).
   Wirkung: set (Flags), unlock (Schlüssel aus data/unlocks.js, Quelle story), act (neuer Akt).
   An die Oberfläche geht das Ereignis { type: 'story', id, cs, pre, dialog, act, to: '*' }: erst der Dialog pre, dann die Cutscene cs,
   dann der Dialog dialog. ui/story.js spielt sie im Cutscene-Player (cutscene/player.js) und im Dialogfenster (ui/dialog.js) ab.
   ========================================================= */

export const ACTS = {
  1: { name: 'Gestrandet' },
  2: { name: 'Das Licht' },
  3: { name: 'Unter dem Meer' },
  4: { name: 'Die Flut' },
  5: { name: 'Das Leuchtfeuer' },
  6: { name: 'Nach der Entscheidung' }
};
export const ACT_MAX = 6;

export const TRIGGERS = [
  // Prolog: neues Spiel (sim/state.js newGame)
  { id: 'prolog', on: 'start', cs: 'cs_prolog' },
  // Akt 1: die drei Völker entdecken (in jeder Reihenfolge), dann zurück zu Brann
  { id: 'npc_ole',   on: 'discover:ole',   set: ['npc_ole'],   cs: 'cs_npc_ole',   dialog: 'ole_1' },
  { id: 'npc_brann', on: 'discover:brann', set: ['npc_brann'], cs: 'cs_npc_brann', dialog: 'brann_1' },
  { id: 'npc_aurel', on: 'discover:aurel', set: ['npc_aurel'], cs: 'cs_npc_aurel', dialog: 'aurel_1' },
  { id: 'akt1_ende', on: 'talk:brann', act: 1, flags: ['npc_ole', 'npc_brann', 'npc_aurel'], cs: 'cs_bauplan', dialog: 'brann_bauplan', unlock: ['leuchtturm'], toAct: 2 },
  // Akt 2: Leuchtturm Stufe 1 und 2; Aurel rät ab (einmalig beim Handel)
  { id: 'akt2_aurel', on: 'trade:aurel', act: 2, dialog: 'aurel_turm' },
  { id: 'akt2_ende', on: 'wonder:2', act: 2, cs: 'cs_licht_im_wind', dialog: 'brann_glocke', set: ['plan_glocke'], unlock: ['glocke'], toAct: 3 },
  // Akt 3: Taucherglocke, Tauchgänge, Karte der alten Welt zu Brann
  // Ole beim ersten Kauf des Glockenseils (sim/npc.js npcBuyTo → buy:<Ware>), einmalig. ID seit 0.20.1 'akt3_seil':
  // Spielstände vor 0.19 hatten 'akt3_ole' (damals jeder Handel mit Ole) schon als ausgelöst, dann kam beim Kauf kein Dialog.
  { id: 'akt3_seil', on: 'buy:glockenseil', minAct: 3, dialog: 'ole_tote' },
  // Erster Tauchgang: cs_abstieg läuft schon vor dem Minispiel (nur beim Taucher, ui/divegame.js); danach Brann, sobald die Glocke oben ist
  { id: 'abstieg', on: 'surface', minAct: 3, dialog: 'brann_glocke_haelt' },
  { id: 'karte', on: 'find:karte', minAct: 3, set: ['karte_gefunden'] },
  { id: 'akt3_ende', on: 'talk:brann', act: 3, flags: ['karte_gefunden'], cs: 'cs_alte_karte', dialog: 'brann_karte', toAct: 4 },
  // Akt 4: Stufe 3, Pumpwerk finden und zu Brann bringen. on darf eine Liste sein (der erste passende Auslöser zählt).
  // Aurel einmal beim nächsten Besuch nach Stufe 3: Anlegen, Gespräch oder Handel
  { id: 'akt4_aurel', on: ['visit:aurel', 'talk:aurel', 'trade:aurel'], act: 4, wonder: 3, dialog: 'aurel_tauchen' },
  // Story-Tauchspot „Pumpwerk“ kommt nach Stufe 3 (sim/dive.js pumpwerkDue); der Fund (Brecheisen) setzt pumpe_gefunden
  { id: 'pumpwerk', on: 'find:pumpwerk', act: 4, wonder: 3, set: ['pumpe_gefunden'] },
  { id: 'akt4_ende', on: 'talk:brann', act: 4, flags: ['pumpe_gefunden'], pre: 'brann_pumpwerk', cs: 'cs_flutnacht', dialog: 'brann_flutnacht', toAct: 5 },
  // Akt 5: Stufe 4 vollenden, Aurel wird nervös; Finale mit Entscheidung
  { id: 'akt5_aurel', on: 'talk:aurel', act: 5, dialog: 'aurel_nervoes' },
  { id: 'finale', on: 'wonder:4', act: 5, cs: 'cs_wahrheit', dialog: 'wahrheit', choice: true }
];
export const TRIGGER_BY_ID = Object.fromEntries(TRIGGERS.map(T => [T.id, T]));

// Leuchtturm: Freigabe der Stufen steht seit 0.18.0 in data/wonder.js (need: Akt bzw. Flag karte_gefunden, pumpe_gefunden)

// Ende der Geschichte: Entscheidung am Leuchtturm (nur der Host), danach Cutscene des Endes
export const CHOICES = {
  // Ende A: Ole, Brann und Aurel sprechen in der Szene (ende_a_szene), danach Branns Worte am Morgen (ende_a).
  // Ende B: Aurels Satz kommt in der Szene (ende_b), danach keine Stimme mehr, nur Wellen: kein Dialog.
  a: { label: 'Leuchtfeuer entzünden', cs: 'cs_ende_a', dialog: 'ende_a' },
  b: { label: 'Nicht entzünden', cs: 'cs_ende_b', dialog: null }
};

// Titel der Cutscenes (Menü „Szenen“, Platzhalter-Meldung für Szenen ohne Modul); die Szenen selbst liegen in src/cutscenes/
export const CUTSCENES = {
  cs_prolog: 'Gestrandet', cs_npc_ole: 'Rauch hinter dem Nebel', cs_npc_brann: 'Funken in der Werkstatt', cs_npc_aurel: 'Der Goldberg',
  cs_bauplan: 'Der Bauplan', cs_licht_im_wind: 'Ein Licht im Wind', cs_abstieg: 'Abstieg', cs_alte_karte: 'Die alte Karte',
  cs_flutnacht: 'Die Flutnacht', cs_wahrheit: 'Die Wahrheit', cs_ende_a: 'Das Feuer antwortet', cs_ende_b: 'Die Lichter gehen aus'
};
// Dialog-Texte: src/data/dialogs/ (Gesprächsdialog ohne Story-Schritt: idle/when, idleDialogFor)

// dives = erfolgreiche Tauchgänge (sim/dive.js), für die Karte der alten Welt
export const freshStory = () => ({ act: 1, flags: {}, seen: {}, once: {}, choice: null, dives: 0 });

// Nächstes Ziel des Akts in einem Satz (Ziel-Karte). ctx = { ship (ein Schiff vorhanden), spot (Art des Tauchspots oder null), wonder (Stufen fertig), wonderBuilt (Turm steht),
//   site (Stufe auf der Baustelle, 0 = keine), full (alle Waren da), share (Anteil der gelieferten Waren 0–1) }
const FIND = { ole: 'das Dorf hinter dem Nebel in der Nähe', brann: 'die Werkstattbucht weiter draußen', aurel: 'die Insel ganz weit draußen' };
export function actGoal(S, ctx) {
  const f = S.flags || {};
  switch (S.act) {
    case 1: {
      if (!ctx.ship) return 'Baue eine Werft und lass dein erstes Schiff vom Stapel.';
      const miss = ['ole', 'brann', 'aurel'].filter(n => !f['npc_' + n]);
      if (miss.length) return `Segle hinaus und finde ${FIND[miss[0]]} (${3 - miss.length}/3 Völker entdeckt).`;
      return 'Du kennst alle drei Völker. Fahr zurück zu Brann und sprich mit ihm.';
    }
    case 2:   // Akt 2: Stufe 1 und 2 (ctx.site = Stufe auf der Baustelle, share = Anteil der gelieferten Waren)
      if (!ctx.wonderBuilt) return 'Baue den Leuchtturm aus: Lege zuerst den Bauplatz auf der Heimatinsel an (Bauen → Schifffahrt).';
      if (ctx.site) return `Baue den Leuchtturm aus: Stufe ${ctx.site} von 2 (${ctx.full ? 'wird gebaut' : `Waren ${Math.floor(ctx.share * 100)} %`}).`;
      return `Baue den Leuchtturm aus: Eröffne im Turm die Baustelle für Stufe ${Math.min(2, ctx.wonder + 1)} von 2.`;
    case 3:   // ctx.bell = Glocke montiert, parts = Teile im Lager (0–2), spot = gerade ein Tauchspot da
      if (f.karte_gefunden) return 'Bring die Karte zu Brann.';
      if (!ctx.bell) return `Baue die Taucherglocke: Glockenseil von Ole, Messingglocke von Brann, dann in der Werft an ein Schiff montieren (${ctx.parts | 0}/2 Teile im Lager).`;
      return `Folge den Blasen: ${ctx.spot ? 'Fahr mit dem Taucherschiff zum Tauchspot und tauche' : 'Halte Ausschau nach Blasen im Wasser'} (${S.dives | 0} ${(S.dives | 0) === 1 ? 'Tauchgang' : 'Tauchgänge'}).`;
    case 4:   // seit 0.21.0: Stufe 3 wie in Akt 2 mit Baustelle (ctx.site, full, share), dann der Story-Spot Pumpwerk
      if (f.pumpe_gefunden) return 'Bring deinen Fund zu Brann.';
      if (ctx.wonder < 3) {
        if (ctx.site === 3) return `Baue den Leuchtturm weiter aus: Stufe 3, die Lampenkammer (${ctx.full ? 'wird gebaut' : `Waren ${Math.floor(ctx.share * 100)} %`}).`;
        return 'Baue den Leuchtturm weiter aus: Eröffne im Turm die Baustelle für Stufe 3, die Lampenkammer.';
      }
      return ctx.spot === 'story' ? 'Etwas Großes liegt da unten: Fahr mit dem Taucherschiff zu den großen Blasen und tauche.' : 'Halte Ausschau nach Blasen im Wasser. Da unten wartet noch etwas.';
    case 5: return ctx.wonder < 4 ? 'Vollende den Leuchtturm mit Stufe 4.' : 'Der Leuchtturm steht. Triff deine Entscheidung.';
    // Akt 6: Abschluss-Satz je Ende (seit 0.23.0), danach geht das Spiel frei weiter
    default: return S.choice === 'a' ? 'Das Leuchtfeuer brennt, und diesmal wurden alle gewarnt. Bau den Goldberg wieder auf, für alle.'
      : 'Der Turm bleibt dunkel. Die Krone gehört wieder dir, doch die Dörfer schweigen.';
  }
}
