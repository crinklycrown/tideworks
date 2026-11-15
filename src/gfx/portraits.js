/* =========================================================
   PORTRÄTS für Dialogfenster und Großaufnahmen (64×80, in der Großaufnahme 2× skaliert)
   Jedes Porträt ist ein Bildsatz aus portraitSet (cutscene/kit.js): portrait(id)(eyes, mouth) → Canvas.
     eyes: 0 offen, 1 zusammengekniffen, 2 zu (Blinzeln) · mouth: 0 zu, 1 offen (Sprechen)
   PORTRAITS[id] = { draw(eyes, mouth) → Canvas, face (true = Gesicht mit Blinzeln und Mund) }
   Figuren ohne eigenes Porträt (noch nicht gezeichnet) bekommen einen Schattenriss in ihrer Farbe.
   Neues Porträt: draw-Funktion mit den Bausteinen aus cutscene/kit.js schreiben, in PORTRAITS eintragen,
   im Dialog (data/dialogs/) als speaker bzw. portrait angeben.
   ========================================================= */
import { PB, PW, PH, shadeE, pick, bay, hash, vnoise, lerp, eyePair, brow, mouth, blush, torso, portraitSet, inE } from '../cutscene/kit.js';

/* ---------- Ole: der alte Fischer (aus der Referenz, Pixel für Pixel gleich) ---------- */
function ole(eyes, mouthOpen) {
  const pb = new PB(PW, PH);
  const HAT = ['#f6d36f', '#e3b04a', '#b9862c', '#80581a'];
  const HAT_D = ['#c9952f', '#a8781f', '#80581a', '#5c3e10'];
  const SKIN = ['#ecb892', '#d49672', '#b27350', '#7f4b34'];
  const BEARD = ['#f0eee6', '#cfccc3', '#a6a39a', '#77746c'];
  const NOSE = ['#f2b89a', '#dc8e6e', '#bb6c53', '#8a4836'];
  // Nackenschutz des Südwesters (hinten)
  shadeE(pb, 18, 42, 8.5, 15, HAT_D, { clip: (x, y) => y >= 28 });
  // Ölzeug-Mantel mit Falten, Kragen, Knebel
  torso(pb, { cx: 32, cy: 88, r: 31, y0: 54, ramp: HAT, folds: (x, y) => (x + (y >> 1)) % 11 === 0 && y > 62 });
  shadeE(pb, 33, 61, 15, 5.5, HAT, { bias: .1 });
  [[42, 68], [42, 74]].forEach(([x, y]) => { pb.rect(x, y, 3, 1, '#3a2a18'); pb.set(x, y - 1, '#f6d36f'); });
  // Ohr und Gesicht
  shadeE(pb, 19, 41, 3.2, 5, SKIN); pb.set(19, 41, SKIN[3]); pb.set(19, 42, SKIN[3]);
  shadeE(pb, 31.5, 39, 13.5, 16.5, SKIN, { noise: .3, seed: 3 });
  for (let x = 18; x < 46; x++) for (let y = 29; y < 33; y++) { const c = pb.get(x, y); if (SKIN.includes(c)) pb.set(x, y, SKIN[Math.min(3, SKIN.indexOf(c) + (y < 31 ? 2 : 1))]); }   // Schatten der Krempe
  // Wangen, Falten, Narbe
  blush(pb, [[24, 43], [40, 42]], '#d6866c');
  pb.set(20, 37, SKIN[3]); pb.set(19, 38, SKIN[3]); pb.set(43, 37, SKIN[3]);
  for (let k = 0; k < 5; k++) pb.set(40 + Math.round(k * .6), 38 + k, '#efc4a4');
  // Augen und Brauen (zusammengekniffen: Brauen tiefer)
  eyePair(pb, { y: 37, skin: SKIN, list: [{ x: 24, w: 4, row: 'WIPW' }, { x: 37, w: 3, row: 'WPI' }] }, eyes);
  const lift = eyes === 1 ? 1 : 0;
  brow(pb, 22, 28, 34, true, lift, BEARD); brow(pb, 35, 41, 34, false, lift, BEARD);
  // Bart mit Strähnen
  const inBeard = (x, y) => (inE(x, y, 31.5, 54, 13.5, 11) || inE(x, y, 31.5, 61, 10, 9) || inE(x, y, 32, 68, 6, 4.5)) && y >= 44;
  for (let y = 44; y < 74; y++) for (let x = 14; x < 50; x++) {
    if (!inBeard(x, y)) continue;
    let l = -((x - 31.5) / 13) * .6 - ((y - 56) / 14) * .5 + (bay(x, y) - .5) * .3;
    if ((x * 3 + (y >> 1)) % 5 === 0) l -= .45;
    pb.set(x, y, pick(BEARD, l));
  }
  // Schnurrbart, Mund, Nase
  shadeE(pb, 27, 48, 6.2, 2.7, BEARD, { bias: .15 }); shadeE(pb, 37, 48, 6.2, 2.7, BEARD, { bias: -.05 });
  pb.set(21, 49, BEARD[2]); pb.set(20, 50, BEARD[2]); pb.set(43, 49, BEARD[2]); pb.set(44, 50, BEARD[3]);
  mouth(pb, 29, 50, 7, mouthOpen);
  shadeE(pb, 34.5, 43, 3.7, 4.2, NOSE);
  for (let y = 34; y < 40; y++) pb.set(33, y, SKIN[1]);
  pb.set(34, 39, SKIN[2]); pb.set(36, 46, '#6a3426'); pb.set(33, 46, '#6a3426'); pb.set(33, 42, '#ffd6bc');
  // Südwester: Krone und Krempe
  shadeE(pb, 30, 21, 15, 10.5, HAT, { clip: (x, y) => y <= 29 });
  for (let x = 17; x < 44; x++) if (pb.get(x, 24 + Math.round(Math.abs(x - 30) * .12))) pb.set(x, 24 + Math.round(Math.abs(x - 30) * .12), HAT[2]);
  for (let y = 22; y < 37; y++) for (let x = 4; x < 60; x++) {
    const cy = 29 + (x - 32) * .09, ny = (y + .5 - cy) / 4.3, nx = (x + .5 - 32) / 26;
    if (nx * nx + ny * ny > 1) continue;
    const under = y + .5 > cy + 1;
    const l = (under ? -.6 : .25) - nx * .45 + (bay(x, y) - .5) * .3;
    pb.set(x, y, pick(under ? HAT_D : HAT, l));
  }
  [[22, 15], [35, 13], [41, 19], [12, 28], [50, 30]].forEach(([x, y]) => pb.set(x, y, '#fff3c4'));   // Regentropfen
  pb.outline('#22160f');
  return pb.canvas();
}

