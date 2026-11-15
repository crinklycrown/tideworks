/* =========================================================
   SPIELTEMPO: Pause, 1×, 2×, 3× (Knöpfe neben der Uhr, Leertaste, Umschalt+1/2/3)
   Das Tempo gehört der Oberfläche (ui.speed, ui.halt) und wird nicht gespeichert; die Simulation
   rechnet entsprechend mehr Schritte je Durchlauf (sim/host.js). In der Pause laufen Kommandos weiter.
   ========================================================= */
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { ui, $, simClient } from './context.js';
import { registerTip } from './tooltip.js';
import { setHTML } from './common.js';
import { isGuest } from '../net/session.js';

// v = 0 ist die Pause
const SPEEDS = [
  { v: 0, icon: 'pause', name: 'Pause', key: 'Leertaste' },
  { v: 1, icon: 'speed1', name: 'Normales Tempo (1×)', key: 'Umschalt+1' },
  { v: 2, icon: 'speed2', name: 'Doppeltes Tempo (2×)', key: 'Umschalt+2' },
  { v: 3, icon: 'speed3', name: 'Dreifaches Tempo (3×)', key: 'Umschalt+3' }
];

function push() { simClient().setSpeed(ui.speed, ui.halt); renderSpeed(); }
// Tempo wählen (0 = Pause); ein Tempo-Knopf hebt die Pause auf. Koop: nur der Host (Mitspieler bekommen Tempo und Pause mit den Snapshots)
export function setSpeed(v) { if (isGuest()) return; if (v === 0) ui.halt = true; else { ui.speed = v; ui.halt = false; } push(); }
export function togglePause() { if (isGuest()) return; ui.halt = !ui.halt; push(); }

export function renderSpeed() {
  for (const el of $('speedBtns').children) {
    const v = +el.dataset.spd;
    el.classList.toggle('on', v === 0 ? ui.halt : !ui.halt && ui.speed === v);
    el.classList.toggle('locked', isGuest());
  }
  $('pausedBadge').classList.toggle('hidden', !ui.halt);
  document.body.classList.toggle('paused', ui.halt);
}

export function wireSpeed() {
  setHTML($('speedBtns'), SPEEDS.map(s => `<button class="spdb" data-spd="${s.v}" data-tip="spd:${s.v}">${img(SPR.icon[s.icon], 2)}</button>`).join(''));
  $('speedBtns').addEventListener('click', e => { const b = e.target.closest('[data-spd]'); if (b) { setSpeed(+b.dataset.spd); b.blur(); } });
  registerTip('spd', (v) => { const s = SPEEDS.find(x => x.v === +v); return !s ? '' : isGuest() ? `<div class="tt-h"><span>${s.name}</span></div><div class="xs">Nur der Host</div>` : `<div class="tt-h"><span>${s.name}</span><kbd>${s.key}</kbd></div>`; });
  renderSpeed();
}
