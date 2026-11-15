/* Tag/Nacht aus der Spielzeit (reine Funktion) */
import { CYCLE, DAY_LEN } from '../config.js';
import { pad } from '../util/format.js';

export function dayInfo(time) {
  const ct = time % CYCLE, day = Math.floor(time / CYCLE) + 1, isDay = ct < DAY_LEN;
  const hours = isDay ? 6 + ct / DAY_LEN * 15 : 21 + (ct - DAY_LEN) / (CYCLE - DAY_LEN) * 9;
  const h = Math.floor(hours) % 24, m = Math.floor((hours % 1) * 60);
  let night = 0;
  if (ct >= DAY_LEN - 30 && ct < DAY_LEN) night = (ct - (DAY_LEN - 30)) / 30;
  else if (ct >= DAY_LEN && ct < CYCLE - 30) night = 1;
  else if (ct >= CYCLE - 30) night = 1 - (ct - (CYCLE - 30)) / 30;
  const left = isDay ? DAY_LEN - ct : CYCLE - ct;
  return { day, isDay, clock: `${pad(h)}:${pad(m)}`, night, left };
}