/* ---------- Brann: der Werkmeister (kräftig, Lederschürze, Ruß, Lappen über der Schulter, prüfender Blick) ---------- */
// eyes: 0 offen, 1 zusammengekniffen (mustert), 2 zu, 3 Blick zur Seite nach unten (auf deine Hände)
function brann(eyes, mouthOpen) {
  const pb = new PB(PW, PH);
  const SKIN = ['#e8b48c', '#cb8e68', '#a66b4a', '#744530'];
  const HAIR = ['#6e5747', '#503e32', '#382b23', '#251c16'];
  const GREY = ['#bdb4a6', '#968d80', '#6f675c'];
  const BEARD = ['#6c5242', '#503c30', '#3b2b22', '#281c16'];
  const SHIRT = ['#e4d9c2', '#c6b99f', '#a1957c', '#786c58'];
  const LEATHER = ['#b77c47', '#945d33', '#6f4325', '#4b2b17'];
  const NOSE = ['#ecb08c', '#cd8966', '#a96548', '#7a432f'];
  const BRASS = ['#f5dc8c', '#cc9c3c', '#8c6522', '#5c3f13'];
  const GLASS = ['#a9cfc8', '#6a9894', '#43696a', '#2a4344'];
  const SOOT = ['#6a5348', '#4e3e35'];
  const soot = (cx, cy, rx, ry, k = .55) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (!inE(x, y, cx, cy, rx, ry) || !pb.get(x, y) || bay(x, y) > k + hash(x, y, 13) * .3) continue;
    pb.set(x, y, SOOT[(x + y) % 3 ? 0 : 1]);
  } };
  // Hemd (breite Schultern) mit Falten, Trennfuge zwischen Oberarm und Brust
  torso(pb, { cx: 32, cy: 98, r: 44, y0: 53, ramp: SHIRT, folds: (x, y) => (y > 60 && ((x * 2 + y) % 13 === 0)) || ((x === 11 || x === 52) && y > 61) });
  // Hals und offener Kragen mit Brust
  shadeE(pb, 32, 54, 9.5, 7, SKIN, { bias: -.2 });
  for (let y = 57; y < 68; y++) for (let x = 22; x < 43; x++) {
    if (Math.abs(x + .5 - 32) > (68 - y) * .62) continue;
    pb.set(x, y, hash(x, y, 4) < .3 && y > 60 ? BEARD[2] : pick(SKIN, -.1 - (y - 57) * .05 + (bay(x, y) - .5) * .3 - (x > 32 ? .25 : 0)));
  }
  for (let y = 57; y < 67; y++) { const d = (68 - y) * .62; pb.set(Math.floor(32 - d) - 1, y, SHIRT[0]); pb.set(Math.floor(32 - d), y, SHIRT[1]); pb.set(Math.ceil(32 + d), y, SHIRT[2]); pb.set(Math.ceil(32 + d) + 1, y, SHIRT[1]); }
  // Lederschürze: Latz mit Naht, Riemen über die Schultern, Nieten, Ruß
  for (let y = 64; y < PH; y++) for (let x = 18; x < 47; x++) {
    const half = 10 + (y - 64) * .18;
    if (Math.abs(x + .5 - 32) > half) continue;
    const e = half - Math.abs(x + .5 - 32);
    let l = -((x - 32) / half) * .55 + (bay(x, y) - .5) * .3 + (hash(x >> 1, y >> 1, 21) - .5) * .35 + .05;
    if (e < 1) l -= .7;
    pb.set(x, y, pick(LEATHER, l));
    if (e >= 1.5 && e < 2.5 && y % 2 === 0) pb.set(x, y, LEATHER[0]);   // Naht
  }
  for (let y = 56; y < 66; y++) { const u = (y - 56) / 10; pb.rect(Math.round(25 - u * 3), y, 3, 1, LEATHER[1]); pb.set(Math.round(25 - u * 3), y, LEATHER[0]); pb.rect(Math.round(37 + u * 3), y, 3, 1, LEATHER[2]); }
  [[23, 66], [41, 66]].forEach(([x, y]) => { pb.set(x, y, BRASS[0]); pb.set(x + 1, y, BRASS[2]); });
  soot(36, 71, 4, 2.5, .5);
  // Lappen über der linken Schulter (im Bild links), hängt vorn herab; eigene Kontur. Keine Arme und Hände im Bild.
  const RAG = ['#bccad3', '#95a6b3', '#6e7f8d', '#4b5864'];
  const ragIn = (x, y) => { const c = 12.5 + (y - 60) * .12, w = y < 60 ? 3.6 + (y - 55) * .7 : 4.6; return y >= 55 && Math.abs(x + .5 - c) <= w; };
  for (let y = 55; y < PH; y++) for (let x = 4; x < 22; x++) {
    if (!ragIn(x, y) || !pb.get(x, y)) continue;
    const edge = !ragIn(x - 1, y) || !ragIn(x + 1, y) || !ragIn(x, y - 1);
    const c = 12.5 + (y - 60) * .12, nx = (x + .5 - c) / 4.6;
    let l = -nx * .7 + (y < 58 ? .35 : 0) + (bay(x, y) - .5) * .3;
    if ((x * 2 + y) % 9 === 0 && y > 59) l -= .55;                        // Falten
    pb.set(x, y, edge ? '#2c3a44' : pick(RAG, l));
  }
  for (let x = 8; x < 18; x++) if (pb.get(x, 61) && ragIn(x, 61) && ragIn(x - 1, 61) && ragIn(x + 1, 61)) pb.set(x, 61, RAG[2]);   // Kante über der Schulter
  soot(14, 70, 2.5, 3, .45);
  // Ohren und Gesicht (kantiger Kiefer)
  shadeE(pb, 17.5, 41, 3.2, 5, SKIN); pb.set(17, 41, SKIN[3]); pb.set(17, 42, SKIN[3]);
  shadeE(pb, 46.5, 41, 3, 5, SKIN, { bias: -.15 }); pb.set(47, 41, SKIN[3]);
  const inFace = (x, y) => { const nx = (x + .5 - 32) / 14.5, ny = (y + .5 - 39) / 17; return (y < 39 ? nx * nx : Math.pow(Math.abs(nx), 3)) + ny * ny <= 1; };
  for (let y = 21; y < 57; y++) for (let x = 16; x < 48; x++) {
    if (!inFace(x, y)) continue;
    const nx = (x + .5 - 32) / 14.5, ny = (y + .5 - 39) / 17;
    const l = -(nx * .62 + ny * .55) * .9 + (1 - nx * nx - ny * ny) * .22 + (bay(x, y) - .5) * .3 + (hash(x, y, 3) - .5) * .25;
    pb.set(x, y, pick(SKIN, l));
  }
  // Stirnfalte, Krähenfüße, Tränensäcke
  for (let x = 27; x < 38; x++) if (hash(x, 1, 5) < .7) pb.set(x, 31 + (x > 32 ? 0 : 0), SKIN[2]);
  [[20, 37], [44, 37]].forEach(([x, y]) => pb.set(x, y, SKIN[3]));
  for (let x = 23; x < 28; x++) pb.set(x, 40, SKIN[2]);
  for (let x = 36; x < 41; x++) pb.set(x, 40, SKIN[2]);
  // Ruß: Wischer über die Wange, Streifen auf der Stirn
  soot(23.5, 45.5, 3.4, .9, .4); soot(40, 32.5, 2.6, .9, .4);
  // Augen und Brauen: eine Braue hoch (prüfend); beim Mustern beide tiefer
  const rows = eyes === 3 ? ['IPWW', 'PIWW'] : ['WIPW', 'WPIW'];
  eyePair(pb, { y: 37, skin: SKIN, iris: '#5d7d8c', pupil: '#1a2428', lash: '#33221a', list: [{ x: 23, w: 4, row: rows[0] }, { x: 37, w: 4, row: rows[1] }] }, eyes === 3 ? 0 : eyes);
  if (eyes === 3) { pb.rect(23, 36, 4, 1, SKIN[2]); pb.rect(37, 36, 4, 1, SKIN[2]); }   // Lider gesenkt
  // buschige Brauen (2 Pixel dick); lift −1 = hochgezogen, 1 = tief und zusammengezogen
  const thick = (x0, x1, y, innerRight, lift) => { for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0), inner = innerRight ? t : 1 - t, yy = y + Math.round(lift * (.4 + inner * .8)) + (inner < .15 ? 1 : 0);
    pb.set(x, yy, HAIR[3]); pb.set(x, yy - 1, (x + yy) % 3 ? HAIR[2] : HAIR[1]);
    if (inner > .3 && inner < .85 && hash(x, yy, 2) < .5) pb.set(x, yy - 2, HAIR[2]);
  } };
  thick(21, 28, 35, true, eyes === 1 ? 1 : 0);
  thick(36, 43, 35, false, eyes === 1 ? 0 : -1.4);
  // Bart (kurz, voll) mit Strähnen, Schnurrbart, Mund, Nase
  const inBeard = (x, y) => (inFace(x, y) && (y > 48 || (Math.abs(x + .5 - 32) > 10.5 && y > 41))) || inE(x, y, 32, 57, 9, 4.5);
  for (let y = 41; y < 63; y++) for (let x = 15; x < 50; x++) {
    if (!inBeard(x, y)) continue;
    let l = -((x - 32) / 14) * .6 - ((y - 52) / 12) * .45 + (bay(x, y) - .5) * .3;
    if ((x * 3 + (y >> 1)) % 5 === 0) l -= .45;
    let c = pick(BEARD, l);
    if ((x < 19 || x > 45) && y < 47 && hash(x, y, 8) < .45) c = GREY[1];   // grau an den Koteletten
    pb.set(x, y, c);
  }
  shadeE(pb, 27.5, 49.5, 5.6, 2.3, BEARD, { bias: .2 }); shadeE(pb, 36.5, 49.5, 5.6, 2.3, BEARD, { bias: 0 });
  mouth(pb, 29, 51, 7, mouthOpen, { line: '#2c1a12', dark: '#24120c', lip: '#7a4434' });
  if (!mouthOpen) for (let x = 30; x < 35; x++) pb.set(x, 52, '#8a5040');   // Unterlippe
  shadeE(pb, 33, 44.5, 3.9, 4.4, NOSE);
  for (let y = 36; y < 42; y++) pb.set(32 + (y === 39 ? 1 : 0), y, SKIN[1]);
  pb.set(31, 47, '#5e3022'); pb.set(35, 47, '#5e3022'); pb.set(32, 42, '#ffd2b4');
  // Haar: kurz geschoren, grau an den Schläfen
  for (let y = 18; y < 38; y++) for (let x = 14; x < 50; x++) {
    if (!inE(x, y, 32, 33, 16, 15.5)) continue;
    const side = x < 19 || x > 45, line = 28 + Math.abs(x + .5 - 32) * .12;
    if (!(y < line || (side && y < 36))) continue;
    let l = -((x - 32) / 16) * .6 - ((y - 24) / 10) * .3 + (bay(x, y) - .5) * .35;
    if ((x + y * 2) % 7 === 0) l -= .4;
    let c = pick(HAIR, l);
    if (side && hash(x, y, 6) < .5) c = GREY[x < 32 ? 0 : 1];
    pb.set(x, y, c);
  }
  // Schutzbrille auf der Stirn: Lederband, Messingringe, Gläser
  for (let x = 16; x < 48; x++) { const y = 25 + Math.round(Math.pow((x - 32) / 16, 2) * 3); if (pb.get(x, y)) { pb.set(x, y, '#3a281d'); pb.set(x, y + 1, '#24180f'); } }
  for (const [gx, lit] of [[25.5, .15], [38.5, -.1]]) {
    shadeE(pb, gx, 25.5, 4.4, 3.6, BRASS, { bias: lit });
    shadeE(pb, gx, 25.5, 2.7, 2, GLASS, { bias: lit + .1 });
    pb.set(Math.floor(gx) - 1, 24, '#e8fbf6');
  }
  pb.outline('#22160f');
  return pb.canvas();
}

