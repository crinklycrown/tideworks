/* Prüft den Skilltree (npm run check:tree):
   keine überlappenden Knoten, jede Forschung genau einmal, jedes Gebäude genau einmal als Blatt,
   jedes Rezept mit tech genau einmal, alle Verweise (req, cat, tech, plan) gültig, genau eine Freischalt-Quelle je Gebäude (data/unlocks.js). Beendet sich mit Code 1 bei Fehlern. */
import { buildLayout, overlaps, baseBuildings, LABEL, labelWidth } from '../src/ui/skilltree-layout.js';
import { TECH, TECH_BY_ID, TECH_BRANCHES } from '../src/data/tech.js';
import { BD, BUILD_ORDER } from '../src/data/buildings.js';
import { RECIPES } from '../src/data/recipes.js';
import { unlockErrors } from '../src/data/unlocks.js';

const err = [], L = buildLayout(), count = (f) => L.nodes.filter(f).length;
const cats = new Set(TECH_BRANCHES.map(b => b.id));
for (const [a, b] of overlaps(L)) err.push(`Überlappung: ${a} ↔ ${b}`);
// Beschriftungen der Forschungs-Knoten (wie ui/skilltree.js: unter dem Knoten bei Ästen nach oben, sonst darüber)
const labels = L.nodes.filter(n => n.kind === 'tech').map(n => {
  const h = LABEL.font * 1.24, cy = n.y + (n.up ? 1 : -1) * (n.size / 2 + LABEL.gap + LABEL.font * 0.6), w = labelWidth(n.tech.name);
  return { key: n.key, x0: n.x - w / 2, x1: n.x + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
});
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
for (let i = 0; i < labels.length; i++) {
  for (let j = i + 1; j < labels.length; j++) if (hit(labels[i], labels[j])) err.push(`Beschriftungen überlappen: ${labels[i].key} ↔ ${labels[j].key}`);
  for (const n of L.nodes) if (n.key !== labels[i].key && hit(labels[i], { x0: n.x - n.size / 2, x1: n.x + n.size / 2, y0: n.y - n.size / 2, y1: n.y + n.size / 2 })) err.push(`Beschriftung ${labels[i].key} verdeckt ${n.key}`);
}
for (const T of TECH) {
  const n = count(x => x.kind === 'tech' && x.key === T.id);
  if (n !== 1) err.push(`Forschung ${T.id}: ${n}× im Baum`);
  if (!cats.has(T.cat)) err.push(`Forschung ${T.id}: unbekannter Ast ${T.cat}`);
  for (const r of T.req) if (!TECH_BY_ID[r]) err.push(`Forschung ${T.id}: Voraussetzung ${r} fehlt`);
}
if (new Set(TECH.map(T => T.id)).size !== TECH.length) err.push('Doppelte Forschungs-IDs');
for (const t of BUILD_ORDER) {
  if (BD[t].fixed) continue;
  if (BD[t].tech && !TECH_BY_ID[BD[t].tech]) err.push(`Gebäude ${t}: Forschung ${BD[t].tech} fehlt`);
  const n = count(x => x.kind === 'leaf' && x.leaf.kind === 'b' && x.leaf.id === t);
  if (n !== 1) err.push(`Gebäude ${t}: ${n}× als Blatt`);
}
for (const e of unlockErrors()) err.push(e);
for (const t in BD) if (!BD[t].fixed && !BUILD_ORDER.includes(t)) err.push(`Gebäude ${t} fehlt in BUILD_ORDER`);
for (const R of RECIPES) if (R.tech) {
  if (!TECH_BY_ID[R.tech]) err.push(`Rezept ${R.id}: Forschung ${R.tech} fehlt`);
  const n = count(x => x.kind === 'leaf' && x.leaf.kind === 'r' && x.leaf.id === R.id);
  if (n !== 1) err.push(`Rezept ${R.id}: ${n}× als Blatt`);
}
console.log(`Skilltree: ${TECH.length} Forschungen, ${count(x => x.kind === 'leaf')} Blätter (${baseBuildings().length} an der Wurzel), ${L.nodes.length} Knoten.`);
if (err.length) { console.log(err.join('\n')); process.exit(1); }
console.log('OK: keine Überlappungen (Knoten und Beschriftungen), jede Forschung genau einmal, alle Gebäude und Rezepte abgedeckt.');
