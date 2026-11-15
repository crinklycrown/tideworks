/* =========================================================
   ALLE CUTSCENES: Id → Szenen-Modul (Format: cutscene/player.js)
   Szenen ohne Modul (noch nicht gebaut) zeigt ui/story.js als kurze Meldung mit Titel, danach geht es mit dem Dialog weiter.
   Neue Szene: Datei cs_<name>.js hier eintragen; die Id muss in CUTSCENES (data/story.js) stehen.
   ========================================================= */
import csProlog from './cs_prolog.js';
import csNpcOle from './cs_npc_ole.js';
import csNpcBrann from './cs_npc_brann.js';
import csNpcAurel from './cs_npc_aurel.js';
import csBauplan from './cs_bauplan.js';
import csLichtImWind from './cs_licht_im_wind.js';
import csAbstieg from './cs_abstieg.js';
import csAlteKarte from './cs_alte_karte.js';
import csWahrheit from './cs_wahrheit.js';
import csEndeA from './cs_ende_a.js';
import csEndeB from './cs_ende_b.js';

export const SCENES = Object.fromEntries([csProlog, csNpcOle, csNpcBrann, csNpcAurel, csBauplan, csLichtImWind, csAbstieg, csAlteKarte, csWahrheit, csEndeA, csEndeB].map(M => [M.id, M]));