/* ---------- Aurel: König vom Goldberg (gepflegt, weiche Züge, goldener Umhang, schmaler Reif, Lächeln) ---------- */
// eyes: 0 offen (freundlich), 1 lachende Augen (Halbmonde), 2 zu, 3 Lächeln stockt (Augen weit, Mund gerade), 4 halbes Lächeln
// (3 und 4 nur in der Szene; der Dialog nutzt 0 und 2)
function aurel(eyes, mouthOpen) {
  const pb = new PB(PW, PH);
  const SKIN = ['#f7d7ba', '#ebbd9c', '#d49e80', '#a87460'];
  const HAIR = ['#dcb47c', '#b88e58', '#8e683a', '#624624'];
  const GOLD = ['#fde89a', '#f1c955', '#d29e34', '#9a6a1c'];
  const ROBE = ['#fffbf2', '#efe4cf', '#d6c6a8', '#a89878'];
  const PURPLE = ['#a86cc8', '#7e449e', '#5c2c78', '#3e1c54'];
  const NOSE = ['#f6d2b4', '#eab092', '#d29276', '#a46a56'];
  const stock = eyes === 3, half = eyes === 4;
  // Haar hinten: fällt in weichen Wellen bis zum Kiefer (hinter Ohren und Gesicht)
  for (let y = 26; y < 56; y++) for (let x = 11; x < 54; x++) {
    const d = Math.abs(x + .5 - 32), w = 19.5 - Math.max(0, y - 44) * .55 + Math.sin(y * .7 + (x < 32 ? 0 : 2)) * .8;
    if (d > w || d < 9) continue;
    let l = (x < 32 ? .2 : -.4) - Math.max(0, y - 40) * .05 + (bay(x, y) - .5) * .3 + Math.sin(y * .7 + d * .4) * .35;
    pb.set(x, y, pick(HAIR, l));
  }
  // Umhang: breite Schultern in Gold mit weichen Falten
  torso(pb, { cx: 32, cy: 104, r: 48, y0: 56, ramp: GOLD, bias: .05, folds: (x, y) => y > 66 && ((x * 2 + y) % 17 === 0 || (x * 2 - y + 90) % 19 === 0) });
  // Gewand: schmaler weißer Ausschnitt unter der Brosche
  for (let y = 66; y < PH; y++) for (let x = 20; x < 44; x++) {
    const d = Math.abs(x + .5 - 32), h = 1 + (y - 66) * .3;
    if (d > h) continue;
    pb.set(x, y, pick(ROBE, -((x - 32) / 6) * .5 + (bay(x, y) - .5) * .3 + .3));
  }
  // Kragen des Umhangs: purpurnes Band mit Goldborte, folgt den Schultern und läuft vorn zur Brosche hinab
  for (let x = 8; x < 56; x++) {
    const d = Math.abs(x + .5 - 32); if (d < 3) continue;
    const sh = 104 - Math.sqrt(Math.max(0, 48 * 48 - d * d));                 // Schulterlinie des Umhangs
    const y0 = Math.round(d > 9 ? sh - 1 : lerp(62, 56, (d - 3) / 6)), th = d > 9 ? 4 : 5;
    for (let k = 0; k < th; k++) {
      let c = k === 0 ? GOLD[x < 32 ? 0 : 1] : k === th - 1 ? GOLD[2] : PURPLE[(x < 32 ? 1 : 2) + (k === th - 2 ? 1 : 0)];
      if (k === 1 && x % 4 === 0) c = GOLD[1];   // Goldstich
      pb.set(x, y0 + k, c);
    }
  }
  // Sonnen-Brosche (wie die Sonne im Wappen), dunkel gefasst
  for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0], [-3, -3], [3, -3], [-3, 3], [3, 3]]) pb.set(32 + dx, 65 + dy, dx < 0 || dy < 0 ? GOLD[0] : GOLD[2]);
  for (let y = 62; y <= 68; y++) for (let x = 29; x <= 35; x++) { const r = Math.hypot(x - 32, y - 65); if (r <= 2.9) pb.set(x, y, r > 2.1 ? GOLD[3] : pick(GOLD, -(x - 32 + y - 65) * .25 + .3)); }
  pb.set(31, 64, '#fffbe0');
  // Hals mit hellem Hemdkragen
  shadeE(pb, 32, 53, 7, 6.5, SKIN, { bias: -.2 });
  for (let x = 25; x < 40; x++) { const y = 57 + Math.round(Math.abs(x + .5 - 32) * -.25 + 1.5); pb.set(x, y, ROBE[x < 32 ? 0 : 1]); pb.set(x, y + 1, ROBE[2]); }
  // Ohren und Gesicht (weich, rund, glatte Haut)
  shadeE(pb, 18, 41, 3, 4.6, SKIN); pb.set(18, 41, SKIN[2]); pb.set(18, 42, SKIN[2]);
  shadeE(pb, 46, 41, 2.8, 4.6, SKIN, { bias: -.1 }); pb.set(46, 41, SKIN[2]);
  const inFace = (x, y) => { const nx = (x + .5 - 32) / 13.8, ny = (y + .5 - 39) / 16.2; return (y < 41 ? nx * nx : Math.pow(Math.abs(nx), 2.2)) + ny * ny <= 1; };
  for (let y = 21; y < 57; y++) for (let x = 16; x < 48; x++) {
    if (!inFace(x, y)) continue;
    const nx = (x + .5 - 32) / 13.8, ny = (y + .5 - 39) / 16.2;
    const l = -(nx * .45 + ny * .4) * .65 + (1 - nx * nx - ny * ny) * .3 + (bay(x, y) - .5) * .22 + .2;
    pb.set(x, y, pick(SKIN, l));
  }
  // Wangen (rosig), Lachfalten nur beim Lächeln
  blush(pb, [[24, 46], [40, 46]], '#f4c2a8');
  if (!stock && !half) { pb.set(26, 49, SKIN[2]); pb.set(25, 50, SKIN[2]); pb.set(38, 49, SKIN[2]); pb.set(39, 50, SKIN[2]); }
  if (half) { pb.set(38, 49, SKIN[2]); pb.set(39, 50, SKIN[2]); }
  if (eyes === 1) { pb.set(20, 37, SKIN[2]); pb.set(19, 38, SKIN[2]); pb.set(44, 37, SKIN[2]); pb.set(45, 38, SKIN[2]); }   // Fältchen beim Lachen
  // Augen: freundlich (unteres Lid leicht gehoben), Halbmonde beim Lachen, weit beim Stocken
  const EY = 38, EL = [{ x: 23, w: 5 }, { x: 36, w: 5 }], LASH = '#5a3a28';
  const col = { W: '#f6f2e8', I: '#5f86a8', P: '#1e2a36' };
  for (const e of EL) pb.rect(e.x - 1, EY - 1, e.w + 2, 3, SKIN[1]);
  for (const e of EL) {
    if (eyes === 1) {
      pb.set(e.x, EY, LASH); pb.rect(e.x + 1, EY - 1, e.w - 2, 1, LASH); pb.set(e.x + e.w - 1, EY, LASH);
      pb.rect(e.x, EY + 1, e.w, 1, SKIN[1]);
    } else if (eyes === 2) {
      pb.rect(e.x, EY, e.w, 1, '#7a4e3a'); pb.set(e.x + 1, EY + 1, SKIN[2]); pb.set(e.x + 3, EY + 1, SKIN[2]);
    } else {
      if (stock) { pb.rect(e.x, EY - 2, e.w, 1, LASH); pb.rect(e.x, EY - 1, e.w, 1, col.W); pb.set(e.x + 2, EY - 1, col.I); }
      else pb.rect(e.x, EY - 1, e.w, 1, LASH);
      pb.set(e.x, EY, col.W); pb.set(e.x + 1, EY, col.I); pb.set(e.x + 2, EY, col.P); pb.set(e.x + 3, EY, col.I); pb.set(e.x + 4, EY, col.W);
      pb.set(e.x + 1, EY - (stock ? 1 : 0), '#d8e8f4');                                         // Glanzlicht
      if (!stock) { pb.set(e.x + e.w - 1, EY, SKIN[1]); pb.rect(e.x + 1, EY + 1, e.w - 2, 1, SKIN[2]); }   // gehobenes Unterlid
      else pb.rect(e.x, EY + 1, e.w, 1, SKIN[1]);
    }
  }
  // Brauen: schmal, gepflegt, im Bogen; beim Stocken höher
  const by = EY - 4 - (stock ? 1 : 0);
  for (const [x0, inRight] of [[22, true], [35, false]]) for (let i = 0; i < 7; i++) {
    const t = inRight ? i : 6 - i, yy = by + (t === 0 ? 1 : 0) + (t === 6 ? 1 : 0) - (t >= 2 && t <= 4 ? 0 : 0);
    pb.set(x0 + i, yy, HAIR[t < 1 || t > 5 ? 2 : 3]);
    if (t >= 2 && t <= 4) pb.set(x0 + i, yy - 1, HAIR[1]);
  }
  // Nase: gerade, weich
  shadeE(pb, 33, 45, 3.2, 3.6, NOSE, { bias: .3 });
  for (let y = 37; y < 43; y++) pb.set(32, y, SKIN[0]);
  pb.set(31, 47, '#b47a66'); pb.set(35, 47, '#b47a66'); pb.set(32, 43, '#fff2e4');
  // Mund: Lächeln (Mundwinkel oben), offen beim Sprechen, gerade beim Stocken, halb beim Wiederfinden
  const LINE = '#8e4c42', LIP = '#e6a092', DARK = '#5a2420', TEETH = '#fbf4ea';
  if (stock) {
    pb.rect(28, 51, 9, 1, LINE); pb.rect(30, 52, 5, 1, LIP);
  } else if (half) {
    pb.rect(28, 51, 7, 1, LINE); pb.set(35, 50, LINE); pb.set(36, 49, LINE); pb.rect(30, 52, 5, 1, LIP);
  } else if (mouthOpen || eyes === 1) {
    pb.set(27, 49, LINE); pb.set(37, 49, LINE); pb.rect(28, 50, 9, 1, LINE);
    pb.rect(29, 51, 7, mouthOpen ? 2 : 1, DARK); pb.rect(29, 51, 7, 1, TEETH); pb.rect(30, mouthOpen ? 53 : 52, 5, 1, LIP);
  } else {
    pb.set(27, 49, LINE); pb.set(28, 50, LINE); pb.rect(29, 51, 7, 1, LINE); pb.set(36, 50, LINE); pb.set(37, 49, LINE);
    pb.rect(30, 52, 5, 1, LIP);
  }
  // Haar oben: sorgfältig zurückgekämmt, Scheitel links, eine weiche Welle über der Stirn
  for (let y = 15; y < 40; y++) for (let x = 13; x < 51; x++) {
    if (!inE(x, y, 32, 31, 17.5, 16)) continue;
    const side = x < 19 || x > 45, line = 26.5 + Math.abs(x + .5 - 32) * .1 + (x > 26 && x < 38 ? Math.sin((x - 26) / 12 * Math.PI) * -1.2 : 0);
    if (!(y < line || (side && y < 36))) continue;
    const wave = Math.sin((x - 24) * .5 + y * .3) * .3;
    let l = -((x - 30) / 17) * .7 - ((y - 22) / 12) * .3 + (bay(x, y) - .5) * .3 + wave + .1;
    if (x === 26 && y < 25) l -= .7;                                                    // Scheitel
    pb.set(x, y, pick(HAIR, l));
  }
  // Schmaler Reif: goldenes Band über der Stirn, kleiner blauer Stein in der Mitte
  for (let x = 14; x < 51; x++) {
    const y = 26 + Math.round(Math.pow((x - 32) / 17, 2) * 4);
    if (!pb.get(x, y)) continue;
    pb.set(x, y, x < 32 ? GOLD[0] : GOLD[1]); pb.set(x, y + 1, GOLD[2]);
  }
  pb.rect(31, 24, 3, 3, GOLD[2]); pb.set(32, 25, '#3a6ac8'); pb.set(31, 24, GOLD[0]);
  pb.outline('#3b2a1f');
  return pb.canvas();
}

/* ---------- Der Spieler / der Herrscher (seit 0.22.0, cs_wahrheit): dunkelgrüner Mantel mit Messingknöpfen und hohem Kragen,
   dunkles Haar mit der hellen Strähne (wie im Bullauge in cs_abstieg), die Hand mit dem schweren Ring am Mantel, ernstes Gesicht ----------
   eyes: 0 offen (ernst, Lider leicht gesenkt), 1 schmal (entschlossen), 2 zu.
   spielerView(view) für die Drehung in cs_wahrheit: 'back' (von hinten), 'qback' (halb von hinten, Ohr und Wange), 'side' (Profil nach links),
   'front' (= Porträt). Alle 64×80 mit demselben Mantel. */
const SP = {
  SKIN: ['#eec4a4', '#d6a283', '#b07c62', '#7e5442'],
  HAIR: ['#5a4232', '#3e2d21', '#2a1e16', '#1a120d'],
  STRAND: ['#f8f3e6', '#e2d9c2', '#c2b89c'],
  COAT: ['#4f8260', '#3a6649', '#2a4f38', '#1b3626'],
  BRASS: ['#f8e09a', '#d4a444', '#8a6422'],
  SHIRT: ['#ece6d4', '#cfc6ae', '#a69c84'],
  GOLD: ['#fff2b8', '#e8c35a', '#b8892c', '#6e4a18'],
  STONE: '#2f8a52', NOSE: ['#f0c4a6', '#d89c7e', '#b47a60', '#84543e'], EDGE: '#1d1410'
};
// Mantel (vorn oder hinten), Hals, Kragen; front = Knopfleiste und Hemd
function spCoat(pb, front) {
  const C = SP.COAT;
  torso(pb, { cx: 32, cy: 102, r: 47, y0: 55, ramp: C, bias: .05, folds: (x, y) => y > 66 && (x * 2 + y) % 19 === 0 });
  shadeE(pb, 32, 53, 6.6, 6.5, SP.SKIN, { bias: front ? -.25 : -.45 });
  if (front) {
    // Ausschnitt: dunkle Weste, am Hals ein schmaler Hemdkragen (kein großes helles Dreieck: das läse sich als Bart)
    for (let y = 56; y < PH; y++) for (let x = 24; x < 41; x++) {
      const d = Math.abs(x + .5 - 32), w = y < 60 ? 5 : Math.max(0, 5 - (y - 60) * .3);
      if (d > w) continue;
      const collar = y >= 58 && y < 60 && d > 1.5;
      pb.set(x, y, y < 58 ? pick(SP.SKIN, -.3 - (x > 32 ? .3 : 0) + (bay(x, y) - .5) * .3) : collar ? SP.SHIRT[d > 3.5 ? 1 : 0] : pick(['#3a3430', '#2c2622', '#201b18', '#16120f'], -((x - 32) / 5) * .6 + (bay(x, y) - .5) * .3));
    }
    for (let y = 60; y < PH; y++) { const w = Math.max(0, 5 - (y - 60) * .3); pb.set(Math.round(32 - w) - 1, y, C[0]); pb.set(Math.round(32 + w), y, C[3]); }   // Kante des Mantels (Revers)
    // Knöpfe (zwei Reihen)
    for (const [bx, by] of [[22, 66], [40, 66], [23, 73], [39, 73]]) { pb.rect(bx, by, 2, 2, SP.BRASS[1]); pb.set(bx, by, SP.BRASS[0]); pb.set(bx + 1, by + 1, SP.BRASS[2]); }
  } else {
    for (let y = 62; y < PH; y++) pb.set(32, y, C[3]);                       // Rückennaht
    for (const bx of [24, 39]) { pb.rect(bx, 77, 2, 2, SP.BRASS[1]); pb.set(bx, 77, SP.BRASS[0]); }   // Knöpfe am Rückengurt
  }
  // hoher Kragen: zwei Spitzen neben dem Hals (vorn offen, hinten geschlossen)
  for (let y = 48; y < 62; y++) {
    const w = (62 - y) * .42;
    for (let x = Math.round(19 - w); x <= 25; x++) pb.set(x, y, C[x < 21 ? 0 : 1]);
    for (let x = 39; x <= Math.round(45 + w); x++) pb.set(x, y, C[x > 42 ? 2 : 1]);
    if (!front && y > 53) for (let x = 25; x < 39; x++) pb.set(x, y, C[y < 56 ? 1 : 2]);
  }
  for (let y = 48; y < 62; y++) { pb.set(25, y, C[3]); pb.set(39, y, C[3]); }
}
// Hand mit Ring am Mantelaufschlag (vorn, im Bild links unten): eigene Ebene mit Kontur
function spHand(pb) {
  const h = new PB(PW, PH), S = SP.SKIN;
  // Ärmel-Aufschlag
  for (let y = 70; y < PH; y++) for (let x = 2; x < 17; x++) { const u = (y - 70) / 10; if (x < 3 + u * 2 || x > 15 - u) continue; h.set(x, y, pick(SP.COAT, -((x - 9) / 7) * .6 + (bay(x, y) - .5) * .3 + (y < 72 ? .5 : 0))); }
  h.rect(5, 74, 2, 2, SP.BRASS[1]); h.set(5, 74, SP.BRASS[0]);
  // Hand: Rücken nach vorn, Finger waagerecht um den Aufschlag, Daumen oben
  for (let y = 64; y < 74; y++) for (let x = 11; x < 26; x++) {
    const nx = (x + .5 - 18) / 7.5, ny = (y + .5 - 69) / 5.2;
    if (nx * nx + ny * ny > 1) continue;
    let l = -(nx * .6 + ny * .5) * .8 + (bay(x, y) - .5) * .25 + .15;
    h.set(x, y, pick(S, l));
  }
  for (const fy of [66, 69, 72]) for (let x = 19; x < 26; x++) if (h.get(x, fy) && h.get(x, fy + 1)) h.set(x, fy, S[x > 23 ? 3 : 2]);   // Fugen zwischen den Fingern
  for (const fy of [65, 68, 71]) h.set(19, fy, S[0]);                                                                   // Knöchel
  for (let x = 15; x < 22; x++) h.set(x, 63, S[x < 18 ? 0 : 1]);                                  // Daumen
  h.set(22, 63, S[2]);
  // Ring: schwerer Goldring mit dunkelgrünem Stein auf dem Mittelfinger
  for (let y = 67; y <= 70; y++) { h.set(21, y, SP.GOLD[y === 67 ? 0 : y === 70 ? 3 : 1]); h.set(22, y, SP.GOLD[y === 70 ? 3 : 2]); }
  h.set(21, 68, SP.STONE); h.set(21, 69, '#1c5a34'); h.set(20, 67, SP.GOLD[0]);
  h.outline(SP.EDGE);
  for (let i = 0; i < h.p.length; i++) if (h.p[i]) pb.p[i] = h.p[i];
}
function spieler(eyes, mouthOpen) {
  const pb = new PB(PW, PH), S = SP.SKIN, H = SP.HAIR;
  // Haar hinten (bis in den Nacken, hinter den Ohren)
  for (let y = 24; y < 52; y++) for (let x = 13; x < 52; x++) {
    const d = Math.abs(x + .5 - 32), w = 18.5 - Math.max(0, y - 42) * .9;
    if (d > w || d < 10) continue;
    pb.set(x, y, pick(H, (x < 32 ? 0 : -.5) - (y - 30) * .03 + Math.sin(y * .8 + d * .5) * .3 + (bay(x, y) - .5) * .3));
  }
  spCoat(pb, true);
  // Ohren und Gesicht: schmaler, kantiger Kiefer
  shadeE(pb, 18.5, 40, 2.8, 4.6, S); pb.set(18, 40, S[2]); pb.set(18, 41, S[2]);
  shadeE(pb, 45.5, 40, 2.6, 4.6, S, { bias: -.2 }); pb.set(46, 40, S[2]);
  const inFace = (x, y) => { const nx = (x + .5 - 32) / 13.2, ny = (y + .5 - 38.5) / 16.4; return (y < 40 ? nx * nx : Math.pow(Math.abs(nx), 2.6)) + ny * ny <= 1; };
  for (let y = 21; y < 56; y++) for (let x = 17; x < 47; x++) {
    if (!inFace(x, y)) continue;
    const nx = (x + .5 - 32) / 13.2, ny = (y + .5 - 38.5) / 16.4;
    let l = -(nx * .55 + ny * .35) * .75 + (1 - nx * nx - ny * ny) * .25 + (bay(x, y) - .5) * .22 + .1;
    if (x > 40 && y > 40) l -= .25;                                                   // Schatten unter dem Wangenknochen rechts
    pb.set(x, y, pick(S, l));
  }
  // Bartschatten an Kinn und Wangen (fein gerastert), Wangenknochen
  for (let y = 44; y < 56; y++) for (let x = 19; x < 46; x++) { const c = pb.get(x, y); if (c && S.includes(c) && bay(x, y) < .2 && Math.abs(x - 32) > (y < 50 ? 7 : 2)) pb.set(x, y, S[2]); }
  pb.set(22, 45, S[2]); pb.set(23, 46, S[2]); pb.set(41, 45, S[3]); pb.set(40, 46, S[2]);
  // Augen: ernst, Oberlid schwer (Lidstrich breit), Iris graugrün
  const EY = 38, EL = [{ x: 23, w: 5 }, { x: 36, w: 5 }], col = { W: '#efeadc', I: '#4a6a5a', P: '#18221c' };
  for (const e of EL) pb.rect(e.x - 1, EY - 2, e.w + 2, 4, S[1]);
  for (const e of EL) {
    if (eyes === 2) { pb.rect(e.x, EY, e.w, 1, '#5a3426'); pb.rect(e.x, EY - 1, e.w, 1, S[2]); continue; }
    pb.rect(e.x, EY - 1, e.w, 1, '#2e1c14'); pb.set(e.x - 1, EY - 1, S[2]);
    if (eyes === 1) { pb.rect(e.x, EY, e.w, 1, '#3a2218'); pb.set(e.x + 2, EY, col.P); pb.rect(e.x, EY + 1, e.w, 1, S[2]); continue; }
    pb.set(e.x, EY, col.W); pb.set(e.x + 1, EY, col.I); pb.set(e.x + 2, EY, col.P); pb.set(e.x + 3, EY, col.I); pb.set(e.x + 4, EY, col.W);
    pb.set(e.x + 1, EY, '#6a8e7a');
    pb.rect(e.x, EY + 1, e.w, 1, S[1]); pb.set(e.x + 2, EY + 1, S[2]);
  }
  // Brauen: gerade, dunkel, tief über den Augen, innen leicht zusammengezogen
  for (const [x0, inRight] of [[22, true], [35, false]]) for (let i = 0; i < 7; i++) {
    const t = inRight ? i : 6 - i, yy = EY - 4 + (t >= 5 ? 1 : 0) + (eyes === 1 && t >= 4 ? 1 : 0);
    pb.set(x0 + i, yy, H[t > 4 ? 3 : 2]); if (t > 0 && t < 6) pb.set(x0 + i, yy - 1, H[1]);
  }
  pb.set(31, EY - 3, S[2]); pb.set(32, EY - 2, S[2]);                                // Falte zwischen den Brauen
  // Nase: gerade, Schatten rechts
  for (let y = 37; y < 46; y++) { pb.set(32, y, S[0]); pb.set(34, y, S[2]); }
  shadeE(pb, 33, 45.5, 3, 2.4, SP.NOSE, { bias: .2 });
  pb.set(31, 47, '#8e5642'); pb.set(35, 47, '#8e5642'); pb.set(32, 44, '#fbe0cc');
  // Mund: gerade, schmal, ernst; offen beim Sprechen
  if (mouthOpen) { pb.rect(29, 50, 7, 2, '#3a1a14'); pb.rect(30, 50, 4, 1, '#e8e0cc'); pb.rect(30, 52, 5, 1, '#b07462'); }
  else { pb.rect(28, 50, 9, 1, '#7a4434'); pb.set(28, 51, S[2]); pb.set(36, 51, S[2]); pb.rect(30, 51, 5, 1, '#c88872'); }
  pb.rect(30, 54, 5, 1, S[2]);                                                         // Kinngrube
  // Haar oben: dicht, fällt in die Stirn, seitlich bis über die Ohren
  for (let y = 12; y < 44; y++) for (let x = 13; x < 52; x++) {
    if (!inE(x, y, 32, 29, 19, 17)) continue;
    const nx = (x + .5 - 32) / 19, fore = 26 + Math.abs(nx) * 8 + Math.sin(x * 1.3) * 1.2 + (x > 30 && x < 40 ? 1.5 : 0);
    const side = Math.abs(nx) > .74;
    if (!(y < fore || (side && y < 37 + Math.round(vnoise(x, 1, 3) * 3)))) continue;
    let l = -nx * .7 - (y - 18) * .025 + (vnoise(x / 2.2, y / 5, 7) - .5) * .9 + (bay(x, y) - .5) * .3;
    pb.set(x, y, pick(H, l));
  }
  // die helle Strähne: vom Scheitel links schräg über die Stirn bis zur rechten Braue, oben breit
  for (let i = 0; i < 48; i++) {
    const u = i / 47, x = 22 + u * 17 + Math.sin(u * 3.1) * 1.4, y = 13 + u * 18 - Math.sin(u * 3.1) * 2.5, w = 3.4 - u * 2.4;
    for (let k = -w; k <= w; k += .5) { const X = Math.round(x + k * .45), Y = Math.round(y + k); const c = pb.get(X, Y); if (c && (H.includes(c) || (S.includes(c) && Y < 35))) pb.set(X, Y, SP.STRAND[k < -w * .3 ? 0 : k > w * .4 ? 2 : 1]); }
  }
  spHand(pb);
  pb.outline(SP.EDGE);
  return pb.canvas();
}
// Ansichten für die Drehung (nur Szene): von hinten, halb von hinten, Profil nach links
function spielerTurn(view) {
  const pb = new PB(PW, PH), S = SP.SKIN, H = SP.HAIR;
  spCoat(pb, false);
  if (view === 'back') {
    shadeE(pb, 14.5, 40, 2.4, 4.4, S, { bias: -.3 }); shadeE(pb, 49.5, 40, 2.4, 4.4, S, { bias: -.5 });
  } else if (view === 'qback') {
    shadeE(pb, 18, 41, 4.5, 9, S, { bias: -.1, clip: (x, y) => x < 20 });           // Wange links
    shadeE(pb, 45, 40, 2.6, 4.4, S, { bias: -.4 });
  } else {
    // Profil nach links: Gesicht vorn links, Nase ragt heraus, Ohr rechts
    for (let y = 22; y < 56; y++) for (let x = 12; x < 44; x++) {
      const nx = (x + .5 - 28) / 13.5, ny = (y + .5 - 38.5) / 16.4;
      if ((y < 40 ? nx * nx : Math.pow(Math.abs(nx), 2.6)) + ny * ny > 1) continue;
      pb.set(x, y, pick(S, -(nx * .35 + ny * .4) * .7 + (bay(x, y) - .5) * .22 + (x < 20 ? .25 : 0)));
    }
    for (let y = 39; y < 46; y++) for (let x = 11; x < 15; x++) if (x >= 14 - (y - 39) * .5) pb.set(x, y, S[y > 43 ? 1 : 0]);   // Nase
    pb.set(12, 46, S[2]); pb.set(13, 46, S[2]);
    shadeE(pb, 37, 40, 2.6, 4.6, S, { bias: -.2 }); pb.set(37, 41, S[2]);
    pb.rect(17, 37, 4, 1, '#2e1c14'); pb.set(17, 38, '#efeadc'); pb.set(18, 38, '#4a6a5a'); pb.set(19, 38, '#18221c');
    for (let i = 0; i < 6; i++) pb.set(15 + i, 34 + (i > 3 ? 1 : 0), H[2]);
    pb.rect(15, 50, 5, 1, '#7a4434'); pb.set(13, 54, S[2]);
    for (let y = 46; y < 56; y++) for (let x = 14; x < 36; x++) { const c = pb.get(x, y); if (c && S.includes(c) && bay(x, y) < .18 && x > 17) pb.set(x, y, S[2]); }
  }
  // Haar: von hinten ganz, sonst nur der Hinterkopf
  const cx = view === 'side' ? 34 : view === 'qback' ? 33 : 32;
  for (let y = 12; y < 52; y++) for (let x = 12; x < 53; x++) {
    if (!inE(x, y, cx, 30, 19, view === 'back' ? 20 : 17.5) && !(y > 40 && y < 52 && Math.abs(x + .5 - cx) < 13 - (y - 40) * .6 && view !== 'side')) continue;
    if (view === 'side' && x < 30 && y > 25 + (30 - x) * .1) continue;              // Gesicht frei
    if (view === 'qback' && x < 19 && y > 30) continue;
    const nx = (x + .5 - cx) / 19;
    let l = -nx * .8 - (y - 20) * .02 + (vnoise(x / 2.2, y / 5, 7) - .5) * .9 + (bay(x, y) - .5) * .3;
    pb.set(x, y, pick(H, l));
  }
  // helle Strähne: von hinten sieht man sie oben vom Scheitel nach rechts vorn laufen (gespiegelt), im Profil über der Stirn
  const strand = view === 'back' ? [[41, 13], [47, 22], [49, 30]] : view === 'qback' ? [[38, 13], [26, 18], [18, 26]] : [[26, 13], [18, 20], [13, 28]];
  for (let i = 0; i < 40; i++) {
    const u = i / 39, a = strand[0], b = strand[1], c = strand[2];
    const x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * b[0] + u * u * c[0], y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * b[1] + u * u * c[1], w = 3 - u * 2;
    for (let k = -w; k <= w; k += .5) { const X = Math.round(x + k * .6), Y = Math.round(y + k * .5); const col = pb.get(X, Y); if (col && H.includes(col)) pb.set(X, Y, SP.STRAND[k < 0 ? 0 : 1]); }
  }
  pb.outline(SP.EDGE);
  return pb.canvas();
}
const turnCache = {};
export function spielerView(view) { return view === 'front' ? portrait('spieler')(0, 0) : turnCache[view] || (turnCache[view] = spielerTurn(view)); }

/* ---------- Schattenriss: Platzhalter für Figuren ohne eigenes Porträt ---------- */
// Kopf und Schultern in der Farbe der Figur, kein Gesicht (Blinzeln und Mund entfallen)
function shadow(accent) {
  return () => {
    const pb = new PB(PW, PH), R = ['#4a4f57', '#3a3e45', '#2c2f35', '#202227'], A = [accent, accent, '#3a3e45', '#2c2f35'];
    torso(pb, { cx: 32, cy: 90, r: 30, y0: 56, ramp: R, bias: .2 });
    for (let x = 14; x < 50; x++) if (hash(x, 3, 7) < .9) pb.set(x, 60 + Math.round(Math.abs(x - 32) * .25), pick(A, .5 - Math.abs(x - 32) / 40));   // Kragen in der Farbe der Figur
    shadeE(pb, 32, 52, 7, 6, R, { bias: -.1 });                 // Hals
    shadeE(pb, 32, 36, 13, 16, R, { bias: .1, noise: .2, seed: 5 });
    pb.outline('#121316');
    return pb.canvas();
  };
}

export const PORTRAITS = {
  ole: { draw: ole, face: true },
  brann: { draw: brann, face: true },
  aurel: { draw: aurel, face: true },
  spieler: { draw: spieler, face: true },
  herrscher: { draw: shadow('#3f7a4c'), none: true },   // seit 0.22.0: der Herrscher hat erst nach dem Umdrehen ein Gesicht (Porträt spieler), vorher keins
  stimme: { draw: shadow('#8a8f98') }
};
const sets = {};
// Bildsatz zum Porträt id (unbekannt: grauer Schattenriss)
export function portrait(id) {
  if (!sets[id]) sets[id] = portraitSet((PORTRAITS[id] || { draw: shadow('#8a8f98') }).draw);
  return sets[id];
}
// Hat die Figur ein echtes Gesicht (Blinzeln, Mund)? Schattenrisse nicht.
export const hasFace = (id) => !!(PORTRAITS[id] && PORTRAITS[id].face);
// Figur ohne Porträt im Dialogkasten (nur Namensschild)
export const noPortrait = (id) => !!(PORTRAITS[id] && PORTRAITS[id].none);
